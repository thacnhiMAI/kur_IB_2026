import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";

import { getUserAccessState } from "@/lib/auth/access";
import { assertAuthRateLimit, clearAuthRateLimit } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { signInSchema } from "@/lib/validators/auth";

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Пароль", type: "password" }
    },
    authorize: async (credentials) => {
      const parsed = signInSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const email = parsed.data.email;
      const limiterKey = `login:${email}`;

      try {
        await assertAuthRateLimit({ key: limiterKey });
      } catch {
        return null;
      }

      const user = await db.user.findUnique({ where: { email } });
      if (!user?.passwordHash || !user.emailVerified) return null;
      if (getUserAccessState(user).blocked) return null;

      const matches = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!matches) return null;

      await Promise.all([
        clearAuthRateLimit(limiterKey),
        db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
      ]);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        authVersion: user.authVersion
      };
    }
  })
];

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET
    })
  );
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Only this provider may link by email, after the strict checks below.
      allowDangerousEmailAccountLinking: true,
      authorization: { params: { prompt: "select_account" } }
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/sign-in", error: "/auth/sign-in" },
  providers,
  callbacks: {
    signIn: async ({ user, account, profile }) => {
      if (account?.provider === "google") {
        // The OAuth profile is authoritative: `user` may already be an adapter
        // user from a previously linked (possibly incorrect) Account row.
        const email = typeof profile?.email === "string" ? profile.email.trim().toLowerCase() : "";
        if (!email || profile?.email_verified !== true || profile?.sub !== account.providerAccountId) {
          return "/auth/sign-in?error=GoogleEmailUnverified";
        }
        const existing = await db.user.findUnique({ where: { email } });
        const linked = await db.account.findUnique({
          where: { provider_providerAccountId: { provider: "google", providerAccountId: account.providerAccountId } },
          include: { user: true }
        });
        if (linked && linked.user.email.trim().toLowerCase() !== email) {
          return "/auth/sign-in?error=GoogleIdentityMismatch";
        }
        // Also block Auth.js's implicit account linking through an active
        // session, including direct requests that bypass our Google button.
        const active = await auth();
        if (active?.user?.id && active.user.id !== existing?.id) {
          return "/auth/sign-in?error=GoogleIdentityMismatch";
        }
        if (existing && getUserAccessState(existing).blocked) return false;
        if (existing && !existing.emailVerified) return "/auth/sign-in?error=EmailNotVerified";
        const cookieStore = await cookies();
        const intent = cookieStore.get("smart-library-google-intent")?.value;
        cookieStore.set("smart-library-google-intent", "", { path: "/api/auth/callback/google", maxAge: 0 });
        if (!existing && intent !== "signup") return "/auth/sign-in?error=AccountNotRegistered";
        user.email = email;
        return true;
      }
      if (!user.email) return false;

      const existing = await db.user.findUnique({
        where: { email: user.email.toLowerCase() },
        select: { bannedPermanently: true, bannedUntil: true }
      });

      if (existing && getUserAccessState(existing).blocked) return false;

      if (account?.provider === "credentials") {
        const verified = await db.user.findUnique({
          where: { email: user.email.toLowerCase() },
          select: { emailVerified: true }
        });
        if (!verified?.emailVerified) return false;
      }

      return true;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "USER";
        token.authVersion = user.authVersion ?? 0;
      }

      if (token.id) {
        const current = await db.user.findUnique({
          where: { id: String(token.id) },
          select: {
            role: true,
            email: true,
            name: true,
            image: true,
            authVersion: true,
            bannedPermanently: true,
            bannedUntil: true
          }
        });

        if (!current || token.authVersion !== current.authVersion ||
            (typeof token.email === "string" && token.email.toLowerCase() !== current.email.toLowerCase())) {
          return null;
        } else {
          token.email = current.email;
          token.role = current.role;
          token.name = current.name;
          token.picture = current.image;
          token.accessBlocked = getUserAccessState(current).blocked;
        }
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = String(token.id);
        session.user.email = typeof token.email === "string" ? token.email : session.user.email;
        session.user.role = (token.role as "USER" | "ADMIN" | undefined) ?? "USER";
        session.user.name = typeof token.name === "string" ? token.name : null;
        session.user.image = typeof token.picture === "string" ? token.picture : null;
        session.user.accessBlocked = Boolean(token.accessBlocked);
        session.user.authVersion = Number(token.authVersion ?? 0);
      }
      return session;
    }
  },
  events: {
    signIn: async ({ user, account }) => {
      if (!user.id) return;
      await db.user
        .update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            ...(account?.provider === "google" ? { emailVerified: new Date() } : {})
          }
        })
        .catch(() => undefined);
    }
  }
});

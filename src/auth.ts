import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

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
      if (!parsed.success) {
        return null;
      }

      const user = await db.user.findUnique({
        where: { email: parsed.data.email }
      });

      if (!user?.passwordHash) {
        return null;
      }

      const matches = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!matches) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role
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
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  trustHost: true,
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/auth/sign-in"
  },
  providers,
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "USER";
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = String(token.id);
        session.user.role = (token.role as "USER" | "ADMIN" | undefined) ?? "USER";
      }

      return session;
    }
  }
});

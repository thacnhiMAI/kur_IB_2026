import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getUserAccessState } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/permissions";

function buildSignInRedirect(callbackUrl?: string) {
  if (!callbackUrl) return "/auth/sign-in";
  return `/auth/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

export async function requireUser(callbackUrl?: string) {
  const session = await auth();
  const sessionUserId = session?.user?.id;

  if (!sessionUserId) redirect(buildSignInRedirect(callbackUrl));

  const user = await db.user.findUnique({
    where: { id: sessionUserId },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      image: true,
      name: true,
      role: true,
      bannedUntil: true,
      bannedPermanently: true,
      banReason: true,
      authVersion: true
    }
  });

  if (!user) redirect(buildSignInRedirect(callbackUrl));

  const access = getUserAccessState(user);
  if (access.blocked) {
    const until = access.until ? encodeURIComponent(access.until.toISOString()) : "permanent";
    redirect(`/auth/banned?until=${until}`);
  }

  return user;
}

export async function requireAdmin(callbackUrl?: string) {
  const user = await requireUser(callbackUrl);
  if (!canAccessAdmin(user)) redirect("/");
  return user;
}

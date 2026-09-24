import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { canAccessAdmin } from "@/lib/permissions";

export async function requireUser() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (!canAccessAdmin(user)) {
    redirect("/");
  }

  return user;
}

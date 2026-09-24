"use client";

import React, { useEffect, useState } from "react";
import { getSession, signOut } from "next-auth/react";

import { AuthNav, type AuthNavUser } from "@/components/auth/auth-nav";

export function AuthNavClient() {
  const [user, setUser] = useState<AuthNavUser>(null);

  useEffect(() => {
    let active = true;

    void getSession().then((session) => {
      if (!active) {
        return;
      }

      setUser(
        session?.user
          ? {
              name: session.user.name,
              email: session.user.email,
              role: session.user.role
            }
          : null
      );
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <AuthNav
      user={user}
      onSignOut={async () => {
        await signOut({ redirectTo: "/" });
      }}
    />
  );
}

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getSession, signOut } from "next-auth/react";

import { AuthNav, type AuthNavUser, type AuthNavVariant } from "@/components/auth/auth-nav";

export function AuthNavClient({ variant = "full" }: { variant?: AuthNavVariant }) {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthNavUser>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const session = await getSession();
      if (session?.user?.accessBlocked) {
        setUser(null);
        await signOut({ redirect: false });
        window.location.assign("/auth/banned");
        return;
      }
      setUser(
        session?.user
          ? {
              name: session.user.name,
              email: session.user.email,
              role: session.user.role,
              image: session.user.image
            }
          : null
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        const session = await getSession();
        if (!active) return;
        if (session?.user?.accessBlocked) {
          setUser(null);
          await signOut({ redirect: false });
          window.location.assign("/auth/banned");
          return;
        }
        setUser(
          session?.user
            ? {
                name: session.user.name,
                email: session.user.email,
                role: session.user.role,
                image: session.user.image
              }
            : null
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    const handleFocus = () => void refreshSession();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refreshSession();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshSession]);


  useEffect(() => {
    const handleProfileChange = () => void refreshSession();
    window.addEventListener("smart-library:profile-updated", handleProfileChange);
    return () => window.removeEventListener("smart-library:profile-updated", handleProfileChange);
  }, [refreshSession]);

  return (
    <AuthNav
      variant={variant}
      user={user}
      loading={loading}
      onSignOut={async () => {
        await signOut({ redirect: false });
        setUser(null);
        window.location.assign("/");
      }}
    />
  );
}

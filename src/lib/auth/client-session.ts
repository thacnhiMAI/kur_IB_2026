import { getSession } from "next-auth/react";

let pendingSession: ReturnType<typeof getSession> | undefined;

export function getSharedSession() {
  pendingSession ??= getSession({ broadcast: false }).finally(() => {
    pendingSession = undefined;
  });
  return pendingSession;
}

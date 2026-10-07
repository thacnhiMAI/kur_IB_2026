export type AccessControlledUser = {
  bannedPermanently?: boolean | null;
  bannedUntil?: Date | string | null;
};

export type UserAccessState = {
  blocked: boolean;
  permanent: boolean;
  until: Date | null;
};

export function getUserAccessState(user: AccessControlledUser, now = new Date()): UserAccessState {
  if (user.bannedPermanently) {
    return { blocked: true, permanent: true, until: null };
  }

  const until = user.bannedUntil ? new Date(user.bannedUntil) : null;
  if (until && until.getTime() > now.getTime()) {
    return { blocked: true, permanent: false, until };
  }

  return { blocked: false, permanent: false, until: null };
}

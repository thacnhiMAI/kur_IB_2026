type RoleUser = {
  role?: "USER" | "ADMIN" | string | null;
};

export function canAccessAdmin(user: RoleUser) {
  return user.role === "ADMIN";
}

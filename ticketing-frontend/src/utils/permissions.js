export function can(user, permission) {
  if (!user) return false;

  if (user.is_super_admin === true) {
    return true;
  }

  return (
    Array.isArray(user.permissions) && user.permissions.includes(permission)
  );
}

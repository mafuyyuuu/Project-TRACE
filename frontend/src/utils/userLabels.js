/** Human-readable labels for the \`users.role\` enum. */
export const ROLE_LABELS = {
  student: 'Student',
  clerk: 'Clerk',
  admin: 'Administrator',
};

export const USER_TYPE_LABELS = {
  undergraduate: 'Undergraduate',
  irregular: 'Irregular',
  alumni: 'Alumni',
};

export function getUserLabel(user) {
  if (!user) return 'Unknown';
  if (user.role === 'admin') return 'Administrator';
  if (user.role === 'clerk') return user.desk_assignment ? `${user.desk_assignment} Clerk` : 'Clerk';
  if (user.role === 'student') return USER_TYPE_LABELS[user.user_type] || 'Student';
  return ROLE_LABELS[user.role] || user.role;
}

/** Presentation only. Backend services continue to enforce desk and college scope. */
export const isCollegeOrFinance = user => user?.role === 'clerk' && ['Secretary','Finance'].includes(user.desk_assignment);
export const isSecretary = user => user?.role === 'clerk' && user.desk_assignment === 'Secretary';

export function secretaryPurpose(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return Object.entries(parsed)
      .filter(([, entry]) => entry !== '' && entry !== null && entry !== undefined)
      .map(([key, entry]) => ({ label: key.replaceAll('_', ' '), value: String(entry) }));
  } catch { /* Historical requests may contain plain text. */ }
  return [{ label: 'Purpose', value: String(value) }];
}

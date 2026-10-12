/** Calculate against every filtered staff row before paging or slicing for display. */
export function getWorkloadShares(staff = []) {
  const counts = staff.map(row => {
    const count = Number(row.documents_handled);
    return Number.isFinite(count) && count > 0 ? count : 0;
  });
  const total = counts.reduce((sum, count) => sum + count, 0);
  return staff.map((row, index) => ({
    ...row,
    documents_handled: counts[index],
    // One decimal place is shared by the bar, numeric label and accessible value.
    share: total > 0 ? Math.round((counts[index] / total) * 1000) / 10 : 0,
  }));
}

export function downloadRecoveryCodes(codes) {
  const url = URL.createObjectURL(new Blob([`TRACE single-use recovery codes\nKeep these private and offline.\n\n${codes.join('\n')}\n`], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'trace-recovery-codes.txt'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

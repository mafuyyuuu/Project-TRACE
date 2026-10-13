const { badRequest } = require('./AppError');
function packPattern(input, segment) {
  const serial = typeof input === 'string' ? input.trim() : '';
  if (!serial || serial.length > 100 || !/^[A-Za-z0-9 ._/-]+$/.test(serial)) throw badRequest('Use a serial of at most 100 letters, digits, spaces, dots, slashes, underscores or hyphens.');
  const matches = [...serial.matchAll(/\d+/g)];
  if (!matches.length) throw badRequest('The serial needs a numeric segment to increment.');
  if (matches.length > 1 && (segment === '' || segment === undefined || segment === null)) throw badRequest('Choose the numeric segment to increment; the serial is ambiguous.');
  const selected = segment === '' || segment === undefined || segment === null ? 0 : Number(segment);
  if (!Number.isInteger(selected) || !matches[selected]) throw badRequest('Choose a valid numeric segment.');
  const match = matches[selected], start = BigInt(match[0]);
  if ((start + 49n).toString().length > match[0].length) throw badRequest('The 50th serial exceeds this numeric width. Enter a wider starting segment.');
  const pattern = { prefix: serial.slice(0, match.index), suffix: serial.slice(match.index + match[0].length), start: start.toString(), width: match[0].length, segment: selected };
  const serials = Array.from({ length: 50 }, (_, index) => serialAt(pattern, index));
  if (serials.some(value => value.length > 100)) throw badRequest('Serials exceed the supported length.');
  return { pattern, serials, first: serials.slice(0, 3), last: serials[49], count: 50 };
}
function serialAt(pattern, index) {
  if (!Number.isInteger(index) || index < 0 || index >= 50) throw badRequest('This 50-receipt pack is exhausted.');
  const digits = (BigInt(pattern.start) + BigInt(index)).toString();
  if (digits.length > pattern.width) throw badRequest('The receipt numeric width would overflow.');
  return pattern.prefix + digits.padStart(pattern.width, '0') + pattern.suffix;
}
/** Infer the changing numeric block from two complete paper numbers. */
function packRange(first, last) {
  const end = typeof last === 'string' ? last.trim() : '';
  if (!end || end.length > 100 || !/^[A-Za-z0-9 ._/-]+$/.test(end)) throw badRequest('Enter the complete last issuance number.');
  const start = typeof first === 'string' ? first.trim() : '';
  const matches = [...start.matchAll(/\d+/g)];
  const candidates = [];
  for (let segment = 0; segment < matches.length; segment++) {
    try {
      const candidate = packPattern(start, segment);
      if (candidate.last === end) candidates.push(candidate);
    } catch { /* This numeric block cannot describe a 50-paper range. */ }
  }
  if (candidates.length !== 1) throw badRequest('First and last numbers must cover exactly 50 consecutive receipts, with the same prefix, separators and digit width. For example: 2026-00001 to 2026-00050.');
  return candidates[0];
}
module.exports = { packPattern, packRange, serialAt };

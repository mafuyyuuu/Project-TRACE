/** Receiving Desk is the legacy Window 1 label; preserve stored account labels. */
function canonicalDesk(desk) {
  return desk === 'Receiving Desk' ? 'Window 1' : desk;
}

module.exports = { canonicalDesk };

const tickets = require('./supportTicket.service');
// Database clocks/events, rather than this interval, preserve timeout state.
// Overlap is prevented locally; the settings/ticket locks serialize replicas.
function startTimers() {
  let pending = false, stopped = false, reported = false;
  async function tick() {
    if (pending || stopped) return;
    pending = true;
    try { await tickets.processTimers(); reported = false; }
    catch (error) {
      if (!reported) console.warn('Support timer check unavailable:', error.code || 'INTERNAL_ERROR');
      reported = true;
    } finally { pending = false; }
  }
  const interval = setInterval(tick, 15000); interval.unref();
  void tick();
  return () => { stopped = true; clearInterval(interval); };
}
module.exports = { startTimers };

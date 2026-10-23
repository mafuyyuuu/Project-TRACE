/** Stop accepting work, drain requests, then close database connections. */
function installShutdown({ server, io, pool, stops = [], operations, deadlineMs = 30000, exit = code => process.exit(code), signals = process }) {
  let stopping = false;
  async function stop() {
    if (stopping) return; stopping = true;
    operations.drain();
    for (const end of stops) { try { end(); } catch { /* Continue draining. */ } }
    const deadline = setTimeout(() => exit(1), deadlineMs);
    deadline.unref?.();
    try {
      await new Promise(resolve => {
        if (io) io.close(resolve); else server.close(resolve);
        server.closeIdleConnections?.();
      });
      await pool.end(); clearTimeout(deadline); exit(0);
    } catch { clearTimeout(deadline); exit(1); }
  }
  signals.once('SIGTERM', stop); signals.once('SIGINT', stop);
  return stop;
}
module.exports = { installShutdown };

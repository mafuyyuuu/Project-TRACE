const { pool } = require('../config/db');
const env = require('../config/env');
let draining = false, requests = 0, failures = 0, inflight = 0, totalMs = 0;
function begin() { inflight++; let ended = false; return (status, ms) => { if (ended) return; ended = true; inflight--; requests++; failures += Number(status >= 500); totalMs += ms; }; }
let probe = null, freshUntil = 0, lastError = null;
async function readiness() {
  if (draining) throw new Error('Draining');
  if (freshUntil > Date.now()) { if (lastError) throw lastError; return; }
  if (!probe) {
    probe = (async () => {
      await pool.query('SELECT 1');
      if (env.RATE_LIMIT_STORE === 'mysql') await pool.query('SELECT bucket_key FROM rate_limit_counters LIMIT 0');
    })().then(() => { lastError = null; }, () => { lastError = new Error('Readiness unavailable'); throw lastError; })
      .finally(() => { freshUntil = Date.now() + (env.NODE_ENV === 'test' ? 0 : 2000); probe = null; });
  }
  await probe;
  if (draining) throw new Error('Draining');
}
function snapshot() { return { uptime_seconds: Math.floor(process.uptime()), draining, requests, failures, inflight,
  mean_duration_ms: requests ? Math.round(totalMs / requests) : null, memory_bytes: process.memoryUsage().rss,
  topology: 'single-backend', multi_replica_ready: false }; }
function drain() { draining = true; }
module.exports = { begin, readiness, snapshot, drain, isDraining: () => draining };

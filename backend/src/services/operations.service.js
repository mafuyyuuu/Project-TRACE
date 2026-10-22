const { pool } = require('../config/db');
const env = require('../config/env');
let draining = false, requests = 0, failures = 0, inflight = 0, totalMs = 0;
function begin() { inflight++; let ended = false; return (status, ms) => { if (ended) return; ended = true; inflight--; requests++; failures += Number(status >= 500); totalMs += ms; }; }
async function readiness() {
  if (draining) throw new Error('Draining');
  await pool.query('SELECT 1');
  if (env.RATE_LIMIT_STORE === 'mysql') await pool.query('SELECT bucket_key FROM rate_limit_counters LIMIT 0');
}
function snapshot() { return { uptime_seconds: Math.floor(process.uptime()), draining, requests, failures, inflight,
  mean_duration_ms: requests ? Math.round(totalMs / requests) : null, memory_bytes: process.memoryUsage().rss,
  topology: 'single-backend', multi_replica_ready: false }; }
function drain() { draining = true; }
module.exports = { begin, readiness, snapshot, drain, isDraining: () => draining };

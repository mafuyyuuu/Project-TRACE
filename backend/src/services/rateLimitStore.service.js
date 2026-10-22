const { createHmac } = require('crypto');
const env = require('../config/env');
const model = require('../models/rateLimit.model');
let nextPrune = 0;
class MysqlRateLimitStore {
  constructor(namespace) { this.namespace = namespace; this.localKeys = false; }
  init(options) { this.windowMs = options.windowMs; }
  key(value) { return createHmac('sha256', env.JWT_SECRET).update(`${this.namespace}:${value}`).digest('hex'); }
  async increment(value) {
    try {
      const result = await model.increment(this.key(value), this.windowMs);
      if (Date.now() >= nextPrune) { nextPrune = Date.now() + 60000; model.prune().catch(() => {}); }
      return result;
    } catch { const error = new Error('Request protection is temporarily unavailable.'); error.status = 503; throw error; }
  }
  decrement(value) { return model.decrement(this.key(value)); }
  resetKey(value) { return model.resetKey(this.key(value)); }
}
module.exports = { MysqlRateLimitStore };

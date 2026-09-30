const signupOcr = require('../services/signupOcr.service');
async function extractIdentity(req, res, next) {
  try { res.json(await signupOcr.extractIdentity(req.file)); }
  catch (err) { next(err); }
}
module.exports = { extractIdentity };

const service = require('../services/onboarding.service');
async function start(req, res) {
  try { res.set('Cache-Control', 'no-store').json({ show_guide: await service.start(req.user) }); }
  catch { res.status(500).json({ error: 'Could not check the first-login guide. You can open it using the question mark.' }); }
}
module.exports = { start };

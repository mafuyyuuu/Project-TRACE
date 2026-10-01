const service = require('../services/emailVerification.service');
async function resend(req, res) {
  try {
    const options = req.body?.email === undefined ? {} : { email: req.body.email, current_password: req.body.current_password };
    res.set('Cache-Control', 'no-store').json(await service.issue(req.user.id, options));
  }
  catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not send verification link.' }); }
}
async function confirm(req, res) {
  try { res.set('Cache-Control', 'no-store').json(await service.confirm(req.body?.token)); }
  catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not verify email. Retry later.' }); }
}
module.exports = { resend, confirm };

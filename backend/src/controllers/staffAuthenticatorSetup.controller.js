const service = require('../services/staffAuthenticatorSetup.service');
const trust = require('../services/trustedBrowser.service');
const actions = { issue: req => service.issue(req.user, Number(req.params.id), req.body), start: req => service.start(req.body), confirm: req => service.confirm(req.body) };
module.exports = Object.fromEntries(Object.entries(actions).map(([name, action]) => [name, async (req, res) => {
  try {
    const result = await action(req);
    res.set('Cache-Control', 'no-store');
    if (result.token) res.clearCookie(trust.COOKIE_NAME, trust.COOKIE_OPTIONS);
    res.json(result);
  } catch (error) {
    require('../utils/httpError').sendError(res, error, 'Staff authenticator setup is unavailable. Ask Admin to check configuration and migrations.');
  }
}]));

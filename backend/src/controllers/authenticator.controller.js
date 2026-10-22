const service = require('../services/authenticator.service');
const trust = require('../services/trustedBrowser.service');
const routes = {
  status: req => service.status(req.user.id),
  begin: req => service.begin(req.user, req.body),
  confirm: req => service.confirm(req.user, req.body),
  disable: req => service.change(req.user, req.body, 'disable'),
  regenerate: req => service.change(req.user, req.body, 'regenerate'),
};
module.exports = Object.fromEntries(Object.entries(routes).map(([action, run]) => [action, async (req, res) => {
  try {
    const result = await run(req);
    res.set('Cache-Control', 'no-store');
    if (result.token) res.clearCookie(trust.COOKIE_NAME, trust.COOKIE_OPTIONS);
    res.json(result);
  } catch (error) {
    // Never print secrets, OTPs, request bodies or provisioning URIs.
    require('../utils/httpError').sendError(res, error, 'Could not update authenticator settings. Please retry.');
  }
}]));

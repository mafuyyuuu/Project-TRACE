const service = require('../services/supportMessage.service');
function action(fn) {
  return async (req, res, next) => {
    try { res.set('Cache-Control', 'no-store').json(await fn(req)); }
    catch (error) {
      if (error.status && error.status < 500) return next(error);
      console.error('General support action failed:', error.code || 'INTERNAL_ERROR');
      res.status(500).json({ error: 'Support is temporarily unavailable. Retry when connected or contact the Registrar.' });
    }
  };
}
module.exports = {
  list: action(req => service.list(req.user, req.query.page)),
  read: action(req => service.read(req.user, req.params.studentId)),
  send: action(req => service.send(req.user, req.params.studentId, req.body)),
};

const service = require('../services/internalAssistance.service');
const action = fn => async (req,res,next) => {
  try { res.set('Cache-Control','private, no-store').json(await fn(req)); }
  catch (error) {
    if (error.status && error.status < 500) return next(error);
    console.error('Internal assistance failed:',error.code || 'INTERNAL_ERROR');
    res.status(500).json({error:'Internal assistance is temporarily unavailable. Keep your draft and retry.'});
  }
};
module.exports = {
 markRead:action(req=>service.markRead(req.user,req.params.id,req.body)),
  list:action(req => service.list(req.user,req.query)),read:action(req => service.read(req.user,req.params.id,req.query)),
  create:action(req => service.create(req.user,req.body)),send:action(req => service.send(req.user,req.params.id,req.body)),
  change:action(req => service.action(req.user,req.params.id,req.body)),
};

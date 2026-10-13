const service = require('../services/staffConversation.service');
const action = fn => async(req,res,next) => {
  try {res.set('Cache-Control','private, no-store').json(await fn(req));}
  catch(error) {if (error.status && error.status<500) return next(error);console.error('Staff conversation failed:',error.code || 'INTERNAL_ERROR');res.status(500).json({error:'Staff coordination is temporarily unavailable. Keep your draft and retry.'});}
};
module.exports = {recipients:action(req=>service.recipients(req.user,req.query)),list:action(req=>service.list(req.user,req.query)),read:action(req=>service.read(req.user,req.params.id,req.query)),open:action(req=>service.open(req.user,req.body)),send:action(req=>service.send(req.user,req.params.id,req.body))};

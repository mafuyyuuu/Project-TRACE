const service = require('../services/supportTicket.service');
const faq = require('../services/supportFaq.service');
const supportingDocuments = require('../services/supportingDocument.service');
const {validateFiles,cleanup} = require('../utils/supportUpload');
function action(fn) {
  return async(req,res,next)=>{
    try{res.set('Cache-Control','private, no-store').json(await fn(req));}
    catch(error){if(error.status && error.status<500)return next(error);console.error('Support ticket action failed:',error.code || 'INTERNAL_ERROR');res.status(error.status===503 ? 503 : 500).json({error:'Support is temporarily unavailable. Retry with the same action or contact the Registrar.'});}
  };
}
const send=action(async req=>{
  try {
    await validateFiles(req.files || []);
    const result=await service.send(req.user,req.params.ticketId,req.body,req.files || []);
    if(result.duplicate)await cleanup(req.files || []);
    return {sent:result.sent,duplicate:result.duplicate};
  }catch(error){await cleanup(req.files || []);throw error;}
});
async function uploadAccess(req,res,next){try{await service.assertSendAccess(req.user,req.params.ticketId);next();}catch(error){next(error);}}
module.exports={
 list:action(req=>service.list(req.user,req.query)),read:action(req=>service.read(req.user,req.params.ticketId,req.query)),
 create:action(req=>service.create(req.user,req.body)),send,uploadAccess,
 change:action(req=>service.action(req.user,req.params.ticketId,req.body)),claim:action(req=>service.claim(req.user)),
 settings:action(req=>service.getSettings(req.user)),saveSettings:action(req=>service.saveSettings(req.user,req.body)),
 availability:action(req=>service.setAvailability(req.user,req.body)),
 requirementHistory:action(req=>service.requirementHistory(req.user,req.params.ticketId,req.params.requirementId,req.query.before)),
 context:action(req=>service.resolveContext(req.user,req.query)),
 metrics:action(req=>require('../services/supportReport.service').report(req.user,req.query)),
 catalog:action(req=>supportingDocuments.list(req.user)),saveCatalog:action(req=>supportingDocuments.save(req.user,req.body)),
 faq:action(()=>faq.list()),match:action(req=>({topics:faq.match(req.query.q)})),feedback:action(req=>faq.feedback(req.user,req.params.ticketId,req.body)),
};

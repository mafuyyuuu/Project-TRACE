const service=require('../services/manualFaq.service');
const action=fn=>async(req,res,next)=>{try{res.set('Cache-Control','private, no-store').json(await fn(req));}catch(error){next(error);}};
module.exports={feedback:action(req=>service.feedback(req.user)),record:action(req=>service.record(req.user,req.body))};

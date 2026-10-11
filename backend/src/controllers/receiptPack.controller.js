const fs = require('fs/promises');
const service = require('../services/receiptPack.service');
function handler(action, upload = false) {
  return async (req,res) => {
    try {res.setHeader('Cache-Control','no-store');res.json(await action(req));}
    catch(error) {
      if(upload && req.file?.path)await fs.unlink(req.file.path).catch(()=>{});
      res.status(error.status || 500).json({error:error.status ? error.message : 'Receipt action failed. Retry with the same confirmation or refresh to review.'});
    }
  };
}
module.exports = {
 state:handler(req=>service.state(req.user)),preview:handler(req=>service.preview(req.user,req.body)),
 configure:handler(req=>service.configure(req.user,req.body)),history:handler(req=>service.history(req.user)),
 get:handler(req=>service.get(req.user,req.params.receiptId)),issue:handler(req=>service.issue(req.user,req.params.documentId,req.body)),
 upload:handler(req=>service.upload(req.user,req.params.receiptId,req.file),true),
 print:handler(req=>service.print(req.user,req.params.receiptId,req.body)),
 void:handler(req=>service.voidIssued(req.user,req.params.receiptId,req.body)),savePrint:handler(req=>service.savePrint(req.user,req.body)),
 authorize(req,res,next){try{service.authorize(req.user);next();}catch(error){res.status(error.status).json({error:error.message});}},
};

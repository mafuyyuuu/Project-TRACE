const attachments = require('../models/requestAttachment.model');
const tickets = require('../models/supportTicket.model');
const fs = require('fs/promises');
const path = require('path');
const { UPLOAD_DIR } = require('../middlewares/upload.middleware');
async function archiveCase(documentId, executor) {
  const rows = await attachments.list(documentId,executor);
  if(!rows.length) return;
  for(const row of rows) await attachments.bubble({...row,cancelled:true},executor);
  for(const file of await attachments.uploads(documentId,executor)) {
    const filename=path.basename(file.file_path);
    if(`/uploads/${filename}`!==file.file_path) throw new Error('INVALID_ARCHIVE_FILE_PATH');
    const mime=/\.pdf$/i.test(filename) ? 'application/pdf' : /\.png$/i.test(filename) ? 'image/png' : 'image/jpeg';
    let size=0;
    try { size=(await fs.stat(path.join(UPLOAD_DIR,filename))).size; }
    catch(error) { if(error.code!=='ENOENT') throw error; }
    await tickets.archiveFile(documentId,file.requirement_id,{filename,originalname:file.original_filename,mimetype:mime,size},executor);
  }
}
module.exports = { archiveCase };

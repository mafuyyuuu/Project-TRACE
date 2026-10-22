const { publicError, logError } = require('../utils/httpError');
const filesService = require('../services/files.service');

/** Streams an uploaded file to an authorized caller. */
async function get(req, res) {
  try {
    const fullPath = await filesService.getFilePathForUser(req.user, req.params.filename);
    if (req.params.filename.startsWith('support-') || await require('../models/supportTicket.model').fileOwner(req.params.filename)) {
      const file = await require('../services/supportTicket.service').assertFileRead(req.user,req.params.filename);
      res.set('Cache-Control','private, no-store').set('X-Content-Type-Options','nosniff');
      res.type(file.mime_type).attachment(file.original_name);
    }
    res.sendFile(fullPath);
  } catch (err) {
    logError('File access error', err, res.locals?.requestId);
    const result = publicError(err, 'Failed to retrieve file.');
    res.status(result.status).json({ error: result.message });
  }
}

module.exports = { get };

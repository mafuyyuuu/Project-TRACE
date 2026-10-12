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
    console.error('File access error:', err.message);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Failed to retrieve file.' });
  }
}

module.exports = { get };

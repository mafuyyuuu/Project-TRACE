const filesService = require('../services/files.service');

/** Streams an uploaded file to an authorized caller. */
async function get(req, res) {
  try {
    const fullPath = await filesService.getFilePathForUser(req.user, req.params.filename);
    res.sendFile(fullPath);
  } catch (err) {
    console.error('File access error:', err.message);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Failed to retrieve file.' });
  }
}

module.exports = { get };

const service = require('../services/requestAttachments.service');
async function list(req, res) {
  try { res.setHeader('Cache-Control', 'no-store'); res.json(await service.list(req.user, req.params.id)); }
  catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not load attachment requirements.' }); }
}
const mutate = kind => async (req, res) => {
  try { res.json(await service.mutate(req.user, req.params.id, kind, req.params.requirementId, req.body, req.file)); }
  catch (error) {
    if (req.file?.path) await require('fs').promises.unlink(req.file.path).catch(() => {});
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not save attachment requirement.' });
  }
};
module.exports = { list, request: mutate('request'), upload: mutate('upload'), review: mutate('review') };

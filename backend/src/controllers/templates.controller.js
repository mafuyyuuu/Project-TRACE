const { publicError, logError } = require('../utils/httpError');
const templateModel = require('../models/template.model');
const templateService = require('../services/template.service');

function fail(res, err, logLabel, fallbackMessage) {
  logError(logLabel, err, res.locals?.requestId);
  const result = publicError(err, fallbackMessage);
  res.status(result.status).json({ error: result.message });
}

async function list(req, res) {
  try {
    res.json(await templateModel.list());
  } catch (err) {
    fail(res, err, 'Fetch templates error', 'Failed to fetch templates.');
  }
}

async function getByKey(req, res) {
  try {
    const template = await templateService.get(req.params.key);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (err) {
    fail(res, err, 'Fetch template error', 'Failed to fetch template.');
  }
}

async function update(req, res) {
  try {
    await templateService.update(req.params.key, req.body);
    res.json({ message: 'Template updated successfully.' });
  } catch (err) {
    fail(res, err, 'Update template error', 'Failed to update template.');
  }
}

module.exports = { list, getByKey, update };

const templateModel = require('../models/template.model');
const templateService = require('../services/template.service');

function fail(res, err, logLabel, fallbackMessage) {
  console.error(`${logLabel}:`, err);
  res.status(err.status || 500).json({ error: err.status ? err.message : fallbackMessage });
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

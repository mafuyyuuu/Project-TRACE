const templateModel = require('../models/template.model');

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
    const template = await templateModel.findByKey(req.params.key);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (err) {
    fail(res, err, 'Fetch template error', 'Failed to fetch template.');
  }
}

async function update(req, res) {
  try {
    const { content, font_family, font_size } = req.body;
    await templateModel.update(req.params.key, content, font_family, font_size);
    res.json({ message: 'Template updated successfully.' });
  } catch (err) {
    fail(res, err, 'Update template error', 'Failed to update template.');
  }
}

module.exports = { list, getByKey, update };

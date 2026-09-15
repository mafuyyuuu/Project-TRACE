const gradService = require('../services/gradApplication.service');

/** Thin HTTP layer for /api/grad-applications. */

function fail(res, err, logLabel, fallbackMessage) {
  console.error(`${logLabel}:`, err);
  res.status(err.status || 500).json({ error: err.status ? err.message : fallbackMessage });
}

async function getFormFields(req, res) {
  try {
    res.json(await gradService.getFormFields());
  } catch (err) {
    fail(res, err, 'Fetch grad form fields error', 'Failed to fetch form fields.');
  }
}

async function submit(req, res) {
  try {
    res.status(201).json(await gradService.submitApplication(req.user, req.body));
  } catch (err) {
    fail(res, err, 'Submit grad application error', 'Failed to submit application.');
  }
}

async function listMine(req, res) {
  try {
    res.json(await gradService.listMyApplications(req.user));
  } catch (err) {
    fail(res, err, 'List own grad applications error', 'Failed to fetch applications.');
  }
}

async function list(req, res) {
  try {
    res.json(await gradService.listApplications(req.user, req.query));
  } catch (err) {
    fail(res, err, 'List grad applications error', 'Failed to fetch applications.');
  }
}

async function getOne(req, res) {
  try {
    res.json(await gradService.getApplication(req.user, req.params.id));
  } catch (err) {
    fail(res, err, 'Fetch grad application error', 'Failed to fetch application.');
  }
}

async function review(req, res) {
  try {
    res.json(await gradService.reviewApplication(req.user, req.params.id, req.body));
  } catch (err) {
    fail(res, err, 'Review grad application error', 'Failed to review application.');
  }
}

module.exports = { getFormFields, submit, listMine, list, getOne, review };

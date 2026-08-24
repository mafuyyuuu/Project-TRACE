const documentsService = require('../services/documents.service');

/**
 * Thin HTTP layer for /api/documents. Pipeline logic lives in
 * services/documents.service.js.
 */

function fail(res, err, logLabel, fallbackMessage) {
  console.error(`${logLabel}:`, err);
  res.status(err.status || 500).json({ error: err.status ? err.message : fallbackMessage });
}

async function upload(req, res) {
  try {
    res.status(201).json(await documentsService.uploadDocument(req.user, req.body, req.files));
  } catch (err) {
    fail(res, err, 'Document upload error', 'Failed to upload document.');
  }
}

async function list(req, res) {
  try {
    res.json(await documentsService.listDocuments(req.user, req.query));
  } catch (err) {
    fail(res, err, 'List documents error', 'Failed to retrieve documents.');
  }
}

async function stats(req, res) {
  try {
    res.json(await documentsService.getStats(req.user));
  } catch (err) {
    fail(res, err, 'Stats error', 'Failed to fetch stats.');
  }
}

async function forecast(req, res) {
  try {
    res.json(await documentsService.getForecast());
  } catch (err) {
    fail(res, err, 'Forecast error', 'Failed to fetch forecast.');
  }
}

async function insights(req, res) {
  try {
    res.json(await documentsService.getInsights());
  } catch (err) {
    fail(res, err, 'Insights error', 'Failed to fetch insights.');
  }
}

async function activityLogs(req, res) {
  try {
    res.json(await documentsService.getActivityLogs(req.user));
  } catch (err) {
    fail(res, err, 'Fetch activity logs error', 'Failed to fetch activity logs.');
  }
}

async function track(req, res) {
  try {
    res.json(await documentsService.trackByTrackingNumber(req.params.trackingNumber));
  } catch (err) {
    fail(res, err, 'Track document error', 'Failed to retrieve document tracking info.');
  }
}

async function assign(req, res) {
  try {
    res.json(await documentsService.assignDocument(req.body));
  } catch (err) {
    fail(res, err, 'Assign document error', 'Failed to assign document.');
  }
}

async function action(req, res) {
  try {
    res.json(await documentsService.processAction(req.user, req.params.id, req.body.action));
  } catch (err) {
    fail(res, err, 'Process document error', 'Failed to process document.');
  }
}

async function submitPayment(req, res) {
  try {
    res.json(await documentsService.submitPayment(req.user, req.params.id, req.body, req.file));
  } catch (err) {
    fail(res, err, 'Submit payment error', 'Failed to submit payment.');
  }
}

async function verifyPayment(req, res) {
  try {
    res.json(await documentsService.verifyPayment(req.user, req.params.id, req.body, req.file));
  } catch (err) {
    fail(res, err, 'Verify payment error', 'Failed to process payment verification.');
  }
}

async function evaluate(req, res) {
  try {
    res.json(await documentsService.evaluateDocument(req.user, req.params.id, req.body));
  } catch (err) {
    fail(res, err, 'Evaluate document error', 'Failed to evaluate document.');
  }
}

async function release(req, res) {
  try {
    res.json(await documentsService.releaseDocument(req.user, req.params.id));
  } catch (err) {
    fail(res, err, 'Release document error', 'Failed to release document.');
  }
}

async function cancel(req, res) {
  try {
    res.json(await documentsService.cancelDocument(req.user, req.params.id));
  } catch (err) {
    fail(res, err, 'Cancel document error', 'Failed to cancel document.');
  }
}

module.exports = {
  upload,
  list,
  stats,
  forecast,
  insights,
  activityLogs,
  track,
  assign,
  action,
  submitPayment,
  verifyPayment,
  evaluate,
  release,
  cancel,
};

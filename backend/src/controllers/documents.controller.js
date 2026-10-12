const documentsService = require('../services/documents.service');
const assignments = require('../services/requestAssignment.service');

async function detail(req, res) {
  try { res.json(await documentsService.requestDetail(req.user, req.params.id)); }
  catch (err) { fail(res, err, 'Request detail error', 'Failed to load request.'); }
}
async function assignmentContext(req, res) {
  try { res.json(await assignments.context(req.user, req.params.id)); }
  catch (err) { fail(res, err, 'Assignment context error', 'Failed to load assignment.'); }
}
async function reassign(req, res) {
  try { res.json(await assignments.reassign(req.user, req.params.id, req.body)); }
  catch (err) { fail(res, err, 'Request reassignment error', 'Failed to reassign request.'); }
}
async function reconcileCollege(req, res) {
  try { res.json(await assignments.reconcileCollege(req.user, req.params.id, req.body)); }
  catch (err) { fail(res, err, 'College reconciliation error', 'Failed to reconcile college.'); }
}

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
    res.json(await documentsService.getInsights(req.user));
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

async function intake(req, res) {
  try {
    res.json(await documentsService.intakeDocument(req.user, req.params.id, req.body, req.file));
  } catch (err) {
    fail(res, err, 'Intake error', 'Failed to process intake.');
  }
}

async function accept(req, res) {
  try {
    res.json(await documentsService.acceptForProcessing(req.user, req.params.id, req.body));
  } catch (err) {
    fail(res, err, 'Evaluate document error', 'Failed to evaluate document.');
  }
}

async function price(req, res) {
  try {
    res.json(await documentsService.priceDocument(req.user, req.params.id, req.body));
  } catch (err) {
    fail(res, err, 'Price document error', 'Failed to price document.');
  }
}

async function scanReceipt(req, res) {
  try {
    res.json(await documentsService.scanReceipt(req.user, req.file));
  } catch (err) {
    fail(res, err, 'Receipt scan error', 'Failed to read the receipt.');
  }
}

async function logWalkInPayment(req, res) {
  try {
    res.json(await documentsService.logWalkInPayment(req.user, req.params.id, req.body, req.file));
  } catch (err) {
    fail(res, err, 'Walk-in payment error', 'Failed to log counter payment.');
  }
}

async function verifyOfficialReceipt(req, res) {
  try {
    res.json(await documentsService.verifyOfficialReceipt(req.user, req.params.id, req.body));
  } catch (err) {
    fail(res, err, 'OR verification error', 'Failed to verify the Official Receipt.');
  }
}

async function handoff(req, res) {
  try {
    res.json(await documentsService.confirmHandoff(req.user, req.params.id, req.body));
  } catch (err) {
    fail(res, err, 'Handoff error', 'Failed to record handoff.');
  }
}

async function release(req, res) {
  try {
    res.json(await documentsService.releaseDocument(req.user, req.params.id, req.body));
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


async function uploadDeferredOR(req, res) {
  try { res.json(await documentsService.uploadDeferredOR(req.user, req.params.id, req.file, req.body)); }
  catch (err) { fail(res, err, 'OR upload error', 'Could not publish the Official Receipt.'); }
}

async function getMessages(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await documentsService.getMessages(req.user, req.params.id));
  } catch (err) {
    fail(res, err, 'Fetch messages error', 'Failed to fetch messages.');
  }
}

async function messageThreads(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await documentsService.messageThreads(req.user, req.query));
  } catch (err) {
    fail(res, err, 'Fetch message threads error', 'Failed to fetch conversations.');
  }
}

async function sendMessage(req, res) {
  try {
    res.status(201).json(await documentsService.sendMessage(req.user, req.params.id, req.body));
  } catch (err) {
    fail(res, err, 'Send message error', 'Failed to send message.');
  }
}

module.exports = {
  detail, assignmentContext, reassign, reconcileCollege,
  messageThreads,
  getMessages,
  sendMessage,
  uploadDeferredOR,
  upload,
  list,
  stats,
  forecast,
  insights,
  activityLogs,
  track,
  assign,
  submitPayment,
  verifyPayment,
  intake,
  accept,
  price,
  scanReceipt,
  logWalkInPayment,
  verifyOfficialReceipt,
  handoff,
  release,
  cancel,
};

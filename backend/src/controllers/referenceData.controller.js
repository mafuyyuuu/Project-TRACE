const { publicError, logError } = require('../utils/httpError');
const referenceService = require('../services/referenceData.service');

/** Thin HTTP layer for /api/reference. */

function fail(res, err, logLabel, fallbackMessage) {
  logError(logLabel, err, res.locals?.requestId);
  const result = publicError(err, fallbackMessage);
  res.status(result.status).json({ error: result.message });
}

/** Inactive entries are only ever exposed to staff maintaining the lists. */
function wantsInactive(req) {
  return req.query.includeInactive === 'true' && req.user && req.user.role !== 'student';
}

async function getColleges(req, res) {
  try {
    res.json(await referenceService.listColleges({ includeInactive: wantsInactive(req) }));
  } catch (err) {
    fail(res, err, 'List colleges error', 'Failed to fetch colleges.');
  }
}

async function getDocumentTypes(req, res) {
  try {
    res.json(await referenceService.listDocumentTypes({ includeInactive: wantsInactive(req), user: req.user }));
  } catch (err) {
    fail(res, err, 'List document types error', 'Failed to fetch document types.');
  }
}

async function getPaymentMethods(req, res) {
  try {
    res.json(await referenceService.listPaymentMethods({ includeInactive: wantsInactive(req) }));
  } catch (err) {
    fail(res, err, 'List payment methods error', 'Failed to fetch payment methods.');
  }
}

async function getPrograms(req, res) {
  try { res.json(await referenceService.listPrograms()); }
  catch (err) { fail(res, err, 'List programs error', 'Failed to fetch programs.'); }
}

module.exports = { getPrograms, getColleges, getDocumentTypes, getPaymentMethods };

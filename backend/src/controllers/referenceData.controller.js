const referenceService = require('../services/referenceData.service');

/** Thin HTTP layer for /api/reference. */

function fail(res, err, logLabel, fallbackMessage) {
  console.error(`${logLabel}:`, err);
  res.status(err.status || 500).json({ error: err.status ? err.message : fallbackMessage });
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
    res.json(await referenceService.listDocumentTypes({ includeInactive: wantsInactive(req) }));
  } catch (err) {
    fail(res, err, 'List document types error', 'Failed to fetch document types.');
  }
}

module.exports = { getColleges, getDocumentTypes };

const maintenanceService = require('../services/maintenance.service');

/** Thin HTTP layer for /api/maintenance (admin CRUD). */

function fail(res, err, logLabel, fallbackMessage) {
  console.error(`${logLabel}:`, err);
  res.status(err.status || 500).json({ error: err.status ? err.message : fallbackMessage });
}

/**
 * Wrap a service call so each handler stays one line.
 * `status` is the success code (201 for creates).
 */
function handler(fn, { logLabel, fallback, status = 200 }) {
  return async (req, res) => {
    try {
      res.status(status).json(await fn(req));
    } catch (err) {
      fail(res, err, logLabel, fallback);
    }
  };
}

// -- Colleges ---------------------------------------------------------------
const listColleges = handler((req) => maintenanceService.listColleges(req.user), {
  logLabel: 'List colleges error', fallback: 'Failed to fetch colleges.',
});
const createCollege = handler((req) => maintenanceService.createCollege(req.user, req.body), {
  logLabel: 'Create college error', fallback: 'Failed to create college.', status: 201,
});
const updateCollege = handler((req) => maintenanceService.updateCollege(req.user, req.params.id, req.body), {
  logLabel: 'Update college error', fallback: 'Failed to update college.',
});
const setCollegeActive = handler(
  (req) => maintenanceService.setCollegeActive(req.user, req.params.id, req.body.is_active),
  { logLabel: 'Toggle college error', fallback: 'Failed to update college status.' }
);

// -- Document types ---------------------------------------------------------
const listDocumentTypes = handler((req) => maintenanceService.listDocumentTypes(req.user), {
  logLabel: 'List document types error', fallback: 'Failed to fetch document types.',
});
const createDocumentType = handler((req) => maintenanceService.createDocumentType(req.user, req.body), {
  logLabel: 'Create document type error', fallback: 'Failed to create document type.', status: 201,
});
const updateDocumentType = handler(
  (req) => maintenanceService.updateDocumentType(req.user, req.params.id, req.body),
  { logLabel: 'Update document type error', fallback: 'Failed to update document type.' }
);
const setDocumentTypeActive = handler(
  (req) => maintenanceService.setDocumentTypeActive(req.user, req.params.id, req.body.is_active),
  { logLabel: 'Toggle document type error', fallback: 'Failed to update document type status.' }
);

// -- Staff ------------------------------------------------------------------
const listStaff = handler((req) => maintenanceService.listStaff(req.user), {
  logLabel: 'List staff error', fallback: 'Failed to fetch staff.',
});
const createStaff = handler((req) => maintenanceService.createStaff(req.user, req.body), {
  logLabel: 'Create staff error', fallback: 'Failed to create staff account.', status: 201,
});
const updateStaff = handler((req) => maintenanceService.updateStaff(req.user, req.params.id, req.body), {
  logLabel: 'Update staff error', fallback: 'Failed to update staff account.',
});
const setStaffActive = handler(
  (req) => maintenanceService.setStaffActive(req.user, req.params.id, req.body.is_active),
  { logLabel: 'Toggle staff error', fallback: 'Failed to update staff status.' }
);

module.exports = {
  listColleges, createCollege, updateCollege, setCollegeActive,
  listDocumentTypes, createDocumentType, updateDocumentType, setDocumentTypeActive,
  listStaff, createStaff, updateStaff, setStaffActive,
};

import { useState, useEffect, useCallback } from 'react';
import * as maintenanceService from '@/services/maintenanceService';

/**
 * Admin Maintenance module: staff, document types and colleges.
 *
 * "Delete" is a deactivation throughout — see maintenanceService. The hook
 * exposes one uniform shape per entity so the UI can render three near-identical
 * tables without three sets of handlers.
 */
export default function useMaintenance(user, currentTab) {
  const [staff, setStaff] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [colleges, setColleges] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isActive = user?.role === 'admin' && currentTab === 'admin-maintenance';

  const load = useCallback(async () => {
    try {
      const [s, d, c] = await Promise.allSettled([
        maintenanceService.getStaff(),
        maintenanceService.getDocumentTypes(),
        maintenanceService.getColleges(),
      ]);
      if (s.status === 'fulfilled') setStaff(s.value.staff || []);
      if (d.status === 'fulfilled') setDocumentTypes(d.value.document_types || []);
      if (c.status === 'fulfilled') setColleges(c.value.colleges || []);
      if ([s, d, c].some((r) => r.status === 'rejected')) {
        setError('Some maintenance data could not be loaded.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isActive) load();
  }, [isActive, load]);

  const notify = useCallback((message, isError = false) => {
    if (isError) {
      setError(message);
      setTimeout(() => setError(''), 5000);
    } else {
      setSuccess(message);
      setTimeout(() => setSuccess(''), 4000);
    }
  }, []);

  /** Runs a mutation, surfaces the server's message, and refreshes the tables. */
  const run = useCallback(
    async (fn, fallbackError) => {
      setSaving(true);
      try {
        const res = await fn();
        notify(res.message || 'Saved.');
        await load();
        return true;
      } catch (err) {
        notify(err.response?.data?.error || fallbackError, true);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [notify, load]
  );

  return {
    staff, documentTypes, colleges,
    loading, saving, error, success,
    reload: load,

    // Staff
    createStaff: (payload) => run(() => maintenanceService.createStaff(payload), 'Failed to create staff account.'),
    updateStaff: (id, payload) => run(() => maintenanceService.updateStaff(id, payload), 'Failed to update staff account.'),
    setStaffActive: (id, active) => run(() => maintenanceService.setStaffActive(id, active), 'Failed to update staff status.'),

    // Document types
    createDocumentType: (payload) => run(() => maintenanceService.createDocumentType(payload), 'Failed to create document type.'),
    updateDocumentType: (id, payload) => run(() => maintenanceService.updateDocumentType(id, payload), 'Failed to update document type.'),
    setDocumentTypeActive: (id, active) => run(() => maintenanceService.setDocumentTypeActive(id, active), 'Failed to update document type.'),

    // Colleges
    createCollege: (payload) => run(() => maintenanceService.createCollege(payload), 'Failed to create college.'),
    updateCollege: (id, payload) => run(() => maintenanceService.updateCollege(id, payload), 'Failed to update college.'),
    setCollegeActive: (id, active) => run(() => maintenanceService.setCollegeActive(id, active), 'Failed to update college.'),
  };
}

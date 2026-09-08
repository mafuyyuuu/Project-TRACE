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
  const [paymentMethods, setPaymentMethods] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Card-grid modal state: detail and edit are separate flags so "Edit User"
  // can open the edit modal without tearing down the detail modal beneath it.
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [addingUser, setAddingUser] = useState(false);

  // A pending deactivate/restore staged for confirmation, or null when closed.
  // { kind: 'staff'|'documentType'|'college'|'paymentMethod', id, label, active }
  const [activeToggleToConfirm, setActiveToggleToConfirm] = useState(null);

  const isActive = user?.role === 'admin' && currentTab === 'admin-maintenance';

  const load = useCallback(async () => {
    try {
      const [s, d, c, p] = await Promise.allSettled([
        maintenanceService.getStaff(),
        maintenanceService.getDocumentTypes(),
        maintenanceService.getColleges(),
        maintenanceService.getPaymentMethods(),
      ]);
      if (s.status === 'fulfilled') setStaff(s.value.staff || []);
      if (d.status === 'fulfilled') setDocumentTypes(d.value.document_types || []);
      if (c.status === 'fulfilled') setColleges(c.value.colleges || []);
      if (p.status === 'fulfilled') setPaymentMethods(p.value.payment_methods || []);
      if ([s, d, c, p].some((r) => r.status === 'rejected')) {
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

  const updateStaff = useCallback(
    (id, payload) => run(() => maintenanceService.updateStaff(id, payload), 'Failed to update staff account.'),
    [run]
  );
  const setStaffActive = useCallback(
    (id, active) => run(() => maintenanceService.setStaffActive(id, active), 'Failed to update staff status.'),
    [run]
  );
  const setDocumentTypeActive = useCallback(
    (id, active) => run(() => maintenanceService.setDocumentTypeActive(id, active), 'Failed to update document type.'),
    [run]
  );
  const setCollegeActive = useCallback(
    (id, active) => run(() => maintenanceService.setCollegeActive(id, active), 'Failed to update college.'),
    [run]
  );
  const setPaymentMethodActive = useCallback(
    (id, active) => run(() => maintenanceService.setPaymentMethodActive(id, active), 'Failed to update payment method.'),
    [run]
  );

  /** Stage a staff deactivate/restore for confirmation. */
  const handleToggleActive = useCallback((u) => {
    setActiveToggleToConfirm({ kind: 'staff', id: u.id, label: u.full_name, active: u.is_active });
  }, []);

  /** Stage a document type deactivate/restore for confirmation. */
  const handleToggleDocumentTypeActive = useCallback((d) => {
    setActiveToggleToConfirm({ kind: 'documentType', id: d.id, label: d.name, active: d.is_active });
  }, []);

  /** Stage a college deactivate/restore for confirmation. */
  const handleToggleCollegeActive = useCallback((c) => {
    setActiveToggleToConfirm({ kind: 'college', id: c.id, label: c.name, active: c.is_active });
  }, []);

  /** Stage a payment method deactivate/restore for confirmation. */
  const handleTogglePaymentMethodActive = useCallback((p) => {
    setActiveToggleToConfirm({ kind: 'paymentMethod', id: p.id, label: p.name, active: p.is_active });
  }, []);

  /** Runs whichever entity's toggle was staged, then patches the still-open detail modal in place for staff. */
  const confirmActiveToggle = useCallback(async () => {
    if (!activeToggleToConfirm) return;
    const { kind, id, active } = activeToggleToConfirm;

    const toggleFn = {
      staff: setStaffActive,
      documentType: setDocumentTypeActive,
      college: setCollegeActive,
      paymentMethod: setPaymentMethodActive,
    }[kind];

    const ok = await toggleFn(id, !active);
    if (ok) {
      if (kind === 'staff') {
        setSelectedUser((prev) => (prev && prev.id === id ? { ...prev, is_active: !active } : prev));
      }
      setActiveToggleToConfirm(null);
    }
  }, [activeToggleToConfirm, setStaffActive, setDocumentTypeActive, setCollegeActive, setPaymentMethodActive]);

  const cancelActiveToggle = useCallback(() => {
    setActiveToggleToConfirm(null);
  }, []);

  const handleSaveEdit = useCallback(
    async (id, payload) => {
      const ok = await updateStaff(id, payload);
      if (ok) setEditingUser(null);
      return ok;
    },
    [updateStaff]
  );

  return {
    staff, documentTypes, colleges, paymentMethods,
    loading, saving, error, success,
    reload: load,

    selectedUser, setSelectedUser,
    editingUser, setEditingUser,
    addingUser, setAddingUser,
    handleToggleActive,
    handleToggleDocumentTypeActive,
    handleToggleCollegeActive,
    handleTogglePaymentMethodActive,
    activeToggleToConfirm,
    confirmActiveToggle,
    cancelActiveToggle,
    handleSaveEdit,

    // Staff
    createStaff: (payload) => run(() => maintenanceService.createStaff(payload), 'Failed to create staff account.'),
    updateStaff,
    setStaffActive,

    // Document types
    createDocumentType: (payload) => run(() => maintenanceService.createDocumentType(payload), 'Failed to create document type.'),
    updateDocumentType: (id, payload) => run(() => maintenanceService.updateDocumentType(id, payload), 'Failed to update document type.'),
    setDocumentTypeActive,

    // Colleges
    createCollege: (payload) => run(() => maintenanceService.createCollege(payload), 'Failed to create college.'),
    updateCollege: (id, payload) => run(() => maintenanceService.updateCollege(id, payload), 'Failed to update college.'),
    setCollegeActive,

    // Payment methods
    createPaymentMethod: (payload) => run(() => maintenanceService.createPaymentMethod(payload), 'Failed to create payment method.'),
    updatePaymentMethod: (id, payload) => run(() => maintenanceService.updatePaymentMethod(id, payload), 'Failed to update payment method.'),
    setPaymentMethodActive,
  };
}

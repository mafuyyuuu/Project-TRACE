import useDataRefresh from '@/hooks/useDataRefresh';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getUsers } from '@/services/authService';
import * as maintenanceService from '@/services/maintenanceService';
import { getSupportingDocuments } from '@/services/supportTicketsService';

/**
 * Admin Maintenance module: staff, document types and colleges.
 *
 * "Delete" is a deactivation throughout — see maintenanceService. The hook
 * exposes one uniform shape per entity so the UI can render three near-identical
 * tables without three sets of handlers.
 */
export default function useMaintenance(user, currentTab) {
  const requestVersion = useRef(0);
  useEffect(() => () => { requestVersion.current += 1; }, []);
  const [accounts, setAccounts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [catalogCounts,setCatalogCounts] = useState({programs:null,supportingDocuments:null});

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

  const isActive = user?.role === 'admin' && ['admin-maintenance', 'admin-users'].includes(currentTab);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const [s, d, c, p, a, programs, supporting] = await Promise.allSettled([
        maintenanceService.getStaff(),
        maintenanceService.getDocumentTypes(),
        maintenanceService.getColleges(),
        maintenanceService.getPaymentMethods(),
        getUsers(),
        maintenanceService.getPrograms(),
        getSupportingDocuments(),
      ]);
      if (version !== requestVersion.current) return;
      if (a.status === 'fulfilled') {
        const fresh = a.value.users || [];
        setAccounts(fresh);
        setSelectedUser(current => current ? fresh.find(row => Number(row.id) === Number(current.id)) || current : null);
      }
      if (s.status === 'fulfilled') setStaff(s.value.staff || []);
      if (d.status === 'fulfilled') setDocumentTypes(d.value.document_types || []);
      if (c.status === 'fulfilled') setColleges(c.value.colleges || []);
      if (p.status === 'fulfilled') setPaymentMethods(p.value.payment_methods || []);
      setCatalogCounts(current => ({
        programs:programs.status === 'fulfilled' && Array.isArray(programs.value?.programs) ? programs.value.programs.length : current.programs,
        supportingDocuments:supporting.status === 'fulfilled' && Array.isArray(supporting.value) ? supporting.value.length : current.supportingDocuments,
      }));
      if ([s, d, c, p, a].some((r) => r.status === 'rejected')) {
        setError('Some maintenance data could not be loaded.');
      }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isActive) load();
  }, [isActive, load]);

  useDataRefresh(["accounts", "reference"], load, isActive);

  const notify = useCallback((message, isError = false) => {
    if (isError) {
      setError(message);
      setSuccess('');
    } else {
      setSuccess(message);
      setError('');
    }
  }, []);

  const dismissNotification = useCallback(() => {
    setSuccess('');
    setError('');
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

  /** Stage an account deactivate/restore for confirmation. */
  const handleToggleActive = useCallback((u) => {
    setActiveToggleToConfirm({ kind: u.role==='student'?'student':'staff', id: u.id, label: u.full_name, active: u.is_active });
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

  /** Runs the staged toggle, then patches the still-open account detail modal. */
  const confirmActiveToggle = useCallback(async () => {
    if (!activeToggleToConfirm) return;
    const { kind, id, active } = activeToggleToConfirm;

    const toggleFn = {
      staff: setStaffActive,
      student: (id,active)=>run(()=>maintenanceService.setAccountActive(id,active),'Failed to update account status.'),
      documentType: setDocumentTypeActive,
      college: setCollegeActive,
      paymentMethod: setPaymentMethodActive,
    }[kind];

    const ok = await toggleFn(id, !active);
    if (ok) {
      if (kind === 'staff' || kind === 'student') {
        setSelectedUser((prev) => (prev && prev.id === id ? { ...prev, is_active: !active } : prev));
      }
      setActiveToggleToConfirm(null);
    }
  }, [activeToggleToConfirm, setStaffActive, setDocumentTypeActive, setCollegeActive, setPaymentMethodActive, run]);

  const cancelActiveToggle = useCallback(() => {
    setActiveToggleToConfirm(null);
  }, []);

  const handleSaveEdit = useCallback(
    async (id, payload) => {
      const { password, ...profile } = payload;
      const ok = Object.keys(profile).length ? await run(() => maintenanceService.updateAccount(id, profile), 'Failed to update account.') : true;
      if (ok && password && !(await updateStaff(id, { password }))) return false;
      if (ok) setEditingUser(null);
      return ok;
    },
    [updateStaff, run]
  );

  return {
    accounts, staff, documentTypes, colleges, paymentMethods, catalogCounts,
    loading, saving, error, success,
    dismissNotification,
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

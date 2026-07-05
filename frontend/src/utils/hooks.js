import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, login as apiLogin, register as apiRegister, getDocuments, processDocument, uploadDocument } from '../services/api';

/**
 * Hook for managing Authentication state
 */
export function useAuth() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('trace_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getMe();
        const userData = data.user || data;
        setUser(userData);
        localStorage.setItem('trace_user', JSON.stringify(userData));
      } catch {
        // Interceptor handles 401 and clears storage
      } finally {
        setLoading(false);
      }
    };
    
    if (localStorage.getItem('trace_token')) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiLogin(credentials);
      localStorage.setItem('trace_token', data.token);
      if (data.user) {
        localStorage.setItem('trace_user', JSON.stringify(data.user));
        setUser(data.user);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('trace_token');
    localStorage.removeItem('trace_user');
    setUser(null);
    navigate('/');
  };

  const register = async (credentials) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRegister(credentials);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Registration failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, error, login, logout, register, setUser };
}

/**
 * Hook for managing the Document Queue
 */
export function useDocuments(initialLimit = 5) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchDocuments = useCallback(async (currentPage = page) => {
    try {
      setLoading(true);
      const data = await getDocuments(currentPage, initialLimit);
      setDocuments(data.documents || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      setError('Failed to load queue. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [page, initialLimit]);

  useEffect(() => {
    fetchDocuments(page);
  }, [fetchDocuments, page]);

  const handleAction = async (id, action) => {
    try {
      await processDocument(id, action);
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || `Failed to ${action} document.`);
    }
  };

  // Optimizing derived data using useMemo (per CODING_PREFERENCES guidelines)
  const stats = useMemo(() => {
    if (documents.length === 0) return { approvedPercentage: 0, pendingPercentage: 0 };
    
    const approved = documents.filter(d => d.current_status === 'approved').length;
    const pending = documents.filter(d => ['submitted', 'processing'].includes(d.current_status)).length;
    
    return {
      approvedPercentage: Math.round((approved / documents.length) * 100) || 0,
      pendingPercentage: Math.round((pending / documents.length) * 100) || 0,
    };
  }, [documents]);

  return { 
    documents, loading, error, page, setPage, totalPages, total, 
    handleAction, fetchDocuments, stats 
  };
}

/**
 * Hook for managing Document Upload
 */
export function useDocumentUpload() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const submitUpload = async (file, documentType, studentId, studentName) => {
    if (!file || !documentType || !studentId.trim() || !studentName.trim()) {
      setError('Please fill out all fields and select a file.');
      return false;
    }
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('document_type', documentType);
      formData.append('student_id', studentId.trim());
      formData.append('student_name', studentName.trim());
      
      const data = await uploadDocument(formData);
      setResult(data);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Upload failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError('');
  };

  return { submitUpload, loading, error, result, reset };
}

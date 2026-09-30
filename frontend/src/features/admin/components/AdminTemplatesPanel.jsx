import { INPUT_LIMITS } from '@/utils/inputLimits';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useState, useEffect } from 'react';
import api from '@/services/api';

export default function AdminTemplatesPanel() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState(null);
  
  const [formData, setFormData] = useState({ content: '', font_family: 'sans-serif', font_size: '12px' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [templateToConfirm, setTemplateToConfirm] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [listRetry, setListRetry] = useState(0);
  const [detailRetry, setDetailRetry] = useState(0);
  const [templateDetails, setTemplateDetails] = useState(null);
  const detailsLoading = selectedKey && templateDetails?.key !== selectedKey;
  const detailError = templateDetails?.key === selectedKey ? templateDetails.error : '';

  useEffect(() => {
    let active = true;
    async function fetchTemplates() {
      try {
        const res = await api.get('/templates');
        if (!active) return;
        setTemplates(res.data);
        setSelectedKey(current => current || res.data[0]?.template_key || null);
      } catch {
        if (active) setLoadError('Could not load templates. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchTemplates();
    return () => { active = false; };
  }, [listRetry]);

  useEffect(() => {
    if (!selectedKey) return;
    let active = true;
    async function fetchTemplateDetails() {
      try {
        const res = await api.get(`/templates/${selectedKey}`);
        if (!active) return;
        setFormData({
          content: res.data.content || '',
          font_family: res.data.font_family || 'sans-serif',
          font_size: res.data.font_size || '12px'
        });
        setTemplateDetails({ key: selectedKey });
        setSuccess('');
      } catch {
        if (active) setTemplateDetails({ key: selectedKey, error: 'Could not load this template. Please try again.' });
      }
    }
    fetchTemplateDetails();
    return () => { active = false; };
  }, [selectedKey, detailRetry]);

  // Preview only: no scripts, app-origin access or remote resources. Stored HTML is unchanged.
  const previewFont = ['sans-serif', 'serif', 'monospace', 'Arial, Helvetica, sans-serif', "'Times New Roman', Times, serif"].includes(formData.font_family)
    ? formData.font_family : 'sans-serif';
  const previewSize = ['10px', '11px', '12px', '14px', '16px'].includes(formData.font_size)
    ? formData.font_size : '12px';
  const previewContent = formData.content
    .replace(/{{STUDENT_NAME}}/g, 'Juan Dela Cruz')
    .replace(/{{STUDENT_ID}}/g, 'STU-2024-001')
    .replace(/{{DOCUMENT_TYPE}}/g, 'Transcript of Records')
    .replace(/{{OR_NUMBER}}/g, 'OR-998877')
    .replace(/{{AMOUNT}}/g, 'P150.00');
  const previewDocument = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><style>body{margin:0;padding:24px;color:#111827;background:white;font-family:${previewFont};font-size:${previewSize};overflow-wrap:anywhere}</style></head><body>${previewContent}</body></html>`;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedKey || detailsLoading || detailError || saving) return;
    setSaveError('');
    setTemplateToConfirm({ key: selectedKey, payload: { ...formData } });
  };

  const confirmSave = async () => {
    if (!templateToConfirm) return;
    setSaveError('');
    setSaving(true);
    setSuccess('');
    try {
      await api.put(`/templates/${templateToConfirm.key}`, templateToConfirm.payload);
      setSuccess('Template saved successfully!');
      setTemplateToConfirm(null);
    } catch (err) {
      console.error(err);
      setSaveError(err.response?.data?.error || 'Could not save the template. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div role="status" className="p-8 text-center text-gray-500 dark:text-gray-400">Loading templates...</div>;
  if (loadError) return (
    <div className="space-y-4 rounded-3xl bg-white dark:bg-gray-900 p-8">
      <h3 className="font-bold text-gray-900 dark:text-gray-100">System Templates</h3>
      <p role="alert" className="text-sm text-red-600 dark:text-red-300">{loadError}</p>
      <button type="button" onClick={() => { setLoading(true); setLoadError(''); setListRetry(value => value + 1); }}
        className="rounded-xl bg-[#15803d] px-4 py-2 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803d]">
        Retry loading templates
      </button>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
      <ConfirmDialog open={!!templateToConfirm} title="Confirm Template Save"
        message={['Save this template?', saveError ? <span role="alert">{saveError}</span> : null]}
        confirmLabel="Save Template" loading={saving} onConfirm={confirmSave}
        onCancel={() => setTemplateToConfirm(null)} />
      {/* Sidebar List */}
      <div className="w-full md:w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shrink-0">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">System Templates</h3>
        </div>
        <ul className="py-2">
          {templates.map(t => (
            <li key={t.template_key}>
              <button
                type="button"
                disabled={saving}
                onClick={() => setSelectedKey(t.template_key)}
                className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#15803d] disabled:opacity-50 ${selectedKey === t.template_key ? 'bg-white dark:bg-gray-900 text-[#15803d] dark:text-green-300 border-l-4 border-[#15803d]' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border-l-4 border-transparent'}`}
              >
                {t.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Editor */}
      <div className="min-w-0 flex-1 flex flex-col">
        {detailsLoading ? (
          <div role="status" className="p-8 text-center text-gray-500 dark:text-gray-400">Loading template...</div>
        ) : detailError ? (
          <div className="space-y-4 p-8">
            <p role="alert" className="text-sm text-red-600 dark:text-red-300">{detailError}</p>
            <button type="button" onClick={() => { setTemplateDetails(null); setDetailRetry(value => value + 1); }}
              className="rounded-xl bg-[#15803d] px-4 py-2 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803d]">
              Retry loading template
            </button>
          </div>
        ) : selectedKey ? (
          <form onSubmit={handleSave} className="flex-1 flex flex-col h-full">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-900">
              <div className="flex gap-4 items-center">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">Font Family</label>
                  <select
                    value={formData.font_family}
                    onChange={e => setFormData({...formData, font_family: e.target.value})}
                    className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none"
                  >
                    <option value="sans-serif">Sans Serif</option>
                    <option value="serif">Serif</option>
                    <option value="monospace">Monospace</option>
                    <option value="Arial, Helvetica, sans-serif">Arial</option>
                    <option value="'Times New Roman', Times, serif">Times New Roman</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">Base Font Size</label>
                  <select
                    value={formData.font_size}
                    onChange={e => setFormData({...formData, font_size: e.target.value})}
                    className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none"
                  >
                    <option value="10px">10px</option>
                    <option value="11px">11px</option>
                    <option value="12px">12px (Default)</option>
                    <option value="14px">14px</option>
                    <option value="16px">16px</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {success && <span className="text-xs font-bold text-[#15803d] dark:text-green-300 animate-fade-in">{success}</span>}
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#15803d] hover:bg-[#166534] text-white px-6 py-2 rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 transition-all"
                >
                  {saving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
            
            <div className="flex-1 min-w-0 p-4 bg-gray-50 dark:bg-gray-800 flex flex-col lg:flex-row gap-4">
              <div className="flex-1 flex flex-col">
                <label htmlFor="admin-template-content" className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-2">HTML Template (Use {'{{VARIABLE_NAME}}'})</label>
                <textarea id="admin-template-content" maxLength={INPUT_LIMITS.template}
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                  className="flex-1 w-full font-mono text-xs p-4 bg-gray-900 dark:bg-gray-800 text-green-400 dark:text-green-300 rounded-xl outline-none focus:ring-2 focus:ring-[#15803d] resize-none"
                  placeholder="<div><h1>{{STUDENT_NAME}}</h1></div>"
                />
              </div>
              
              <div className="w-full lg:w-1/3 flex flex-col">
                <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-2">Live Preview (Mock Data)</label>
                <iframe
                  title="Template preview"
                  sandbox=""
                  referrerPolicy="no-referrer"
                  srcDoc={previewDocument}
                  className="min-h-80 flex-1 w-full bg-white text-gray-900 border border-gray-200 rounded-xl shadow-inner [color-scheme:light]"
                />
              </div>
            </div>
          </form>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-gray-400 dark:text-gray-400 font-semibold">No templates are configured.</div>
        )}
      </div>
    </div>
  );
}

import { INPUT_LIMITS } from '@/utils/inputLimits';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useState, useEffect } from 'react';
import { getTemplates, getTemplate, saveTemplate } from '@/services/templateService';

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
    const controller = new AbortController();
    const deadline = setTimeout(() => {
      if (!active) return;
      active = false;
      controller.abort();
      setLoading(false);
      setLoadError('Template loading timed out. Check your connection and retry.');
    }, 15000);
    async function fetchTemplates() {
      try {
        const res = await getTemplates({ signal: controller.signal, timeout: 15000 });
        if (!Array.isArray(res.data) || res.data.some(item => !item || typeof item.template_key !== 'string' || typeof item.name !== 'string')) throw new Error('Invalid template catalog');
        if (!active) return;
        setTemplates(res.data);
        setSelectedKey(current => current || res.data[0]?.template_key || null);
      } catch {
        if (active) setLoadError('Could not load templates. Please try again.');
      } finally {
        clearTimeout(deadline);
        if (active) setLoading(false);
      }
    }
    fetchTemplates();
    return () => { active = false; clearTimeout(deadline); controller.abort(); };
  }, [listRetry]);

  useEffect(() => {
    if (!selectedKey) return;
    let active = true;
    const controller = new AbortController();
    const deadline = setTimeout(() => {
      if (!active) return;
      active = false;
      controller.abort();
      setTemplateDetails({ key: selectedKey, error: 'Template loading timed out. Check your connection and retry.' });
    }, 15000);
    async function fetchTemplateDetails() {
      try {
        const res = await getTemplate(selectedKey, { signal: controller.signal, timeout: 15000 });
        if (typeof res.data?.content !== 'string') throw new Error('Invalid template content');
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
      } finally {
        clearTimeout(deadline);
      }
    }
    fetchTemplateDetails();
    return () => { active = false; clearTimeout(deadline); controller.abort(); };
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
  const previewWithContext = previewContent.replace(/{{PROGRAM_COURSE}}/g, 'BS Information Technology')
    .replace(/{{REQUEST_SEQUENCE}}/g, 'Transcript of Records – Request No. 3')
    .replace(/{{TRACKING_NUMBER}}/g, 'TRC-SYNTHETIC').replace(/{{DATE_ISSUED}}/g, 'Oct 1, 2026')
    .replace(/{{SUBJECT}}/g, 'Verify your TRACE email').replace(/{{MESSAGE}}/g, 'Synthetic notice: open the verification link in your actual email.');
  const previewDocument = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><style>body{margin:0;padding:24px;color:#111827;background:white;font-family:${previewFont};font-size:${previewSize};overflow-wrap:anywhere}</style></head><body>${previewWithContext}</body></html>`;

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
      await saveTemplate(templateToConfirm.key, templateToConfirm.payload);
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
        className="trace-button trace-button-primary">
        Retry loading templates
      </button>
    </div>
  );

  return (
    <div className="trace-section overflow-hidden flex flex-col md:flex-row min-h-[600px]">
      <ConfirmDialog open={!!templateToConfirm} title="Confirm Template Save"
        message={['Save this template?', saveError ? <span role="alert">{saveError}</span> : null]}
        confirmLabel="Save Template" loading={saving} onConfirm={confirmSave}
        onCancel={() => setTemplateToConfirm(null)} />
      {/* Sidebar List */}
      <div className="w-full md:w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shrink-0">
        <div className="trace-section-header border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">System Templates</h3>
        </div>
        <ul className="py-2">
          {templates.map(t => (
            <li key={t.template_key}>
              <button
                type="button"
                disabled={saving}
                onClick={() => setSelectedKey(t.template_key)}
                className={`trace-tab w-full text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#15803d]  ${selectedKey === t.template_key ? 'bg-white dark:bg-gray-900 text-[#15803d] dark:text-green-300 border-l-4 border-[#15803d]' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border-l-4 border-transparent'}`}
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
              className="trace-button trace-button-primary">
              Retry loading template
            </button>
          </div>
        ) : selectedKey ? (
          <form onSubmit={handleSave} className="flex-1 flex flex-col h-full">
            <div className="trace-section-header border-gray-200 dark:border-gray-700 flex-wrap bg-white dark:bg-gray-900">
              <div className="flex flex-wrap gap-4 items-center min-w-0">
                <div>
                  <label className="trace-label block mb-1">Font Family</label>
                  <select
                    value={formData.font_family}
                    onChange={e => setFormData({...formData, font_family: e.target.value})}
                    className="trace-control"
                  >
                    <option value="sans-serif">Sans Serif</option>
                    <option value="serif">Serif</option>
                    <option value="monospace">Monospace</option>
                    <option value="Arial, Helvetica, sans-serif">Arial</option>
                    <option value="'Times New Roman', Times, serif">Times New Roman</option>
                  </select>
                </div>
                <div>
                  <label className="trace-label block mb-1">Base Font Size</label>
                  <select
                    value={formData.font_size}
                    onChange={e => setFormData({...formData, font_size: e.target.value})}
                    className="trace-control"
                  >
                    <option value="10px">10px</option>
                    <option value="11px">11px</option>
                    <option value="12px">12px (Default)</option>
                    <option value="14px">14px</option>
                    <option value="16px">16px</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {success && <span className="text-xs font-bold text-[#15803d] dark:text-green-300 animate-fade-in">{success}</span>}
                <button
                  type="submit"
                  disabled={saving}
                  className="trace-button trace-button-primary"
                >
                  {saving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
            
            <div className="flex-1 min-w-0 p-4 bg-gray-50 dark:bg-gray-800 flex flex-col lg:flex-row gap-4">
              <div className="flex-1 flex flex-col">
                <label htmlFor="admin-template-content" className="trace-label block mb-2">HTML Template (Use {'{{VARIABLE_NAME}}'})</label>
                <p className="text-xs mb-2 break-words">{selectedKey === 'email_notice' ? 'Email variables: {{SUBJECT}}, {{MESSAGE}}. MESSAGE is required for verification links and account notices.' : 'Slip variables: {{STUDENT_NAME}}, {{STUDENT_ID}}, {{DOCUMENT_TYPE}}, {{TRACKING_NUMBER}}, {{AMOUNT}}, {{PROGRAM_COURSE}}, {{REQUEST_SEQUENCE}}, {{DATE_ISSUED}}. OR_NUMBER is a legacy alias for the tracking number.'} Basic text, tables and supported inline styles are saved; scripts, forms, remote images and active content are removed. Clear the body to use the default.</p>
                <textarea id="admin-template-content" maxLength={INPUT_LIMITS.template}
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                  className="trace-control flex-1 w-full font-mono resize-none"
                  placeholder="<div><h1>{{STUDENT_NAME}}</h1></div>"
                />
              </div>
              
              <div className="w-full lg:w-1/3 flex flex-col">
                <label className="trace-label block mb-2">Live Preview (Mock Data)</label>
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

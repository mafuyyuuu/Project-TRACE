import AdminIcon from './AdminIcon';
import Button from '@/components/Button';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useState, useEffect, useRef } from 'react';
import { getTemplates, getTemplate, saveTemplate } from '@/services/templateService';

export default function AdminTemplatesPanel() {
  const [templates, setTemplates] = useState([]);
  const editorRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState(null);
  
  const [formData, setFormData] = useState({ content: '', font_family: 'sans-serif', font_size: '12px' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [templateToConfirm, setTemplateToConfirm] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [insertError, setInsertError] = useState('');
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
        setInsertError('');
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
      <Button type="button" onClick={() => { setLoading(true); setLoadError(''); setListRetry(value => value + 1); }}
        className="trace-button trace-button-primary">
        Retry loading templates
      </Button>
    </div>
  );

  const selectedName = templates.find(template => template.template_key === selectedKey)?.name || 'Template';
  const variables = selectedKey === 'email_notice' ? ['SUBJECT', 'MESSAGE'] : ['STUDENT_NAME', 'STUDENT_ID', 'DOCUMENT_TYPE', 'TRACKING_NUMBER', 'AMOUNT', 'PROGRAM_COURSE', 'REQUEST_SEQUENCE', 'DATE_ISSUED'];
  const insertVariable = name => {
    const editor = editorRef.current;
    const start = editor?.selectionStart ?? formData.content.length;
    const end = editor?.selectionEnd ?? start;
    const token = '{{' + name + '}}';
    if (formData.content.length - (end - start) + token.length > INPUT_LIMITS.template) {
      setInsertError('This variable would exceed the 100,000-character template limit. Select text to replace or shorten the draft.');
      return;
    }
    setInsertError('');
    setFormData(previous => ({ ...previous, content: previous.content.slice(0, start) + token + previous.content.slice(end) }));
    requestAnimationFrame(() => { editor?.focus(); editor?.setSelectionRange(start + token.length, start + token.length); });
  };
  return (
    <section className="trace-page trace-admin-templates">
      <header><h2 className="trace-page-title">System Templates</h2><p className="trace-page-description">Customize the documents and notices generated by TRACE.</p></header>
      <ConfirmDialog open={!!templateToConfirm} title="Confirm Template Save"
        message={['Save this template?', saveError ? <span role="alert" key="error">{saveError}</span> : null]}
        confirmLabel="Save Template" loading={saving} onConfirm={confirmSave} onCancel={() => setTemplateToConfirm(null)} />
      <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="trace-section overflow-hidden" aria-label="Template catalog">
          <div className="trace-section-header"><div><h3 className="trace-section-title">Templates</h3><p className="trace-admin-caption">Choose a template to edit.</p></div></div>
          <ul className="py-2">{templates.map(template => <li key={template.template_key}>
            <Button type="button" disabled={saving} onClick={() => setSelectedKey(template.template_key)} aria-pressed={selectedKey === template.template_key}
              className={`trace-action flex w-full items-center gap-3 border-l-4 px-5 py-4 text-left text-sm font-medium ${selectedKey === template.template_key ? 'border-trace-emerald bg-emerald-50 text-trace-emerald dark:bg-green-950 dark:text-green-300' : 'border-transparent text-gray-600 dark:text-gray-300'}`}>
              <AdminIcon name="document" className="h-5 w-5" />{template.name}
            </Button>
          </li>)}</ul>
          <p className="border-t border-gray-100 bg-gray-50 p-5 text-xs leading-relaxed text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">Changes apply to future generated documents and notices.</p>
        </aside>
        <div className="trace-section min-w-0 overflow-hidden">
          {detailsLoading ? <div role="status" className="p-8 text-center text-gray-500 dark:text-gray-400">Loading template...</div> : detailError ? <div className="space-y-4 p-8">
            <p role="alert" className="trace-inline-error">{detailError}</p><Button type="button" onClick={() => { setTemplateDetails(null); setDetailRetry(value => value + 1); }} className="trace-button trace-button-primary">Retry loading template</Button>
          </div> : selectedKey ? <form onSubmit={handleSave} className="min-w-0">
            <div className="trace-section-header"><div><h3 className="trace-section-title">{selectedName}</h3><p className="trace-admin-caption">Edit the HTML body and check the live preview.</p></div>
              <div className="trace-actions">{success && <span role="status" className="text-xs text-trace-emerald">{success}</span>}
                <Button type="button" className="trace-button trace-button-secondary" disabled={saving} onClick={() => { setFormData(previous => ({ ...previous, content: '' })); setInsertError(''); }}><AdminIcon name="refresh" className="h-4 w-4" />Reset to default</Button>
                <Button type="submit" disabled={saving} className="trace-button trace-button-primary">{saving ? 'Saving...' : 'Save Template'}</Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-5 px-6 py-4">
              <label className="trace-label min-w-0">Font Family<select aria-label="Font Family" value={formData.font_family} onChange={event => setFormData({ ...formData, font_family: event.target.value })} className="trace-control mt-2 min-w-44">
                <option value="sans-serif">Sans Serif</option><option value="serif">Serif</option><option value="monospace">Monospace</option><option value="Arial, Helvetica, sans-serif">Arial</option><option value="'Times New Roman', Times, serif">Times New Roman</option>
              </select></label>
              <label className="trace-label">Base Font Size<select aria-label="Base Font Size" value={formData.font_size} onChange={event => setFormData({ ...formData, font_size: event.target.value })} className="trace-control mt-2">
                <option value="10px">10px</option><option value="11px">11px</option><option value="12px">12px (Default)</option><option value="14px">14px</option><option value="16px">16px</option>
              </select></label>
            </div>
            <div className="space-y-3 border-y border-gray-200 bg-[#f8faf9] px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="flex flex-wrap gap-2 text-xs"><span className="font-semibold">Insert variable</span><span className="text-gray-500 dark:text-gray-400">Click a variable to add it at the cursor.</span></p>
              <div className="flex flex-wrap gap-2">{variables.map(name => <Button type="button" key={name} disabled={saving} onClick={() => insertVariable(name)} className="trace-action rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 font-mono text-xs dark:border-gray-600 dark:bg-gray-900">{'{{' + name + '}}'}</Button>)}</div>
              <p className="trace-admin-caption">{selectedKey === 'email_notice' ? 'MESSAGE is required for verification links and account notices.' : 'OR_NUMBER is a legacy alias for the tracking number.'}</p>
              {insertError && <p role="alert" className="trace-inline-error">{insertError}</p>}
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-4 p-6 xl:grid-cols-[minmax(0,1.49fr)_minmax(0,1fr)]">
              <div className="min-w-0 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800"><label htmlFor="admin-template-content" className="trace-label text-xs">HTML Template (Use {'{{VARIABLE_NAME}}'})</label></div>
                <textarea ref={editorRef} id="admin-template-content" maxLength={INPUT_LIMITS.template} value={formData.content} onChange={event => setFormData({ ...formData, content: event.target.value })} className="trace-control h-[420px] min-h-80 w-full resize-y rounded-none border-0 bg-white p-4 font-mono text-xs leading-relaxed dark:bg-gray-900" placeholder="<div><h1>{{STUDENT_NAME}}</h1></div>" />
              </div>
              <div className="min-w-0 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800"><h4 className="text-xs font-semibold">Live Preview</h4><span className="trace-admin-badge trace-admin-badge-neutral">Mock data</span></div>
                <iframe title="Template preview" sandbox="" referrerPolicy="no-referrer" srcDoc={previewDocument} className="h-[420px] min-h-80 w-full border-0 bg-white text-gray-900 [color-scheme:light]" />
              </div>
            </div>
            <p className="border-t border-gray-200 bg-gray-50 px-6 py-4 text-xs leading-relaxed text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">Basic text, tables and supported inline styles are saved; scripts, forms, remote images and active content are removed. Clear the body to use the default.</p>
          </form> : <div className="p-8 text-center text-gray-500 dark:text-gray-400">No templates are configured.</div>}
        </div>
      </div>
    </section>
  );
}

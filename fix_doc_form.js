const fs = require('fs');
const file = 'frontend/src/features/admin/components/MaintenancePanel.jsx';
let content = fs.readFileSync(file, 'utf8');

// Update submitDocType
content = content.replace(
  "attachment_label: form.dt_attach ? form.dt_label : null,",
  "attachment_label: form.dt_attach ? form.dt_label : null,\n      available_to: form.dt_available_to || 'both',\n      is_repeatable: form.dt_is_repeatable !== false,\n      is_walk_in: Boolean(form.dt_is_walk_in),\n      requires_original: Boolean(form.dt_requires_original),\n      registrar_attachment_rule: form.dt_reg_attach || 'none',"
);

// Update form UI
const insertionIndex = content.indexOf("<button type=\"submit\" disabled={m.saving}");
if (insertionIndex !== -1) {
  const newFields = `
              <select className={\`\${inputClass} cursor-pointer\`} value={form.dt_available_to || 'both'}
                onChange={(e) => set('dt_available_to', e.target.value)}>
                <option value="both">Both Student & Alumni</option>
                <option value="student">Student Only</option>
                <option value="alumni">Alumni Only</option>
              </select>

              <select className={\`\${inputClass} cursor-pointer\`} value={form.dt_reg_attach || 'none'}
                onChange={(e) => set('dt_reg_attach', e.target.value)}>
                <option value="none">No Registrar Attachment</option>
                <option value="optional">Optional Registrar Attachment</option>
                <option value="required">Required Registrar Attachment</option>
              </select>

              <div className="space-y-2 py-2">
                <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-700 cursor-pointer">
                  <input type="checkbox" className="accent-[#15803d]"
                    checked={form.dt_is_repeatable !== false} onChange={(e) => set('dt_is_repeatable', e.target.checked)} />
                  Is Repeatable (can request multiple)
                </label>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-700 cursor-pointer">
                  <input type="checkbox" className="accent-[#15803d]"
                    checked={Boolean(form.dt_is_walk_in)} onChange={(e) => set('dt_is_walk_in', e.target.checked)} />
                  Supports Walk-in Requests
                </label>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-700 cursor-pointer">
                  <input type="checkbox" className="accent-[#15803d]"
                    checked={Boolean(form.dt_requires_original)} onChange={(e) => set('dt_requires_original', e.target.checked)} />
                  Requires Original Document Surrender
                </label>
              </div>\n`;
  content = content.substring(0, insertionIndex) + newFields + content.substring(insertionIndex);
}

fs.writeFileSync(file, content);

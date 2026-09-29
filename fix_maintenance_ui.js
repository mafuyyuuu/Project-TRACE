const fs = require('fs');
const file = 'frontend/src/features/admin/components/MaintenancePanel.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('dt_is_same_day')) {
  content = content.replace(
    "registrar_attachment_rule: form.dt_reg_attach || 'none',",
    "registrar_attachment_rule: form.dt_reg_attach || 'none',\n      is_same_day: Boolean(form.dt_is_same_day),"
  );
  
  content = content.replace(
    "Requires Original Document Surrender\n                </label>",
    "Requires Original Document Surrender\n                </label>\n                <label className=\"flex items-center gap-2 text-[11px] font-semibold text-gray-700 cursor-pointer\">\n                  <input type=\"checkbox\" className=\"accent-[#15803d]\"\n                    checked={Boolean(form.dt_is_same_day)} onChange={(e) => set('dt_is_same_day', e.target.checked)} />\n                  Eligible for Same-Day Release\n                </label>"
  );
  
  fs.writeFileSync(file, content);
}

export function renderTemplateValues(content, values) {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  return content.replace(/{{([A-Z_]+)}}/g, (_match, key) => escape(values[key]));
}

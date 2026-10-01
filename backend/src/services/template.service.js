const sanitizeHtml = require('sanitize-html');
const model = require('../models/template.model');
const { badRequest, notFound } = require('../utils/AppError');
const fonts = ['sans-serif', 'serif', 'monospace', 'Arial', 'Arial, Helvetica, sans-serif', "'Times New Roman', Times, serif"];
const sizes = ['10px', '11px', '12px', '14px', '16px'];
const variables = {
  payment_slip: ['STUDENT_NAME', 'STUDENT_ID', 'DOCUMENT_TYPE', 'TRACKING_NUMBER', 'OR_NUMBER', 'AMOUNT', 'PROGRAM_COURSE', 'REQUEST_SEQUENCE', 'DATE_ISSUED'],
  email_notice: ['SUBJECT', 'MESSAGE'],
};
function clean(content, links = false) {
  return sanitizeHtml(content, {
    allowedTags: ['div', 'section', 'header', 'footer', 'h1', 'h2', 'h3', 'p', 'span', 'strong', 'b', 'em', 'i', 'u', 'small', 'br', 'hr', 'pre', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'a'],
    allowedAttributes: { '*': ['style'], td: ['style', 'colspan', 'rowspan'], th: ['style', 'colspan', 'rowspan'], a: links ? ['href'] : [] },
    allowedSchemes: ['https', 'http'], allowProtocolRelative: false,
    allowedStyles: { '*': {
      color: [/^#[\da-f]{3,8}$/i, /^(?:black|white|gray|green)$/],
      'background-color': [/^#[\da-f]{3,8}$/i, /^(?:black|white|gray|green)$/],
      'text-align': [/^(?:left|center|right)$/],
      'font-weight': [/^(?:normal|bold|[1-9]00)$/],
      'font-size': [/^(?:1[0-9]|2[0-8])px$/],
      'white-space': [/^(?:normal|pre-wrap)$/],
      padding: [/^\d{1,2}px(?: \d{1,2}px){0,3}$/],
      margin: [/^\d{1,2}px(?: \d{1,2}px){0,3}$/],
    } },
  });
}
function escape(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function emailText(value) {
  return String(value ?? '').split(/(https?:\/\/[^\s<>"']+)/g).map((part, index) => index % 2 ? `<a href="${escape(part)}">${escape(part)}</a>` : escape(part)).join('');
}
function render(content, values, email = false) {
  // Sanitize after substitution as well: variables cannot create active attributes.
  return clean(content.replace(/{{([A-Z_]+)}}/g, (_match, key) => email && key === 'MESSAGE' ? emailText(values[key]) : escape(values[key])), email);
}
async function get(key) {
  const row = await model.findByKey(key);
  return row ? { ...row, content: clean(row.content || '', key === 'email_notice'), font_family: fonts.includes(row.font_family) ? row.font_family : 'sans-serif', font_size: sizes.includes(row.font_size) ? row.font_size : '12px' } : null;
}
async function update(key, { content, font_family, font_size } = {}) {
  const size = typeof font_size === 'number' ? `${font_size}px` : font_size;
  if (typeof content !== 'string' || content.length > 100000 || !fonts.includes(font_family) || !sizes.includes(size)) throw badRequest('Use a template up to 100,000 characters and a supported font and size.');
  const allowed = variables[key];
  if (!allowed) throw badRequest('Choose a supported template.');
  const unknown = [...content.matchAll(/{{([A-Z_]+)}}/g)].map(match => match[1]).filter(variable => !allowed.includes(variable));
  if (unknown.length) throw badRequest(`Unsupported template variable: ${unknown[0]}.`);
  if (key === 'email_notice' && content.trim() && !content.includes('{{MESSAGE}}')) throw badRequest('Email notices must include {{MESSAGE}} so verification links and account notices remain available.');
  if (!await model.findByKey(key)) throw notFound('Template not found.');
  await model.update(key, clean(content, key === 'email_notice'), font_family, size);
}
module.exports = { get, update, render, clean, emailText };

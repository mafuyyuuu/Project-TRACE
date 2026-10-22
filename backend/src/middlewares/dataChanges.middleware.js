const { invalidateData } = require('../realtime');

function changedResources(url, method) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return [];
  const path = String(url || '').split(/[?#]/)[0].replace(/^\/api/, '');
  if (/\/(?:scan|scan-receipt|extract|preview|print)(?:\/|$)/.test(path)) return [];
  if (/^\/auth\/(?:register|verify-student|students|users)/.test(path)) return ['accounts'];
  if (/^\/auth\/(?:profile|study-years|student\/\d+\/study-years)/.test(path)) return ['profile', 'accounts', 'documents'];
  if (/^\/maintenance\//.test(path)) return ['reference', 'accounts', 'documents'];
  if (/^\/reference\//.test(path)) return ['reference'];
  if (/^\/grad-applications/.test(path)) return ['graduate', 'profile', 'accounts'];
  if (/^\/templates/.test(path)) return ['templates'];
  if (/^\/documents/.test(path)) return ['documents', 'receipts'];
  if (/^\/(?:support|manual-faq|staff-conversations|internal-assistance)/.test(path)) return ['support'];
  return [];
}

/** A completed write invalidates resource names, never another actor's data. */
function dataChanges(req, res, next) {
  const resources = changedResources(req.originalUrl, req.method);
  if (resources.length) res.once('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const target = String(req.originalUrl || '').match(/\/(?:users|student|staff)\/([1-9][0-9]*)(?:[/?]|$)/);
        invalidateData?.(resources, { actorId: req.user?.id, targetUserId: target ? Number(target[1]) : undefined });
      } catch { /* A socket outage cannot undo a committed write. */ }
    }
  });
  next();
}
module.exports = { dataChanges, changedResources };

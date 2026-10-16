import Button from '@/components/Button';

/** One footer for locally paged tables. Server-paged queues keep their own cursor. */
export default function Pagination({ count, page, pageSize, onChange, label = 'records', children }) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const start = count ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, count);
  return <footer className="trace-pagination">
    <p aria-live="polite">Showing {start}–{end} of {count} {label}</p>
    {children}
    <nav aria-label={`${label} pages`} className="trace-actions">
      <Button type="button" className="trace-button trace-button-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Button>
      <span className="text-xs">Page {page} of {pages}</span>
      <Button type="button" className="trace-button trace-button-secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</Button>
    </nav>
  </footer>;
}

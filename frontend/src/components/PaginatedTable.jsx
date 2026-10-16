import { Children, cloneElement, useState } from 'react';
import Pagination from '@/components/Pagination';

/** Paginate existing row elements without changing their values or actions. */
export default function PaginatedTable({ children, pageSize = 8, label = 'records', resetKey = '', ...props }) {
  const sections = Children.toArray(children);
  const body = sections.find(child => child.type === 'tbody');
  const rows = Children.toArray(body?.props.children);
  const empty = rows.length === 1 && Children.toArray(rows[0].props.children).some(cell => Number(cell.props?.colSpan) > 1);
  const count = empty ? 0 : rows.length;
  const source = `${resetKey}:${rows.map(row => row.key).join('|')}`;
  const [state, setState] = useState({ source, page: 1 });
  const page = state.source === source ? Math.max(1, Math.min(state.page, Math.max(1, Math.ceil(count / pageSize)))) : 1;
  return <div className="min-w-0">
    <div className="trace-table-scroll max-h-[60dvh]" role="region" aria-label={props['aria-label'] || label} tabIndex={0}>
      <table {...props}>{sections.map(section => section === body ? cloneElement(body, {}, empty ? rows : rows.slice((page - 1) * pageSize, page * pageSize)) : section.type === 'thead' ? cloneElement(section, { className: `sticky top-0 z-10 bg-white dark:bg-gray-900 ${section.props.className || ''}` }) : section)}</table>
    </div>
    <Pagination count={count} page={page} pageSize={pageSize} label={label} onChange={next => setState({ source, page: next })} />
  </div>;
}

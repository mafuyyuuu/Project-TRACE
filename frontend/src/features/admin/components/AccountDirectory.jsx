import EmailText from '@/components/EmailText';
import PaginatedTable from '@/components/PaginatedTable';
import FilterSelect from '@/components/FilterSelect';
import Button from '@/components/Button';
import UserAvatar from '@/components/UserAvatar';
import AdminIcon from './AdminIcon';
import { getUserLabel } from '@/utils/userLabels';

/** Figma's account directory, using the caller's existing filters and actions. */
export default function AccountDirectory({ users, totalCount, onSelectUser, roleFilter, onRoleFilterChange, roleOptions, deskFilter, onDeskFilterChange, deskOptions, onAddUser }) {
  const visible = users;
  return (
    <section className="trace-section trace-admin-directory overflow-hidden" aria-label="Accounts">
      <div className="trace-section-header">
        <div><h3 className="trace-section-title">Accounts</h3><p className="trace-admin-caption">{totalCount ?? users.length} accounts in total</p></div>
        <div className="trace-actions">
          <FilterSelect aria-label="Account role" className="trace-control" value={roleFilter} onChange={event => onRoleFilterChange(event.target.value)}>
            {roleOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </FilterSelect>
          {onDeskFilterChange && <FilterSelect aria-label="Staff desk" className="trace-control" value={deskFilter} onChange={event => onDeskFilterChange(event.target.value)}>
            {deskOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </FilterSelect>}
          {onAddUser && <Button type="button" className="trace-button trace-button-primary" onClick={onAddUser}><AdminIcon name="plus" />Add User</Button>}
        </div>
      </div>
      <div className="trace-table-scroll" role="region" aria-label="Account directory table" tabIndex={0}>
        <PaginatedTable label="accounts" className="trace-data-table min-w-[55rem]">
          <colgroup>{['w-[38%]', 'w-[15%]', 'w-[18%]', 'w-[11%]', 'w-[14%]', 'w-[4%]'].map((width, index) => <col key={index} className={width} />)}</colgroup>
          <thead><tr>{['Account', 'Account ID', 'Role / Desk', 'Status', 'Verification', ''].map((label, index) => <th key={index} scope="col">{label || <span className="sr-only">Actions</span>}</th>)}</tr></thead>
          <tbody>
            {visible.map(account => <tr key={account.id}>
              <td><Button type="button" data-testid="user-card" data-user-id={account.id} className="trace-action flex w-full min-w-0 items-center gap-3 text-left" onClick={() => onSelectUser(account)}>
                <UserAvatar user={account} className="h-10 w-10 shrink-0 rounded-full object-cover" alt="" />
                <span className="min-w-0"><span className="block font-semibold text-trace-ink dark:text-gray-100">{account.full_name}</span><span className="trace-admin-caption block break-words"><EmailText value={account.email} /></span></span>
              </Button></td>
              <td className="font-mono text-xs text-gray-500 dark:text-gray-400">{account.student_id || '—'}</td>
              <td><span className="block">{getUserLabel(account)}</span>{account.desk_assignment && <span className="trace-admin-caption block">{account.desk_assignment}</span>}</td>
              <td><span className={`trace-admin-badge ${Number(account.is_active) ? 'trace-admin-badge-green' : 'trace-admin-badge-neutral'}`}><span aria-hidden="true">●</span>{Number(account.is_active) ? 'Active' : 'Inactive'}</span></td>
              <td><span className={`trace-admin-badge ${account.verification_status === 'rejected' ? 'trace-admin-badge-red' : account.verification_status === 'pending' ? 'trace-admin-badge-amber' : 'trace-admin-badge-blue'}`}>{account.verification_status !== 'pending' && <AdminIcon name={account.verification_status === 'rejected' ? 'verification-rejected' : 'verified'} />}{account.verification_status === 'rejected' ? 'Rejected' : account.verification_status === 'pending' ? 'Pending' : 'Verified'}</span></td>
              <td><Button type="button" className="trace-icon-button" aria-label={`Account actions for ${account.student_id || account.id}`} onClick={() => onSelectUser(account)}><AdminIcon name="ellipsis" /></Button></td>
            </tr>)}
            {!visible.length && <tr><td colSpan={6} className="py-10 text-center text-gray-500 dark:text-gray-400">No users match your filters.</td></tr>}
          </tbody>
        </PaginatedTable>
      </div>
    </section>
  );
}

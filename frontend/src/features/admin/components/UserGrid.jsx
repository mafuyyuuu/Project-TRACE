import Button from '@/components/Button';
import UserCard from '@/components/UserCard';

const selectClass =
  "trace-control cursor-pointer";

/**
 * Role/desk filters and a responsive grid of UserCards.
 *
 * The desk filter and "+ Add User" button are both optional — a consumer
 * only gets them by passing the matching handler prop. Filtering itself
 * happens in the caller's hook; this component only renders what it's given.
 */
export default function UserGrid({
  users,
  onSelectUser,
  roleFilter,
  onRoleFilterChange,
  roleOptions,
  deskFilter,
  onDeskFilterChange,
  deskOptions,
  onAddUser,
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-center">
        <select className={selectClass} value={roleFilter} onChange={(e) => onRoleFilterChange(e.target.value)}>
          {roleOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {onDeskFilterChange && (
          <select className={selectClass} value={deskFilter} onChange={(e) => onDeskFilterChange(e.target.value)}>
            {deskOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
        {onAddUser && (
          <Button
            type="button"
            onClick={onAddUser}
            className="trace-button trace-button-primary"
          >
            + Add User
          </Button>
        )}
      </div>

      {users.length === 0 ? (
        <div className="trace-section text-center py-12 text-gray-400 dark:text-gray-400 font-medium">
          No users match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
          {users.map((u) => (
            <UserCard key={u.id} user={u} onClick={() => onSelectUser(u)} />
          ))}
        </div>
      )}
    </div>
  );
}

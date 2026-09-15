import UserCard from '@/components/UserCard';

const selectClass =
  'px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#15803d] cursor-pointer';

/**
 * Search + filters + a responsive grid of UserCards.
 *
 * The desk filter and "+ Add User" button are both optional — a consumer
 * only gets them by passing the matching handler prop. Filtering itself
 * happens in the caller's hook; this component only renders what it's given.
 */
export default function UserGrid({
  users,
  onSelectUser,
  searchValue,
  onSearchChange,
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
        <input
          type="text"
          placeholder="Search by name or email…"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 min-w-[220px] px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#15803d]"
        />
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
          <button
            type="button"
            onClick={onAddUser}
            className="px-5 py-2 bg-[#15803d] hover:bg-[#166534] text-white rounded-xl text-xs font-bold shadow-sm transition-all whitespace-nowrap"
          >
            + Add User
          </button>
        )}
      </div>

      {users.length === 0 ? (
        <div className="text-center py-12 text-gray-400 font-medium bg-white rounded-3xl border border-gray-200">
          No users match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <UserCard key={u.id} user={u} onClick={() => onSelectUser(u)} />
          ))}
        </div>
      )}
    </div>
  );
}

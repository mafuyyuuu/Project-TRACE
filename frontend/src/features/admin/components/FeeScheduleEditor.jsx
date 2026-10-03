const emptySchedule = () => ({ base_fee: 0, fee_rule: 'flat', rental_fee: 0, special_fee: 0, fee_items: [] });
const inputClass = "trace-control w-full";

function NamedItems({ items, onChange }) {
  return <div className="space-y-2">
    <p className="text-xs font-semibold">Named fees · once per document type in each request</p>
    {items.map((item, index) => <div key={index} className="flex gap-2">
      <label className="flex-1 text-xs">Item name<input className={inputClass} required maxLength={100} value={item.label}
        onChange={event => onChange(items.map((row, i) => i === index ? { ...row, label: event.target.value } : row))} /></label>
      <label className="trace-label w-24">Item fee (₱)<input className={inputClass} required type="number" min="0" step="0.01" value={item.amount}
        onChange={event => onChange(items.map((row, i) => i === index ? { ...row, amount: event.target.value } : row))} /></label>
      <button type="button" aria-label={`Remove fee item ${index + 1}`} onClick={() => onChange(items.filter((_, i) => i !== index))}>Remove</button>
    </div>)}
    <button type="button" className="trace-action text-xs font-bold text-green-700 dark:text-green-300" disabled={items.length >= 30}
      onClick={() => onChange([...items, { label: '', amount: 0 }])}>Add named fee</button>
  </div>;
}
function ExtraFees({ schedule, onChange }) {
  return <><div className="grid grid-cols-2 gap-2">{[['rental_fee', 'Rental Fee (₱)'], ['special_fee', 'Special Fee (₱)']].map(([key, label]) =>
    <label key={key} className="trace-label">{label}<input className={inputClass} required type="number" min="0" step="0.01" value={schedule[key] ?? 0}
      onChange={event => onChange({ ...schedule, [key]: event.target.value })} /></label>)}</div>
    <NamedItems items={schedule.fee_items || []} onChange={fee_items => onChange({ ...schedule, fee_items })} /></>;
}
export default function FeeScheduleEditor({ value, colleges, onChange }) {
  const overrides = value.college_fee_schedules || [];
  const updateOverride = (index, next) => onChange({ ...value, college_fee_schedules: overrides.map((row, i) => i === index ? next : row) });
  return <div className="space-y-4">
    <fieldset className="space-y-2"><legend className="text-sm font-bold">Default extra fees</legend>
      <ExtraFees schedule={value} onChange={onChange} />
      <p className="text-xs text-gray-500">Rental, Special and named fees apply once, regardless of copies.</p>
    </fieldset>
    <fieldset className="space-y-3"><legend className="text-sm font-bold">College fee overrides</legend>
      <p className="text-xs text-gray-500">A college override replaces the complete default schedule. Other colleges use the default.</p>
      {overrides.map((row, index) => <fieldset key={index} className="space-y-2 rounded-xl border border-gray-300 dark:border-gray-600 p-3">
        <legend className="text-xs font-semibold">Override {index + 1}</legend>
        <label className="trace-label">College<select className={inputClass} required value={row.college_id || ''}
          onChange={event => updateOverride(index, { ...row, college_id: Number(event.target.value) })}>
          <option value="">Choose college</option>{colleges.map(college => <option key={college.id} value={college.id}>{college.name}</option>)}
        </select></label>
        <label className="trace-label block">College base rate (₱)<input className={inputClass} required type="number" min="0" step="0.01" value={row.base_fee}
          onChange={event => updateOverride(index, { ...row, base_fee: event.target.value })} /></label>
        <label className="trace-label block">College fee basis<select className={inputClass} value={row.fee_rule}
          onChange={event => updateOverride(index, { ...row, fee_rule: event.target.value })}>
          <option value="flat">Flat fee per copy</option><option value="per_semester_block">Per printed page per copy</option>
        </select></label>
        <ExtraFees schedule={row} onChange={next => updateOverride(index, next)} />
        <button type="button" className="trace-action text-xs text-red-700 dark:text-red-300" onClick={() => onChange({ ...value, college_fee_schedules: overrides.filter((_, i) => i !== index) })}>Remove college override</button>
      </fieldset>)}
      <button type="button" className="trace-action text-xs font-bold text-green-700 dark:text-green-300" disabled={overrides.length >= 100}
        onClick={() => onChange({ ...value, college_fee_schedules: [...overrides, { ...emptySchedule(), college_id: null }] })}>Add college override</button>
    </fieldset>
  </div>;
}

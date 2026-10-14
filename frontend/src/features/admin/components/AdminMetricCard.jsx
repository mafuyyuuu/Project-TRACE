/** Native metric layout from Admin dashboard frame 93:663. */
export default function AdminMetricCard({ label, value, icon, children, helper, solidHelper = false }) {
  return <section aria-label={label.charAt(0) + label.slice(1).toLowerCase()} className="trace-admin-kpi trace-card-info">
    <span className="trace-admin-kpi-label">{label}</span>
    <span className="trace-admin-kpi-value">{value}</span>
    <span className="trace-admin-kpi-icon" aria-hidden="true"><img src={`/admin-figma/${icon}.svg`} alt="" width="36" height="36" /></span>
    <div className="min-w-0">{children}</div>
    <p className={solidHelper ? 'mt-auto rounded-xl bg-trace-emerald px-3 py-1 text-[0.5625rem] font-medium leading-[1.45] text-white' : 'trace-admin-kpi-helper'}>{helper}</p>
  </section>;
}

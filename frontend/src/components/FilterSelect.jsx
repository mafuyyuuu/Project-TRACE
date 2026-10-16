/** Shared History-style filter; native select semantics and caller-owned state. */
export default function FilterSelect({ children, className = '', ...props }) {
  return <span className={`trace-filter-select ${className}`}>
    <img src="/student-figma/filter-4fbfe.svg" alt="" aria-hidden="true" />
    <select {...props} className="trace-filter-native">{children}</select>
    <img src="/student-figma/chevd-14e4c.svg" alt="" aria-hidden="true" />
  </span>;
}

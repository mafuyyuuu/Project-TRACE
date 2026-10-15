/** Original Student frame exports retain their intrinsic dimensions. */
export default function StudentIcon({ name, className = '' }) {
  return <img src={`/student-figma/${name}.svg`} alt="" aria-hidden="true" className={`trace-student-icon shrink-0 ${className}`} />;
}

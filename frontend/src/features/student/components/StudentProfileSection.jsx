import StudentIcon from './StudentIcon';

export default function StudentProfileSection({ title, icon, description, action, children }) {
  return <section className="trace-student-profile-card" aria-label={title}>
    <header className="trace-student-profile-card-heading">
      <span className="trace-student-profile-symbol"><StudentIcon name={icon} /></span>
      <div className="min-w-0 flex-1"><h4>{title}</h4>{description && <p>{description}</p>}</div>{action}
    </header>{children}
  </section>;
}

export function StudentProfileInput({ icon, children }) {
  return <div className="trace-student-profile-input"><StudentIcon name={icon} />{children}</div>;
}

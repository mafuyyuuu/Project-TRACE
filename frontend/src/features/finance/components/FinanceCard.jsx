export default function FinanceCard({ title, badge, children, className = '' }) {
  return <section className={`trace-finance-card ${className}`}><header><h4>{title}</h4>{badge}</header><div>{children}</div></section>;
}

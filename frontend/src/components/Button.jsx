/** Native semantics stay on the fixed target; only decoration/content lifts. */
export default function Button({ children, className = '', motion, ...props }) {
  const lift = motion === 'lift' || (motion !== 'feedback' && /(?:^|\s)trace-(?:button|icon-button|button-lift)(?:\s|$)/.test(className));
  return <button {...props} className={`${className} trace-button-feedback${lift ? ' trace-button-motion' : ''}`}>
    {lift ? <span className="trace-button-visual">{children}</span> : children}
  </button>;
}

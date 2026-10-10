/** A native trailing-edge control; toggling never submits its parent form. */
export default function PasswordVisibilityButton({ visible, onToggle, label = 'password', controls, disabled = false, inverse = false }) {
  return <button type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label}`} aria-pressed={visible}
    aria-controls={controls} disabled={disabled} onClick={onToggle}
    className={`trace-icon-button absolute inset-y-0 right-1 my-auto size-11 ${inverse ? 'text-white enabled:hover:bg-white/10 focus-visible:outline-white' : 'focus-visible:outline-pine-600 dark:focus-visible:outline-green-400'} focus-visible:outline-2 focus-visible:outline-offset-2`}>
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      {visible ? <><path strokeLinecap="round" d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M6.5 6.5C4.5 7.8 3 9.7 2 12c2 4.5 5.4 7 10 7 1.8 0 3.5-.4 5-1.2M9 5.4A12 12 0 0 1 12 5c4.6 0 8 2.5 10 7a16 16 0 0 1-3.3 4.5" /></>
        : <><path d="M2 12c2-4.5 5.4-7 10-7s8 2.5 10 7c-2 4.5-5.4 7-10 7s-8-2.5-10-7Z" /><circle cx="12" cy="12" r="3" /></>}
    </svg>
  </button>;
}

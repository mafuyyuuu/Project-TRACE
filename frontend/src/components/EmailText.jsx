import { formatEmail } from '@/utils/formatters';

/** Email is an identifier; keep its display lowercase and copyable in every role. */
export default function EmailText({ value }) {
  return <span className="select-text break-all normal-case">{formatEmail(value)}</span>;
}

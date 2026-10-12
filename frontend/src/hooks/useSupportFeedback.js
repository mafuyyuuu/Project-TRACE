import { useCallback, useState } from 'react';
export default function useSupportFeedback() {
  const [notices, setNotices] = useState([]);
  const notify = useCallback(message => setNotices(previous => [...previous, { id: crypto.randomUUID(), message }]), []);
  const dismiss = useCallback(id => setNotices(previous => previous.filter(row => row.id !== id)), []);
  const dismissAll = useCallback(() => setNotices([]), []);
  return { notices, notify, dismiss, dismissAll };
}

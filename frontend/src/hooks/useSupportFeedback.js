import { useCallback, useEffect, useRef, useState } from 'react';
export default function useSupportFeedback() {
  const [notices, setNotices] = useState([]);
  const timers = useRef(new Map());
  const dismiss = useCallback(id => {
    clearTimeout(timers.current.get(id)); timers.current.delete(id);
    setNotices(previous => previous.filter(row => row.id !== id));
  }, []);
  const notify = useCallback(message => {
    const id = crypto.randomUUID();
    setNotices(previous => [...previous, { id, message }]);
    timers.current.set(id,setTimeout(() => dismiss(id),3000));
  }, [dismiss]);
  const dismissAll = useCallback(() => {
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear(); setNotices([]);
  }, []);
  useEffect(() => {
    const pending = timers.current;
    return () => { for (const timer of pending.values()) clearTimeout(timer); pending.clear(); };
  }, []);
  return { notices, notify, dismiss, dismissAll };
}

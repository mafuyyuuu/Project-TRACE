import { PIPELINE, STATUS } from '@/utils/documentStatus';

export const isWindowClerk = user => user?.role === 'clerk' && ['Window 1', 'Receiving Desk'].includes(user?.desk_assignment);

/** Tracking filters describe records; desk authorization stays in the service. */
export function windowTrackingMatches(document, filter) {
  if (filter === 'completed') return document.current_status === STATUS.COMPLETED;
  if (filter === 'other') return !PIPELINE.includes(document.current_status);
  if (filter === 'progress') return PIPELINE.includes(document.current_status) && document.current_status !== STATUS.COMPLETED;
  return true;
}

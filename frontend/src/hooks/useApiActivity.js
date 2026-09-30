import { useSyncExternalStore } from 'react';
import { getPendingApiRequests, subscribeApiActivity } from '@/services/api';

const serverSnapshot = () => 0;

export default function useApiActivity() {
  return useSyncExternalStore(subscribeApiActivity, getPendingApiRequests, serverSnapshot);
}

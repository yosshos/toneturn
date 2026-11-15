// The practice ledger as live React state (AUDIT-5): re-renders on every booking.
import { useSyncExternalStore } from 'react';
import type { PracticeLedger } from '../engine/practiceTime';
import { loadLedger, subscribePractice } from '../storage/practice';

export function useLedger(): PracticeLedger {
  return useSyncExternalStore(subscribePractice, loadLedger, loadLedger);
}

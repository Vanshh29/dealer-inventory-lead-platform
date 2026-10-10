import type { LeadStatus } from './constants';

/**
 * Allowed lead status moves. WON and LOST are terminal.
 * Shared so the API enforces it and the UI only offers valid actions.
 */
export const LEAD_TRANSITIONS: Readonly<Record<LeadStatus, readonly LeadStatus[]>> = {
  NEW: ['CONTACTED', 'LOST'],
  CONTACTED: ['TEST_DRIVE', 'OFFER', 'LOST'],
  TEST_DRIVE: ['OFFER', 'LOST'],
  OFFER: ['WON', 'LOST'],
  WON: [],
  LOST: [],
};

export function allowedTransitions(from: LeadStatus): readonly LeadStatus[] {
  return LEAD_TRANSITIONS[from];
}

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  return LEAD_TRANSITIONS[from].includes(to);
}

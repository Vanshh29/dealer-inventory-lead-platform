import { LEAD_STATUSES } from './constants';
import { allowedTransitions, canTransition } from './lead-transitions';

describe('lead transitions', () => {
  it('allows the happy path NEW -> CONTACTED -> TEST_DRIVE -> OFFER -> WON', () => {
    expect(canTransition('NEW', 'CONTACTED')).toBe(true);
    expect(canTransition('CONTACTED', 'TEST_DRIVE')).toBe(true);
    expect(canTransition('TEST_DRIVE', 'OFFER')).toBe(true);
    expect(canTransition('OFFER', 'WON')).toBe(true);
  });

  it('allows LOST from every open state', () => {
    for (const s of ['NEW', 'CONTACTED', 'TEST_DRIVE', 'OFFER'] as const) {
      expect(canTransition(s, 'LOST')).toBe(true);
    }
  });

  it('treats WON and LOST as terminal', () => {
    expect(allowedTransitions('WON')).toEqual([]);
    expect(allowedTransitions('LOST')).toEqual([]);
  });

  it('forbids skipping steps, going backwards and staying in place', () => {
    expect(canTransition('NEW', 'WON')).toBe(false);
    expect(canTransition('NEW', 'OFFER')).toBe(false);
    expect(canTransition('OFFER', 'CONTACTED')).toBe(false);
    for (const s of LEAD_STATUSES) expect(canTransition(s, s)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  createInitialBorderState,
  getCurrentApplicant,
  selectInspectField,
  stampApplicantDecision,
} from './border-inspector';

describe('Border Inspector Desk (#138)', () => {
  it('initializes shift with 8 applicants and first valid Arstotzka worker', () => {
    const state = createInitialBorderState();
    expect(state.status).toBe('playing');
    expect(state.cases).toHaveLength(8);
    const first = getCurrentApplicant(state);
    expect(first.isValid).toBe(true);
    expect(first.discrepancyType).toBe('none');
  });

  it('awards credits and advances index when approving a valid applicant', () => {
    let state = createInitialBorderState();
    state = stampApplicantDecision(state, 'approved');
    expect(state.correctCount).toBe(1);
    expect(state.credits).toBe(70);
    expect(state.currentIndex).toBe(1);
  });

  it('detects discrepancy via 2-field inspector and awards bonus on correct denial', () => {
    let state = createInitialBorderState();
    // Advance to applicant #1 (Elena Voronina — expired passport 1982-09-14 < 1982-11-23)
    state = stampApplicantDecision(state, 'approved');
    expect(state.currentIndex).toBe(1);

    state = selectInspectField(state, 'clock_date');
    state = selectInspectField(state, 'passport_expiry');
    expect(state.lastInspectResult).toBe('conflict');
    expect(state.discrepancyFound).toBe(true);

    // Deny with discrepancy bonus (+35 credits)
    state = stampApplicantDecision(state, 'denied');
    expect(state.correctCount).toBe(2);
    expect(state.credits).toBe(105);
  });

  it('issues Ministry Citation when approving an invalid applicant and fires after max citations', () => {
    let state = createInitialBorderState();
    // Wrongfully deny applicant #0
    state = stampApplicantDecision(state, 'denied');
    expect(state.citations).toBe(1);
    expect(state.lastCitationReason).toBe('wrongful_denial');

    // Wrongfully approve applicant #1 (expired passport)
    state = stampApplicantDecision(state, 'approved');
    expect(state.citations).toBe(2);
    expect(state.lastCitationReason).toBe('expired_passport');
  });
});

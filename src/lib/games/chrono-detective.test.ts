import { describe, expect, it } from 'vitest';
import {
  applyAutoDeductionHint,
  createChronoDetectiveState,
  inspectSceneClue,
  updateFateDraft,
} from './chrono-detective';

describe('Memento Mori Chrono (#145)', () => {
  it('initializes with 3 maritime scenes and 3 unconfirmed Fate Ledger entries', () => {
    const state = createChronoDetectiveState();
    expect(state.status).toBe('investigating');
    expect(state.drafts).toHaveLength(3);
    expect(state.confirmedTriadsCount).toBe(0);
  });

  it('records inspected hotspot clues on the current frozen scene', () => {
    let state = createChronoDetectiveState();
    state = inspectSceneClue(state, 'clue-helm-log');
    expect(state.inspectedClueIds).toContain('clue-helm-log');
    expect(state.feedbackEn).toContain('Capt. Robert Vale');
  });

  it('validates the Rule of Three and locks the Ledger when all 3 fates are correctly deduced', () => {
    let state = createChronoDetectiveState();
    // Fate 1: Capt. Robert Vale / Shot by Flintlock / First Mate William Hawke
    state = updateFateDraft(state, 'fate-1', 'identity', 'capt-vale');
    state = updateFateDraft(state, 'fate-1', 'cause', 'flintlock-shot');
    state = updateFateDraft(state, 'fate-1', 'culprit', 'mate-hawke');
    expect(state.confirmedTriadsCount).toBe(1);
    expect(state.status).toBe('investigating');

    // Solve remaining fates via hint helper
    state = applyAutoDeductionHint(state);
    expect(state.confirmedTriadsCount).toBe(3);
    expect(state.status).toBe('case-solved');
    expect(state.drafts.every((d) => d.lockedCorrect)).toBe(true);
  });
});

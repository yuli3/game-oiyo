import { describe, expect, it } from 'vitest';
import { StanleyChoiceEngine, ENDINGS_CATALOG } from './stanley-choice';

describe('StanleyChoiceEngine', () => {
  it('initializes in office 427 with 0% completion by default', () => {
    const engine = new StanleyChoiceEngine();
    expect(engine.state.currentRoomId).toBe('office_427');
    expect(engine.state.currentEnding).toBeNull();
    expect(engine.getCompletionPercentage()).toBe(0);
    expect(ENDINGS_CATALOG.length).toBe(8);
  });

  it('navigates classic Freedom Ending path faithfully', () => {
    const engine = new StanleyChoiceEngine();

    // Leave office -> corridor_start
    let res = engine.makeChoice('leave_office');
    expect(res.success).toBe(true);
    expect(engine.state.currentRoomId).toBe('corridor_start');

    // Advance to two doors
    res = engine.makeChoice('advance_doors');
    expect(res.success).toBe(true);
    expect(engine.state.currentRoomId).toBe('two_doors');

    // Left door -> meeting_room
    res = engine.makeChoice('door_left');
    expect(res.success).toBe(true);
    expect(engine.state.currentRoomId).toBe('meeting_room');

    // Meeting room -> boss_office
    res = engine.makeChoice('goto_boss');
    expect(res.success).toBe(true);
    expect(engine.state.currentRoomId).toBe('boss_office');

    // Boss office -> mind_control
    res = engine.makeChoice('enter_elevator');
    expect(res.success).toBe(true);
    expect(engine.state.currentRoomId).toBe('mind_control');

    // Mind control -> turn OFF -> ending_freedom!
    res = engine.makeChoice('turn_off');
    expect(res.success).toBe(true);
    expect(engine.state.currentEnding).toBe('ending_freedom');
    expect(engine.state.unlockedEndings.has('ending_freedom')).toBe(true);
  });

  it('triggers Coward Ending when closing the door immediately', () => {
    const engine = new StanleyChoiceEngine();
    const res = engine.makeChoice('close_door');
    expect(res.success).toBe(true);
    expect(engine.state.currentEnding).toBe('ending_coward');
    expect(engine.state.unlockedEndings.has('ending_coward')).toBe(true);
  });

  it('triggers Broom Closet Ending when stubbornly staying inside', () => {
    const engine = new StanleyChoiceEngine();
    engine.makeChoice('leave_office');
    engine.makeChoice('enter_broom_closet');
    expect(engine.state.currentRoomId).toBe('broom_closet');

    const res = engine.makeChoice('stay_in_closet');
    expect(res.success).toBe(true);
    expect(engine.state.currentEnding).toBe('ending_broom_closet');
  });

  it('triggers Destruction Ending when pushing ON in mind control', () => {
    const engine = new StanleyChoiceEngine();
    engine.makeChoice('leave_office');
    engine.makeChoice('advance_doors');
    engine.makeChoice('door_left');
    engine.makeChoice('goto_boss');
    engine.makeChoice('enter_elevator');

    const res = engine.makeChoice('turn_on');
    expect(res.success).toBe(true);
    expect(engine.state.currentEnding).toBe('ending_destruction');
  });

  it('restarts game loop properly while keeping unlocked endings memory', () => {
    const engine = new StanleyChoiceEngine();
    engine.makeChoice('close_door');
    expect(engine.state.currentEnding).toBe('ending_coward');
    expect(engine.state.unlockedEndings.size).toBe(1);

    engine.restartGame();
    expect(engine.state.currentRoomId).toBe('office_427');
    expect(engine.state.currentEnding).toBeNull();
    // Memory of unlocked ending is preserved
    expect(engine.state.unlockedEndings.has('ending_coward')).toBe(true);
    expect(engine.getCompletionPercentage()).toBe(13); // 1/8 = 12.5% -> 13%
  });
});

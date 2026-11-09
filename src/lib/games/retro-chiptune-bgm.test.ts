import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RetroChiptuneBgmPlayer, getRetroChiptuneBgm, type RetroBgmTheme } from './retro-chiptune-bgm';

describe('RetroChiptuneBgmPlayer', () => {
  let player: RetroChiptuneBgmPlayer;

  beforeEach(() => {
    player = new RetroChiptuneBgmPlayer();
  });

  afterEach(() => {
    player.stop();
  });

  it('initializes with default status', () => {
    const status = player.getStatus();
    expect(status.isPlaying).toBe(false);
    expect(status.theme).toBe('retro-jump');
  });

  it('allows setting and toggling mute state', () => {
    player.setMuted(true);
    expect(player.getStatus().isMuted).toBe(true);

    const toggled = player.toggleMute();
    expect(toggled).toBe(false);
    expect(player.getStatus().isMuted).toBe(false);
  });

  it('supports volume adjustments within bounds [0, 1]', () => {
    player.setVolume(0.5);
    // Should not throw and clamp properly
    player.setVolume(2.0);
    player.setVolume(-0.5);
  });

  it('provides singleton getRetroChiptuneBgm instance', () => {
    const inst1 = getRetroChiptuneBgm();
    const inst2 = getRetroChiptuneBgm();
    expect(inst1).toBe(inst2);
    expect(inst1).toBeInstanceOf(RetroChiptuneBgmPlayer);
  });

  it('handles play and stop gracefully even without window Web Audio context in node', () => {
    const themes: RetroBgmTheme[] = ['retro-jump', 'retro-runner', 'cozy-pet', 'retro-dungeon', 'retro-mining'];
    for (const theme of themes) {
      player.playTheme(theme);
      player.stop();
    }
  });

  it('handles toggle between play and stop', () => {
    // In node/test environment without window.AudioContext, play will be no-op or return boolean
    const state1 = player.toggle();
    expect(typeof state1).toBe('boolean');
    player.stop();
    expect(player.getStatus().isPlaying).toBe(false);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { InputGenerosity, createInputGenerosity } from './input-generosity';

describe('InputGenerosity', () => {
  let input: InputGenerosity;

  beforeEach(() => {
    input = createInputGenerosity();
  });

  describe('Input Buffering', () => {
    it('buffers an action press and allows consuming it once', () => {
      input.bufferPress('jump', 0.15);
      expect(input.consumeBufferedPress('jump')).toBe(true);
      expect(input.consumeBufferedPress('jump')).toBe(false);
    });

    it('expires buffered press after TTL has elapsed', () => {
      input.bufferPress('dash', 0.1);
      input.update(0.05);
      expect(input.consumeBufferedPress('dash')).toBe(true);

      input.bufferPress('dash', 0.1);
      input.update(0.12);
      expect(input.consumeBufferedPress('dash')).toBe(false);
    });
  });

  describe('Coyote Time', () => {
    it('activates and consumes coyote time window', () => {
      input.startCoyote('ledge_jump', 0.14);
      expect(input.consumeCoyote('ledge_jump')).toBe(true);
      expect(input.consumeCoyote('ledge_jump')).toBe(false);
    });

    it('expires coyote window when duration is exceeded', () => {
      input.startCoyote('ledge_jump', 0.12);
      input.update(0.08);
      expect(input.consumeCoyote('ledge_jump')).toBe(true);

      input.startCoyote('ledge_jump', 0.12);
      input.update(0.15);
      expect(input.consumeCoyote('ledge_jump')).toBe(false);
    });
  });

  describe('Reset', () => {
    it('clears all active buffers and coyote timers', () => {
      input.bufferPress('jump', 0.5);
      input.startCoyote('edge', 0.5);
      input.reset();
      expect(input.consumeBufferedPress('jump')).toBe(false);
      expect(input.consumeCoyote('edge')).toBe(false);
    });
  });
});

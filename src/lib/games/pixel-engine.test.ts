import { describe, it, expect, vi } from "vitest";
import {
  hexToRgb,
  computeIntegerPixelScale,
  parsePixelMatrix,
  PixelCanvasBuffer,
  RetroChiptuneSynth,
  PICO8_PALETTE,
  GAMEBOY_PALETTE,
} from "./pixel-engine";

describe("Pixel Engine - Palettes & Color", () => {
  it("converts 6-digit hex color to RGB correctly", () => {
    const rgb = hexToRgb("#FF004D");
    expect(rgb.r).toBe(255);
    expect(rgb.g).toBe(0);
    expect(rgb.b).toBe(77);
    expect(rgb.a).toBe(255);
  });

  it("converts 3-digit hex color correctly", () => {
    const rgb = hexToRgb("#F05");
    expect(rgb.r).toBe(255);
    expect(rgb.g).toBe(0);
    expect(rgb.b).toBe(85);
  });

  it("PICO-8 palette has 16 distinct colors", () => {
    expect(PICO8_PALETTE.length).toBe(16);
    const unique = new Set(PICO8_PALETTE);
    expect(unique.size).toBe(16);
  });

  it("GameBoy DMG palette has 4 shades", () => {
    expect(GAMEBOY_PALETTE.length).toBe(4);
  });
});

describe("Pixel Engine - Integer Viewport Scaling", () => {
  it("calculates exact integer scaling factors without fractional tearing", () => {
    // 160x144 (GameBoy resolution) inside a 800x600 screen
    // 800 / 160 = 5.0, 600 / 144 = 4.166 => scale should be integer 4
    const fit = computeIntegerPixelScale(800, 600, 160, 144);
    expect(fit.scale).toBe(4);
    expect(fit.width).toBe(640);
    expect(fit.height).toBe(576);
    expect(fit.offsetX).toBe((800 - 640) / 2);
    expect(fit.offsetY).toBe((600 - 576) / 2);
  });

  it("respects maxScale and minScale constraints", () => {
    const fit = computeIntegerPixelScale(1920, 1080, 160, 144, { maxScale: 3 });
    expect(fit.scale).toBe(3);
    expect(fit.width).toBe(480);
    expect(fit.height).toBe(432);
  });

  it("handles fractional scaling gracefully when screen is smaller than native resolution", () => {
    const fit = computeIntegerPixelScale(100, 100, 200, 200);
    expect(fit.scale).toBe(0.5);
    expect(fit.width).toBe(100);
    expect(fit.height).toBe(100);
  });
});

describe("Pixel Engine - ASCII Matrix Sprite Parser", () => {
  it("parses ASCII sprite matrices into palette indices", () => {
    const sprite = parsePixelMatrix([
      "..88..",
      ".8888.",
      "881188",
      ".8888.",
    ]);
    expect(sprite.width).toBe(6);
    expect(sprite.height).toBe(4);
    expect(sprite.pixels.length).toBe(24);

    // First row: '.' is -1, '8' is 8
    expect(sprite.pixels[0]).toBe(-1);
    expect(sprite.pixels[1]).toBe(-1);
    expect(sprite.pixels[2]).toBe(8);
    expect(sprite.pixels[3]).toBe(8);
    expect(sprite.pixels[4]).toBe(-1);
    expect(sprite.pixels[5]).toBe(-1);

    // Row 2: '1' is 1
    expect(sprite.pixels[14]).toBe(1);
    expect(sprite.pixels[15]).toBe(1);
  });

  it("handles empty matrices gracefully", () => {
    const sprite = parsePixelMatrix([]);
    expect(sprite.width).toBe(0);
    expect(sprite.height).toBe(0);
    expect(sprite.pixels.length).toBe(0);
  });

  it("supports custom character mappings", () => {
    const sprite = parsePixelMatrix(["#X"], { "#": 0, X: 7 });
    expect(sprite.pixels[0]).toBe(0);
    expect(sprite.pixels[1]).toBe(7);
  });
});

describe("Pixel Engine - PixelCanvasBuffer Primitives", () => {
  it("draws points and clears buffer", () => {
    const buffer = new PixelCanvasBuffer(16, 16);
    expect(buffer.pget(4, 4)).toBe(0);

    buffer.pset(4, 4, 8);
    expect(buffer.pget(4, 4)).toBe(8);

    buffer.cls(1);
    expect(buffer.pget(4, 4)).toBe(1);
  });

  it("ignores out of bounds coordinate writes safely", () => {
    const buffer = new PixelCanvasBuffer(8, 8);
    buffer.pset(-1, 0, 5);
    buffer.pset(8, 0, 5);
    buffer.pset(0, -1, 5);
    buffer.pset(0, 8, 5);
    expect(buffer.pget(-1, 0)).toBe(-1);
    expect(buffer.pget(8, 0)).toBe(-1);
  });

  it("draws straight and diagonal lines with Bresenham algorithm", () => {
    const buffer = new PixelCanvasBuffer(10, 10);
    buffer.line(0, 0, 3, 3, 10); // diagonal
    expect(buffer.pget(0, 0)).toBe(10);
    expect(buffer.pget(1, 1)).toBe(10);
    expect(buffer.pget(2, 2)).toBe(10);
    expect(buffer.pget(3, 3)).toBe(10);
    expect(buffer.pget(0, 1)).toBe(0); // adjacent cell untouched
  });

  it("draws stroked and filled rectangles", () => {
    const buffer = new PixelCanvasBuffer(10, 10);
    buffer.rect(2, 2, 4, 4, 3, true); // filled 4x4
    for (let y = 2; y < 6; y++) {
      for (let x = 2; x < 6; x++) {
        expect(buffer.pget(x, y)).toBe(3);
      }
    }
  });

  it("draws sprites with flipping and scaling", () => {
    const buffer = new PixelCanvasBuffer(16, 16);
    const sprite = parsePixelMatrix([
      "8.",
      "12",
    ]);

    // Draw normal
    buffer.drawSprite(0, 0, sprite);
    expect(buffer.pget(0, 0)).toBe(8);
    expect(buffer.pget(1, 0)).toBe(0); // transparent pixel preserves background (0)
    expect(buffer.pget(0, 1)).toBe(1);
    expect(buffer.pget(1, 1)).toBe(2);

    // Draw flipped horizontally
    buffer.drawSprite(4, 0, sprite, { flipX: true });
    expect(buffer.pget(4, 0)).toBe(0); // transparent flipped to left, preserves background (0)
    expect(buffer.pget(5, 0)).toBe(8);
    expect(buffer.pget(4, 1)).toBe(2);
    expect(buffer.pget(5, 1)).toBe(1);
  });

  it("renders retro bitmap font text into pixel buffer", () => {
    const buffer = new PixelCanvasBuffer(32, 16);
    buffer.drawText("HI", 0, 0, 7);
    // H has pixels in first column
    expect(buffer.pget(0, 0)).toBe(7);
  });
});

describe("Pixel Engine - RetroChiptuneSynth", () => {
  it("generates 8-bit audio cues without throwing with valid AudioContext mock", () => {
    const mockCtx = {
      currentTime: 0,
      sampleRate: 44100,
      destination: {},
      createOscillator: vi.fn(() => ({
        type: "square",
        frequency: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn().mockReturnThis(),
        start: vi.fn(),
        stop: vi.fn(),
      })),
      createGain: vi.fn(() => ({
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn().mockReturnThis(),
      })),
      createBuffer: vi.fn(() => ({
        getChannelData: vi.fn(() => new Float32Array(100)),
      })),
      createBufferSource: vi.fn(() => ({
        buffer: null,
        connect: vi.fn().mockReturnThis(),
        start: vi.fn(),
        stop: vi.fn(),
      })),
      createBiquadFilter: vi.fn(() => ({
        type: "lowpass",
        frequency: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn().mockReturnThis(),
      })),
    } as unknown as AudioContext;

    expect(() => RetroChiptuneSynth.playJump(mockCtx)).not.toThrow();
    expect(() => RetroChiptuneSynth.playCoin(mockCtx)).not.toThrow();
    expect(() => RetroChiptuneSynth.playLaser(mockCtx)).not.toThrow();
    expect(() => RetroChiptuneSynth.playHit(mockCtx)).not.toThrow();
    expect(() => RetroChiptuneSynth.playExplosion(mockCtx)).not.toThrow();
    expect(() => RetroChiptuneSynth.playPowerup(mockCtx)).not.toThrow();
    expect(() => RetroChiptuneSynth.playBlip(mockCtx)).not.toThrow();
    expect(() => RetroChiptuneSynth.playGameOver(mockCtx)).not.toThrow();

    expect(() => RetroChiptuneSynth.playJump(null)).not.toThrow();
  });
});

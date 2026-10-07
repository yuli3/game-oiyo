// One AudioContext per game, reused for every beep. Opening a context per sound runs into the
// browser's limit after a few dozen moves: the audio device starts erroring and the sound stops.

type AudioContextCtor = new () => AudioContext;

export interface TonePlayer {
  play(frequency: number, duration?: number, volume?: number): void;
  close(): void;
}

function defaultCtor(): AudioContextCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const scope = window as Window & { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext ?? scope.webkitAudioContext;
}

export function createTonePlayer(resolveCtor: () => AudioContextCtor | undefined = defaultCtor): TonePlayer {
  let context: AudioContext | null = null;
  return {
    play(frequency, duration = 0.1, volume = 0.025) {
      try {
        if (!context) {
          const Ctor = resolveCtor();
          if (!Ctor) return;
          context = new Ctor();
        }
        // Mobile browsers suspend the context when the tab goes to the background.
        if (context.state === "suspended") void context.resume();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(volume, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + duration);
      } catch {
        // Sound is decoration. A blocked or broken audio device must not stop the game.
      }
    },
    close() {
      const closing = context;
      context = null;
      if (closing && closing.state !== "closed") void closing.close().catch(() => undefined);
    },
  };
}

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

describe('mobile game interaction contracts', () => {
  it.each(['solitaire', 'freecell'])('%s avoids random SSR deal hydration', (slug) => {
    const route = source(`../../pages/[...lang]/${slug}.astro`);
    expect(route).toContain('client:only="react"');
    expect(route).not.toContain('client:load');
  });

  it('keeps Connect Four fixed-width board inside its own scroller', () => {
    const component = source('../../components/games/ConnectFour.tsx');
    expect(component).toMatch(/className="overflow-x-auto[^\"]*"[^>]*tabIndex=\{-1\}[^>]*>\s*<div\s+className="relative mx-auto"\s+style=\{\{\s*width:/);
  });

  it('keeps Gomoku fixed-cell board inside its own scroller', () => {
    const component = source('../../components/games/Gomoku.tsx');
    expect(component).toMatch(/className="overflow-x-auto[^\"]*"[^>]*>\s*<div\s+className="relative[^"]*"\s+style=\{\{\s*width: BOARD_PX/);
  });

  it('keeps Connect Four mode and level targets at least 44px high', () => {
    const component = source('../../components/games/ConnectFour.tsx');
    expect(component).toMatch(/min-h-11 px-3 py-1\.5 text-xs font-bold[^`]*mode === m/);
    expect(component).toMatch(/min-h-11 px-2\.5 py-1\.5 rounded-lg[^`]*level === lv/);
  });

  it('keeps Gomoku reset, mode, and level targets at least 44px high', () => {
    const component = source('../../components/games/Gomoku.tsx');
    expect(component).toMatch(/onClick=\{reset\} className="min-h-11/);
    expect(component).toMatch(/min-h-11 px-3 py-1\.5 text-xs font-bold[^`]*mode === m/);
    expect(component).toMatch(/min-h-11 px-2\.5 py-1\.5 rounded-lg[^`]*level === lv/);
  });

  it('uses the shared preference hook to simplify Connect Four motion', () => {
    const component = source('../../components/games/ConnectFour.tsx');
    expect(component).toContain('usePrefersReducedMotion');
    expect(component).toMatch(/reducedMotion \? 60 : 320/);
    expect(component).toMatch(/reducedMotion \? '' : 'animate-pulse'/);
    expect(component).toMatch(/isFalling && !reducedMotion \? "animate-fall"/);
    expect(component).toMatch(/\.\.\.\(isFalling && !reducedMotion/);
    expect(component).toMatch(/rounded-full transition-opacity motion-reduce:transition-none/);
  });

  it('keeps Gomoku board and result motion disabled when requested', () => {
    const component = source('../../components/games/Gomoku.tsx');
    expect(component).toMatch(/transition-opacity motion-reduce:transition-none/);
    expect(component).toMatch(/animate-in zoom-in-75 motion-reduce:transform-none motion-reduce:transition-none motion-reduce:animate-none/);
    expect(component).toMatch(/animate-in fade-in zoom-in-95 motion-reduce:animate-none/);
  });
});

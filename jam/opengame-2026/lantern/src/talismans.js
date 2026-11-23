// Talismans (부적) are the run's upgrades. One is chosen after every night.
export const TALISMANS = [
  { id: 'seeds', glyph: '火', name: 'Twin Ember', desc: 'Throw one more flame seed in a fan.', max: 3 },
  { id: 'bloom', glyph: '爆', name: 'Wide Bloom', desc: 'Flame bursts are 25% wider and paint more ground.', max: 3 },
  { id: 'power', glyph: '力', name: 'Ember Heart', desc: 'Bursts deal 30% more damage.', max: 4 },
  { id: 'rate', glyph: '速', name: 'Swift Brush', desc: 'Throw 22% faster.', max: 3 },
  { id: 'lantern', glyph: '光', name: 'Great Lantern', desc: 'More maximum light. Your glow reaches further.', max: 3 },
  { id: 'memory', glyph: '癒', name: 'Warm Memory', desc: 'Painted ground restores light 60% faster.', max: 3 },
  { id: 'thunder', glyph: '雷', name: 'Thunder Seal', desc: 'Bursts arc lightning to nearby dokkaebi.', max: 3 },
  { id: 'firefly', glyph: '螢', name: 'Firefly Choir', desc: 'A firefly circles you and burns what it touches.', max: 4 },
  { id: 'phoenix', glyph: '鳳', name: 'Phoenix Step', desc: 'Dash leaves a trail of fire and recovers faster.', max: 2 },
  { id: 'pierce', glyph: '貫', name: 'Piercing Light', desc: 'Seeds pass through one more dokkaebi before blooming.', max: 2 },
  { id: 'ward', glyph: '守', name: 'Guardian Ward', desc: 'Take 15% less harm.', max: 3 },
  { id: 'hunger', glyph: '吸', name: 'Hungry Flame', desc: 'Every kill feeds your lantern.', max: 3 },
  { id: 'bind', glyph: '縛', name: 'Binding Glow', desc: 'Dokkaebi inside your light move 15% slower.', max: 3 },
];

export function baseStats() {
  return {
    maxLight: 100,
    seeds: 1,
    burstRadius: 2.6,
    damage: 18,
    fireDelay: 0.34,
    regen: 5,
    thunder: 0,
    fireflies: 0,
    phoenix: 0,
    pierce: 0,
    ward: 0,
    hunger: 0,
    bind: 0,
    dashCooldown: 1.3,
  };
}

export function applyTalismans(levels) {
  const s = baseStats();
  const L = (id) => levels[id] || 0;
  s.seeds += L('seeds');
  s.burstRadius *= 1 + 0.25 * L('bloom');
  s.damage *= 1 + 0.3 * L('power');
  s.fireDelay /= 1 + 0.22 * L('rate');
  s.maxLight += 25 * L('lantern');
  s.regen *= 1 + 0.6 * L('memory');
  s.thunder = L('thunder');
  s.fireflies = L('firefly');
  s.phoenix = L('phoenix');
  s.dashCooldown *= 1 - 0.25 * L('phoenix');
  s.pierce = L('pierce');
  s.ward = Math.min(0.45, 0.15 * L('ward'));
  s.hunger = 2.5 * L('hunger');
  s.bind = 0.15 * L('bind');
  return s;
}

export function offerTalismans(levels, rng, n = 3) {
  const pool = TALISMANS.filter((t) => (levels[t.id] || 0) < t.max);
  rng.shuffle(pool);
  return pool.slice(0, n);
}

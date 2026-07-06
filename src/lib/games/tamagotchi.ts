// Tamagotchi simulation — ported from ahoxy-legacy (use-pet hook, 1000 lines)
// as pure functions over a Pet value. The component owns persistence
// (localStorage) and timers; everything here is deterministic given `now`.

export type PetType = 'dog' | 'cat' | 'bird' | 'dragon';
export type PetStage = 'egg' | 'baby' | 'child' | 'adult';
export type PetState =
    | 'normal' | 'happy' | 'sad' | 'sick' | 'hungry' | 'dirty'
    | 'walking' | 'hopping' | 'sleeping' | 'excited' | 'bored'
    | 'playing' | 'cleaning' | 'feeding' | 'drinking' | 'healing'
    | 'confused' | 'loving' | 'curious' | 'mischievous' | 'dead';

export type MealTime = 'breakfast' | 'lunch' | 'dinner';
export type ActionName = 'feed' | 'water' | 'play' | 'clean' | 'heal' | 'pet';

export interface MealStatus {
    breakfast: string | null;
    lunch: string | null;
    dinner: string | null;
    streak: number;
}

export interface Pet {
    name: string;
    type: PetType;
    stage: PetStage;
    state: PetState;
    age: number;
    hunger: number;
    thirst: number;
    happiness: number;
    cleanliness: number;
    health: number;
    isSick: boolean;
    lastInteraction: string;
    birthTime: string;
    deathTime?: string;
    lastWalkTime: string | null;
    mealStatus: MealStatus;
    actionCooldowns: Partial<Record<ActionName, string | null>>;
}

export const MAX_AGE_DAYS = 365;
export const WALK_COOLDOWN_HOURS = 4;

// Cooldowns in minutes
export const COOLDOWN_TIMES: Record<ActionName, number> = {
    feed: 30, water: 20, play: 45, clean: 60, heal: 120, pet: 5,
};

export function createPet(name: string, now = new Date()): Pet {
    // 10% chance to hatch the hidden dragon
    const types: PetType[] = ['dog', 'cat', 'bird'];
    const type: PetType = Math.random() < 0.1 ? 'dragon' : types[Math.floor(Math.random() * types.length)];
    return {
        name, type,
        stage: 'egg', state: 'normal', age: 0,
        hunger: 100, thirst: 100, happiness: 100, cleanliness: 100, health: 100,
        isSick: false,
        lastInteraction: now.toISOString(),
        birthTime: now.toISOString(),
        lastWalkTime: null,
        mealStatus: { breakfast: null, lunch: null, dinner: null, streak: 0 },
        actionCooldowns: {},
    };
}

export function isOnCooldown(pet: Pet, action: ActionName, now = new Date()): boolean {
    // generous shortcut: high stats skip the cooldown entirely
    if (action === 'feed' && pet.hunger > 55) return false;
    if (action === 'water' && pet.thirst > 55) return false;
    if (action === 'clean' && pet.cleanliness > 55) return false;
    const until = pet.actionCooldowns[action];
    return !!until && now < new Date(until);
}

export function cooldownRemainingMin(pet: Pet, action: ActionName, now = new Date()): number {
    const until = pet.actionCooldowns[action];
    if (!until) return 0;
    return Math.max(0, Math.ceil((new Date(until).getTime() - now.getTime()) / 60000));
}

function withCooldown(pet: Pet, action: ActionName, now: Date): Pet {
    const end = new Date(now.getTime() + COOLDOWN_TIMES[action] * 60000);
    return { ...pet, actionCooldowns: { ...pet.actionCooldowns, [action]: end.toISOString() } };
}

// ── time step ────────────────────────────────────────────────────────────────

export interface TickResult { pet: Pet; message: string | null }

// A single catch-up applies at most 3 hours' worth of decay. The legacy code
// was uncapped, so any ~4-hour absence killed the pet (and eggs starved before
// they could hatch) — one neglectful absence now hurts badly but is survivable
// from full health; repeated neglect is still fatal.
const MAX_DECAY_MINUTES = 180;

/** Advance the pet by the time elapsed since lastInteraction. */
export function tick(prev: Pet, now = new Date()): TickResult {
    if (!prev.name || prev.state === 'dead') return { pet: prev, message: null };

    const minutesPassed = Math.floor((now.getTime() - new Date(prev.lastInteraction).getTime()) / 60000);
    if (minutesPassed < 1) return { pet: prev, message: null };

    let message: string | null = null;

    const age = Math.floor((now.getTime() - new Date(prev.birthTime).getTime()) / 86400000);

    // eggs don't starve — they only incubate
    if (prev.stage === 'egg') {
        if (age >= 1) {
            return { pet: { ...prev, stage: 'baby', age, lastInteraction: now.toISOString() }, message: 'hatched' };
        }
        return { pet: { ...prev, age, lastInteraction: now.toISOString() }, message: null };
    }

    const decayMin = Math.min(minutesPassed, MAX_DECAY_MINUTES);
    const hunger = Math.max(0, prev.hunger - decayMin * 2);
    const thirst = Math.max(0, prev.thirst - decayMin * 3);
    const happiness = Math.max(0, prev.happiness - decayMin);
    const cleanliness = Math.max(0, prev.cleanliness - decayMin * 0.5);

    const avg = (hunger + thirst + happiness + cleanliness) / 4;
    const health = avg < 30 ? Math.max(0, prev.health - decayMin * 0.5) : prev.health;

    // death: neglect or old age
    if (health <= 0 || age >= MAX_AGE_DAYS) {
        return {
            pet: { ...prev, state: 'dead', deathTime: now.toISOString(), lastInteraction: now.toISOString(), health: 0, age },
            message: health <= 0 ? 'died_neglect' : 'died_old_age',
        };
    }

    // growth stages
    let stage = prev.stage;
    if (prev.stage === 'baby' && age >= 3) { stage = 'child'; message = 'grew_to_child'; }
    else if (prev.stage === 'child' && age >= 7) { stage = 'adult'; message = 'grew_to_adult'; }

    // state machine
    let state = prev.state;
    let isSick = prev.isSick;
    const hour = now.getHours();
    const isNight = hour >= 22 || hour < 6;

    if (isNight && state !== 'sleeping' && Math.random() < 0.1) {
        state = 'sleeping';
        message = message ?? 'sleeping';
    } else if (!isNight && state === 'sleeping') {
        state = 'normal';
        message = message ?? 'woke_up';
    }

    if (state !== 'sleeping') {
        if (hunger < 20 || thirst < 20) state = 'hungry';
        else if (cleanliness < 20) state = 'dirty';
        else if (happiness < 20) state = 'sad';
        else if (health < 30) { state = 'sick'; isSick = true; }
        else if (happiness > 80) state = 'happy';
        else {
            const r = Math.random();
            state = r < 0.03 ? 'bored'
                : r < 0.06 ? 'excited'
                : r < 0.09 ? 'confused'
                : r < 0.12 ? 'loving'
                : r < 0.15 ? 'curious'
                : r < 0.18 ? 'mischievous'
                : 'normal';
        }
    }

    // meal day rollover + streak
    const mealStatus = { ...prev.mealStatus };
    const today = now.toDateString();
    const yesterday = new Date(now.getTime() - 86400000).toDateString();
    const meals: MealTime[] = ['breakfast', 'lunch', 'dinner'];
    const allYesterday = meals.every((m) => {
        const t = prev.mealStatus[m];
        return t && new Date(t).toDateString() === yesterday;
    });
    let rolledOver = false;
    for (const m of meals) {
        const t = mealStatus[m];
        if (t && new Date(t).toDateString() !== today) { mealStatus[m] = null; rolledOver = true; }
    }
    if (rolledOver) mealStatus.streak = allYesterday ? (mealStatus.streak || 0) + 1 : 0;

    // expire cooldowns
    const actionCooldowns = { ...prev.actionCooldowns };
    for (const k of Object.keys(actionCooldowns) as ActionName[]) {
        const t = actionCooldowns[k];
        if (t && now > new Date(t)) actionCooldowns[k] = null;
    }

    return {
        pet: { ...prev, hunger, thirst, happiness, cleanliness, health, age, stage, state, isSick, mealStatus, actionCooldowns, lastInteraction: now.toISOString() },
        message,
    };
}

// ── actions ──────────────────────────────────────────────────────────────────

export interface ActionResult { pet: Pet; message: string; ok: boolean }

function guard(pet: Pet, action: ActionName | null, now: Date): string | null {
    if (pet.state === 'dead') return 'dead_cant_act';
    if (pet.state === 'sleeping') return 'sleeping_cant_act';
    if (action && isOnCooldown(pet, action, now)) return `${action}_cooldown`;
    return null;
}

export function feed(pet: Pet, now = new Date()): ActionResult {
    const g = guard(pet, 'feed', now);
    if (g) return { pet, message: g, ok: false };
    const next = withCooldown({
        ...pet, hunger: Math.min(100, pet.hunger + 30), state: 'feeding', lastInteraction: now.toISOString(),
    }, 'feed', now);
    return { pet: next, message: 'fed', ok: true };
}

export function giveWater(pet: Pet, now = new Date()): ActionResult {
    const g = guard(pet, 'water', now);
    if (g) return { pet, message: g, ok: false };
    const next = withCooldown({
        ...pet, thirst: Math.min(100, pet.thirst + 30), state: 'drinking', lastInteraction: now.toISOString(),
    }, 'water', now);
    return { pet: next, message: 'gave_water', ok: true };
}

export function play(pet: Pet, now = new Date()): ActionResult {
    const g = guard(pet, 'play', now);
    if (g) return { pet, message: g, ok: false };
    const next = withCooldown({
        ...pet,
        happiness: Math.min(100, pet.happiness + 30),
        hunger: Math.max(0, pet.hunger - 5),
        thirst: Math.max(0, pet.thirst - 10),
        state: 'playing', lastInteraction: now.toISOString(),
    }, 'play', now);
    return { pet: next, message: 'played', ok: true };
}

export function clean(pet: Pet, now = new Date()): ActionResult {
    const g = guard(pet, 'clean', now);
    if (g) return { pet, message: g, ok: false };
    const next = withCooldown({
        ...pet, cleanliness: Math.min(100, pet.cleanliness + 50), state: 'cleaning', lastInteraction: now.toISOString(),
    }, 'clean', now);
    return { pet: next, message: 'cleaned', ok: true };
}

export function heal(pet: Pet, now = new Date()): ActionResult {
    if (pet.health > 70) return { pet, message: 'heal_not_needed', ok: false };
    const g = guard(pet, 'heal', now);
    if (g) return { pet, message: g, ok: false };
    const next = withCooldown({
        ...pet, health: Math.min(100, pet.health + 20), state: 'healing', isSick: false, lastInteraction: now.toISOString(),
    }, 'heal', now);
    return { pet: next, message: 'healed', ok: true };
}

export function petPet(pet: Pet, now = new Date()): ActionResult {
    if (pet.state === 'dead') return { pet, message: 'dead_cant_act', ok: false };
    if (pet.state === 'sleeping') {
        return { pet: { ...pet, state: 'confused' }, message: 'woke_up', ok: false };
    }
    if (isOnCooldown(pet, 'pet', now)) return { pet, message: 'pet_cooldown', ok: false };
    const next = withCooldown({
        ...pet, happiness: Math.min(100, pet.happiness + 5), state: 'happy', lastInteraction: now.toISOString(),
    }, 'pet', now);
    return { pet: next, message: 'petted', ok: true };
}

/** Tap the egg: after 6 hours of care it can hatch early. */
export function careForEgg(pet: Pet, now = new Date()): ActionResult {
    if (pet.stage !== 'egg') return { pet, message: 'egg_cared', ok: false };
    const minutes = (now.getTime() - new Date(pet.birthTime).getTime()) / 60000;
    if (minutes > 360) {
        return { pet: { ...pet, stage: 'baby', lastInteraction: now.toISOString() }, message: 'hatched', ok: true };
    }
    return { pet: { ...pet, lastInteraction: now.toISOString() }, message: 'egg_cared', ok: true };
}

export function takeMeal(pet: Pet, meal: MealTime, now = new Date()): ActionResult {
    const g = guard(pet, null, now);
    if (g) return { pet, message: g, ok: false };
    const mealStatus = { ...pet.mealStatus, [meal]: now.toISOString() };
    const today = now.toDateString();
    const allToday = (['breakfast', 'lunch', 'dinner'] as MealTime[]).every((m) => {
        const t = mealStatus[m];
        return t && new Date(t).toDateString() === today;
    });
    const next: Pet = {
        ...pet,
        hunger: Math.min(100, pet.hunger + 40),
        thirst: Math.min(100, pet.thirst + 20),
        happiness: Math.min(100, pet.happiness + 10),
        health: Math.min(100, pet.health + (allToday ? 20 : 10)),
        state: 'feeding', lastInteraction: now.toISOString(),
        mealStatus,
    };
    return { pet: next, message: `meal_${meal}`, ok: true };
}

export function completeWalk(pet: Pet, now = new Date()): ActionResult {
    const g = guard(pet, null, now);
    if (g) return { pet, message: g, ok: false };
    if (!canWalk(pet, now)) return { pet, message: 'walk_unavailable', ok: false };
    const next: Pet = {
        ...pet,
        happiness: Math.min(100, pet.happiness + 40),
        health: Math.min(100, pet.health + 20),
        hunger: Math.max(0, pet.hunger - 10),
        thirst: Math.max(0, pet.thirst - 15),
        state: 'walking', lastInteraction: now.toISOString(), lastWalkTime: now.toISOString(),
    };
    return { pet: next, message: 'walked', ok: true };
}

// ── helpers for the trackers ─────────────────────────────────────────────────

export function currentMealWindow(now = new Date()): MealTime | null {
    const h = now.getHours();
    if (h >= 6 && h < 10) return 'breakfast';
    if (h >= 11 && h < 14) return 'lunch';
    if (h >= 17 && h < 21) return 'dinner';
    return null;
}

export function mealTakenToday(pet: Pet, meal: MealTime, now = new Date()): boolean {
    const t = pet.mealStatus[meal];
    return !!t && new Date(t).toDateString() === now.toDateString();
}

export function canWalk(pet: Pet, now = new Date()): boolean {
    if (!pet.lastWalkTime) return true;
    return (now.getTime() - new Date(pet.lastWalkTime).getTime()) / 3600000 >= WALK_COOLDOWN_HOURS;
}

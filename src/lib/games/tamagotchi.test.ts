import { describe, expect, it } from "vitest";
import { MAX_AGE_DAYS, createPet, explainTamagotchiDeath, tick } from "./tamagotchi";

describe("tamagotchi death", () => {
  it("names neglect vs old age without changing a live pet", () => {
    const now = new Date("2026-08-21T00:00:00.000Z");
    const pet = createPet("Mochi", now);
    expect(explainTamagotchiDeath(pet)).toBeNull();
    expect(pet.stage).toBe("egg");
  });

  it("dies of old age after the age cap", () => {
    const birth = new Date("2025-01-01T00:00:00.000Z");
    const later = new Date(birth.getTime() + (MAX_AGE_DAYS + 1) * 86_400_000);
    const pet = { ...createPet("Mochi", birth), stage: "adult" as const, lastInteraction: birth.toISOString() };
    const result = tick(pet, later);
    expect(result.message).toBe("died_old_age");
    expect(explainTamagotchiDeath(result.pet)).toBe("died_old_age");
  });

  it("dies of neglect when health hits zero", () => {
    const now = new Date("2026-08-21T00:00:00.000Z");
    const later = new Date(now.getTime() + 180 * 60_000);
    const pet = {
      ...createPet("Mochi", now),
      stage: "baby" as const,
      hunger: 0,
      thirst: 0,
      happiness: 0,
      cleanliness: 0,
      health: 1,
    };
    const result = tick(pet, later);
    expect(result.message).toBe("died_neglect");
    expect(explainTamagotchiDeath(result.pet)).toBe("died_neglect");
  });
});

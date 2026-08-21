export type DotPetAction = "feed" | "play" | "rest";
export type DotPetActionFailure = "full" | "tired" | "rested";

export function explainDotPetAction(
  pet: { hunger: number; energy: number },
  action: DotPetAction,
): DotPetActionFailure | null {
  if (action === "feed" && pet.hunger >= 100) return "full";
  if (action === "play" && pet.energy <= 10) return "tired";
  if (action === "rest" && pet.energy >= 100) return "rested";
  return null;
}

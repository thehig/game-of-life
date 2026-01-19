import { describe, expect, it } from "vitest";
import { canCarnivoreEat, createCarnivoreState, eatCarnivore } from "./carnivore.js";

describe("carnivore", () => {
  it("defaults to hunting herbivores", () => {
    const carnivore = createCarnivoreState();
    expect(carnivore.diet).toContain("herbivore");
  });

  it("cannot eat trees or grass", () => {
    expect(canCarnivoreEat({ type: "tree" })).toBe(false);
    expect(canCarnivoreEat({ type: "grass" })).toBe(false);
  });

  it("gains energy based on prey energy at time of kill", () => {
    const carnivore = createCarnivoreState({ energy: 0.1, efficiency: 0.8 });
    const result = eatCarnivore(carnivore, { type: "herbivore", energy: 0.6, satiety: 0.5 });
    expect(result.ate).toBe(true);
    expect(result.energy).toBeGreaterThan(carnivore.energy);
    expect(result.energy).toBeCloseTo(0.1 + 0.6 * 0.8, 5);
  });
});

import { describe, expect, it } from "vitest";
import { chooseBestFood, createOmnivoreState, eatOmnivore } from "./omnivore.js";

describe("omnivore", () => {
  it("defaults to a broad diet", () => {
    const omnivore = createOmnivoreState();
    expect(omnivore.diet.length).toBeGreaterThan(1);
  });

  it("eats any edible entity", () => {
    const omnivore = createOmnivoreState({ energy: 0.2, hunger: 0.6 });
    const result = eatOmnivore(omnivore, { type: "rock", edible: true, energy: 0.2 });
    expect(result.ate).toBe(true);
    expect(result.energy).toBeGreaterThan(omnivore.energy);
  });

  it("prioritizes food based on energy yield", () => {
    const omnivore = createOmnivoreState();
    const best = chooseBestFood(omnivore, [
      { type: "grass", energy: 0.1 },
      { type: "herbivore", energy: 0.6 },
      { type: "tree_leaves", energy: 0.2 }
    ]);
    expect(best?.type).toBe("herbivore");
  });
});

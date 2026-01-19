import { describe, expect, it } from "vitest";
import { canHerbivoreEat, createHerbivoreState, eatHerbivore, tickHerbivore } from "./herbivore.js";

describe("herbivore", () => {
  it("defaults to a grass diet", () => {
    const herbivore = createHerbivoreState();
    expect(herbivore.diet).toContain("grass");
  });

  it("eats grass to recover energy", () => {
    const herbivore = createHerbivoreState({ energy: 0.2, hunger: 0.8 });
    const result = eatHerbivore(herbivore, { type: "grass", energy: 0.3, satiety: 0.4 });
    expect(result.ate).toBe(true);
    expect(result.energy).toBeGreaterThan(herbivore.energy);
    expect(result.hunger).toBeLessThan(herbivore.hunger);
  });

  it("cannot eat trees or bark", () => {
    const herbivore = createHerbivoreState({ canEatLeaves: true });
    expect(canHerbivoreEat(herbivore, { type: "tree" })).toBe(false);
  });

  it("can eat leaves based on tree height or species", () => {
    const herbivore = createHerbivoreState({ canEatLeaves: true, minLeafHeight: 4 });
    expect(canHerbivoreEat(herbivore, { type: "tree_leaves", treeHeight: 3 })).toBe(false);
    expect(canHerbivoreEat(herbivore, { type: "tree_leaves", treeHeight: 6 })).toBe(true);
  });

  it("loses energy and starves without food", () => {
    let herbivore = createHerbivoreState({ energy: 0.2, hunger: 0.8 });
    for (let i = 0; i < 10; i += 1) {
      herbivore = tickHerbivore(herbivore, 1);
    }
    expect(herbivore.isStarving).toBe(true);
    expect(herbivore.energy).toBeLessThan(0.2);
  });
});

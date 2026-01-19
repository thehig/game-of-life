import { describe, expect, it } from "vitest";
import { createOmnivoreState } from "./omnivore.js";

describe("omnivore", () => {
  it("defaults to a broad diet", () => {
    const omnivore = createOmnivoreState();
    expect(omnivore.diet.length).toBeGreaterThan(1);
  });

  it.todo("eats any edible entity");
  it.todo("prioritizes food based on energy yield");
});

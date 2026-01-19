import { describe, expect, it } from "vitest";
import { createCarnivoreState } from "./carnivore.js";

describe("carnivore", () => {
  it("defaults to hunting herbivores", () => {
    const carnivore = createCarnivoreState();
    expect(carnivore.diet).toContain("herbivore");
  });

  it.todo("cannot eat trees or grass");
  it.todo("gains energy based on prey energy at time of kill");
});

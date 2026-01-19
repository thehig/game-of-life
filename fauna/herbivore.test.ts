import { describe, expect, it } from "vitest";
import { createHerbivoreState } from "./herbivore.js";

describe("herbivore", () => {
  it("defaults to a grass diet", () => {
    const herbivore = createHerbivoreState();
    expect(herbivore.diet).toContain("grass");
  });

  it.todo("eats grass to recover energy");
  it.todo("cannot eat trees or bark");
  it.todo("can eat leaves based on tree height or species");
  it.todo("loses energy and starves without food");
});

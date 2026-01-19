import { describe, expect, it } from "vitest";
import { createTreeState, treeModel } from "./tree.js";

describe("tree", () => {
  it("exposes a tree model stub", () => {
    expect(treeModel.id).toBe("tree");
    expect(createTreeState({ height: 5 }).height).toBe(5);
  });

  it.todo("grows slowly relative to grass over long timelines");
  it.todo("casts a circular shade that widens with height");
  it.todo("converts height to a fallen corpse on death");
  it.todo("breaks down corpse into soil and grass over time");
  it.todo("supports fast-weak and slow-strong variations");
  it.todo("scales shade intensity per unit height by species");
});

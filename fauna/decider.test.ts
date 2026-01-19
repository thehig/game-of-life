import { describe, expect, it } from "vitest";
import { createDeciderState } from "./decider.js";

describe("decider", () => {
  it("creates a decider state", () => {
    const decider = createDeciderState();
    expect(decider.intents).toEqual([]);
  });

  it.todo("selects actions based on perceived entities");
  it.todo("runs away from trees when tree-phobic");
  it.todo("moves toward trees when tree-philic");
  it.todo("chooses eating actions when food is available");
});

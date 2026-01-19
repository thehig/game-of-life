import { describe, expect, it } from "vitest";
import { createDeciderState, decideAction } from "./decider.js";

describe("decider", () => {
  it("creates a decider state", () => {
    const decider = createDeciderState();
    expect(decider.intents).toEqual([]);
  });

  it("selects actions based on perceived entities", () => {
    const action = decideAction({
      selfPosition: { x: 0, y: 0 },
      preferences: {
        seekTags: ["water"],
        avoidTags: [],
        eatTags: [],
        weights: { seek: 2, avoid: -3, eat: 5 }
      },
      perceived: [
        { id: "w1", tags: ["water"], position: { x: 1, y: 0 }, distance: 1 }
      ]
    });

    expect(action.kind).toBe("move");
    if (action.kind === "move") {
      expect(action.targetId).toBe("w1");
    }
  });

  it("runs away from trees when tree-phobic", () => {
    const action = decideAction({
      selfPosition: { x: 0, y: 0 },
      preferences: {
        seekTags: [],
        avoidTags: ["tree"],
        eatTags: [],
        weights: { seek: 2, avoid: -3, eat: 5 }
      },
      perceived: [
        { id: "t1", tags: ["tree"], position: { x: 1, y: 0 }, distance: 1 }
      ]
    });

    expect(action.kind).toBe("flee");
    if (action.kind === "flee") {
      expect(action.vector.dx).toBeLessThan(0);
    }
  });

  it("moves toward trees when tree-philic", () => {
    const action = decideAction({
      selfPosition: { x: 0, y: 0 },
      preferences: {
        seekTags: ["tree"],
        avoidTags: [],
        eatTags: [],
        weights: { seek: 2, avoid: -3, eat: 5 }
      },
      perceived: [
        { id: "t1", tags: ["tree"], position: { x: 2, y: 0 }, distance: 2 }
      ]
    });

    expect(action.kind).toBe("move");
    if (action.kind === "move") {
      expect(action.vector.dx).toBeGreaterThan(0);
    }
  });

  it("chooses eating actions when food is available", () => {
    const action = decideAction({
      selfPosition: { x: 0, y: 0 },
      preferences: {
        seekTags: [],
        avoidTags: [],
        eatTags: ["edible"],
        weights: { seek: 2, avoid: -3, eat: 5 }
      },
      perceived: [
        { id: "b1", tags: ["edible"], position: { x: 0, y: 1 }, distance: 1 }
      ]
    });

    expect(action.kind).toBe("eat");
    if (action.kind === "eat") {
      expect(action.targetId).toBe("b1");
    }
  });
});

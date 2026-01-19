import { describe, expect, it } from "vitest";
import { createPercieverState, observeEntities } from "./perciever.js";

describe("perciever", () => {
  it("creates a perciever state with tag matrix", () => {
    const perciever = createPercieverState({ range: 3 });
    expect(perciever.range).toBe(3);
  });

  it("observes nearby entities with creature-specific tags", () => {
    const perciever = createPercieverState({
      range: 3,
      tags: new Map([
        ["tree", ["shade", "obstacle"]],
        ["grass", ["food"]]
      ])
    });
    const self = { x: 0, y: 0 };
    const entities = [
      { id: "t1", type: "tree", position: { x: 2, y: 0 } },
      { id: "g1", type: "grass", position: { x: 4, y: 0 } }
    ];

    const observations = observeEntities(perciever, self, entities);
    expect(observations).toHaveLength(1);
    expect(observations[0].tags).toContain("shade");
  });

  it("returns identified entities with behaviors", () => {
    const perciever = createPercieverState({
      range: 5,
      tags: new Map([["wolf", ["threat"]]]),
      behaviors: new Map([["wolf", ["chase", "howl"]]])
    });
    const observations = observeEntities(perciever, { x: 0, y: 0 }, [
      { id: "w1", type: "wolf", position: { x: 3, y: 4 } }
    ]);

    expect(observations[0].behaviors).toEqual(["chase", "howl"]);
  });

  it("distinguishes identical entities by tag mapping", () => {
    const percieverA = createPercieverState({
      range: 2,
      tags: new Map([["tree", ["safe"]]])
    });
    const percieverB = createPercieverState({
      range: 2,
      tags: new Map([["tree", ["danger"]]])
    });
    const entity = { id: "t1", type: "tree", position: { x: 1, y: 1 } };

    const aTags = observeEntities(percieverA, { x: 0, y: 0 }, [entity])[0].tags;
    const bTags = observeEntities(percieverB, { x: 0, y: 0 }, [entity])[0].tags;

    expect(aTags).not.toEqual(bTags);
    expect(aTags).toContain("safe");
    expect(bTags).toContain("danger");
  });
});

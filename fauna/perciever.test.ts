import { describe, expect, it } from "vitest";
import { createPercieverState } from "./perciever.js";

describe("perciever", () => {
  it("creates a perciever state with tag matrix", () => {
    const perciever = createPercieverState({ range: 3 });
    expect(perciever.range).toBe(3);
  });

  it.todo("observes nearby entities with creature-specific tags");
  it.todo("returns identified entities with behaviors");
  it.todo("distinguishes identical entities by tag mapping");
});

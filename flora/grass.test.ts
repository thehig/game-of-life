import { describe, expect, it } from "vitest";
import { createGrassState, grassModel } from "./grass.js";

describe("grass", () => {
  it("exposes a grass model stub", () => {
    expect(grassModel.id).toBe("grass");
    expect(createGrassState({ height: 2 }).height).toBe(2);
  });

  it.todo("grows to a sunlight-adjusted spread threshold");
  it.todo("spreads in clustered, ring-like patches over time");
  it.todo("slows growth at night relative to daytime");
  it.todo("reduces growth under tree shade");
  it.todo("recovers after grazing with a realistic regrowth curve");
});

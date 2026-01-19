import { describe, expect, it } from "vitest";
import { defaultDefinitions, parseAscii, renderAscii } from "../src/engine/index.js";

describe("ascii serialization", () => {
  it("round trips grid symbols", () => {
    const input = [".~:", "\"H,"].join("\n");
    const world = parseAscii(input, defaultDefinitions, "land");

    expect(world.width).toBe(3);
    expect(world.height).toBe(2);
    expect(renderAscii(world, defaultDefinitions)).toBe(input);
  });
});

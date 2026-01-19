import { beforeAll, describe, expect, it } from "vitest";
import { parseAscii, renderAscii } from "../src/engine/index.js";
import { DefinitionSet } from "../src/engine/types.js";
import { loadDefinitionsFixture } from "./helpers.js";

let definitions: DefinitionSet;

beforeAll(async () => {
  definitions = await loadDefinitionsFixture();
});

describe("ascii serialization", () => {
  it("round trips grid symbols", () => {
    const input = [".~:", "\"H,"].join("\n");
    const world = parseAscii(input, definitions, "land");

    expect(world.width).toBe(3);
    expect(world.height).toBe(2);
    expect(renderAscii(world, definitions)).toBe(input);
  });
});

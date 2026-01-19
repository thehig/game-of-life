import { describe, expect, it } from "vitest";
import { createMoverState } from "./mover.js";

describe("mover", () => {
  it("creates a basic mover state", () => {
    const mover = createMoverState({ energy: 10, speed: 1 });
    expect(mover.energy).toBe(10);
    expect(mover.speed).toBe(1);
  });

  it.todo("spends energy based on movement distance");
  it.todo("charges more energy for faster movement");
  it.todo("blocks movement through impassable media");
  it.todo("varies movement cost by medium and creature type");
  it.todo("allows pathing between shade patches for shade-bound creatures");
});

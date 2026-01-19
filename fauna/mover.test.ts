import { describe, expect, it } from "vitest";
import {
  attemptMove,
  calculateMoveCost,
  canTraverseMedium,
  createMovementProfile,
  createMoverState,
  isShadePath
} from "./mover.js";

describe("mover", () => {
  it("creates a basic mover state", () => {
    const mover = createMoverState({ energy: 10, speed: 1 });
    expect(mover.energy).toBe(10);
    expect(mover.speed).toBe(1);
  });

  it("spends energy based on movement distance", () => {
    const profile = createMovementProfile();
    const shortCost = calculateMoveCost({
      distance: 1,
      speed: 1,
      medium: "land",
      profile
    });
    const longCost = calculateMoveCost({
      distance: 4,
      speed: 1,
      medium: "land",
      profile
    });
    expect(longCost).toBeGreaterThan(shortCost);
  });

  it("charges more energy for faster movement", () => {
    const profile = createMovementProfile();
    const slowCost = calculateMoveCost({
      distance: 2,
      speed: 1,
      medium: "land",
      profile
    });
    const fastCost = calculateMoveCost({
      distance: 2,
      speed: 3,
      medium: "land",
      profile
    });
    expect(fastCost).toBeGreaterThan(slowCost);
  });

  it("blocks movement through impassable media", () => {
    const profile = createMovementProfile({ allowedMedia: ["land", "grass"] });
    expect(canTraverseMedium(profile, "mud")).toBe(false);
    expect(canTraverseMedium(profile, "grass")).toBe(true);
  });

  it("varies movement cost by medium and creature type", () => {
    const swimmer = createMovementProfile({
      mediaCosts: { land: 1, water: 0.9 }
    });
    const walker = createMovementProfile({
      mediaCosts: { land: 1, water: 2.5 }
    });
    const swimmerWater = calculateMoveCost({
      distance: 2,
      speed: 1,
      medium: "water",
      profile: swimmer
    });
    const walkerWater = calculateMoveCost({
      distance: 2,
      speed: 1,
      medium: "water",
      profile: walker
    });
    expect(swimmerWater).toBeLessThan(walkerWater);
  });

  it("allows pathing between shade patches for shade-bound creatures", () => {
    const profile = createMovementProfile({ requiresShade: true });
    const mover = createMoverState({ energy: 5 });
    const shadedPath = [{ isShaded: true }, { isShaded: true }];
    const exposedPath = [{ isShaded: true }, { isShaded: false }];

    expect(isShadePath(shadedPath)).toBe(true);
    expect(isShadePath(exposedPath)).toBe(false);

    const allowed = attemptMove(
      mover,
      { x: 1, y: 0 },
      { medium: "shade", path: shadedPath, speed: 1 },
      profile
    );
    const blocked = attemptMove(
      mover,
      { x: 1, y: 0 },
      { medium: "shade", path: exposedPath, speed: 1 },
      profile
    );

    expect(allowed.moved).toBe(true);
    expect(blocked.moved).toBe(false);
  });
});

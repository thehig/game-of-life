import { describe, expect, it } from "vitest";
import {
  chooseHerdMove,
  choosePackTarget,
  createBodyShape,
  createGuardState,
  createHerdState,
  createPackState,
  createSnakeState,
  getHerdCenter,
  getOccupiedCells,
  guardHerd,
  growSnake,
  moveBody,
  moveSnake
} from "./behaviors.js";

describe("fauna behaviors", () => {
  it("computes herd center", () => {
    const center = getHerdCenter([{ x: 0, y: 0 }, { x: 2, y: 2 }]);
    expect(center).toEqual({ x: 1, y: 1 });
  });

  it("herd moves away from nearby predators", () => {
    const herdState = createHerdState({ threatRadius: 3 });
    const action = chooseHerdMove(
      { x: 0, y: 0 },
      [{ x: 0, y: 0 }, { x: 2, y: 0 }],
      [{ id: "wolf", position: { x: 1, y: 0 } }],
      herdState
    );
    expect(action.kind).toBe("flee");
    expect(action.vector.dx).toBeLessThanOrEqual(0);
  });

  it("selects pack targets by distance and weakness", () => {
    const packState = createPackState({ focusDistance: 6 });
    const target = choosePackTarget(packState, [
      { id: "deer", distance: 4, energy: 0.8 },
      { id: "rabbit", distance: 2, energy: 0.2 }
    ]);
    expect(target?.id).toBe("rabbit");
  });

  it("guards herds by intercepting threats", () => {
    const guardState = createGuardState({ alertRadius: 5 });
    const action = guardHerd(
      { x: 0, y: 0 },
      [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      [{ id: "wolf", position: { x: 3, y: 0 } }],
      guardState
    );
    expect(action.kind).toBe("intercept");
    expect(action.targetId).toBe("wolf");
  });

  it("moves snakes and leaves a trail", () => {
    const snake = createSnakeState({ segments: [{ x: 0, y: 0 }, { x: -1, y: 0 }] });
    const moved = moveSnake(snake, { x: 1, y: 0 });
    expect(moved.segments[0]).toEqual({ x: 1, y: 0 });
    expect(moved.trail).toEqual({ x: -1, y: 0 });

    const grown = growSnake(moved, 2);
    const longer = moveSnake(grown, { x: 1, y: 0 }, true);
    expect(longer.segments.length).toBeGreaterThan(moved.segments.length);
  });

  it("handles multi-cell body footprints", () => {
    const shape = createBodyShape(2, 3);
    const cells = getOccupiedCells({ x: 1, y: 1 }, shape);
    expect(cells).toHaveLength(6);
    expect(cells[0]).toEqual({ x: 1, y: 1 });

    const moved = moveBody({ x: 1, y: 1 }, { dx: 1, dy: -1 });
    expect(moved).toEqual({ x: 2, y: 0 });
  });
});

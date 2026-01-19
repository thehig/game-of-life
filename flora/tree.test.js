import { describe, expect, it } from "vitest";
import {
  createTreeCorpse,
  createTreeState,
  decayCorpse,
  getShadeRadius,
  growTree,
  killTree,
  treeModel,
  treeSpecies
} from "./tree.js";

describe("tree", () => {
  it("exposes a tree model stub", () => {
    expect(treeModel.id).toBe("tree");
    expect(createTreeState({ height: 5 }).height).toBe(5);
  });

  it("grows slowly relative to grass over long timelines", () => {
    let tree = createTreeState({ height: 0, speciesId: "slowStrong" });
    for (let i = 0; i < 100; i += 1) {
      tree = growTree(tree, { sunlight: 1, isShaded: false }, treeSpecies.slowStrong, 1);
    }
    expect(tree.height).toBeGreaterThan(0);
    expect(tree.height).toBeLessThan(5);
  });

  it("casts a circular shade that widens with height", () => {
    const small = getShadeRadius(2, treeSpecies.fastWeak);
    const tall = getShadeRadius(8, treeSpecies.fastWeak);
    expect(tall).toBeGreaterThan(small);
  });

  it("converts height to a fallen corpse on death", () => {
    const tree = createTreeState({ height: 6, speciesId: "fastWeak" });
    const fallen = killTree(tree, treeSpecies.fastWeak);
    expect(fallen.isAlive).toBe(false);
    expect(fallen.corpse.length).toBeGreaterThan(0);
  });

  it("breaks down corpse into soil and grass over time", () => {
    const corpse = createTreeCorpse(createTreeState({ height: 5 }), treeSpecies.fastWeak);
    const decay = decayCorpse(corpse, 2);
    expect(decay.corpse.mass).toBeLessThan(corpse.mass);
    expect(decay.soilGain).toBeGreaterThan(0);
    expect(decay.grassGain).toBeGreaterThan(0);
  });

  it("supports fast-weak and slow-strong variations", () => {
    expect(treeSpecies.fastWeak.growthRate).toBeGreaterThan(treeSpecies.slowStrong.growthRate);
    expect(treeSpecies.fastWeak.strength).toBeLessThan(treeSpecies.slowStrong.strength);
  });

  it("scales shade intensity per unit height by species", () => {
    const height = 6;
    const fastShade = getShadeRadius(height, treeSpecies.fastWeak);
    const slowShade = getShadeRadius(height, treeSpecies.slowStrong);
    expect(slowShade).toBeGreaterThan(fastShade);
  });
});

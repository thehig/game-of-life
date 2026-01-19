import { describe, expect, it } from "vitest";
import {
  advanceFlower,
  climbSupport,
  createCactusState,
  createFlowerProfile,
  createFlowerState,
  createFungusProfile,
  createFungusState,
  seasonalGrowthMultiplier,
  spreadSpores,
  surviveDrought
} from "./traits.js";

describe("flora traits", () => {
  it("applies seasonal growth multipliers", () => {
    const deciduousWinter = seasonalGrowthMultiplier("deciduous", "winter");
    const evergreenWinter = seasonalGrowthMultiplier("evergreen", "winter");
    const deciduousSummer = seasonalGrowthMultiplier("deciduous", "summer");

    expect(deciduousWinter).toBeLessThan(deciduousSummer);
    expect(evergreenWinter).toBeGreaterThan(deciduousWinter);
  });

  it("advances flowering and pollination", () => {
    const profile = createFlowerProfile({ budRate: 1, bloomThreshold: 2, nectarCap: 4 });
    const flower = createFlowerState();
    const sunny = advanceFlower(flower, { sunlight: 1, season: "spring" }, profile);
    const blooming = advanceFlower(sunny, { sunlight: 1, season: "spring" }, profile);
    const pollinated = advanceFlower(
      blooming,
      { sunlight: 1, season: "spring", pollinatorVisits: 2 },
      profile
    );

    expect(blooming.blooms).toBeGreaterThanOrEqual(1);
    expect(pollinated.seeds).toBeGreaterThan(blooming.seeds);
    expect(pollinated.nectar).toBeLessThanOrEqual(profile.nectarCap);
  });

  it("climbs supports without exceeding target height", () => {
    const vine = climbSupport({ height: 0, grip: 0 }, 3);
    const tall = climbSupport(vine, 3);
    expect(tall.height).toBeLessThanOrEqual(3);
    expect(tall.grip).toBeGreaterThan(vine.grip);
  });

  it("spreads spores more in moist conditions", () => {
    const profile = createFungusProfile({ sporeRadius: 1, spreadDensity: 0.6, moistureSensitivity: 1 });
    const fungus = createFungusState({ sporeBank: 0 });
    const dry = spreadSpores(fungus, { moisture: 0.1 }, profile);
    const wet = spreadSpores(fungus, { moisture: 0.9 }, profile);

    expect(wet.targets.length).toBeGreaterThanOrEqual(dry.targets.length);
  });

  it("survives drought by spending water storage", () => {
    const cactus = createCactusState({ waterStorage: 0.2, health: 1 });
    const stressed = surviveDrought(cactus, { moisture: 0 });
    expect(stressed.waterStorage).toBeLessThan(cactus.waterStorage);
  });
});

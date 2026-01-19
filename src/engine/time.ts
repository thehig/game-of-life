import { SimulationTime, SimulationTiming } from "./types.js";

export const getSimulationTime = (tick: number, timing: SimulationTiming): SimulationTime => {
  const cycleLength = timing.dayLength + timing.nightLength;
  const cycleTick = cycleLength === 0 ? 0 : tick % cycleLength;

  if (cycleTick < timing.dayLength) {
    return {
      tick,
      phase: "day",
      phaseTick: cycleTick
    };
  }

  return {
    tick,
    phase: "night",
    phaseTick: cycleTick - timing.dayLength
  };
};

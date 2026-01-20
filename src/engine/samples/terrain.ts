export type TerrainSample = {
  id: string;
  name: string;
  ascii: string;
  color: string;
  fertility: number;
  passable: boolean;
};

export const terrainSamples: TerrainSample[] = [
  {
    id: "land",
    name: "Land",
    ascii: ".",
    color: "#7c5a3a",
    fertility: 0.6,
    passable: true
  },
  {
    id: "dirt",
    name: "Dirt",
    ascii: ",",
    color: "#8a5a44",
    fertility: 0.4,
    passable: true
  },
  {
    id: "soil",
    name: "Soil",
    ascii: ";",
    color: "#7a5338",
    fertility: 0.55,
    passable: true
  },
  {
    id: "rich_soil",
    name: "Rich Soil",
    ascii: "+",
    color: "#6b462f",
    fertility: 0.85,
    passable: true
  },
  {
    id: "toxic_soil",
    name: "Toxic Soil",
    ascii: "!",
    color: "#585145",
    fertility: 0.15,
    passable: true
  },
  {
    id: "mud",
    name: "Mud",
    ascii: "=",
    color: "#604a3a",
    fertility: 0.3,
    passable: true
  },
  {
    id: "sand",
    name: "Sand",
    ascii: ":",
    color: "#c2a468",
    fertility: 0.2,
    passable: true
  },
  {
    id: "shallow_water",
    name: "Shallow Water",
    ascii: "-",
    color: "#4f90a6",
    fertility: 0.12,
    passable: true
  },
  {
    id: "sea",
    name: "Sea",
    ascii: "~",
    color: "#2e6f95",
    fertility: 0.1,
    passable: false
  },
  {
    id: "rock",
    name: "Rock",
    ascii: "#",
    color: "#6f737c",
    fertility: 0.05,
    passable: false
  }
];

export const getTerrainSample = (id: string): TerrainSample | null =>
  terrainSamples.find((sample) => sample.id === id) ?? null;

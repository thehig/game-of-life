export const conwaySpecies = {
  id: "conway"
};

const neighborOffsets = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1]
];

export const createConwayState = (width, height, liveCells = new Set()) => ({
  width,
  height,
  liveCells: new Set(liveCells)
});

const indexFor = (x, y, width) => x + y * width;

export const isAlive = (state, x, y) => state.liveCells.has(indexFor(x, y, state.width));

export const stepConway = (state) => {
  const nextLive = new Set();
  const candidates = new Set();

  for (const cell of state.liveCells) {
    const x = cell % state.width;
    const y = Math.floor(cell / state.width);
    candidates.add(cell);
    for (const [dx, dy] of neighborOffsets) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= state.width || ny >= state.height) continue;
      candidates.add(indexFor(nx, ny, state.width));
    }
  }

  for (const cell of candidates) {
    const x = cell % state.width;
    const y = Math.floor(cell / state.width);
    let neighbors = 0;
    for (const [dx, dy] of neighborOffsets) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= state.width || ny >= state.height) continue;
      if (state.liveCells.has(indexFor(nx, ny, state.width))) neighbors += 1;
    }
    const alive = state.liveCells.has(cell);
    if ((alive && (neighbors === 2 || neighbors === 3)) || (!alive && neighbors === 3)) {
      nextLive.add(cell);
    }
  }

  return { ...state, liveCells: nextLive };
};

export const renderConway = (state) => {
  const lines = [];
  for (let y = 0; y < state.height; y += 1) {
    let line = "";
    for (let x = 0; x < state.width; x += 1) {
      line += isAlive(state, x, y) ? "O" : ".";
    }
    lines.push(line);
  }
  return lines.join("\n");
};

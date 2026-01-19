# Deterministic Life Simulation

A deterministic, data-driven life simulator with a browser UI, CLI UI, and ASCII save/load format. The simulation is a 2D grid of tiles with terrain, flora, and fauna. Rules are deterministic and reproducible, including a Conway mode that mirrors Game of Life behavior.

## Features
- Browser UI with a grid canvas and a side panel for controls and tile inspection.
- CLI UI that mirrors the web panel with ASCII rendering.
- Deterministic rule engine with a Conway rule set.
- Data-driven definitions for terrain, flora, and fauna.
- ASCII save/load format for file interchange and CLI rendering.
- Soil effects from decomposition that enrich or poison growth.

## Config files (player content)
Input:
C:\workspace> notepad config\definitions.json
C:\workspace> notepad config\timing.json

Output:
- Web UI loads config\definitions.json and config\timing.json on startup.
- CLI loads the same files unless overridden by environment variables.

Input (CLI override example):
C:\workspace> set LIFE_DEFINITIONS=config\definitions.json
C:\workspace> set LIFE_TIMING=config\timing.json
C:\workspace> npm run start:cli

Output:
CLI starts with the edited definitions and timing.

## Quick start (web)
Input:
C:\workspace> npm install
C:\workspace> npm run build
C:\workspace> npm run start:web

Output:
Serving dist/web on http://localhost:5173

Then open the URL in your browser.

## Quick start (CLI)
Input:
C:\workspace> npm run build
C:\workspace> npm run start:cli

Output (example):
....."......."....  | Tick: 0
....".......".....  | Mode: PAUSED
..."....H...".....  | Sun: day (0)
..."....T...".....  | Selected: (2, 2)
....."......."....  | Terrain: Land
....."......C"....  | Flora: Grass (nutrition 0.45)
..................  | Fauna: Herbivore (health 10.00, hunger 0.20)
..................  | Shade: 0.00
                  | 
                  | Controls:
                  |  play | pause | step
                  |  fast | slow
                  |  tile x y
                  |  quit

## ASCII save/load format
Input (ASCII grid):
."~
"H,

Output (after parse + render):
."~
"H,

Rules:
- Fauna symbols override flora and terrain.
- Flora symbols override terrain.
- Terrain symbols render when no flora or fauna are present.

## Rule sets
### Ecosystem
- Grass grows in the day, loses nutrition when walked on, and can be eaten by herbivores.
- Trees grow during the day, darken as they grow, and cast shade around them.
- Herbivores move toward grass; carnivores move toward prey.

### Conway
Uses classic Conway rules for live/dead cells. Terrain and flora are ignored.

## Data-driven definitions
Input (file path):
C:\workspace\config\definitions.json

Output (example IDs):
terrain: land, sea, sand, dirt
flora: grass, tree
fauna: herbivore, carnivore, sheep, wolf, conway

Output (example usage):
- Grass grows at a constant rate in the day based on terrain fertility.
- Herbivores only eat flora types listed in their diet.
- Shade reduces growth for nearby tiles.
- Decomposition enriches soil for herbivores and poisons soil for carnivores.

## Tests
Input:
C:\workspace> npm test

Output:
10 passed

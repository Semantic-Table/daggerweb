import { makeRng, randInt, type Rng } from "../rng";

// Génération block-based simplifiée (cf. GDD §4), version DONNÉES PURES :
// aucune dépendance Three.js — on renvoie juste des positions, le rendu et la
// physique sont gérés par les composants React Three Fiber.

export const CELL = 4;
export const WALL_H = 3.5;

export interface WallPanel {
  x: number;
  z: number;
  rot: number; // 0 = mur orienté N/S, PI/2 = mur orienté E/O
}

export interface DungeonData {
  floors: [number, number][]; // centres des cellules praticables
  panels: WallPanel[];
  enemies: [number, number][]; // positions de spawn des ennemis
  spawn: [number, number, number]; // position de l'œil
  size: number;
}

function carve(rng: Rng, size: number): boolean[] {
  const floor = new Array<boolean>(size * size).fill(false);
  const idx = (x: number, y: number) => y * size + x;
  const c = Math.floor(size / 2);

  const walkers = randInt(rng, 3, 5);
  const steps = Math.floor(size * size * 0.12);
  for (let w = 0; w < walkers; w++) {
    let x = c;
    let y = c;
    for (let s = 0; s < steps; s++) {
      floor[idx(x, y)] = true;
      const dir = randInt(rng, 0, 3);
      if (dir === 0 && x > 1) x--;
      else if (dir === 1 && x < size - 2) x++;
      else if (dir === 2 && y > 1) y--;
      else if (dir === 3 && y < size - 2) y++;
    }
  }

  const rooms = randInt(rng, 2, 4);
  for (let r = 0; r < rooms; r++) {
    const rw = randInt(rng, 2, 4);
    const rh = randInt(rng, 2, 4);
    const rx = randInt(rng, 1, size - rw - 1);
    const ry = randInt(rng, 1, size - rh - 1);
    for (let y = ry; y < ry + rh; y++)
      for (let x = rx; x < rx + rw; x++) floor[idx(x, y)] = true;
  }

  floor[idx(c, c)] = true;
  return floor;
}

export function generateDungeon(seed: number): DungeonData {
  const rng = makeRng(seed);
  const size = 24;
  const floor = carve(rng, size);
  const at = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < size && y < size && floor[y * size + x];

  const off = (size * CELL) / 2;
  const toWorld = (gx: number, gy: number): [number, number] => [
    gx * CELL - off + CELL / 2,
    gy * CELL - off + CELL / 2,
  ];

  const floors: [number, number][] = [];
  const panels: WallPanel[] = [];
  const dirs = [
    { dx: 0, dy: -1, rot: 0, ox: 0, oz: -CELL / 2 },
    { dx: 0, dy: 1, rot: 0, ox: 0, oz: CELL / 2 },
    { dx: -1, dy: 0, rot: Math.PI / 2, ox: -CELL / 2, oz: 0 },
    { dx: 1, dy: 0, rot: Math.PI / 2, ox: CELL / 2, oz: 0 },
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!floor[y * size + x]) continue;
      const [wx, wz] = toWorld(x, y);
      floors.push([wx, wz]);
      for (const d of dirs) {
        if (at(x + d.dx, y + d.dy)) continue;
        panels.push({ x: wx + d.ox, z: wz + d.oz, rot: d.rot });
      }
    }
  }

  const [sx, sz] = toWorld(Math.floor(size / 2), Math.floor(size / 2));

  // Ennemis : on tire quelques cases praticables éloignées du point d'entrée.
  const pool = floors.filter(([x, z]) => Math.hypot(x - sx, z - sz) > 12);
  const enemies: [number, number][] = [];
  const n = Math.min(4, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * pool.length);
    enemies.push(pool.splice(idx, 1)[0]);
  }

  return { floors, panels, enemies, spawn: [sx, 1.6, sz], size };
}

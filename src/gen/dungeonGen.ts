import { makeRng, randInt, type Rng } from "../rng";
import {
  DUNGEON_SIZE,
  DUNGEON_CELL_RATIO,
  DUNGEON_ENEMY_MIN_DIST,
  DUNGEON_MAX_ENEMIES,
} from "../config";
import {
  WallBlockType,
  FloorBlockType,
  CeilingBlockType,
  getRandomWallType,
  getRandomFloorType,
  getRandomCeilingType,
} from "./blockTypes";

// Génération block-based simplifiée (cf. GDD §4), version DONNÉES PURES :
// aucune dépendance Three.js — on renvoie juste des positions et types, le rendu et la
// physique sont gérés par les composants React Three Fiber.

export const CELL = 4;
export const WALL_H = 3.5;

// Interface pour un panneau de mur avec son type
export interface WallPanel {
  x: number;
  z: number;
  rot: number; // 0 = mur orienté N/S, PI/2 = mur orienté E/O
  blockType: WallBlockType; // Type de bloc pour ce panneau
}

// Interface pour une cellule de sol avec son type
export interface FloorCell {
  x: number;
  z: number;
  blockType: FloorBlockType; // Type de bloc pour ce sol
}

// Interface pour une cellule de plafond avec son type
export interface CeilingCell {
  x: number;
  z: number;
  blockType: CeilingBlockType; // Type de bloc pour ce plafond
}

export interface DungeonData {
  floors: FloorCell[]; // cellules de sol avec leurs types
  panels: WallPanel[];
  ceilings: CeilingCell[]; // cellules de plafond avec leurs types
  enemies: [number, number][]; // positions de spawn des ennemis
  spawn: [number, number, number]; // position de l'œil
  exit: [number, number, number]; // seuil de retour vers l'overworld
  exitRot: number; // orientation du seuil (Y)
  size: number;
  seed: number; // seed utilisé pour la génération (pour la reproductibilité)
}

function carve(rng: Rng, size: number): boolean[] {
  const floor = new Array<boolean>(size * size).fill(false);
  const idx = (x: number, y: number) => y * size + x;
  const c = Math.floor(size / 2);

  const walkers = randInt(rng, 3, 5);
  const steps = Math.floor(size * size * DUNGEON_CELL_RATIO);
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
  const size = DUNGEON_SIZE;
  const floor = carve(rng, size);
  const at = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < size && y < size && floor[y * size + x];

  const off = (size * CELL) / 2;
  const toWorld = (gx: number, gy: number): [number, number] => [
    gx * CELL - off + CELL / 2,
    gy * CELL - off + CELL / 2,
  ];

  const floors: FloorCell[] = [];
  const panels: WallPanel[] = [];
  const ceilings: CeilingCell[] = [];
  
  const dirs = [
    { dx: 0, dy: -1, rot: 0, ox: 0, oz: -CELL / 2 },
    { dx: 0, dy: 1, rot: 0, ox: 0, oz: CELL / 2 },
    { dx: -1, dy: 0, rot: Math.PI / 2, ox: -CELL / 2, oz: 0 },
    { dx: 1, dy: 0, rot: Math.PI / 2, ox: CELL / 2, oz: 0 },
  ];

  // Compteur pour l'attribution déterministe des types de blocs
  let floorIndex = 0;
  let wallIndex = 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!floor[y * size + x]) continue;
      const [wx, wz] = toWorld(x, y);
      
      // Attribuer un type de sol (déterministe basé sur seed + position)
      const floorType = getRandomFloorType(seed, floorIndex);
      floors.push({ x: wx, z: wz, blockType: floorType });
      floorIndex++;
      
      // Attribuer un type de plafond (déterministe basé sur seed + position)
      const ceilingType = getRandomCeilingType(seed, floorIndex);
      ceilings.push({ x: wx, z: wz, blockType: ceilingType });
      
      // Créer les murs autour de cette cellule
      for (const d of dirs) {
        if (at(x + d.dx, y + d.dy)) continue;
        const wallType = getRandomWallType(seed, wallIndex);
        panels.push({ 
          x: wx + d.ox, 
          z: wz + d.oz, 
          rot: d.rot,
          blockType: wallType 
        });
        wallIndex++;
      }
    }
  }

  const cc = Math.floor(size / 2);
  const [sx, sz] = toWorld(cc, cc);

  // Sortie : seuil de retour à l'overworld, plaqué contre un mur jouxtant la
  // case d'entrée (centre). On l'oriente comme le panneau de mur correspondant.
  // Fallback (centre cerné de sol) : sur la case d'entrée, rot 0.
  let exit: [number, number, number] = [sx, 0, sz];
  let exitRot = 0;
  for (const d of dirs) {
    if (at(cc + d.dx, cc + d.dy)) continue;
    exit = [sx + d.ox * 0.9, 0, sz + d.oz * 0.9];
    exitRot = d.rot;
    break;
  }

  // Ennemis : on tire quelques cases praticables éloignées du point d'entrée.
  const pool = floors.filter((f) => Math.hypot(f.x - sx, f.z - sz) > DUNGEON_ENEMY_MIN_DIST);
  const enemies: [number, number][] = [];
  const n = Math.min(DUNGEON_MAX_ENEMIES, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * pool.length);
    const enemyPos = pool.splice(idx, 1)[0];
    enemies.push([enemyPos.x, enemyPos.z]);
  }

  return { 
    floors, 
    panels, 
    ceilings,
    enemies, 
    spawn: [sx, 1.6, sz], 
    exit, 
    exitRot, 
    size,
    seed 
  };
}

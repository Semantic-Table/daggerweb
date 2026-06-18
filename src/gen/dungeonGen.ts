import { makeRng, randInt, type Rng } from "../rng";
import {
  CELL,
  DUNGEON_SIZE,
  DUNGEON_ENEMY_MIN_DIST,
  DUNGEON_ENEMY_BASE,
  DUNGEON_ENEMY_PER_LEVEL,
  DUNGEON_MAX_ENEMIES,
  LEVEL_MAX,
} from "../config";
import {
  WallBlockType,
  FloorBlockType,
  CeilingBlockType,
  getRandomWallType,
  getRandomFloorType,
  getRandomCeilingType,
} from "./blockTypes";

// Génération block-based (cf. GDD §4), version DONNÉES PURES : aucune dépendance
// Three.js — on renvoie juste des positions, le rendu et la physique sont gérés
// par les composants React Three Fiber.
//
// Approche : salles rectangulaires posées sur une grille d'occupation, reliées
// par des couloirs en L. La grille garantit l'absence de chevauchement, et le
// chaînage des salles garantit la connexité. Tout l'aléatoire passe par `rng.ts`
// (même seed ⇒ même donjon).

// CELL vient de config.ts (re-exporté ici pour compatibilité avec les imports existants)
export { CELL };
export const WALL_H = 3.5;

// Un panneau de mur (le type de bloc est unique au niveau du donjon, pas par panneau)
export interface WallPanel {
  x: number;
  z: number;
  rot: number; // 0 = mur orienté E/O (s'étend sur X), PI/2 = mur orienté N/S (s'étend sur Z)
}

// Un spawn d'ennemi : position + type (id catalogue) + niveau (≈ niveau du donjon ±).
export interface EnemySpawn {
  x: number;
  z: number;
  typeId: string;
  level: number;
  elite: boolean; // tirage « élite » (niveau donjon + 2)
}

// Types d'ennemis débloqués par niveau de donjon (ids IMPLÉMENTÉS uniquement —
// le rendu passe par getEnemyComponent). Plus le donjon monte, plus le pool s'élargit.
const ENEMY_UNLOCKS: { id: string; level: number }[] = [
  { id: "goblin", level: 1 },
  { id: "wolf", level: 1 },
  { id: "slime", level: 2 },
  { id: "skeleton", level: 3 },
  { id: "orc", level: 5 },
];

export interface DungeonData {
  floors: [number, number][]; // centres monde des cellules praticables
  panels: WallPanel[];
  enemies: EnemySpawn[]; // spawns d'ennemis (position + type + niveau)
  spawn: [number, number, number]; // position de l'œil
  exit: [number, number, number]; // seuil de retour vers l'overworld
  exitRot: number; // orientation du seuil (Y)
  size: number; // dimension de la grille (en cellules)
  seed: number;
  level: number; // niveau de difficulté, hérité de l'entrée (cf. roadmap-niveaux)
  // Types de blocs pour ce donjon (un seul par catégorie)
  wallType: WallBlockType;
  floorType: FloorBlockType;
  ceilingType: CeilingBlockType;
}

// ============================================================================
// PARAMÈTRES
// ============================================================================

const GEN = {
  roomMin: 3, // côté minimum d'une salle (cellules)
  roomMax: 6, // côté maximum
  roomAttempts: 60, // tentatives de placement de salle
  margin: 1, // cellules vides minimales entre deux salles
};

// ============================================================================
// GRILLE D'OCCUPATION
// ============================================================================

type Grid = {
  size: number;
  floor: Uint8Array; // 1 = praticable
};

const idx = (g: Grid, x: number, y: number) => y * g.size + x;
const inBounds = (g: Grid, x: number, y: number) =>
  x >= 1 && y >= 1 && x < g.size - 1 && y < g.size - 1; // garde une bordure pleine
const isFloor = (g: Grid, x: number, y: number) =>
  inBounds(g, x, y) && g.floor[idx(g, x, y)] === 1;

interface Rect {
  x: number; // coin haut-gauche (cellule)
  y: number;
  w: number;
  h: number;
}

const rectCenter = (r: Rect): [number, number] => [
  Math.floor(r.x + r.w / 2),
  Math.floor(r.y + r.h / 2),
];

/** Vrai si `r` (étendu d'une marge) déborde ou recouvre du sol déjà posé. */
function rectCollides(g: Grid, r: Rect, margin: number): boolean {
  for (let y = r.y - margin; y < r.y + r.h + margin; y++) {
    for (let x = r.x - margin; x < r.x + r.w + margin; x++) {
      if (!inBounds(g, x, y)) return true;
      if (g.floor[idx(g, x, y)] === 1) return true;
    }
  }
  return false;
}

function carveRect(g: Grid, r: Rect) {
  for (let y = r.y; y < r.y + r.h; y++)
    for (let x = r.x; x < r.x + r.w; x++)
      if (inBounds(g, x, y)) g.floor[idx(g, x, y)] = 1;
}

/** Couloir en L de 1 cellule de large entre deux points (ordre H puis V aléatoire). */
function carveCorridor(g: Grid, ax: number, ay: number, bx: number, by: number, rng: Rng) {
  const hFirst = rng() < 0.5;
  const carveH = (y: number) => {
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++)
      if (inBounds(g, x, y)) g.floor[idx(g, x, y)] = 1;
  };
  const carveV = (x: number) => {
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++)
      if (inBounds(g, x, y)) g.floor[idx(g, x, y)] = 1;
  };
  if (hFirst) {
    carveH(ay);
    carveV(bx);
  } else {
    carveV(ax);
    carveH(by);
  }
}

// ============================================================================
// GÉNÉRATION
// ============================================================================

export function generateDungeon(seed: number, level: number = 1): DungeonData {
  const rng = makeRng(seed);

  // Un type de bloc par catégorie pour ce donjon (déterministe)
  const wallType = getRandomWallType(seed, 0);
  const floorType = getRandomFloorType(seed, 1);
  const ceilingType = getRandomCeilingType(seed, 2);

  const size = DUNGEON_SIZE;
  const g: Grid = { size, floor: new Uint8Array(size * size) };

  // --- 1. Placer les salles (rejet si chevauchement avec marge) ---
  const rooms: Rect[] = [];
  for (let i = 0; i < GEN.roomAttempts; i++) {
    const w = randInt(rng, GEN.roomMin, GEN.roomMax);
    const h = randInt(rng, GEN.roomMin, GEN.roomMax);
    const x = randInt(rng, 1, size - w - 2);
    const y = randInt(rng, 1, size - h - 2);
    const r: Rect = { x, y, w, h };
    if (rectCollides(g, r, GEN.margin)) continue;
    carveRect(g, r);
    rooms.push(r);
  }

  // Garde-fou : si l'aléatoire a tout rejeté, forcer une salle centrale.
  if (rooms.length === 0) {
    const r: Rect = {
      x: Math.floor(size / 2) - 2,
      y: Math.floor(size / 2) - 2,
      w: 4,
      h: 4,
    };
    carveRect(g, r);
    rooms.push(r);
  }

  // --- 2. Relier chaque salle à la précédente (connexité garantie) ---
  for (let i = 1; i < rooms.length; i++) {
    const [ax, ay] = rectCenter(rooms[i - 1]);
    const [bx, by] = rectCenter(rooms[i]);
    carveCorridor(g, ax, ay, bx, by, rng);
  }

  // --- 3. Construire sols + murs depuis la grille ---
  const off = (size * CELL) / 2;
  const toWorld = (gx: number, gy: number): [number, number] => [
    gx * CELL - off + CELL / 2,
    gy * CELL - off + CELL / 2,
  ];

  const floors: [number, number][] = [];
  const panels: WallPanel[] = [];

  // Côtés : un mur dès qu'une cellule de sol borde le vide.
  const dirs = [
    { dx: 0, dy: -1, rot: 0, ox: 0, oz: -CELL / 2 }, // Nord
    { dx: 0, dy: 1, rot: 0, ox: 0, oz: CELL / 2 }, // Sud
    { dx: -1, dy: 0, rot: Math.PI / 2, ox: -CELL / 2, oz: 0 }, // Ouest
    { dx: 1, dy: 0, rot: Math.PI / 2, ox: CELL / 2, oz: 0 }, // Est
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (g.floor[idx(g, x, y)] !== 1) continue;
      const [wx, wz] = toWorld(x, y);
      floors.push([wx, wz]);
      for (const d of dirs) {
        if (isFloor(g, x + d.dx, y + d.dy)) continue;
        panels.push({ x: wx + d.ox, z: wz + d.oz, rot: d.rot });
      }
    }
  }

  // --- 4. Spawn (centre de la 1re salle) ---
  const spawnRoom = rooms[0];
  const [scx, scy] = rectCenter(spawnRoom);
  const [sx, sz] = toWorld(scx, scy);

  // --- 5. Sortie : centre de la salle la plus éloignée, plaqué contre un mur ---
  let exitRoom = rooms[0];
  let maxDist = -1;
  for (const r of rooms) {
    const [cx, cy] = rectCenter(r);
    const [wx, wz] = toWorld(cx, cy);
    const dist = Math.hypot(wx - sx, wz - sz);
    if (dist > maxDist) {
      maxDist = dist;
      exitRoom = r;
    }
  }
  const [ecx, ecy] = rectCenter(exitRoom);
  const [ex, ez] = toWorld(ecx, ecy);
  let exit: [number, number, number] = [ex, 0, ez];
  let exitRot = 0;
  for (const d of dirs) {
    if (isFloor(g, ecx + d.dx, ecy + d.dy)) continue;
    exit = [ex + d.ox * 0.9, 0, ez + d.oz * 0.9];
    exitRot = d.rot;
    break;
  }

  // --- 6. Ennemis : cases praticables éloignées du spawn (déterministe) ---
  // Composition par niveau (Phase 3) :
  //  • NOMBRE croissant : clamp(round(BASE + PER_LEVEL·(niveau−1)), BASE, MAX).
  //  • TYPE pondéré : poids = 1/(1 + niveau − débloqué). Le type le plus
  //    récemment débloqué (le plus costaud disponible) domine, les anciens
  //    s'estompent sans disparaître → les donjons profonds penchent vers les
  //    ennemis durs, pas une mer de gobelins.
  //  • NIVEAU d'ennemi autour de celui du donjon : ~60% au niveau, ~30% à ±1,
  //    ~10% élite +2.
  const pool = floors.filter(
    ([x, z]) => Math.hypot(x - sx, z - sz) > DUNGEON_ENEMY_MIN_DIST
  );
  const unlocked = ENEMY_UNLOCKS.filter((u) => u.level <= level);
  const weightOf = (u: { level: number }) => 1 / (1 + level - u.level);
  const totalWeight = unlocked.reduce((s, u) => s + weightOf(u), 0);
  const pickType = (): string => {
    let r = rng() * totalWeight;
    for (const u of unlocked) {
      r -= weightOf(u);
      if (r < 0) return u.id;
    }
    return unlocked[unlocked.length - 1].id;
  };

  const enemies: EnemySpawn[] = [];
  const count = Math.max(
    DUNGEON_ENEMY_BASE,
    Math.min(DUNGEON_MAX_ENEMIES, Math.round(DUNGEON_ENEMY_BASE + DUNGEON_ENEMY_PER_LEVEL * (level - 1)))
  );
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const k = Math.floor(rng() * pool.length);
    const [x, z] = pool.splice(k, 1)[0];
    const typeId = pickType();
    const r = rng();
    const offset = r < 0.6 ? 0 : r < 0.9 ? (rng() < 0.5 ? -1 : 1) : 2;
    const eLevel = Math.max(1, Math.min(LEVEL_MAX, level + offset));
    enemies.push({ x, z, typeId, level: eLevel, elite: offset === 2 });
  }

  return {
    floors,
    panels,
    enemies,
    spawn: [sx, 1.6, sz],
    exit,
    exitRot,
    size,
    seed,
    level,
    wallType,
    floorType,
    ceilingType,
  };
}

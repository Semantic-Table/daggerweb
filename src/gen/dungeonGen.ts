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
  getBlockTypeForBiome,
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

// Torche murale : position + normale inward (direction vers le sol)
export interface WallTorch {
  x: number;
  z: number;
  nx: number; // normale inward X
  nz: number; // normale inward Z
}

// Spawn d'un coffre (positionné contre un mur, orienté vers la salle)
export interface ChestSpawn {
  x: number;
  z: number;
  nx: number; // normale inward (mur → salle) — direction vers laquelle le coffre fait face
  nz: number;
}

// Spawn d'une porte (bloque le passage, ouvrable à la main)
export interface DoorSpawn {
  x: number;
  z: number;
  rot: number; // 0 = bloque N/S, PI/2 = bloque E/W
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
  { id: "skeletonArcher", level: 4 },
  { id: "orc", level: 5 },
  { id: "spider", level: 6 },
  { id: "troll", level: 8 },
  { id: "necromancer", level: 10 },
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
  level: number; // niveau de difficulté, hérité de l'entrée
  biome: string; // preset de biome (default / keep / crypt / cave)
  // Types de blocs pour ce donjon (un seul par catégorie)
  wallType: WallBlockType;
  floorType: FloorBlockType;
  ceilingType: CeilingBlockType;
  // Décors procéduraux
  wallTorches: WallTorch[];
  chests: ChestSpawn[];
  doors: DoorSpawn[];
  pillars: [number, number][]; // positions monde des colonnes
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

  // Biome : déterministe par seed
  const BIOMES = ["default", "keep", "crypt", "cave"];
  const biome = BIOMES[Math.floor(rng() * BIOMES.length)];

  // Types de blocs sélectionnés depuis le preset du biome
  const wallType = getBlockTypeForBiome(biome, "wall", seed, 0) as WallBlockType;
  const floorType = getBlockTypeForBiome(biome, "floor", seed, 1) as FloorBlockType;
  const ceilingType = getBlockTypeForBiome(biome, "ceiling", seed, 2) as CeilingBlockType;

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
  const wallTorches: WallTorch[] = [];
  const MAX_TORCHES = 8;

  // Côtés : un mur dès qu'une cellule de sol borde le vide.
  // nx/nz = normale inward (direction mur → sol)
  const dirs = [
    { dx: 0, dy: -1, rot: 0,            ox: 0,         oz: -CELL / 2, nx: 0,  nz: 1  }, // Nord
    { dx: 0, dy: 1,  rot: 0,            ox: 0,         oz:  CELL / 2, nx: 0,  nz: -1 }, // Sud
    { dx: -1, dy: 0, rot: Math.PI / 2,  ox: -CELL / 2, oz: 0,         nx: 1,  nz: 0  }, // Ouest
    { dx: 1,  dy: 0, rot: Math.PI / 2,  ox:  CELL / 2, oz: 0,         nx: -1, nz: 0  }, // Est
  ];

  let panelIdx = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (g.floor[idx(g, x, y)] !== 1) continue;
      const [wx, wz] = toWorld(x, y);
      floors.push([wx, wz]);
      for (const d of dirs) {
        if (isFloor(g, x + d.dx, y + d.dy)) continue;
        const px = wx + d.ox, pz = wz + d.oz;
        panels.push({ x: px, z: pz, rot: d.rot });
        // Torche tous les ~12 panneaux, espacées
        if (panelIdx % 12 === 5 && wallTorches.length < MAX_TORCHES) {
          wallTorches.push({ x: px, z: pz, nx: d.nx, nz: d.nz });
        }
        panelIdx++;
      }
    }
  }

  // --- 4 & 5. Seuil de sortie + spawn du joueur ---
  // Salle de sortie : la plus éloignée du centre de rooms[0].
  const [r0cx, r0cy] = rectCenter(rooms[0]);
  const [r0x, r0z] = toWorld(r0cx, r0cy);
  let exitRoom = rooms[0];
  let maxDist = -1;
  for (const r of rooms) {
    const [cx, cy] = rectCenter(r);
    const [wx, wz] = toWorld(cx, cy);
    const dist = Math.hypot(wx - r0x, wz - r0z);
    if (dist > maxDist) { maxDist = dist; exitRoom = r; }
  }

  // Cherche une cellule du périmètre de exitRoom qui borde un mur réel (pas le centre).
  // Prend la cellule médiane de la première face trouvée pour centrer la porte.
  let exit: [number, number, number] = [r0x, 0, r0z];
  let exitRot = 0;
  let sx = r0x, sz = r0z;

  exitSearch: for (const d of dirs) {
    const wallCells: [number, number][] = [];
    for (let cy = exitRoom.y; cy < exitRoom.y + exitRoom.h; cy++)
      for (let cx = exitRoom.x; cx < exitRoom.x + exitRoom.w; cx++)
        if (isFloor(g, cx, cy) && !isFloor(g, cx + d.dx, cy + d.dy))
          wallCells.push([cx, cy]);
    if (wallCells.length === 0) continue;
    const [wcx, wcy] = wallCells[Math.floor(wallCells.length / 2)];
    const [wx, wz] = toWorld(wcx, wcy);
    exit = [wx + d.ox * 0.95, 0, wz + d.oz * 0.95];
    exitRot = d.rot;
    // Spawn à cette même cellule : le joueur entre par la porte de sortie
    sx = wx;
    sz = wz;
    break exitSearch;
  }

  // --- 6a. Piliers : coins intérieurs des grandes salles (w≥4 ET h≥4) ---
  const pillars: [number, number][] = [];
  for (const room of rooms) {
    if (room.w < 4 || room.h < 4) continue;
    const corners: [number, number][] = [
      [room.x + 1, room.y + 1],
      [room.x + room.w - 2, room.y + 1],
      [room.x + 1, room.y + room.h - 2],
      [room.x + room.w - 2, room.y + room.h - 2],
    ];
    for (const [cx, cy] of corners) {
      if (isFloor(g, cx, cy)) {
        const [px, pz] = toWorld(cx, cy);
        pillars.push([px, pz]);
      }
    }
  }

  // --- 6b. Coffres : contre les murs des salles les plus isolées ---
  // Directions mur (même logique que les panels mais avec normale inward)
  const wallDirs4 = [
    { dx: 0, dy: -1, nx: 0, nz: 1  }, // mur Nord  → coffre face Sud
    { dx: 0, dy:  1, nx: 0, nz: -1 }, // mur Sud   → coffre face Nord
    { dx: -1, dy: 0, nx: 1, nz: 0  }, // mur Ouest → coffre face Est
    { dx:  1, dy: 0, nx: -1, nz: 0 }, // mur Est   → coffre face Ouest
  ];

  const sortedRooms = [...rooms]
    .map((r) => {
      const [cx, cy] = rectCenter(r);
      const [wx, wz] = toWorld(cx, cy);
      return { r, dist: Math.hypot(wx - sx, wz - sz) };
    })
    .sort((a, b) => b.dist - a.dist);

  const MAX_CHESTS = Math.min(4, Math.max(1, Math.floor(rooms.length / 3)));
  const chests: ChestSpawn[] = [];

  for (let i = 0; i < sortedRooms.length && chests.length < MAX_CHESTS; i++) {
    if (i !== 0 && rng() >= 0.5) continue;
    const { r } = sortedRooms[i];

    // Trouver toutes les cellules du bord de la salle adjacentes à un mur
    const candidates: { gx: number; gy: number; nx: number; nz: number }[] = [];
    for (let gy = r.y; gy < r.y + r.h; gy++) {
      for (let gx = r.x; gx < r.x + r.w; gx++) {
        if (!isFloor(g, gx, gy)) continue;
        for (const wd of wallDirs4) {
          if (!isFloor(g, gx + wd.dx, gy + wd.dy)) {
            candidates.push({ gx, gy, nx: wd.nx, nz: wd.nz });
            break; // une direction de mur par cellule suffit
          }
        }
      }
    }
    if (candidates.length === 0) continue;
    const pick = candidates[Math.floor(rng() * candidates.length)];
    const [wx, wz] = toWorld(pick.gx, pick.gy);
    chests.push({ x: wx, z: wz, nx: pick.nx, nz: pick.nz });
  }

  // --- 6c. Portes : segments de couloir droits (pas trop près du spawn) ---
  const doors: DoorSpawn[] = [];
  const MAX_DOORS = 4;
  const MIN_DOOR_DIST_SQ = (CELL * 4) * (CELL * 4); // espacement min entre portes
  const MIN_SPAWN_DIST = DUNGEON_ENEMY_MIN_DIST / 2;

  for (let gy = 1; gy < size - 1 && doors.length < MAX_DOORS; gy++) {
    for (let gx = 1; gx < size - 1 && doors.length < MAX_DOORS; gx++) {
      if (!isFloor(g, gx, gy)) continue;
      const [wx, wz] = toWorld(gx, gy);
      if (Math.hypot(wx - sx, wz - sz) < MIN_SPAWN_DIST) continue;

      const nsFloor = isFloor(g, gx, gy - 1) && isFloor(g, gx, gy + 1);
      const nsWall  = !isFloor(g, gx - 1, gy) && !isFloor(g, gx + 1, gy);
      const ewFloor = isFloor(g, gx - 1, gy) && isFloor(g, gx + 1, gy);
      const ewWall  = !isFloor(g, gx, gy - 1) && !isFloor(g, gx, gy + 1);

      let doorRot: number | null = null;
      if (nsFloor && nsWall) doorRot = 0;
      else if (ewFloor && ewWall) doorRot = Math.PI / 2;
      if (doorRot === null) continue;

      // Éviter les portes trop proches les unes des autres
      const tooClose = doors.some(
        (d) => (d.x - wx) * (d.x - wx) + (d.z - wz) * (d.z - wz) < MIN_DOOR_DIST_SQ
      );
      if (tooClose) continue;
      if (rng() < 0.28) doors.push({ x: wx, z: wz, rot: doorRot });
    }
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
  const blockedPositions = new Set<string>([
    ...pillars.map(([px, pz]) => `${px},${pz}`),
    ...chests.map((c) => `${c.x},${c.z}`),
  ]);
  const pool = floors.filter(
    ([x, z]) =>
      Math.hypot(x - sx, z - sz) > DUNGEON_ENEMY_MIN_DIST &&
      !blockedPositions.has(`${x},${z}`)
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
    biome,
    wallType,
    floorType,
    ceilingType,
    wallTorches,
    chests,
    doors,
    pillars,
  };
}

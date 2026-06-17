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
import {
  DungeonModule,
  ModuleType,
  createModule,
  getAvailableConnectors,
  calculateNewModulePosition,
  MODULE_CELL,
} from "./dungeonModules";

// Génération block-based simplifiée (cf. GDD §4), version DONNÉES PURES :
// aucune dépendance Three.js — on renvoie juste des positions, le rendu et la
// physique sont gérés par les composants React Three Fiber.

// Pour la compatibilité avec le système existant, on garde CELL = 4
export const CELL = 4;
export const WALL_H = 3.5;

// Interface pour un panneau de mur (sans type individuel, le type est au niveau du donjon)
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
  exit: [number, number, number]; // seuil de retour vers l'overworld
  exitRot: number; // orientation du seuil (Y)
  size: number;
  seed: number; // seed utilisé pour la génération
  // Types de blocs pour ce donjon (un seul type par catégorie)
  wallType: WallBlockType;
  floorType: FloorBlockType;
  ceilingType: CeilingBlockType;
}

// ============================================================================
// ANCIEN SYSTÈME (grille creusée) - gardé pour référence
// ============================================================================

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

// ============================================================================
// NOUVEAU SYSTÈME : Génération par modules à connecteurs (GDD §4)
// ============================================================================

/**
 * Paramètres de génération modulaire
 */
const MODULAR_GEN_PARAMS = {
  // Nombre minimum de modules
  minModules: 8,
  // Nombre maximum de modules
  maxModules: 20,
  // Nombre d'itérations max pour essayer d'ajouter un module
  maxAttemptsPerModule: 50,
  // Probabilité d'ajouter un dead-end (vs autres types)
  deadEndWeight: 0.3,
  // Probabilité d'ajouter une salle (vs couloir/angle/T)
  roomWeight: 0.2,
};

/**
 * Génère un donjon en chaînant des modules avec connecteurs
 * @param seed - Seed pour la génération déterministe
 * @param targetModuleCount - Nombre de modules souhaité (optionnel)
 * @returns Liste des modules générés
 */
function generateModularDungeon(
  rng: Rng,
  seed: number,
  targetModuleCount?: number
): DungeonModule[] {
  const modules: DungeonModule[] = [];
  const usedSeeds: Set<number> = new Set();
  
  // Utiliser un sous-seed pour chaque module pour la reproductibilité
  const getModuleSeed = (idx: number): number => seed + idx * 1000;
  
  // Créer le module racine (salle ou couloir au centre)
  const rootType: ModuleType = randInt(rng, 0, 1) === 0 ? "room" : "straight";
  const rootSeed = getModuleSeed(0);
  const rootModule = createModule(rootType, [0, 0], 0, rootSeed);
  modules.push(rootModule);
  usedSeeds.add(rootSeed);
  
  // Nombre de modules à générer
  const desiredCount = targetModuleCount || 
    randInt(rng, MODULAR_GEN_PARAMS.minModules, MODULAR_GEN_PARAMS.maxModules);
  
  let attemptCount = 0;
  const maxAttempts = MODULAR_GEN_PARAMS.maxAttemptsPerModule * desiredCount;
  
  // Tant qu'on n'a pas assez de modules et qu'on a des connecteurs disponibles
  while (modules.length < desiredCount && attemptCount < maxAttempts) {
    attemptCount++;
    
    // Obtenir tous les connecteurs disponibles
    const availableConnectors = getAvailableConnectors(modules);
    
    if (availableConnectors.length === 0) {
      // Plus de connecteurs disponibles, on arrête
      break;
    }
    
    // Choisir un connecteur disponible aléatoirement
    const connIdx = randInt(rng, 0, availableConnectors.length - 1);
    const { module: parentModule, connector: parentConnector } = availableConnectors[connIdx];
    
    // Déterminer le type du nouveau module
    // On pondère pour avoir une bonne distribution
    const typeRoll = rng();
    let newModuleType: ModuleType;
    
    if (typeRoll < MODULAR_GEN_PARAMS.deadEndWeight) {
      newModuleType = "dead-end";
    } else if (typeRoll < MODULAR_GEN_PARAMS.deadEndWeight + MODULAR_GEN_PARAMS.roomWeight) {
      newModuleType = "room";
    } else {
      // Choisir entre straight, corner, t-junction
      const types: ModuleType[] = ["straight", "corner", "t-junction"];
      const subIdx = randInt(rng, 0, types.length - 1);
      newModuleType = types[subIdx];
    }
    
    // Calculer la position et rotation du nouveau module
    const { worldPos, rotation } = calculateNewModulePosition(
      parentModule,
      parentConnector,
      newModuleType
    );
    
    // Vérifier que le nouveau module ne chevauche pas les modules existants
    if (doesModuleOverlap(worldPos, newModuleType, rotation, modules)) {
      continue; // Essayer un autre connecteur
    }
    
    // Créer le nouveau module
    const moduleSeed = getModuleSeed(modules.length);
    const newModule = createModule(newModuleType, worldPos, rotation, moduleSeed);
    modules.push(newModule);
    usedSeeds.add(moduleSeed);
  }
  
  return modules;
}

/**
 * Vérifie si un nouveau module chevaucherait avec les modules existants
 * @param worldPos - Position monde du centre du nouveau module
 * @param moduleType - Type du nouveau module
 * @param rotation - Rotation du nouveau module
 * @param existingModules - Modules existants
 * @returns true si chevauchement détecté
 */
function doesModuleOverlap(
  worldPos: [number, number],
  moduleType: ModuleType,
  rotation: number,
  existingModules: DungeonModule[]
): boolean {
  const { width, height } = { width: 1, height: 3, room: { width: 4, height: 4 }, 
    straight: { width: 1, height: 3 }, corner: { width: 2, height: 2 },
    "t-junction": { width: 3, height: 3 }, "dead-end": { width: 1, height: 2 } }[moduleType] || { width: 1, height: 1 };
  
  // Calculer le bounding box du nouveau module en monde
  // Tenir compte de la rotation
  const halfW = (width * MODULE_CELL) / 2;
  const halfH = (height * MODULE_CELL) / 2;
  
  let minX, maxX, minZ, maxZ;
  
  if (rotation === 0) {
    minX = worldPos[0] - halfW;
    maxX = worldPos[0] + halfW;
    minZ = worldPos[1] - halfH;
    maxZ = worldPos[1] + halfH;
  } else if (rotation === Math.PI / 2) {
    // Rotation 90° : largeur et hauteur sont échangées
    minX = worldPos[0] - halfH;
    maxX = worldPos[0] + halfH;
    minZ = worldPos[1] - halfW;
    maxZ = worldPos[1] + halfW;
  } else if (rotation === Math.PI) {
    minX = worldPos[0] - halfW;
    maxX = worldPos[0] + halfW;
    minZ = worldPos[1] - halfH;
    maxZ = worldPos[1] + halfH;
  } else { // -PI/2
    minX = worldPos[0] - halfH;
    maxX = worldPos[0] + halfH;
    minZ = worldPos[1] - halfW;
    maxZ = worldPos[1] + halfW;
  }
  
  // Vérifier le chevauchement avec chaque module existant
  for (const existing of existingModules) {
    const eHalfW = (existing.width * MODULE_CELL) / 2;
    const eHalfH = (existing.height * MODULE_CELL) / 2;
    
    let eMinX, eMaxX, eMinZ, eMaxZ;
    
    if (existing.rotation === 0) {
      eMinX = existing.worldPos[0] - eHalfW;
      eMaxX = existing.worldPos[0] + eHalfW;
      eMinZ = existing.worldPos[1] - eHalfH;
      eMaxZ = existing.worldPos[1] + eHalfH;
    } else if (existing.rotation === Math.PI / 2) {
      eMinX = existing.worldPos[0] - eHalfH;
      eMaxX = existing.worldPos[0] + eHalfH;
      eMinZ = existing.worldPos[1] - eHalfW;
      eMaxZ = existing.worldPos[1] + eHalfW;
    } else if (existing.rotation === Math.PI) {
      eMinX = existing.worldPos[0] - eHalfW;
      eMaxX = existing.worldPos[0] + eHalfW;
      eMinZ = existing.worldPos[1] - eHalfH;
      eMaxZ = existing.worldPos[1] + eHalfH;
    } else { // -PI/2
      eMinX = existing.worldPos[0] - eHalfH;
      eMaxX = existing.worldPos[0] + eHalfH;
      eMinZ = existing.worldPos[1] - eHalfW;
      eMaxZ = existing.worldPos[1] + eHalfW;
    }
    
    // Chevauchement si les bounding boxes se croisent
    if (maxX < eMinX || minX > eMaxX || maxZ < eMinZ || minZ > eMaxZ) {
      continue; // Pas de chevauchement
    }
    
    // Chevauchement détecté
    return true;
  }
  
  return false;
}

/**
 * Convertit une liste de modules en données de donjon (DungeonData)
 * pour la compatibilité avec le système de rendu existant
 */
function modulesToDungeonData(
  modules: DungeonModule[],
  seed: number,
  wallType: WallBlockType,
  floorType: FloorBlockType,
  ceilingType: CeilingBlockType
): DungeonData {
  // Aggregé tous les sols et panneaux
  const allFloors: [number, number][] = [];
  const allPanels: WallPanel[] = [];
  
  for (const module of modules) {
    allFloors.push(...module.geometry.floors);
    allPanels.push(...module.geometry.panels);
  }
  
  // Trouver la position de spawn (centre du module racine ou premier module)
  const spawnModule = modules[0];
  const spawnX = spawnModule.worldPos[0];
  const spawnZ = spawnModule.worldPos[1];
  
  // Trouver la sortie : on cherche un connecteur "end" ou un dead-end
  // Pour simplifier, on place la sortie à la position la plus éloignée du spawn
  let exitPos: [number, number, number] = [spawnX, 0, spawnZ - 8];
  let exitRot: number = Math.PI;
  
  // Chercher un module de type dead-end pour la sortie
  const deadEndModules = modules.filter(m => m.type === "dead-end");
  if (deadEndModules.length > 0) {
    // Prendre le dead-end le plus éloigné du spawn
    let farthestDeadEnd = deadEndModules[0];
    let maxDist = 0;
    
    for (const de of deadEndModules) {
      const dist = Math.hypot(de.worldPos[0] - spawnX, de.worldPos[1] - spawnZ);
      if (dist > maxDist) {
        maxDist = dist;
        farthestDeadEnd = de;
      }
    }
    
    // Placer la sortie à l'extrémité du dead-end (connecteur "end")
    const endConnector = farthestDeadEnd.connectors.find(c => c.id === "end");
    if (endConnector) {
      const [mx, mz] = farthestDeadEnd.worldPos;
      const [cx, cz] = endConnector.relPos;
      const rot = farthestDeadEnd.rotation;
      
      let ex, ez;
      if (rot === 0) {
        ex = mx + cx * MODULE_CELL;
        ez = mz + cz * MODULE_CELL;
      } else if (rot === Math.PI / 2) {
        ex = mx + cz * MODULE_CELL;
        ez = mz - cx * MODULE_CELL;
      } else if (rot === Math.PI) {
        ex = mx - cx * MODULE_CELL;
        ez = mz - cz * MODULE_CELL;
      } else {
        ex = mx - cz * MODULE_CELL;
        ez = mz + cx * MODULE_CELL;
      }
      
      exitPos = [ex, 0, ez - 0.5]; // Légèrement en retrait
      exitRot = (endConnector.direction + rot + Math.PI) % (2 * Math.PI);
    }
  }
  
  // Calculer une taille approximative pour le donjon
  // Trouver les min/max des positions
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of allFloors) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  
  const sizeX = maxX - minX;
  const sizeZ = maxZ - minZ;
  const size = Math.max(Math.ceil(sizeX / CELL), Math.ceil(sizeZ / CELL), 1);
  
  // Générer les positions pour les ennemis
  const enemies: [number, number][] = [];
  const spawnDistSq = 16 * 16; // Distance minimum au carré (4 cellules)
  
  for (const [x, z] of allFloors) {
    const distSq = (x - spawnX) * (x - spawnX) + (z - spawnZ) * (z - spawnZ);
    if (distSq > spawnDistSq && Math.random() < 0.3) {
      // On prend environ 30% des positions éloignées pour les ennemis
      enemies.push([x, z]);
    }
  }
  
  // Limiter le nombre d'ennemis
  const maxEnemies = Math.min(DUNGEON_MAX_ENEMIES, Math.floor(allFloors.length * 0.2));
  while (enemies.length > maxEnemies) {
    const idx = Math.floor(Math.random() * enemies.length);
    enemies.splice(idx, 1);
  }
  
  return {
    floors: allFloors,
    panels: allPanels,
    enemies,
    spawn: [spawnX, 1.6, spawnZ],
    exit: exitPos,
    exitRot,
    size,
    seed,
    wallType,
    floorType,
    ceilingType,
  };
}

/**
 * Génère un donjon avec le NOUVEAU système modulaire (GDD §4)
 * Remplace la grille creusée par de vrais modules chaînés par connecteurs
 * @param seed - Seed pour la génération déterministe
 * @param useLegacy - Si true, utilise l'ancien système de grille creusée (pour compatibilité)
 * @returns Les données du donjon
 */
export function generateDungeon(seed: number, useLegacy: boolean = false): DungeonData {
  const rng = makeRng(seed);

  // Sélectionner UN type de bloc par catégorie pour ce donjon (déterministe)
  const wallType = getRandomWallType(seed, 0);
  const floorType = getRandomFloorType(seed, 1);
  const ceilingType = getRandomCeilingType(seed, 2);

  // Utiliser le nouveau système modulaire par défaut
  if (!useLegacy) {
    // Générer les modules
    const modules = generateModularDungeon(rng, seed);
    
    // Convertir en DungeonData
    return modulesToDungeonData(modules, seed, wallType, floorType, ceilingType);
  }

  // ============================================================================
  // ANCIEN SYSTÈME (grille creusée) - pour compatibilité/rétrogradation
  // ============================================================================
  
  const size = DUNGEON_SIZE;
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
      
      // Créer les murs autour de cette cellule (sans type individuel)
      for (const d of dirs) {
        if (at(x + d.dx, y + d.dy)) continue;
        panels.push({ 
          x: wx + d.ox, 
          z: wz + d.oz, 
          rot: d.rot
        });
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
  const pool = floors.filter(([x, z]) => Math.hypot(x - sx, z - sz) > DUNGEON_ENEMY_MIN_DIST);
  const enemies: [number, number][] = [];
  const n = Math.min(DUNGEON_MAX_ENEMIES, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * pool.length);
    const enemyPos = pool.splice(idx, 1)[0];
    enemies.push(enemyPos);
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
    wallType,
    floorType,
    ceilingType
  };
}

// Export pour les tests et le debugging
export { generateModularDungeon, modulesToDungeonData };

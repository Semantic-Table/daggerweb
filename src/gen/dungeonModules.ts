import { randInt, type Rng } from "../rng";
import { CELL, type WallPanel } from "./dungeonGen";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Orientation d'un connecteur (correspond aux 4 directions cardinales)
 * 0 = Nord (vers le bas en Z)
 * PI/2 = Est (vers la droite en X)
 * PI = Sud (vers le haut en Z)
 * -PI/2 ou 3*PI/2 = Ouest (vers la gauche en X)
 */
export type ConnectorDirection = number; // 0, Math.PI/2, Math.PI, -Math.PI/2

/**
 * Type de connecteur : entrée ou sortie (ou les deux pour un couloir)
 */
export type ConnectorType = "in" | "out" | "both";

/**
 * Un connecteur est un point d'accroche sur un module
 */
export interface Connector {
  /** Position relative par rapport au centre du module */
  relPos: [number, number]; // [x, z] en coordonnées module
  /** Orientation du connecteur (direction dans laquelle il "regarde") */
  direction: ConnectorDirection;
  /** Type de connecteur */
  type: ConnectorType;
  /** Identifiant unique du connecteur dans le module */
  id: string;
}

/**
 * Type de module de donjon
 */
export type ModuleType = "straight" | "corner" | "t-junction" | "room" | "dead-end";

/**
 * Un module de donjon avec sa géométrie et ses connecteurs
 */
export interface DungeonModule {
  /** Type du module */
  type: ModuleType;
  /** Largeur du module en cellules */
  width: number;
  /** Hauteur/longueur du module en cellules */
  height: number;
  /** Position du centre du module en coordonnées monde */
  worldPos: [number, number];
  /** Rotation du module dans le monde (0, PI/2, PI, -PI/2) */
  rotation: ConnectorDirection;
  /** Liste des connecteurs de ce module (en coordonnées monde) */
  connectors: Connector[];
  /** Géométrie du module : positions des sols et panneaux de mur */
  geometry: {
    floors: [number, number][]; // positions monde des cellules de sol
    panels: WallPanel[]; // panneaux de mur
  };
  /** Seed utilisé pour la génération de ce module */
  seed: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Taille d'une cellule (doit correspondre à CELL dans dungeonGen.ts)
 */
export const MODULE_CELL = CELL;

/**
 * Dimensions des différents types de modules en cellules
 */
export const MODULE_DIMENSIONS: Record<ModuleType, { width: number; height: number }> = {
  straight: { width: 1, height: 3 }, // Couloir droit : 1 cellule de large, 3 de long
  corner: { width: 2, height: 2 }, // Angle : 2x2 cellules (coin)
  "t-junction": { width: 3, height: 3 }, // Jonction T : 3x3 cellules
  room: { width: 4, height: 4 }, // Salle : 4x4 cellules
  "dead-end": { width: 1, height: 2 }, // Cul-de-sac : 1 cellule de large, 2 de long
};

// ============================================================================
// DÉFINITIONS DES CONNECTEURS PAR TYPE DE MODULE
// ============================================================================

/**
 * Définition des connecteurs pour chaque type de module
 * Les positions sont relatives au centre du module (en cellules)
 * Exemple : pour un couloir straight orienté Nord-Sud :
 *   - Connecteur Nord à (0, -height/2) orienté vers le Nord (0)
 *   - Connecteur Sud à (0, height/2) orienté vers le Sud (PI)
 */
const BASE_CONNECTORS: Record<ModuleType, Connector[]> = {
  // Couloir droit : 2 connecteurs aux extrémités
  straight: [
    { relPos: [0, -1.5], direction: 0, type: "both", id: "north" }, // Nord
    { relPos: [0, 1.5], direction: Math.PI, type: "both", id: "south" }, // Sud
  ],
  
  // Angle : 2 connecteurs sur les côtés extérieurs
  corner: [
    { relPos: [-1, 0], direction: Math.PI / 2, type: "both", id: "west" }, // Ouest
    { relPos: [0, 1], direction: Math.PI, type: "both", id: "south" }, // Sud
  ],
  
  // Jonction T : 3 connecteurs
  "t-junction": [
    { relPos: [0, -1.5], direction: 0, type: "both", id: "north" }, // Nord
    { relPos: [-1.5, 0], direction: Math.PI / 2, type: "both", id: "west" }, // Ouest
    { relPos: [1.5, 0], direction: -Math.PI / 2, type: "both", id: "east" }, // Est
  ],
  
  // Salle : 4 connecteurs (un sur chaque côté)
  room: [
    { relPos: [0, -2], direction: 0, type: "both", id: "north" }, // Nord
    { relPos: [0, 2], direction: Math.PI, type: "both", id: "south" }, // Sud
    { relPos: [-2, 0], direction: Math.PI / 2, type: "both", id: "west" }, // Ouest
    { relPos: [2, 0], direction: -Math.PI / 2, type: "both", id: "east" }, // Est
  ],
  
  // Cul-de-sac : 1 connecteur (entrée) + 1 connecteur bloqué (fond)
  "dead-end": [
    { relPos: [0, -1], direction: 0, type: "in", id: "entry" }, // Entrée (Nord)
    { relPos: [0, 1], direction: Math.PI, type: "out", id: "end" }, // Fond (Sud)
  ],
};

// ============================================================================
// GÉOMÉTRIE DES MODULES
// ============================================================================

/**
 * Génère la géométrie (sols + murs) pour un module donné
 * @param moduleType - Type du module
 * @param moduleSeed - Seed pour ce module (pour la variance)
 * @returns Les positions de sol et les panneaux de mur en coordonnées locales au module
 */
function generateModuleGeometry(
  moduleType: ModuleType,
  _moduleSeed: number
): {
  localFloors: [number, number][]; // en coordonnées locales au module (cellules)
  localPanels: { x: number; z: number; rot: number }[]; // en coordonnées locales
} {
  const { width, height } = MODULE_DIMENSIONS[moduleType];
  
  const localFloors: [number, number][] = [];
  const localPanels: { x: number; z: number; rot: number }[] = [];
  
  // Générer les positions de sol pour chaque type de module
  switch (moduleType) {
    case "straight":
      // Couloir droit : ligne de cellules de 1xheight
      for (let z = -Math.floor((height - 1) / 2); z <= Math.floor((height - 1) / 2); z++) {
        localFloors.push([0, z]);
      }
      // Murs des côtés
      for (let z = -Math.floor((height - 1) / 2); z <= Math.floor((height - 1) / 2); z++) {
        // Mur ouest (gauche)
        localPanels.push({ x: -0.5, z, rot: Math.PI / 2 });
        // Mur est (droite)
        localPanels.push({ x: 0.5, z, rot: Math.PI / 2 });
      }
      // Murs aux extrémités
      // Extrémité Nord
      localPanels.push({ x: 0, z: -Math.floor((height - 1) / 2) - 0.5, rot: 0 });
      // Extrémité Sud
      localPanels.push({ x: 0, z: Math.floor((height - 1) / 2) + 0.5, rot: 0 });
      break;
      
    case "corner":
      // Angle : forme en L de 2x2
      for (let x = -1; x <= 0; x++) {
        for (let z = 0; z <= 1; z++) {
          localFloors.push([x, z]);
        }
      }
      // Murs
      // Mur ouest (côté ouest du couloir vertical)
      for (let z = 0; z <= 1; z++) {
        localPanels.push({ x: -1.5, z, rot: Math.PI / 2 });
      }
      // Mur est (côté est du couloir horizontal)
      for (let x = -1; x <= 0; x++) {
        localPanels.push({ x, z: 1.5, rot: 0 });
      }
      // Mur nord (fond du coin)
      localPanels.push({ x: -0.5, z: -0.5, rot: Math.PI / 2 });
      // Mur sud (extrémité sud)
      localPanels.push({ x: 0.5, z: 1.5, rot: Math.PI / 2 });
      break;
      
    case "t-junction":
      // Jonction T : forme en T de 3x3
      // Barre horizontale
      for (let x = -1; x <= 1; x++) {
        localFloors.push([x, 0]);
      }
      // Barre verticale
      for (let z = -1; z <= 1; z++) {
        localFloors.push([0, z]);
      }
      // Murs
      // Côtés de la barre horizontale
      for (let x = -1; x <= 1; x++) {
        localPanels.push({ x, z: -1.5, rot: Math.PI / 2 }); // Sud
        localPanels.push({ x, z: 1.5, rot: Math.PI / 2 }); // Nord
      }
      // Côtés de la barre verticale
      for (let z = -1; z <= 1; z++) {
        localPanels.push({ x: -1.5, z, rot: 0 }); // Ouest
        localPanels.push({ x: 1.5, z, rot: 0 }); // Est
      }
      break;
      
    case "room":
      // Salle : rectangle de width x height
      for (let x = -Math.floor((width - 1) / 2); x <= Math.floor((width - 1) / 2); x++) {
        for (let z = -Math.floor((height - 1) / 2); z <= Math.floor((height - 1) / 2); z++) {
          localFloors.push([x, z]);
        }
      }
      // Murs sur le périmètre
      const hw = Math.floor((width - 1) / 2);
      const hh = Math.floor((height - 1) / 2);
      
      // Mur nord
      for (let x = -hw; x <= hw; x++) {
        localPanels.push({ x, z: -hh - 0.5, rot: 0 });
      }
      // Mur sud
      for (let x = -hw; x <= hw; x++) {
        localPanels.push({ x, z: hh + 0.5, rot: 0 });
      }
      // Mur ouest
      for (let z = -hh; z <= hh; z++) {
        localPanels.push({ x: -hw - 0.5, z, rot: Math.PI / 2 });
      }
      // Mur est
      for (let z = -hh; z <= hh; z++) {
        localPanels.push({ x: hw + 0.5, z, rot: Math.PI / 2 });
      }
      break;
      
    case "dead-end":
      // Cul-de-sac : ligne de 2 cellules
      for (let z = -1; z <= 0; z++) {
        localFloors.push([0, z]);
      }
      // Murs des côtés
      for (let z = -1; z <= 0; z++) {
        localPanels.push({ x: -0.5, z, rot: Math.PI / 2 });
        localPanels.push({ x: 0.5, z, rot: Math.PI / 2 });
      }
      // Mur au fond (Sud)
      localPanels.push({ x: 0, z: 0.5, rot: 0 });
      // Ouverture à l'entrée (Nord) - pas de mur
      break;
  }
  
  return { localFloors, localPanels };
}

// ============================================================================
// FONCTIONS D'AIDE POUR L'ALGORITHME DE CHAÎNAGE
// ============================================================================

/**
 * Trouve un connecteur compatible entre deux modules
 * Deux connecteurs sont compatibles si :
 * - Ils sont face à face (directions opposées)
 * - Leurs positions correspondent
 */
export function areConnectorsCompatible(
  conn1: Connector,
  conn2: Connector,
  module1Pos: [number, number],
  module1Rot: ConnectorDirection,
  module2Pos: [number, number],
  module2Rot: ConnectorDirection
): boolean {
  // Calculer la position monde du connecteur 1
  const [mx1, mz1] = module1Pos;
  const [cx1, cz1] = conn1.relPos;
  
  // Appliquer la rotation du module 1
  const rot1 = module1Rot;
  let wx1, wz1;
  if (rot1 === 0) { // Pas de rotation
    wx1 = mx1 + cx1 * MODULE_CELL;
    wz1 = mz1 + cz1 * MODULE_CELL;
  } else if (rot1 === Math.PI / 2) { // Rotation 90° (vers la droite)
    wx1 = mx1 + cz1 * MODULE_CELL;
    wz1 = mz1 - cx1 * MODULE_CELL;
  } else if (rot1 === Math.PI) { // Rotation 180°
    wx1 = mx1 - cx1 * MODULE_CELL;
    wz1 = mz1 - cz1 * MODULE_CELL;
  } else { // -PI/2 (rotation 90° vers la gauche)
    wx1 = mx1 - cz1 * MODULE_CELL;
    wz1 = mz1 + cx1 * MODULE_CELL;
  }
  
  // Calculer la position monde du connecteur 2
  const [mx2, mz2] = module2Pos;
  const [cx2, cz2] = conn2.relPos;
  
  const rot2 = module2Rot;
  let wx2, wz2;
  if (rot2 === 0) {
    wx2 = mx2 + cx2 * MODULE_CELL;
    wz2 = mz2 + cz2 * MODULE_CELL;
  } else if (rot2 === Math.PI / 2) {
    wx2 = mx2 + cz2 * MODULE_CELL;
    wz2 = mz2 - cx2 * MODULE_CELL;
  } else if (rot2 === Math.PI) {
    wx2 = mx2 - cx2 * MODULE_CELL;
    wz2 = mz2 - cz2 * MODULE_CELL;
  } else {
    wx2 = mx2 - cz2 * MODULE_CELL;
    wz2 = mz2 + cx2 * MODULE_CELL;
  }
  
  // Vérifier si les positions sont proches (avec tolérance)
  const dist = Math.hypot(wx1 - wx2, wz1 - wz2);
  if (dist > MODULE_CELL * 0.6) {
    return false;
  }
  
  // Vérifier si les directions sont opposées (avec tolérance pour la rotation)
  const dir1 = conn1.direction + module1Rot;
  const dir2 = conn2.direction + module2Rot;
  
  // Normaliser les angles
  const normDir1 = ((dir1 + 2 * Math.PI) % (2 * Math.PI)) as ConnectorDirection;
  const normDir2 = ((dir2 + 2 * Math.PI) % (2 * Math.PI)) as ConnectorDirection;
  
  // Directions opposées : 0 et PI, PI/2 et -PI/2
  const opposite = Math.abs(normDir1 - normDir2) % (2 * Math.PI);
  return Math.abs(opposite - Math.PI) < 0.1;
}

/**
 * Calcule la position et rotation d'un nouveau module pour le connecter à un module existant
 * @param existingModule - Module existant
 * @param existingConnector - Connecteur du module existant à utiliser
 * @param newModuleType - Type du nouveau module
 * @returns Position et rotation du nouveau module
 */
export function calculateNewModulePosition(
  existingModule: DungeonModule,
  existingConnector: Connector,
  newModuleType: ModuleType
): { worldPos: [number, number]; rotation: ConnectorDirection } {
  const [mx, mz] = existingModule.worldPos;
  const [cx, cz] = existingConnector.relPos;
  const modRot = existingModule.rotation;
  
  // Calculer la position monde du connecteur
  let connX, connZ;
  if (modRot === 0) {
    connX = mx + cx * MODULE_CELL;
    connZ = mz + cz * MODULE_CELL;
  } else if (modRot === Math.PI / 2) {
    connX = mx + cz * MODULE_CELL;
    connZ = mz - cx * MODULE_CELL;
  } else if (modRot === Math.PI) {
    connX = mx - cx * MODULE_CELL;
    connZ = mz - cz * MODULE_CELL;
  } else { // -PI/2
    connX = mx - cz * MODULE_CELL;
    connZ = mz + cx * MODULE_CELL;
  }
  
  // Calculer la direction du connecteur dans le monde
  const connDir = (existingConnector.direction + modRot + 2 * Math.PI) % (2 * Math.PI) as ConnectorDirection;
  
  // La nouvelle module doit être placée de l'autre côté du connecteur
  // On utilise les dimensions du nouveau module pour calculer l'offset
  const { width: newW, height: newH } = MODULE_DIMENSIONS[newModuleType];
  
  // Trouver le connecteur d'entrée du nouveau module
  // Pour simplifier, on prend toujours le connecteur "north" comme entrée
  // et on calcule la position et rotation en conséquence
  
  // Position du centre du nouveau module
  let newX = connX;
  let newZ = connZ;
  let newRot: ConnectorDirection = 0;
  
  // Calculer l'offset depuis le connecteur jusqu'au centre du nouveau module
  // Les connecteurs du nouveau module sont définis par rapport à son centre
  // On veut que le connecteur "north" du nouveau module soit au niveau du connecteur existant
  
  switch (newModuleType) {
    case "straight":
      // Pour un couloir, si le connecteur existant est orienté vers le Nord,
      // le nouveau module doit être placé au Nord, avec rotation 0
      if (Math.abs(connDir - 0) < 0.1) {
        // Connecteur orienté Nord : nouveau module au Sud du connecteur
        newZ = connZ + (newH / 2) * MODULE_CELL;
        newX = connX;
        newRot = 0;
      } else if (Math.abs(connDir - Math.PI) < 0.1) {
        // Connecteur orienté Sud : nouveau module au Nord du connecteur
        newZ = connZ - (newH / 2) * MODULE_CELL;
        newX = connX;
        newRot = 0;
      } else if (Math.abs(connDir - Math.PI / 2) < 0.1) {
        // Connecteur orienté Est : nouveau module à l'Ouest du connecteur, rotation 90°
        newX = connX - (newH / 2) * MODULE_CELL;
        newZ = connZ;
        newRot = Math.PI / 2;
      } else if (Math.abs(connDir - -Math.PI / 2) < 0.1) {
        // Connecteur orienté Ouest : nouveau module à l'Est du connecteur, rotation -90°
        newX = connX + (newH / 2) * MODULE_CELL;
        newZ = connZ;
        newRot = -Math.PI / 2;
      }
      break;
      
    case "corner":
      // Pour un angle, on veut que l'entrée soit du côté du connecteur existant
      if (Math.abs(connDir - 0) < 0.1) {
        // Nord : nouveau module au Sud, rotation 90° (pour faire un angle vers l'Est)
        newZ = connZ + (newH / 2) * MODULE_CELL;
        newX = connX - (newW / 2) * MODULE_CELL;
        newRot = Math.PI / 2;
      } else if (Math.abs(connDir - Math.PI) < 0.1) {
        // Sud : nouveau module au Nord, rotation -90° (pour faire un angle vers l'Ouest)
        newZ = connZ - (newH / 2) * MODULE_CELL;
        newX = connX + (newW / 2) * MODULE_CELL;
        newRot = -Math.PI / 2;
      } else if (Math.abs(connDir - Math.PI / 2) < 0.1) {
        // Est : nouveau module à l'Ouest, rotation 0° (pour faire un angle vers le Sud)
        newX = connX - (newW / 2) * MODULE_CELL;
        newZ = connZ - (newH / 2) * MODULE_CELL;
        newRot = 0;
      } else if (Math.abs(connDir - -Math.PI / 2) < 0.1) {
        // Ouest : nouveau module à l'Est, rotation 180° (pour faire un angle vers le Nord)
        newX = connX + (newW / 2) * MODULE_CELL;
        newZ = connZ + (newH / 2) * MODULE_CELL;
        newRot = Math.PI;
      }
      break;
      
    case "t-junction":
      // Pour une jonction T, position centrale
      if (Math.abs(connDir - 0) < 0.1) {
        newZ = connZ + (newH / 2) * MODULE_CELL;
        newX = connX;
        newRot = 0;
      } else if (Math.abs(connDir - Math.PI) < 0.1) {
        newZ = connZ - (newH / 2) * MODULE_CELL;
        newX = connX;
        newRot = Math.PI;
      } else if (Math.abs(connDir - Math.PI / 2) < 0.1) {
        newX = connX - (newW / 2) * MODULE_CELL;
        newZ = connZ;
        newRot = Math.PI / 2;
      } else if (Math.abs(connDir - -Math.PI / 2) < 0.1) {
        newX = connX + (newW / 2) * MODULE_CELL;
        newZ = connZ;
        newRot = -Math.PI / 2;
      }
      break;
      
    case "room":
      // Pour une salle, centrer sur le connecteur
      if (Math.abs(connDir - 0) < 0.1) {
        newZ = connZ + (newH / 2) * MODULE_CELL;
        newX = connX;
        newRot = 0;
      } else if (Math.abs(connDir - Math.PI) < 0.1) {
        newZ = connZ - (newH / 2) * MODULE_CELL;
        newX = connX;
        newRot = 0;
      } else if (Math.abs(connDir - Math.PI / 2) < 0.1) {
        newX = connX - (newW / 2) * MODULE_CELL;
        newZ = connZ;
        newRot = Math.PI / 2;
      } else if (Math.abs(connDir - -Math.PI / 2) < 0.1) {
        newX = connX + (newW / 2) * MODULE_CELL;
        newZ = connZ;
        newRot = -Math.PI / 2;
      }
      break;
      
    case "dead-end":
      // Pour un cul-de-sac, placer à l'extrémité du connecteur
      if (Math.abs(connDir - 0) < 0.1) {
        newZ = connZ + (newH / 2) * MODULE_CELL;
        newX = connX;
        newRot = 0;
      } else if (Math.abs(connDir - Math.PI) < 0.1) {
        newZ = connZ - (newH / 2) * MODULE_CELL;
        newX = connX;
        newRot = 0;
      } else if (Math.abs(connDir - Math.PI / 2) < 0.1) {
        newX = connX - (newH / 2) * MODULE_CELL;
        newZ = connZ;
        newRot = Math.PI / 2;
      } else if (Math.abs(connDir - -Math.PI / 2) < 0.1) {
        newX = connX + (newH / 2) * MODULE_CELL;
        newZ = connZ;
        newRot = -Math.PI / 2;
      }
      break;
  }
  
  return { worldPos: [newX, newZ], rotation: newRot };
}

/**
 * Crée un module de donjon avec sa géométrie et ses connecteurs
 * @param moduleType - Type du module
 * @param worldPos - Position monde du centre du module
 * @param rotation - Rotation du module
 * @param seed - Seed pour ce module
 * @returns Le module complet avec géométrie
 */
export function createModule(
  moduleType: ModuleType,
  worldPos: [number, number],
  rotation: ConnectorDirection,
  seed: number
): DungeonModule {
  const { localFloors, localPanels } = generateModuleGeometry(moduleType, seed);
  const baseConnectors = BASE_CONNECTORS[moduleType];
  
  // Appliquer la rotation aux connecteurs
  const connectors: Connector[] = baseConnectors.map(conn => {
    let rotatedRelPos = [...conn.relPos] as [number, number];
    
    if (rotation === Math.PI / 2) {
      // Rotation 90° : (x, z) -> (z, -x)
      rotatedRelPos = [conn.relPos[1], -conn.relPos[0]] as [number, number];
    } else if (rotation === Math.PI) {
      // Rotation 180° : (x, z) -> (-x, -z)
      rotatedRelPos = [-conn.relPos[0], -conn.relPos[1]] as [number, number];
    } else if (rotation === -Math.PI / 2) {
      // Rotation -90° : (x, z) -> (-z, x)
      rotatedRelPos = [-conn.relPos[1], conn.relPos[0]] as [number, number];
    }
    
    // La direction du connecteur est aussi affectée par la rotation du module
    const rotatedDir = (conn.direction + rotation + 2 * Math.PI) % (2 * Math.PI) as ConnectorDirection;
    
    return {
      ...conn,
      relPos: rotatedRelPos,
      direction: rotatedDir,
    };
  });
  
  // Convertir les positions locales en positions monde
  const [wx, wz] = worldPos;
  const floors: [number, number][] = localFloors.map(([lx, lz]) => {
    let rx, rz;
    if (rotation === 0) {
      rx = lx; rz = lz;
    } else if (rotation === Math.PI / 2) {
      rx = lz; rz = -lx;
    } else if (rotation === Math.PI) {
      rx = -lx; rz = -lz;
    } else { // -PI/2
      rx = -lz; rz = lx;
    }
    return [wx + rx * MODULE_CELL, wz + rz * MODULE_CELL] as [number, number];
  });
  
  const panels: WallPanel[] = localPanels.map(p => {
    let rx, rz;
    if (rotation === 0) {
      rx = p.x; rz = p.z;
    } else if (rotation === Math.PI / 2) {
      rx = p.z; rz = -p.x;
    } else if (rotation === Math.PI) {
      rx = -p.x; rz = -p.z;
    } else { // -PI/2
      rx = -p.z; rz = p.x;
    }
    
    let rot = p.rot + rotation;
    rot = (rot + 2 * Math.PI) % (2 * Math.PI) as ConnectorDirection;
    
    return {
      x: wx + rx * MODULE_CELL,
      z: wz + rz * MODULE_CELL,
      rot,
    };
  });
  
  const { width, height } = MODULE_DIMENSIONS[moduleType];
  
  return {
    type: moduleType,
    width,
    height,
    worldPos,
    rotation,
    connectors,
    geometry: {
      floors,
      panels,
    },
    seed,
  };
}

/**
 * Sélectionne un type de module aléatoirement (pondéré si nécessaire)
 * @param rng - Générateur aléatoire
 * @returns Type de module
 */
export function selectRandomModuleType(rng: Rng): ModuleType {
  const types: ModuleType[] = ["straight", "corner", "t-junction", "room", "dead-end"];
  const idx = randInt(rng, 0, types.length - 1);
  return types[idx];
}

/**
 * Vérifie si un connecteur est déjà utilisé pour connecter un module
 */
export function isConnectorUsed(
  connector: Connector,
  module: DungeonModule,
  allModules: DungeonModule[]
): boolean {
  const [mx, mz] = module.worldPos;
  const [cx, cz] = connector.relPos;
  const rot = module.rotation;
  
  // Calculer la position monde du connecteur
  let wx, wz;
  if (rot === 0) {
    wx = mx + cx * MODULE_CELL;
    wz = mz + cz * MODULE_CELL;
  } else if (rot === Math.PI / 2) {
    wx = mx + cz * MODULE_CELL;
    wz = mz - cx * MODULE_CELL;
  } else if (rot === Math.PI) {
    wx = mx - cx * MODULE_CELL;
    wz = mz - cz * MODULE_CELL;
  } else {
    wx = mx - cz * MODULE_CELL;
    wz = mz + cx * MODULE_CELL;
  }
  
  // Vérifier si un autre module a un connecteur à proximité de cette position
  for (const otherModule of allModules) {
    if (otherModule === module) continue;
    
    for (const otherConnector of otherModule.connectors) {
      const [omx, omz] = otherModule.worldPos;
      const [ocx, ocz] = otherConnector.relPos;
      const orot = otherModule.rotation;
      
      let owx, owz;
      if (orot === 0) {
        owx = omx + ocx * MODULE_CELL;
        owz = omz + ocz * MODULE_CELL;
      } else if (orot === Math.PI / 2) {
        owx = omx + ocz * MODULE_CELL;
        owz = omz - ocx * MODULE_CELL;
      } else if (orot === Math.PI) {
        owx = omx - ocx * MODULE_CELL;
        owz = omz - ocz * MODULE_CELL;
      } else {
        owx = omx - ocz * MODULE_CELL;
        owz = omz + ocx * MODULE_CELL;
      }
      
      // Si les connecteurs sont proches, ils sont connectés
      const dist = Math.hypot(wx - owx, wz - owz);
      if (dist < MODULE_CELL * 0.6) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Trouve tous les connecteurs disponibles (non utilisés) dans un ensemble de modules
 */
export function getAvailableConnectors(modules: DungeonModule[]): Array<{
  module: DungeonModule;
  connector: Connector;
}> {
  const available: Array<{ module: DungeonModule; connector: Connector }> = [];
  
  for (const module of modules) {
    for (const connector of module.connectors) {
      if (!isConnectorUsed(connector, module, modules)) {
        // Vérifier que le connecteur n'est pas utilisé par un autre module
        // (double-check pour éviter les doublons)
        let used = false;
        for (const other of modules) {
          if (other === module) continue;
          if (isConnectorUsed(connector, module, [other])) {
            used = true;
            break;
          }
        }
        if (!used) {
          available.push({ module, connector });
        }
      }
    }
  }
  
  return available;
}

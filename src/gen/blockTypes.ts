// =============================================================================
// BLOCK TYPES - Définition centrale pour tous les types de blocs de donjon
// =============================================================================
// Chaque type de bloc a :
// - Un identifiant unique
// - Un nom et une description
// - Des propriétés visuelles (couleurs, matériaux)
// - Des propriétés physiques (si applicable)
//
// Approche : 100% procédural, pas d'assets externes
// Style : Passe-partout (neutre, compatible avec tous les thèmes)

import * as THREE from "three";

// -----------------------------------------------------------------------------
// Types de Blocs
// -----------------------------------------------------------------------------

// Types pour les murs (panneaux verticaux)
export type WallBlockType =
  | "stone"
  | "stone_cracked"
  | "stone_mossy"
  | "brick"
  | "brick_dark"
  | "wood"
  | "wood_old";

// Types pour les sols (plans horizontaux)
export type FloorBlockType =
  | "stone"
  | "stone_dark"
  | "stone_cracked"
  | "dirt"
  | "dirt_dark"
  | "tiles"
  | "tiles_broken";

// Types pour les plafonds
export type CeilingBlockType =
  | "stone"
  | "stone_dark"
  | "wood"
  | "wood_dark"
  | "none"; // Pas de plafond (pour les zones ouvertes)

// Types pour les pièges (à implémenter plus tard)
export type TrapType =
  | "none"
  | "blade"
  | "pit"
  | "spike"
  | "arrow";

// -----------------------------------------------------------------------------
// Apparence des Blocs
// -----------------------------------------------------------------------------

export interface BlockAppearance {
  // Couleur principale du matériau
  color: string | THREE.Color;
  // Couleur secondaire (pour les détails, variations)
  secondaryColor?: string | THREE.Color;
  // Texture procédurale (optionnelle)
  roughness: number;    // 0 = lisse/métallique, 1 = rugueux
  metalness?: number;   // 0 = non-métallique, 1 = métal
  // Émission (pour les blocs lumineux)
  emissiveColor?: string | THREE.Color;
  emissiveIntensity?: number;
  // Variantes visuelles
  hasVariations: boolean; // Si vrai, légère variation de couleur aléatoire
  variationIntensity?: number; // Intensité de la variation (0-1)
}

// -----------------------------------------------------------------------------
// Définitions des Types de Murs
// -----------------------------------------------------------------------------

export const WALL_TYPES: Record<WallBlockType, BlockAppearance> = {
  // Pierre standard - Base neutre
  stone: {
    color: "#6b6b6b",
    secondaryColor: "#5a5a5a",
    roughness: 0.85,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.1,
  },
  
  // Pierre fissurée - Usée par le temps
  stone_cracked: {
    color: "#5a5a5a",
    secondaryColor: "#404040",
    roughness: 0.95,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.15,
  },
  
  // Pierre moussue - Pour les donjons humides
  stone_mossy: {
    color: "#5a6b5a",
    secondaryColor: "#4a5a4a",
    roughness: 0.9,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.12,
  },
  
  // Brique rouge - Style forteresse
  brick: {
    color: "#8b4513",
    secondaryColor: "#a0522d",
    roughness: 0.75,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.1,
  },
  
  // Brique sombre - Style ancien
  brick_dark: {
    color: "#654321",
    secondaryColor: "#4e3418",
    roughness: 0.8,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.08,
  },
  
  // Bois - Pour les donjons en bois
  wood: {
    color: "#8b4513",
    secondaryColor: "#654321",
    roughness: 0.6,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.15,
  },
  
  // Bois ancien - Grisâtre, usé
  wood_old: {
    color: "#6b5b47",
    secondaryColor: "#4a3d2e",
    roughness: 0.7,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.12,
  },
};

// -----------------------------------------------------------------------------
// Définitions des Types de Sols
// -----------------------------------------------------------------------------

export const FLOOR_TYPES: Record<FloorBlockType, BlockAppearance> = {
  // Pierre standard
  stone: {
    color: "#5a5a5a",
    secondaryColor: "#4a4a4a",
    roughness: 0.9,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.1,
  },
  
  // Pierre sombre
  stone_dark: {
    color: "#3a3a3a",
    secondaryColor: "#2a2a2a",
    roughness: 0.95,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.1,
  },
  
  // Pierre fissurée
  stone_cracked: {
    color: "#4a4a4a",
    secondaryColor: "#333333",
    roughness: 0.95,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.15,
  },
  
  // Terre
  dirt: {
    color: "#5d4037",
    secondaryColor: "#4e342e",
    roughness: 1.0,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.2,
  },
  
  // Terre sombre
  dirt_dark: {
    color: "#3e2723",
    secondaryColor: "#2e1b17",
    roughness: 1.0,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.15,
  },
  
  // Dalles de pierre
  tiles: {
    color: "#7a7a7a",
    secondaryColor: "#6a6a6a",
    roughness: 0.7,
    metalness: 0.05,
    hasVariations: true,
    variationIntensity: 0.08,
  },
  
  // Dalles cassées
  tiles_broken: {
    color: "#6a6a6a",
    secondaryColor: "#505050",
    roughness: 0.9,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.12,
  },
};

// -----------------------------------------------------------------------------
// Définitions des Types de Plafonds
// -----------------------------------------------------------------------------

export const CEILING_TYPES: Record<CeilingBlockType, BlockAppearance> = {
  // Pierre standard
  stone: {
    color: "#4a4a4a",
    secondaryColor: "#3a3a3a",
    roughness: 0.9,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.1,
  },
  
  // Pierre sombre
  stone_dark: {
    color: "#2a2a2a",
    secondaryColor: "#1a1a1a",
    roughness: 0.95,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.08,
  },
  
  // Bois
  wood: {
    color: "#5d4037",
    secondaryColor: "#4e342e",
    roughness: 0.6,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.15,
  },
  
  // Bois sombre
  wood_dark: {
    color: "#4e342e",
    secondaryColor: "#3e2723",
    roughness: 0.7,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.12,
  },
  
  // Pas de plafond (pour les zones ouvertes)
  none: {
    color: "#000000",
    roughness: 1.0,
    metalness: 0.0,
    hasVariations: false,
  },
};

// -----------------------------------------------------------------------------
// Définitions des Pièges (à implémenter plus tard)
// -----------------------------------------------------------------------------

export const TRAP_TYPES: Record<TrapType, {
  appearance: BlockAppearance;
  damage?: number;
  cooldown?: number;
  description: string;
}> = {
  none: {
    appearance: { color: "#000000", roughness: 1.0, hasVariations: false },
    description: "Aucun piège",
  },
  
  blade: {
    appearance: {
      color: "#444444",
      emissiveColor: "#ff4444",
      emissiveIntensity: 0.3,
      roughness: 0.5,
      metalness: 0.3,
      hasVariations: false,
    },
    damage: 15,
    cooldown: 2.0,
    description: "Lames sortantes - Dégâts élevés",
  },
  
  pit: {
    appearance: {
      color: "#2a2a2a",
      roughness: 1.0,
      hasVariations: false,
    },
    damage: 20, // Dégâts de chute
    description: "Fosse - Chute mortelle",
  },
  
  spike: {
    appearance: {
      color: "#333333",
      emissiveColor: "#ff0000",
      emissiveIntensity: 0.2,
      roughness: 0.6,
      metalness: 0.2,
      hasVariations: false,
    },
    damage: 25,
    description: "Pièges à pointes - Dégâts instantanés",
  },
  
  arrow: {
    appearance: {
      color: "#5a4a3a",
      roughness: 0.8,
      hasVariations: false,
    },
    damage: 10,
    cooldown: 1.5,
    description: "Piège à flèches - Dégâts à distance",
  },
};

// -----------------------------------------------------------------------------
// Utilitaires
// -----------------------------------------------------------------------------

/** Liste de tous les types de murs disponibles */
export function getAllWallTypes(): WallBlockType[] {
  return Object.keys(WALL_TYPES) as WallBlockType[];
}

/** Liste de tous les types de sols disponibles */
export function getAllFloorTypes(): FloorBlockType[] {
  return Object.keys(FLOOR_TYPES) as FloorBlockType[];
}

/** Liste de tous les types de plafonds disponibles */
export function getAllCeilingTypes(): CeilingBlockType[] {
  return Object.keys(CEILING_TYPES) as CeilingBlockType[];
}

/** Obtenir l'apparence d'un type de mur */
export function getWallAppearance(type: WallBlockType): BlockAppearance {
  return WALL_TYPES[type];
}

/** Obtenir l'apparence d'un type de sol */
export function getFloorAppearance(type: FloorBlockType): BlockAppearance {
  return FLOOR_TYPES[type];
}

/** Obtenir l'apparence d'un type de plafond */
export function getCeilingAppearance(type: CeilingBlockType): BlockAppearance {
  return CEILING_TYPES[type];
}

/** Obtenir une couleur avec variation aléatoire (déterministe) */
export function getVariedColor(
  baseColor: string | THREE.Color,
  variationIntensity: number,
  seed: number,
  index: number
): THREE.Color {
  // Simple hash basé sur seed et index pour la reproductibilité
  const hash = (seed: number, idx: number) => {
    let h = seed * 31 + idx * 17;
    h = ((h << 5) - h) + (h << 4);
    return Math.abs(h) % 10000;
  };
  
  const base = baseColor instanceof THREE.Color ? baseColor : new THREE.Color(baseColor);
  const h = hash(seed, index) / 10000;
  
  // Variation de teinte (hue) de -variationIntensity à +variationIntensity
  const hueVariation = (h - 0.5) * 2 * variationIntensity;
  
  return base.clone().offsetHSL(hueVariation, 0, 0);
}

/** Sélectionner un type de mur aléatoire (déterministe) */
export function getRandomWallType(seed: number, index: number): WallBlockType {
  const types = getAllWallTypes();
  const hash = (seed: number, idx: number) => {
    let h = seed * 23 + idx * 19;
    h = ((h << 5) - h) + (h << 3);
    return Math.abs(h);
  };
  return types[hash(seed, index) % types.length];
}

/** Sélectionner un type de sol aléatoire (déterministe) */
export function getRandomFloorType(seed: number, index: number): FloorBlockType {
  const types = getAllFloorTypes();
  const hash = (seed: number, idx: number) => {
    let h = seed * 29 + idx * 13;
    h = ((h << 5) - h) + (h << 2);
    return Math.abs(h);
  };
  return types[hash(seed, index) % types.length];
}

/** Sélectionner un type de plafond aléatoire (déterministe) */
export function getRandomCeilingType(seed: number, index: number): CeilingBlockType {
  const types = getAllCeilingTypes().filter(t => t !== "none"); // Exclure "none" pour le random
  const hash = (seed: number, idx: number) => {
    let h = seed * 31 + idx * 7;
    h = ((h << 5) - h) + (h << 4);
    return Math.abs(h);
  };
  return types[hash(seed, index) % types.length];
}

// -----------------------------------------------------------------------------
// Presets de Biomes (pour plus tard)
// -----------------------------------------------------------------------------

/** Définition d'un preset de biome pour les blocs */
export interface BiomeBlockPreset {
  name: string;
  wallTypes: WallBlockType[];   // Types de murs possibles
  floorTypes: FloorBlockType[]; // Types de sols possibles
  ceilingTypes: CeilingBlockType[]; // Types de plafonds possibles
  wallWeights?: number[];        // Poids pour la sélection aléatoire
  floorWeights?: number[];       // Poids pour la sélection aléatoire
  ceilingWeights?: number[];    // Poids pour la sélection aléatoire
}

/** Presets de biomes pour les blocs */
export const BIOME_PRESETS: Record<string, BiomeBlockPreset> = {
  default: {
    name: "Défaut",
    wallTypes: ["stone", "stone_cracked", "stone_mossy", "brick", "brick_dark"],
    floorTypes: ["stone", "stone_dark", "stone_cracked", "dirt", "tiles"],
    ceilingTypes: ["stone", "stone_dark", "wood", "wood_dark"],
  },
  keep: {
    name: "Forteresse",
    wallTypes: ["stone", "stone_cracked", "brick", "brick_dark"],
    floorTypes: ["stone", "stone_dark", "tiles", "tiles_broken"],
    ceilingTypes: ["stone", "stone_dark", "wood"],
    wallWeights: [0.4, 0.3, 0.2, 0.1],
    floorWeights: [0.4, 0.3, 0.2, 0.1],
  },
  crypt: {
    name: "Crypte",
    wallTypes: ["stone", "stone_cracked", "stone_mossy"],
    floorTypes: ["stone", "stone_dark", "stone_cracked"],
    ceilingTypes: ["stone", "stone_dark"],
    wallWeights: [0.5, 0.3, 0.2],
    floorWeights: [0.5, 0.3, 0.2],
  },
  cave: {
    name: "Grotte",
    wallTypes: ["stone", "stone_cracked", "stone_mossy"],
    floorTypes: ["dirt", "dirt_dark", "stone", "stone_cracked"],
    ceilingTypes: ["stone", "stone_dark", "none"],
    ceilingWeights: [0.4, 0.4, 0.2], // 20% de chance de pas de plafond
  },
};

/** Sélectionner un type de bloc pour un biome donné */
export function getBlockTypeForBiome(
  biome: string,
  category: "wall" | "floor" | "ceiling",
  seed: number,
  index: number
): WallBlockType | FloorBlockType | CeilingBlockType {
  const preset = BIOME_PRESETS[biome] || BIOME_PRESETS.default;
  const hash = (seed: number, idx: number) => {
    let h = seed * 37 + idx * 23;
    h = ((h << 5) - h) + (h << 3);
    return Math.abs(h);
  };
  
  const r = hash(seed, index) / 10000;
  
  if (category === "wall") {
    const types = preset.wallTypes;
    const weights = preset.wallWeights || types.map(() => 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let cumulative = 0;
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i] / totalWeight;
      if (r <= cumulative) return types[i];
    }
    return types[0];
  }
  
  if (category === "floor") {
    const types = preset.floorTypes;
    const weights = preset.floorWeights || types.map(() => 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let cumulative = 0;
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i] / totalWeight;
      if (r <= cumulative) return types[i];
    }
    return types[0];
  }
  
  // ceiling
  const types = preset.ceilingTypes;
  const weights = preset.ceilingWeights || types.map(() => 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let cumulative = 0;
  for (let i = 0; i < types.length; i++) {
    cumulative += weights[i] / totalWeight;
    if (r <= cumulative) return types[i];
  }
  return types[0];
}

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
  // Pierre standard - donjon neutre
  stone: {
    color: "#7a7673",
    secondaryColor: "#626060",
    roughness: 0.88,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.1,
  },

  // Pierre fissurée - donjon abandonné
  stone_cracked: {
    color: "#5e5a57",
    secondaryColor: "#464240",
    roughness: 0.95,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.15,
  },

  // Pierre moussue - crypte humide
  stone_mossy: {
    color: "#566255",
    secondaryColor: "#455045",
    roughness: 0.92,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.14,
  },

  // Brique - forteresse
  brick: {
    color: "#a05835",
    secondaryColor: "#7e4228",
    roughness: 0.78,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.1,
  },

  // Brique sombre - forteresse ancienne
  brick_dark: {
    color: "#704030",
    secondaryColor: "#502e20",
    roughness: 0.82,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.08,
  },

  // Bois - donjon rustique
  wood: {
    color: "#7a5228",
    secondaryColor: "#5e3e1e",
    roughness: 0.65,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.15,
  },

  // Bois ancien - grisâtre, vermoulu
  wood_old: {
    color: "#6a5540",
    secondaryColor: "#4e3e2c",
    roughness: 0.78,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.13,
  },
};

// -----------------------------------------------------------------------------
// Définitions des Types de Sols
// -----------------------------------------------------------------------------

export const FLOOR_TYPES: Record<FloorBlockType, BlockAppearance> = {
  // Pierre standard
  stone: {
    color: "#646260",
    secondaryColor: "#504e4c",
    roughness: 0.9,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.1,
  },

  // Pierre sombre - cryptes profondes
  stone_dark: {
    color: "#3c3a38",
    secondaryColor: "#2c2a28",
    roughness: 0.95,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.1,
  },

  // Pierre fissurée
  stone_cracked: {
    color: "#525050",
    secondaryColor: "#3c3a38",
    roughness: 0.95,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.15,
  },

  // Terre - grottes
  dirt: {
    color: "#7a5040",
    secondaryColor: "#5e3c2e",
    roughness: 1.0,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.2,
  },

  // Terre sombre - grottes profondes
  dirt_dark: {
    color: "#46302a",
    secondaryColor: "#32201a",
    roughness: 1.0,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.15,
  },

  // Dalles - forteresse
  tiles: {
    color: "#8e8a80",
    secondaryColor: "#767270",
    roughness: 0.68,
    metalness: 0.05,
    hasVariations: true,
    variationIntensity: 0.08,
  },

  // Dalles cassées - forteresse endommagée
  tiles_broken: {
    color: "#706e6a",
    secondaryColor: "#565452",
    roughness: 0.9,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.13,
  },
};

// -----------------------------------------------------------------------------
// Définitions des Types de Plafonds
// -----------------------------------------------------------------------------

export const CEILING_TYPES: Record<CeilingBlockType, BlockAppearance> = {
  // Pierre standard
  stone: {
    color: "#484644",
    secondaryColor: "#383634",
    roughness: 0.9,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.1,
  },

  // Pierre sombre - cryptes
  stone_dark: {
    color: "#282624",
    secondaryColor: "#1a1816",
    roughness: 0.95,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.08,
  },

  // Bois - forteresses
  wood: {
    color: "#5e3a1c",
    secondaryColor: "#4a2c14",
    roughness: 0.65,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.15,
  },

  // Bois sombre
  wood_dark: {
    color: "#3e2410",
    secondaryColor: "#2e180a",
    roughness: 0.72,
    metalness: 0.0,
    hasVariations: true,
    variationIntensity: 0.12,
  },

  // Pas de plafond (zones ouvertes)
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

// -----------------------------------------------------------------------------
// Éclairage par biome — fog + lumière ambiante
// -----------------------------------------------------------------------------

export interface BiomeLighting {
  fogColor: string;
  fogNear: number;
  fogFar: number;
  ambientColor: string;
  ambientIntensity: number;
}

export const BIOME_LIGHTING: Record<string, BiomeLighting> = {
  default: { fogColor: "#07070a", fogNear: 4, fogFar: 30, ambientColor: "#5a586c", ambientIntensity: 1.1 },
  keep:    { fogColor: "#0e0a04", fogNear: 4, fogFar: 32, ambientColor: "#7c6840", ambientIntensity: 1.0 },
  crypt:   { fogColor: "#040508", fogNear: 3, fogFar: 25, ambientColor: "#3a3852", ambientIntensity: 0.9 },
  cave:    { fogColor: "#070604", fogNear: 3, fogFar: 22, ambientColor: "#4a3c30", ambientIntensity: 0.85 },
};

/** Sélectionner un type de bloc pour un biome donné */
export function getBlockTypeForBiome(
  biome: string,
  category: "wall" | "floor" | "ceiling",
  seed: number,
  index: number
): WallBlockType | FloorBlockType | CeilingBlockType {
  const preset = BIOME_PRESETS[biome] || BIOME_PRESETS.default;
  const hash = (s: number, idx: number) => {
    let h = s * 37 + idx * 23;
    h = ((h << 5) - h) + (h << 3);
    return Math.abs(h) % 10000;
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

// =============================================================================
// ENEMY TYPES - Configuration centrale pour tous les types d'ennemis
// =============================================================================
// Chaque type d'ennemi a ses propres:
// - Stats (PV, dégâts, vitesse, etc.)
// - Couleurs et apparence
// - Comportement (poursuite, attaque à distance, etc.)
// - Taille et proportions

import * as THREE from "three";

// -----------------------------------------------------------------------------
// Types de comportements
// -----------------------------------------------------------------------------
export type EnemyBehavior = 
  | "chaser"        // Poursuit le joueur en corps-à-corps
  | "ranged"       // Attaque à distance (projectiles)
  | "tank"         // Lent mais résistant, attaque puissante
  | "fast"         // Rapide, attaque rapide mais faible
  | "boss"         // Boss avec patterns spéciaux
  | "passive"      // Ne attaque pas (ex: animal, PNJ hostile si provoqué)
  | "swarm";       // Petit ennemi qui attaque en groupe

// -----------------------------------------------------------------------------
// Stats de base pour chaque type
// -----------------------------------------------------------------------------
export interface EnemyStats {
  // Stats de combat
  hp: number;           // Points de vie
  attackDamage: number; // Dégâts par attaque
  attackCooldown: number; // Temps entre les attaques (secondes)
  attackRange: number;  // Distance d'attaque
  
  // Stats de mouvement
  speed: number;        // Vitesse de déplacement
  stopDistance: number; // Distance à laquelle l'ennemi s'arrête
  
  // Stats défensives
  armor: number;        // Réduction des dégâts (0 = aucun, 1 = immunité)
  
  // Expérience et loot
  expValue: number;     // EXP donnée au joueur
  lootTier: number;     // Niveau de qualité du loot (1-5)
  
  // Physique
  mass: number;         // Masse du RigidBody
  colliderRadius: number; // Rayon du collider
  colliderHeight: number; // Hauteur du collider
}

// -----------------------------------------------------------------------------
// Appearance - Définition visuelle
// -----------------------------------------------------------------------------
export interface EnemyAppearance {
  // Couleurs principales
  primaryColor: string | THREE.Color;
  secondaryColor: string | THREE.Color;
  accentColor?: string | THREE.Color;
  eyeColor: string | THREE.Color;
  eyeGlow?: number;     // Intensité de la lueur des yeux
  
  // Matériaux
  roughness: number;    // 0 = lisse/métallique, 1 = mat
  metalness?: number;   // 0 = non-métallique, 1 = métal
  flatShading: boolean; // true = style "low-poly"
  
  // Éclairage
  emissiveColor?: string | THREE.Color;
  emissiveIntensity?: number;
}

// -----------------------------------------------------------------------------
// Animations - Paramètres d'animation
// -----------------------------------------------------------------------------
export interface EnemyAnimations {
  // Mouvement
  walkSpeed: number;     // Vitesse de l'animation de marche
  walkAmplitude: number; // Amplitude du mouvement (bob vertical)
  
  // Attaque
  attackAnimSpeed: number; // Vitesse de l'animation d'attaque
  attackLunge: number;    // Force du mouvement vers l'avant lors de l'attaque
  
  // Mort
  deathSpeed: number;    // Vitesse de l'animation de mort
  deathSquash: number;   // Aplatissement du corps à la mort
}

// -----------------------------------------------------------------------------
// Définition complète d'un type d'ennemi
// -----------------------------------------------------------------------------
export interface EnemyType {
  id: string;
  name: string;
  description: string;
  behavior: EnemyBehavior;
  stats: EnemyStats;
  appearance: EnemyAppearance;
  animations: EnemyAnimations;
  // Dimensions du modèle (pour le scaling)
  scale: number;
  height: number; // Hauteur totale
  // Offset vertical pour centrer le collider
  colliderOffsetY: number;
}

// =============================================================================
// 📜 CATALOGUE DES ENNEMIS
// =============================================================================

export const ENEMY_TYPES: Record<string, EnemyType> = {
  // ---------------------------------------------------------------------------
  // 🟢 GOBELIN - Ennemi de base (déjà implémenté)
  // ---------------------------------------------------------------------------
  goblin: {
    id: "goblin",
    name: "Gobelin",
    description: "Petit humanoïde vert, rapide et agile. Attaque en corps-à-corps.",
    behavior: "fast",
    stats: {
      hp: 40,
      attackDamage: 8,
      attackCooldown: 0.8,
      attackRange: 1.2,
      speed: 3.5,
      stopDistance: 1.0,
      armor: 0.0,
      expValue: 25,
      lootTier: 1,
      mass: 1,
      colliderRadius: 0.5,
      colliderHeight: 0.4,
    },
    appearance: {
      primaryColor: "#4a7c2e",
      secondaryColor: "#3a6040",
      accentColor: "#2a4020",
      eyeColor: "#f0d020",
      eyeGlow: 3.0,
      roughness: 1,
      flatShading: true,
    },
    animations: {
      walkSpeed: 5.5,
      walkAmplitude: 0.06,
      attackAnimSpeed: 3.8,
      attackLunge: 0.55,
      deathSpeed: 3.5,
      deathSquash: 0.5,
    },
    scale: 0.78,
    height: 1.8,
    colliderOffsetY: 0.9,
  },

  // ---------------------------------------------------------------------------
  // 💀 SQUELETTE - Ennemi de base à distance moyenne
  // ---------------------------------------------------------------------------
  skeleton: {
    id: "skeleton",
    name: "Squelette",
    description: "Mort-vivant fait d'os. Attaque avec une épée rouillée.",
    behavior: "chaser",
    stats: {
      hp: 55,
      attackDamage: 12,
      attackCooldown: 1.0,
      attackRange: 1.4,
      speed: 2.8,
      stopDistance: 1.2,
      armor: 0.1,
      expValue: 35,
      lootTier: 2,
      mass: 1.2,
      colliderRadius: 0.45,
      colliderHeight: 0.5,
    },
    appearance: {
      primaryColor: "#e0e0e0",
      secondaryColor: "#b8b8b8",
      accentColor: "#333333",
      eyeColor: "#ff4444",
      eyeGlow: 2.0,
      roughness: 0.8,
      flatShading: true,
    },
    animations: {
      walkSpeed: 4.5,
      walkAmplitude: 0.08,
      attackAnimSpeed: 3.2,
      attackLunge: 0.45,
      deathSpeed: 2.8,
      deathSquash: 0.4,
    },
    scale: 0.85,
    height: 1.9,
    colliderOffsetY: 0.95,
  },

  // ---------------------------------------------------------------------------
  // 🏹 ARCHER SQUELETTE - Ennemi à distance
  // ---------------------------------------------------------------------------
  skeletonArcher: {
    id: "skeletonArcher",
    name: "Archer Squelette",
    description: "Squelette armé d'un arc. Attaque à distance avec des flèches.",
    behavior: "ranged",
    stats: {
      hp: 40,
      attackDamage: 10,
      attackCooldown: 2.0,
      attackRange: 8.0,
      speed: 2.0,
      stopDistance: 6.0,
      armor: 0.05,
      expValue: 40,
      lootTier: 2,
      mass: 1.0,
      colliderRadius: 0.4,
      colliderHeight: 0.45,
    },
    appearance: {
      primaryColor: "#d0d0d0",
      secondaryColor: "#a8a8a8",
      accentColor: "#2a1a0a",
      eyeColor: "#ff6666",
      eyeGlow: 1.5,
      roughness: 0.7,
      flatShading: true,
    },
    animations: {
      walkSpeed: 4.0,
      walkAmplitude: 0.06,
      attackAnimSpeed: 2.5,
      attackLunge: 0.3,
      deathSpeed: 3.0,
      deathSquash: 0.45,
    },
    scale: 0.82,
    height: 1.85,
    colliderOffsetY: 0.9,
  },

  // ---------------------------------------------------------------------------
  // 🟤 ORC - Ennemi puissant en corps-à-corps
  // ---------------------------------------------------------------------------
  orc: {
    id: "orc",
    name: "Orc",
    description: "Guerrier imposant et puissant. Attaque avec une hache massive.",
    behavior: "tank",
    stats: {
      hp: 80,
      attackDamage: 18,
      attackCooldown: 1.2,
      attackRange: 1.6,
      speed: 2.2,
      stopDistance: 1.4,
      armor: 0.25,
      expValue: 50,
      lootTier: 3,
      mass: 2.0,
      colliderRadius: 0.6,
      colliderHeight: 0.55,
    },
    appearance: {
      primaryColor: "#5a4d3a",
      secondaryColor: "#3a3224",
      accentColor: "#8a7d68",
      eyeColor: "#ffcc44",
      eyeGlow: 2.5,
      roughness: 0.9,
      flatShading: true,
    },
    animations: {
      walkSpeed: 4.0,
      walkAmplitude: 0.12,
      attackAnimSpeed: 2.8,
      attackLunge: 0.7,
      deathSpeed: 2.5,
      deathSquash: 0.35,
    },
    scale: 1.0,
    height: 2.2,
    colliderOffsetY: 1.1,
  },

  // ---------------------------------------------------------------------------
  // 🟣 SLIME - Ennemi gélatineux qui attaque à distance
  // ---------------------------------------------------------------------------
  slime: {
    id: "slime",
    name: "Slime Acide",
    description: "Créature gélatineuse qui crache de l'acide à distance.",
    behavior: "ranged",
    stats: {
      hp: 60,
      attackDamage: 14,
      attackCooldown: 2.5,
      attackRange: 7.0,
      speed: 1.8,
      stopDistance: 5.0,
      armor: 0.3,
      expValue: 45,
      lootTier: 2,
      mass: 1.5,
      colliderRadius: 0.55,
      colliderHeight: 0.4,
    },
    appearance: {
      primaryColor: "#4caf50",
      secondaryColor: "#2e7d32",
      accentColor: "#8bc34a",
      eyeColor: "#ffffff",
      eyeGlow: 0,
      roughness: 0.6,
      flatShading: false,
      emissiveColor: "#4caf50",
      emissiveIntensity: 0.3,
    },
    animations: {
      walkSpeed: 3.0,
      walkAmplitude: 0.15,
      attackAnimSpeed: 2.0,
      attackLunge: 0.2,
      deathSpeed: 4.0,
      deathSquash: 0.6,
    },
    scale: 0.9,
    height: 1.2,
    colliderOffsetY: 0.3,
  },

  // ---------------------------------------------------------------------------
  // 🐺 LOUP - Ennemi rapide qui attaque en meute
  // ---------------------------------------------------------------------------
  wolf: {
    id: "wolf",
    name: "Loup Sauvage",
    description: "Prédateur rapide qui attaque en groupe. Chasse le joueur.",
    behavior: "fast",
    stats: {
      hp: 35,
      attackDamage: 10,
      attackCooldown: 0.6,
      attackRange: 1.1,
      speed: 4.5,
      stopDistance: 0.9,
      armor: 0.05,
      expValue: 30,
      lootTier: 1,
      mass: 0.8,
      colliderRadius: 0.4,
      colliderHeight: 0.35,
    },
    appearance: {
      primaryColor: "#5d4037",
      secondaryColor: "#4e342e",
      accentColor: "#3e2723",
      eyeColor: "#ffeb3b",
      eyeGlow: 2.0,
      roughness: 0.9,
      flatShading: true,
    },
    animations: {
      walkSpeed: 7.0,
      walkAmplitude: 0.08,
      attackAnimSpeed: 4.5,
      attackLunge: 0.4,
      deathSpeed: 4.0,
      deathSquash: 0.45,
    },
    scale: 0.8,
    height: 1.1,
    colliderOffsetY: 0.55,
  },

  // ---------------------------------------------------------------------------
  // 👹 TROLL - Ennemi tank très résistant
  // ---------------------------------------------------------------------------
  troll: {
    id: "troll",
    name: "Troll des Cavernes",
    description: "Colosse lent mais extrêmement résistant. Régénère des PV.",
    behavior: "tank",
    stats: {
      hp: 120,
      attackDamage: 25,
      attackCooldown: 1.5,
      attackRange: 1.8,
      speed: 1.5,
      stopDistance: 1.6,
      armor: 0.4,
      expValue: 75,
      lootTier: 4,
      mass: 3.0,
      colliderRadius: 0.7,
      colliderHeight: 0.65,
    },
    appearance: {
      primaryColor: "#4e342e",
      secondaryColor: "#3e2723",
      accentColor: "#5d4037",
      eyeColor: "#ff5722",
      eyeGlow: 3.0,
      roughness: 0.85,
      flatShading: true,
    },
    animations: {
      walkSpeed: 3.0,
      walkAmplitude: 0.15,
      attackAnimSpeed: 2.0,
      attackLunge: 0.8,
      deathSpeed: 2.0,
      deathSquash: 0.3,
    },
    scale: 1.1,
    height: 2.5,
    colliderOffsetY: 1.25,
  },

  // ---------------------------------------------------------------------------
  // 🕷️ ARAIGNÉE - Ennemi rapide et venimeux
  // ---------------------------------------------------------------------------
  spider: {
    id: "spider",
    name: "Araignée Géante",
    description: "Créature rapide qui inflige des dégâts de poison.",
    behavior: "fast",
    stats: {
      hp: 50,
      attackDamage: 12,
      attackCooldown: 0.7,
      attackRange: 1.3,
      speed: 4.0,
      stopDistance: 1.1,
      armor: 0.15,
      expValue: 55,
      lootTier: 3,
      mass: 0.6,
      colliderRadius: 0.45,
      colliderHeight: 0.3,
    },
    appearance: {
      primaryColor: "#263238",
      secondaryColor: "#37474f",
      accentColor: "#455a64",
      eyeColor: "#00bcd4",
      eyeGlow: 2.5,
      roughness: 0.7,
      flatShading: true,
    },
    animations: {
      walkSpeed: 6.0,
      walkAmplitude: 0.12,
      attackAnimSpeed: 4.0,
      attackLunge: 0.5,
      deathSpeed: 3.5,
      deathSquash: 0.5,
    },
    scale: 0.75,
    height: 0.9,
    colliderOffsetY: 0.45,
  },

  // ---------------------------------------------------------------------------
  // 💀 NÉCROMANCIEN - Ennemi rare qui invoque des squelettes
  // ---------------------------------------------------------------------------
  necromancer: {
    id: "necromancer",
    name: "Nécromancien",
    description: "Mage sombre qui invoque des squelettes pour combattre à sa place.",
    behavior: "ranged",
    stats: {
      hp: 70,
      attackDamage: 0, // N'inflige pas de dégâts directement
      attackCooldown: 5.0, // Temps entre les invocations
      attackRange: 10.0,
      speed: 2.0,
      stopDistance: 8.0,
      armor: 0.1,
      expValue: 100,
      lootTier: 5,
      mass: 1.0,
      colliderRadius: 0.5,
      colliderHeight: 0.5,
    },
    appearance: {
      primaryColor: "#1a237e",
      secondaryColor: "#303f9f",
      accentColor: "#5c6bc0",
      eyeColor: "#ff1744",
      eyeGlow: 3.5,
      roughness: 0.5,
      flatShading: true,
      emissiveColor: "#7c4dff",
      emissiveIntensity: 0.5,
    },
    animations: {
      walkSpeed: 3.5,
      walkAmplitude: 0.08,
      attackAnimSpeed: 1.5,
      attackLunge: 0.2,
      deathSpeed: 2.8,
      deathSquash: 0.4,
    },
    scale: 0.9,
    height: 1.95,
    colliderOffsetY: 0.95,
  },
};

// -----------------------------------------------------------------------------
// Utilitaires
// -----------------------------------------------------------------------------

/** Récupère un type d'ennemi par ID */
export function getEnemyType(id: string): EnemyType | undefined {
  return ENEMY_TYPES[id];
}

/** Liste des IDs de tous les ennemis disponibles */
export function getAllEnemyIds(): string[] {
  return Object.keys(ENEMY_TYPES);
}

/** Sélectionne un ennemi aléatoire (excluant le gobelin si souhaité) */
export function getRandomEnemyType(exclude: string[] = []): EnemyType {
  const ids = getAllEnemyIds().filter(id => !exclude.includes(id));
  const randomId = ids[Math.floor(Math.random() * ids.length)];
  return ENEMY_TYPES[randomId];
}

/** Sélectionne un ennemi aléatoire par biome */
export function getEnemyForBiome(biome: string, exclude: string[] = []): EnemyType {
  // Définition des ennemis par biome
  const biomeEnemies: Record<string, string[]> = {
    forest: ["goblin", "wolf", "spider"],
    cave: ["goblin", "troll", "slime"],
    ruin: ["skeleton", "skeletonArcher", "necromancer"],
    desert: ["wolf", "scorpion", "skeletonArcher"], // (scorpion à ajouter plus tard)
    ice: ["troll", "wolf", "skeleton"],
    temple: ["skeleton", "skeletonArcher", "necromancer", "goblin"],
    default: ["goblin", "skeleton", "wolf", "slime"],
  };
  
  const available = biomeEnemies[biome] || biomeEnemies.default;
  const filtered = available.filter(id => !exclude.includes(id));
  const randomId = filtered[Math.floor(Math.random() * filtered.length)];
  return ENEMY_TYPES[randomId];
}

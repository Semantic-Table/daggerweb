// Compétences à l'usage, à la Morrowind (cf. GDD §6) : on gagne de l'XP dans une
// CATÉGORIE d'arme en l'utilisant — pas de classe fixe, « on devient ce qu'on
// pratique ». État partagé hors arbre React, comme les autres registres de module
// (cf. inventory.ts) : l'épée pousse l'XP au coup confirmé, le HUD s'abonne.
//
// Les bonus sont calculés À LA VOLÉE (effectiveDmg / effectiveSwingDur) à partir
// du niveau de la catégorie : on ne MUTE JAMAIS les defs d'`itemDefs` (partagées
// avec la loot table). Le niveau dérive du total d'XP via une courbe à coût
// croissant — voir levelInfo().

import type { WeaponDef } from "../items/itemDefs";
import {
  SKILL_XP_BASE,
  SKILL_DMG_PER_LEVEL,
  SKILL_SPEED_PER_LEVEL,
  SKILL_SPEED_FLOOR,
  JUMP_BONUS_PER_LEVEL,
  ATHLETICS_SPEED_PER_LEVEL,
  ATHLETICS_STAMINA_PER_LEVEL,
} from "../config";

export type WeaponCategory = "blade" | "axe" | "unarmed";

/** Ordre d'affichage stable des catégories (HUD, inventaire). */
export const CATEGORIES: WeaponCategory[] = ["blade", "axe", "unarmed"];

/** Libellés FR des catégories, partagés par le HUD et l'inventaire. */
export const CATEGORY_LABEL: Record<WeaponCategory, string> = {
  blade: "Lame",
  axe: "Hache",
  unarmed: "Mains nues",
};

export interface SkillState {
  /** XP totale accumulée dans la catégorie. */
  xp: number;
}

export type SkillsState = Record<WeaponCategory, SkillState>;

const state: SkillsState = {
  blade: { xp: 0 },
  axe: { xp: 0 },
  unarmed: { xp: 0 },
};

const listeners = new Set<() => void>();

export function getSkills(): SkillsState {
  return state;
}

export function subscribeSkills(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) fn();
}

/** Ajoute de l'XP à une catégorie (appelé au coup confirmé depuis Sword). */
export function gainXp(category: WeaponCategory, amount: number): void {
  state[category].xp += amount;
  notify();
}

export interface LevelInfo {
  /** Niveau atteint (commence à 0). */
  level: number;
  /** XP accumulée DANS le palier courant. */
  into: number;
  /** XP nécessaire pour finir le palier courant. */
  need: number;
}

// Coût du palier n (pour passer de n-1 à n) = BASE * n. La courbe est donc à coût
// croissant : chaque niveau demande un peu plus que le précédent.
export function levelInfo(xp: number): LevelInfo {
  let level = 0;
  let acc = 0;
  let need = SKILL_XP_BASE * (level + 1);
  while (xp >= acc + need) {
    acc += need;
    level++;
    need = SKILL_XP_BASE * (level + 1);
  }
  return { level, into: xp - acc, need };
}

export interface SkillBonus {
  level: number;
  /** Multiplicateur de dégâts (1 = aucun bonus). */
  dmgMult: number;
  /** Multiplicateur de swingDur (1 = aucun bonus ; <1 = plus rapide). */
  speedMult: number;
}

/** Bonus actifs d'une catégorie, dérivés de son niveau. */
export function skillBonus(category: WeaponCategory): SkillBonus {
  const { level } = levelInfo(state[category].xp);
  return {
    level,
    dmgMult: 1 + SKILL_DMG_PER_LEVEL * level,
    speedMult: Math.max(SKILL_SPEED_FLOOR, 1 - SKILL_SPEED_PER_LEVEL * level),
  };
}

/** Dégâts effectifs d'une arme = dégâts de base modulés par la compétence. */
export function effectiveDmg(weapon: WeaponDef): number {
  return weapon.dmg * skillBonus(weapon.category).dmgMult;
}

/** Durée de swing effective = base modulée par la compétence (plus court = plus rapide). */
export function effectiveSwingDur(weapon: WeaponDef): number {
  return weapon.swingDur * skillBonus(weapon.category).speedMult;
}

// ============================================================================
// Compétences de mouvement (Saut, Athlétisme) — à l'usage, Morrowind-style
// ============================================================================

export type MovementCategory = "jumping" | "athletics";

export const MOVEMENT_CATEGORIES: MovementCategory[] = ["jumping", "athletics"];

export const MOVEMENT_LABEL: Record<MovementCategory, string> = {
  jumping: "Saut",
  athletics: "Athlétisme",
};

export const MOVEMENT_GOV: Record<MovementCategory, string> = {
  jumping: "AGI",
  athletics: "END",
};

const movementState: Record<MovementCategory, SkillState> = {
  jumping: { xp: 0 },
  athletics: { xp: 0 },
};

const movementListeners = new Set<() => void>();

export function getMovementSkills(): Record<MovementCategory, SkillState> {
  return movementState;
}

export function subscribeMovementSkills(fn: () => void): () => void {
  movementListeners.add(fn);
  return () => movementListeners.delete(fn);
}

function notifyMovement() {
  for (const fn of movementListeners) fn();
}

export function gainMovementXp(category: MovementCategory, amount: number): void {
  movementState[category].xp += amount;
  notifyMovement();
}

export interface MovementBonus {
  level: number;
  /** Multiplicateur de hauteur de saut (1 = base). */
  jumpMult: number;
  /** Multiplicateur de vitesse de sprint (1 = base). */
  speedMult: number;
  /** Multiplicateur du coût en endurance à la course (<1 = moins cher). */
  staminaMult: number;
}

/** Bonus actifs d'une compétence de mouvement, dérivés de son niveau. */
export function movementBonus(category: MovementCategory): MovementBonus {
  const { level } = levelInfo(movementState[category].xp);
  if (category === "jumping") {
    return {
      level,
      jumpMult: 1 + JUMP_BONUS_PER_LEVEL * level,
      speedMult: 1,
      staminaMult: 1,
    };
  }
  return {
    level,
    jumpMult: 1,
    speedMult: 1 + ATHLETICS_SPEED_PER_LEVEL * level,
    staminaMult: Math.max(0.2, 1 - ATHLETICS_STAMINA_PER_LEVEL * level),
  };
}

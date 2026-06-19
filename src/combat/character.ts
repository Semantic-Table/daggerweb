// Registre des attributs du personnage (cf. docs/roadmap-attributs.md).
// 8 attributs qui gouvernent les aptitudes et alimentent les stats dérivées.
// Pattern : registre de module (comme skills.ts / inventory.ts) avec abonnement.

import type { WeaponCategory } from "./skills";

// ============================================================================
// Types
// ============================================================================

export type Attr = "FOR" | "INT" | "VOL" | "AGI" | "END" | "CHA" | "VIT" | "CHN";
export type Attrs = Record<Attr, number>;

/** État interne du personnage (attributs + pratique accumulée + vigueur). */
interface CharacterState {
  attrs: Attrs;
  /** XP de pratique par attribut (pour la croissance future). */
  practice: Record<Attr, number>;
  /** Vigueur actuelle (0-1, fraction de maxStamina). */
  stamina: number;
}

// ============================================================================
// État & Abonnements
// ============================================================================

const state: CharacterState = {
  attrs: { FOR: 30, INT: 30, VOL: 30, AGI: 30, END: 30, CHA: 30, VIT: 30, CHN: 30 },
  practice: { FOR: 0, INT: 0, VOL: 0, AGI: 0, END: 0, CHA: 0, VIT: 0, CHN: 0 },
  stamina: 1.0, // Commence à 100%
};

// ============================================================================
// Level-up : suivi des montées d'attributs pour le feedback UI
// ============================================================================

/** Dernier niveau connu par attribut (pour détecter les montées). */
const lastAttrLevel: Record<Attr, number> = {
  FOR: 0, INT: 0, VOL: 0, AGI: 0, END: 0, CHA: 0, VIT: 0, CHN: 0,
};

// Callback pour notifier une montée d'attribut (utilisé par App.tsx pour le feedback)
let onAttrLevelUp: ((attr: Attr) => void) | null = null;

export function setOnAttrLevelUp(fn: ((attr: Attr) => void) | null): void {
  onAttrLevelUp = fn;
}

const listeners = new Set<() => void>();

export function getCharacter(): CharacterState {
  return state;
}

export function subscribeCharacter(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(): void {
  for (const fn of listeners) fn();
}

// ============================================================================
// Mapping Aptitude → Attribut Gouverneur
// ============================================================================

/** Quel attribut gouverne quelle catégorie d'arme. */
export const SKILL_GOV: Record<WeaponCategory, Attr> = {
  blade: "FOR",   // Épées → Force
  axe: "FOR",     // Haches → Force
  unarmed: "AGI", // Poings → Agilité
};

// ============================================================================
// Stats Dérivées (calculées à la volée, jamais stockées)
// ============================================================================

// Import des constantes
import {
  ATTR_BASE,
  ATTR_CAP,
  HP_BASE,
  HP_PER_END,
  MANA_PER_INT,
  CARRY_BASE,
  CARRY_PER_STR,
  DMG_PER_STR,
  MOVE_PER_SPD,
  CRIT_PER_LUCK,
  SKILL_XP_BASE,
  FAT_K,
  STAMINA_REGEN,
  STAMINA_REGEN_PER_END,
} from "../config";

/** PV maximum = base + END * coefficient. */
export function maxHp(): number {
  return HP_BASE + state.attrs.END * HP_PER_END;
}

/** Magie maximum (mana) = INT * coefficient. */
export function maxMagicka(): number {
  return state.attrs.INT * MANA_PER_INT;
}

/** Charge maximum portable = base + FOR * coefficient. */
export function carryMax(): number {
  return CARRY_BASE + state.attrs.FOR * CARRY_PER_STR;
}

/** Multiplicateur de vitesse de déplacement (basé sur VIT). */
export function moveMult(): number {
  return 1 + (state.attrs.VIT - ATTR_BASE) * MOVE_PER_SPD;
}

/** Multiplicateur de dégâts mêlée (basé sur FOR). */
export function meleeMult(): number {
  return 1 + (state.attrs.FOR - ATTR_BASE) * DMG_PER_STR;
}

/** Chance de coup critique (0-1, basée sur CHN). */
export function critChance(): number {
  return state.attrs.CHN * CRIT_PER_LUCK;
}

// ============================================================================
// Vigueur (Fatigue) - Phase 4
// ============================================================================

/** Vigueur maximum = (FOR + END + AGI + VOL) × FAT_K. */
export function maxStamina(): number {
  const sum = state.attrs.FOR + state.attrs.END + state.attrs.AGI + state.attrs.VOL;
  return sum * FAT_K;
}

/** Vigueur actuelle (en valeur absolue, pas en fraction). */
export function currentStamina(): number {
  return state.stamina * maxStamina();
}

/** Vigueur en pourcentage (0-100). */
export function staminaPercent(): number {
  return state.stamina * 100;
}

/** Multiplicateur de régén de vigueur — l'END donne du souffle au combat. */
export function staminaRegenMult(): number {
  return 1 + (state.attrs.END - ATTR_BASE) * STAMINA_REGEN_PER_END;
}

/** Dépense une FRACTION (0..1) de la jauge. Retourne false si insuffisant. */
export function useStamina(frac: number): boolean {
  if (state.stamina < frac) return false;
  state.stamina = Math.max(0, state.stamina - frac);
  notify();
  return true;
}

/** Régénère de la vigueur (appelé chaque frame). Continue tant que la jauge
 * n'est pas pleine ; une fois à 1, on ne notifie plus (évite un re-render +
 * une sauvegarde localStorage à chaque frame pour rien). */
export function regenStamina(dt: number): void {
  if (state.stamina >= 1.0) return;
  state.stamina = Math.min(1.0, state.stamina + STAMINA_REGEN * staminaRegenMult() * dt);
  notify();
}

/** Vérifie si on a assez de vigueur pour courir. */
export function canRun(): boolean {
  return state.stamina > 0.1; // 10% de vigueur minimum pour courir
}

/** Malus de vitesse si surchargé (poids > carryMax). */
export function encumbranceMult(currentWeight: number): number {
  if (currentWeight <= carryMax()) return 1.0;
  // Malus proportionnel à l'excès de poids
  const excess = currentWeight - carryMax();
  const excessRatio = excess / carryMax();
  return Math.max(0.5, 1.0 - excessRatio * 0.5); // Min 50% vitesse
}

// ============================================================================
// Niveau de personnage (Phase 4)
// ============================================================================

/** Calcule le niveau du personnage = somme des niveaux d'attributs. */
export function characterLevel(): number {
  let total = 0;
  for (const attr of ATTR_ABBR) {
    total += attrLevel(attr);
  }
  return total;
}

/** Poids actuel de l'inventaire (à calculer côté appelant avec getInventory). */
export function getCurrentWeight(items: Array<{ weight: number } | null>): number {
  return items.reduce((sum, item) => sum + (item?.weight ?? 0), 0);
}

/** Vérifie si on peut porter un item supplémentaire (en poids). */
export function canCarryAdditional(weightToAdd: number, currentWeight: number): boolean {
  return currentWeight + weightToAdd <= carryMax();
}

// ============================================================================
// Courbe de progression des attributs (même modèle que les skills)
// Coût du palier n = SKILL_XP_BASE * n (coût croissant)
// ============================================================================

/** Info de niveau pour un attribut (comme levelInfo dans skills.ts). */
export interface AttrLevelInfo {
  level: number;
  into: number;  // XP dans le palier courant
  need: number;  // XP nécessaire pour le prochain palier
}

/** Calcule le niveau, XP dans le palier, et XP nécessaire pour le prochain palier. */
export function attrLevelInfo(practice: number): AttrLevelInfo {
  let level = 0;
  let acc = 0;
  let need = SKILL_XP_BASE * (level + 1);
  while (practice >= acc + need) {
    acc += need;
    level++;
    need = SKILL_XP_BASE * (level + 1);
  }
  return { level, into: practice - acc, need };
}

/** Niveau actuel d'un attribut. */
export function attrLevel(attr: Attr): number {
  return attrLevelInfo(state.practice[attr]).level;
}

/** Ajoute de la pratique à un attribut. Si ça fait passer un palier,
 * l'attribut monte de +1 (jusqu'à ATTR_CAP) et déclenche le callback onAttrLevelUp. */
export function gainAttrPractice(attr: Attr, amount: number): void {
  const oldLevel = lastAttrLevel[attr];
  state.practice[attr] += amount;
  
  const newLevel = attrLevel(attr);
  
  // Si on a passé un ou plusieurs paliers
  if (newLevel > oldLevel) {
    // Monter l'attribut (jusqu'au cap)
    const levelsGained = Math.min(newLevel - oldLevel, ATTR_CAP - state.attrs[attr]);
    if (levelsGained > 0) {
      state.attrs[attr] += levelsGained;
      lastAttrLevel[attr] = newLevel;
      
      // Notifier la montée (pour le feedback UI)
      onAttrLevelUp?.(attr);
    }
  }
  
  lastAttrLevel[attr] = newLevel;
  notify();
}

// ============================================================================
// Profils de départ (Phase 4)
// ============================================================================

export type CharacterProfile = "guerrier" | "voleur" | "mage" | "neutre";

export const PROFILES: Record<CharacterProfile, { label: string; attrs: Attrs }> = {
  neutre: {
    label: "Neutre",
    attrs: { FOR: 30, INT: 30, VOL: 30, AGI: 30, END: 30, CHA: 30, VIT: 30, CHN: 30 },
  },
  guerrier: {
    label: "Guerrier",
    attrs: { FOR: 35, INT: 25, VOL: 30, AGI: 28, END: 32, CHA: 20, VIT: 25, CHN: 25 },
  },
  voleur: {
    label: "Voleur",
    attrs: { FOR: 25, INT: 28, VOL: 25, AGI: 35, END: 28, CHA: 25, VIT: 30, CHN: 30 },
  },
  mage: {
    label: "Mage",
    attrs: { FOR: 20, INT: 35, VOL: 32, AGI: 25, END: 25, CHA: 20, VIT: 25, CHN: 30 },
  },
};

// Clé pour sauvegarder le profil choisi
const PROFILE_KEY = "dungeonFps_profile";

/** Charge le profil sélectionné ou retourne 'neutre' par défaut. */
function loadProfile(): CharacterProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return (raw && Object.keys(PROFILES).includes(raw))
      ? (raw as CharacterProfile)
      : "neutre";
  } catch {
    return "neutre";
  }
}

/** Sauvegarde le profil sélectionné. */
export function saveProfile(profile: CharacterProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, profile);
  } catch {
    // Ignorer
  }
}

/** Applique immédiatement les attributs d'un profil au personnage en cours. */
export function applyProfile(profile: CharacterProfile): void {
  Object.assign(state.attrs, PROFILES[profile].attrs);
  notify();
}

/** Remet le personnage à zéro (attributs + pratique + vigueur) et efface la sauvegarde. */
export function resetCharacter(): void {
  const base = PROFILES.neutre.attrs;
  Object.assign(state.attrs, base);
  for (const attr of Object.keys(state.practice) as Attr[]) {
    state.practice[attr] = 0;
    lastAttrLevel[attr] = 0;
  }
  state.stamina = 1.0;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PROFILE_KEY);
  } catch { /* Ignorer */ }
  notify();
}

// ============================================================================
// Persistance (localStorage)
// ============================================================================

const STORAGE_KEY = "dungeonFps_character";

/** Charge les attributs depuis localStorage. */
function loadCharacter(): Partial<CharacterState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Sauvegarde les attributs dans localStorage. */
function saveCharacter(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignorer les erreurs de stockage (ex: mode privé)
  }
}

/** Initialise le caractère avec sauvegarde si disponible. */
function initCharacter(): void {
  const saved = loadCharacter();
  const profile = loadProfile();
  
  if (saved) {
    // Fusionner avec les valeurs par défaut
    Object.assign(state.attrs, saved.attrs);
    Object.assign(state.practice, saved.practice);
    if (typeof saved.stamina === 'number') {
      state.stamina = saved.stamina;
    }
  } else {
    // Premier lancement : appliquer le profil sélectionné
    const profileAttrs = PROFILES[profile].attrs;
    Object.assign(state.attrs, profileAttrs);
  }
  
  // S'assurer que les valeurs sont dans les limites
  for (const attr of Object.keys(state.attrs) as Attr[]) {
    state.attrs[attr] = Math.max(ATTR_BASE, Math.min(ATTR_CAP, state.attrs[attr]));
  }
  state.stamina = Math.max(0, Math.min(1, state.stamina));

  // Synchroniser le suivi des paliers avec la pratique chargée. `attrs` (persisté)
  // inclut déjà les niveaux gagnés ; si `lastAttrLevel` restait à 0, le prochain
  // gainAttrPractice recalculerait tous les paliers comme « nouveaux » et
  // réappliquerait les montées (double comptage). On l'aligne donc sur l'état réel.
  for (const attr of Object.keys(state.attrs) as Attr[]) {
    lastAttrLevel[attr] = attrLevel(attr);
  }
  
  // Abonner à la sauvegarde automatique sur changement
  const saveOnChange = () => saveCharacter();
  listeners.add(saveOnChange);
}

// Initialiser au premier import
initCharacter();

// ============================================================================
// Export des valeurs brutes (pour l'UI)
// ============================================================================

export function getAttr(attr: Attr): number {
  return state.attrs[attr];
}

export function getAllAttrs(): Attrs {
  return { ...state.attrs };
}

// Noms complets des attributs pour l'UI
export const ATTR_LABEL: Record<Attr, string> = {
  FOR: "Force",
  INT: "Intelligence",
  VOL: "Volonté",
  AGI: "Agilité",
  END: "Endurance",
  CHA: "Charisme",
  VIT: "Vitesse",
  CHN: "Chance",
};

export const ATTR_ABBR: Attr[] = ["FOR", "INT", "VOL", "AGI", "END", "CHA", "VIT", "CHN"];

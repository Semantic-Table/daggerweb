import type { ItemDef, WeaponDef } from "../items/itemDefs";
import { ITEMS } from "../items/itemDefs";
import { carryMax, getCurrentWeight } from "./character";

// Inventaire illimité en nombre d'items, mais limité par le poids (FORCE).
// Plus de limite de slots, on porte autant que carryMax() le permet.

export interface InventoryState {
  /** Tableau dynamique d'items (pas de limite de taille). */
  items: ItemDef[];
  equipped: WeaponDef;
}

const state: InventoryState = {
  items: [],
  equipped: ITEMS.fists as WeaponDef,
};

const listeners = new Set<() => void>();

export function getInventory(): InventoryState {
  return state;
}

export function subscribeInventory(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(): void {
  for (const fn of listeners) fn();
}

/** Calcule le poids total actuel de l'inventaire. */
export function getTotalWeight(): number {
  return getCurrentWeight(state.items);
}

/** Calcule le poids restant disponible. */
export function getRemainingWeight(): number {
  return carryMax() - getTotalWeight();
}

/** Vérifie si on peut ajouter un item (en poids). */
function canAddItem(item: ItemDef): boolean {
  return getTotalWeight() + item.weight <= carryMax();
}

/** Ajoute un item à l'inventaire si la charge le permet. Retourne true si réussi. */
export function pickupItem(item: ItemDef): boolean {
  if (!canAddItem(item)) return false;
  state.items.push(item);
  notify();
  return true;
}

/** Équipe l'arme à l'index donné (si c'est bien une arme). */
export function equipWeapon(index: number): void {
  const item = state.items[index];
  if (!item || item.kind !== "weapon") return;
  state.equipped = item;
  notify();
}

/** Déséquipe l'arme courante : on repasse à mains nues. */
export function unequipWeapon(): void {
  if (state.equipped.id === "fists") return;
  state.equipped = ITEMS.fists as WeaponDef;
  notify();
}

/** Consomme une potion à l'index donné. Retourne les PV soignés (0 si pas une potion). */
export function consumePotion(index: number): number {
  const item = state.items[index];
  if (!item || item.kind !== "potion") return 0;
  state.items.splice(index, 1);
  notify();
  return item.heal;
}

/** Retire un item de l'inventaire (par index). */
export function removeItem(index: number): ItemDef | null {
  if (index < 0 || index >= state.items.length) return null;
  const [item] = state.items.splice(index, 1);
  notify();
  return item;
}

/** Retire un item spécifique (par référence). Retourne true si trouvé et retiré. */
export function removeItemByReference(item: ItemDef): boolean {
  const index = state.items.findIndex((it) => it === item);
  if (index === -1) return false;
  state.items.splice(index, 1);
  notify();
  return true;
}

// ============================================================================
// Utilitaires pour la compatibilité avec l'ancien système
// ============================================================================

/** Retourne les items sous forme de tableau avec null pour les slots vides.
 * (Pour compatibilité avec l'ancien système de slots si nécessaire) */
export function getItemsAsSlots(): (ItemDef | null)[] {
  return [...state.items]; // Pas de null, juste les items existants
}

/** Retourne le nombre d'items dans l'inventaire. */
export function getItemCount(): number {
  return state.items.length;
}

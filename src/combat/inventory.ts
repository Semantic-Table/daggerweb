import type { ItemDef, WeaponDef } from "../items/itemDefs";
import { ITEMS } from "../items/itemDefs";

export const INVENTORY_SIZE = 8;

export interface InventoryState {
  slots: (ItemDef | null)[];
  equipped: WeaponDef;
}

const state: InventoryState = {
  slots: Array(INVENTORY_SIZE).fill(null),
  equipped: ITEMS.sword_rusty as WeaponDef,
};

const listeners = new Set<() => void>();

export function getInventory(): InventoryState {
  return state;
}

export function subscribeInventory(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) fn();
}

/** Ajoute un item dans le premier slot libre. Retourne true si réussi. */
export function pickupItem(item: ItemDef): boolean {
  const idx = state.slots.findIndex((s) => s === null);
  if (idx === -1) return false;
  state.slots[idx] = item;
  notify();
  return true;
}

/** Équipe l'arme dans le slot donné (si c'est bien une arme). */
export function equipWeapon(slotIdx: number): void {
  const item = state.slots[slotIdx];
  if (!item || item.kind !== "weapon") return;
  state.equipped = item;
  notify();
}

/** Consomme une potion du slot donné. Retourne les PV soignés (0 si pas une potion). */
export function consumePotion(slotIdx: number): number {
  const item = state.slots[slotIdx];
  if (!item || item.kind !== "potion") return 0;
  state.slots[slotIdx] = null;
  notify();
  return item.heal;
}

/** Retire un item d'un slot (ex: transfert depuis cadavre). */
export function removeFromSlot(slotIdx: number): ItemDef | null {
  const item = state.slots[slotIdx];
  if (!item) return null;
  state.slots[slotIdx] = null;
  notify();
  return item;
}

import type { Object3D } from "three";
import type { ItemDef } from "../items/itemDefs";

export interface CorpseHandle {
  mesh: Object3D;
  loot: ItemDef[];
  looted: boolean;
  markLooted: () => void;
}

// Registre des cadavres fouillables — interrogé par Interaction (raycast) et InventoryUI.
export const corpseRegistry = new Set<CorpseHandle>();

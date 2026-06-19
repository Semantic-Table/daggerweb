import type { Object3D } from "three";
import type { ItemDef } from "../items/itemDefs";

export interface ChestHandle {
  mesh: Object3D;
  loot: ItemDef[];
  opened: boolean;
  markOpened: () => void;
}

// Registre des coffres fouillables — interrogé par Interaction (raycast).
export const chestRegistry = new Set<ChestHandle>();

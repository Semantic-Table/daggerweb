import type { Object3D } from "three";
import type { GatherableDef } from "../items/itemDefs";

export interface GatherableHandle {
  mesh: Object3D;
  item: GatherableDef;
  gathered: boolean;
  markGathered: () => void;
}

// Registre des objets gatherables — interrogé par Interaction (raycast).
export const gatherableRegistry = new Set<GatherableHandle>();

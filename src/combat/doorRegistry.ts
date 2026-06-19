import type { Object3D } from "three";

export interface DoorHandle {
  mesh: Object3D;
  open: boolean;
  markOpen: () => void;
}

// Registre des portes ouvrables — interrogé par Interaction (raycast).
export const doorRegistry = new Set<DoorHandle>();

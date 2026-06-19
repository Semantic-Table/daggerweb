import type { Object3D } from "three";

export interface WellHandle {
  mesh: Object3D;
}

// Registre des puits interactables — interrogé par Interaction (raycast).
export const wellRegistry = new Set<WellHandle>();

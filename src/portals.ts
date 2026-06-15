import type { Object3D } from "three";

// Registre des meshes de seuil. L'interaction au regard raycaste uniquement
// contre ces objets (et non toute la scène) -> coût quasi nul par frame.
export const portalRegistry = new Set<Object3D>();

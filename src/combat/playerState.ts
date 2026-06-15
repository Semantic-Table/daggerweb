import { Vector3 } from "three";

// Position monde du joueur, mise à jour chaque frame par le composant Player.
// Les ennemis la lisent pour se diriger (évite le prop-drilling).
export const playerPos = new Vector3();

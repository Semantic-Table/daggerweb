import { Vector3 } from "three";

// Position monde du joueur, mise à jour chaque frame par le composant Player.
// Les ennemis la lisent pour se diriger (évite le prop-drilling).
export const playerPos = new Vector3();

// Direction de regard du joueur projetée sur le plan XZ (normalisée), mise à
// jour chaque frame par Player. Lue par combat/playerDefense pour savoir si le
// joueur fait FACE à l'attaquant (on ne pare/bloque que de face).
export const playerForward = new Vector3(0, 0, -1);

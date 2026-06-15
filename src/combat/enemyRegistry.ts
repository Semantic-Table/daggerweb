import type { Vector3 } from "three";

// Registre des ennemis vivants. L'épée interroge ce registre au moment du swing
// pour savoir qui est touché (cône + distance), sans passer par React.
export interface EnemyHandle {
  getPosition: (out: Vector3) => Vector3;
  /** Encaisse un coup : direction (XZ normalisée) + dégâts. */
  hit: (dirX: number, dirZ: number, dmg: number) => void;
}

export const enemyRegistry = new Set<EnemyHandle>();

// Défense du joueur : garde & parade (clic droit). Même pattern « registre de
// module » que playerCombat / playerState — pas de prop-drilling, pas de store.
//
// Boucle de contre-jeu (refonte ennemis Phase 1, cf. docs/refonte-ennemis-plan.md) :
//   - L'ennemi TÉLÉGRAPHIE son coup (windup visible) puis FRAPPE (STRIKE).
//   - À STRIKE, l'ennemi en mêlée appelle `resolveMeleeHit()` au lieu de
//     `damagePlayer()` directement. Cette fonction arbitre :
//       • PARADE  : garde pressée dans la fenêtre PARRY_WINDOW_MS, de face
//                   → aucun dégât + l'ennemi est STAGGER (le seul cas d'interruption).
//       • BLOC    : garde maintenue, de face, assez de vigueur
//                   → dégâts réduits (GUARD_BLOCK_MULT).
//       • TOUCHÉ  : sinon → dégâts pleins.
//   - Le résultat est renvoyé à l'ennemi : "parried" déclenche son stagger.
//
// La parade ne marche que de FACE (cône GUARD_FACING_DOT) : on lit `playerForward`
// (regard caméra projeté XZ) contre la direction joueur→ennemi.

import { useStamina } from "./character";
import { damagePlayer } from "./playerCombat";
import { playerForward } from "./playerState";
import {
  GUARD_FACING_DOT,
  GUARD_BLOCK_MULT,
  GUARD_BLOCK_STAMINA,
  PARRY_WINDOW_MS,
} from "../config";

/** État de défense partagé (lu par les ennemis à la frappe, écrit par Sword). */
export const playerDefense = {
  /** Garde maintenue (clic droit enfoncé). */
  guarding: false,
  /** Horodatage (performance.now) jusqu'auquel une parade est possible. */
  parryUntil: 0,
};

export type HitOutcome = "parried" | "blocked" | "hit";

// Feedback de parade (HUD) : App s'abonne pour flasher un indicateur.
let onParry: (() => void) | null = null;
export function setOnParry(fn: (() => void) | null): void {
  onParry = fn;
}

/** Arme une nouvelle fenêtre de parade (appelé au clic droit qui ENFONCE la garde). */
export function beginGuard(): void {
  playerDefense.guarding = true;
  playerDefense.parryUntil = performance.now() + PARRY_WINDOW_MS;
}

/** Relâche la garde. */
export function endGuard(): void {
  playerDefense.guarding = false;
  playerDefense.parryUntil = 0;
}

/** Vrai si le joueur fait face à un attaquant situé dans la direction (nx,nz)
 *  = vecteur ennemi→joueur normalisé sur XZ. Joueur→ennemi = (−nx,−nz). */
function facingAttacker(nx: number, nz: number): boolean {
  return playerForward.x * -nx + playerForward.z * -nz >= GUARD_FACING_DOT;
}

/**
 * Arbitre un coup de mêlée à l'instant de la frappe. `nx,nz` = direction
 * ennemi→joueur normalisée (XZ). Renvoie l'issue ; "parried" doit déclencher
 * le stagger de l'ennemi côté appelant.
 */
export function resolveMeleeHit(dmg: number, nx: number, nz: number): HitOutcome {
  const frontal = facingAttacker(nx, nz);

  // Parade : fenêtre active + de face. Consommée pour éviter une double-parade.
  if (frontal && performance.now() < playerDefense.parryUntil) {
    playerDefense.parryUntil = 0;
    onParry?.();
    return "parried";
  }

  // Bloc : garde maintenue, de face, et assez de vigueur pour encaisser.
  if (frontal && playerDefense.guarding && useStamina(GUARD_BLOCK_STAMINA)) {
    damagePlayer(dmg * GUARD_BLOCK_MULT);
    return "blocked";
  }

  // Sinon : coup plein.
  damagePlayer(dmg);
  return "hit";
}

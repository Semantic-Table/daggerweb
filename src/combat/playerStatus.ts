// Altérations d'état du joueur (Phase 5). Pour l'instant : POISON (DoT).
// Même pattern « registre de module » que playerCombat / playerState.
//
// Implémentation volontairement sobre : le poison inflige des TICKS espacés de
// POISON_TICK secondes. Comme l'intervalle dépasse les i-frames du joueur
// (PLAYER_IFRAMES_MS, cf. App), chaque tick passe par `damagePlayer` normal
// (flash + mitigation AC) sans canal de dégâts dédié. Player appelle tickPoison()
// chaque frame et inflige le dégât renvoyé.

const POISON_TICK = 0.8;   // intervalle entre deux ticks (s) — > i-frames
const POISON_TICKS = 3;    // nombre de ticks par application

let ticksLeft = 0;
let dmgPerTick = 0;
let timer = 0;

/** Applique/rafraîchit un poison qui infligera `total` dégâts répartis en ticks. */
export function applyPoison(total: number): void {
  if (total <= 0) return;
  dmgPerTick = total / POISON_TICKS;
  ticksLeft = POISON_TICKS;
  timer = POISON_TICK;
}

/** Avance le poison d'un pas de temps ; renvoie le dégât à infliger cette frame
 *  (0 la plupart du temps, `dmgPerTick` quand un tick arrive à échéance). */
export function tickPoison(dt: number): number {
  if (ticksLeft <= 0) return 0;
  timer -= dt;
  if (timer <= 0) {
    timer += POISON_TICK;
    ticksLeft--;
    return dmgPerTick;
  }
  return 0;
}

/** Vrai si un poison est actif (pour un éventuel indicateur HUD). */
export function isPoisoned(): boolean {
  return ticksLeft > 0;
}

/** Purge le poison (respawn / changement de monde). */
export function clearPoison(): void {
  ticksLeft = 0;
  timer = 0;
}

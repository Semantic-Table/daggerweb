// Registre d'INVOCATIONS runtime (Phase 5) — pour le nécromancien qui fait
// apparaître des ennemis en cours de partie. Même pattern « registre de module »
// que enemyRegistry / projectileRegistry : la liste vit hors React, <Enemies>
// s'abonne et monte/démonte les composants invoqués.
//
// Les invoqués réutilisent les MÊMES composants (getEnemyComponent) ; ils gèrent
// donc seuls IA, mort, cadavre et loot. La liste est vidée au changement de monde
// (<Enemies> est keyé par donjon et purge au démontage).

export interface Summoned {
  id: number;
  typeId: string;
  level: number;
  x: number;
  z: number;
}

export const summons: Summoned[] = [];
let nextId = 1;

const listeners = new Set<() => void>();
export function subscribeSummons(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify(): void {
  for (const fn of listeners) fn();
}

/** Invoque un ennemi à la position donnée. Renvoie son id. */
export function addSummon(typeId: string, level: number, x: number, z: number): number {
  const id = nextId++;
  summons.push({ id, typeId, level, x, z });
  notify();
  return id;
}

/** Vide toutes les invocations (changement de monde/donjon). */
export function clearSummons(): void {
  if (summons.length === 0) return;
  summons.length = 0;
  notify();
}

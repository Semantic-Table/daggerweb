// Registre des chiffres de dégâts flottants.
// pushDmg() est appelé depuis useEnemyAI au moment de l'impact.
// Le composant DamageNumbers (dans le Canvas) s'abonne et rend chaque événement
// via <Html> drei. Un setTimeout retire l'événement après l'animation CSS.

export interface DmgEvent {
  id: number;
  x: number;
  y: number;
  z: number;
  dmg: number;
}

const events: DmgEvent[] = [];
let nextId = 0;
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export const DMG_NUMBER_DURATION_MS = 1100;

export function pushDmg(x: number, y: number, z: number, dmg: number): void {
  const ev: DmgEvent = { id: nextId++, x, y, z, dmg };
  events.push(ev);
  notify();
  setTimeout(() => {
    const i = events.indexOf(ev);
    if (i !== -1) {
      events.splice(i, 1);
      notify();
    }
  }, DMG_NUMBER_DURATION_MS);
}

export function getDmgEvents(): readonly DmgEvent[] {
  return events;
}

export function subscribeDmg(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

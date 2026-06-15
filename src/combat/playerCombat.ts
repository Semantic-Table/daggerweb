// Canal de dégâts vers le joueur : les ennemis appellent damagePlayer(), App
// enregistre le handler (qui met à jour les PV en état React). Évite le
// prop-drilling, comme enemyRegistry / playerState.

type Handler = (dmg: number) => void;
let handler: Handler | null = null;

export function setDamageHandler(h: Handler | null): void {
  handler = h;
}

export function damagePlayer(dmg: number): void {
  handler?.(dmg);
}

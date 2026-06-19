// Registre de projectiles — système UNIFIÉ, partagé par tous les ennemis à
// distance (slime, archer, nécro…). Même pattern « registre de module » que
// enemyRegistry / corpseRegistry : pas de prop-drilling, état hors arbre React.
//
// Les projectiles ne sont PAS des RigidBody Rapier (fini le create/destroy par
// tir, les ids `Date.now()` et le nettoyage par setTimeout de l'ancien
// AcidProjectile). Ce sont de simples données ; <Projectiles> les avance chaque
// frame et résout les collisions :
//   - MURS  : raycast Rapier `EXCLUDE_DYNAMIC` (géométrie fixe réelle, Y compris).
//   - JOUEUR: test de proximité 3D contre playerPos (centre caméra).
// À l'impact, un « burst » court (FX) est émis puis le projectile est retiré.

import * as THREE from "three";

export type ProjectileKind = "acid" | "arrow" | "bolt";

export interface ProjectileKindDef {
  speed: number;     // vitesse de croisière (u/s)
  radius: number;    // rayon visuel + tolérance de collision
  life: number;      // durée de vie max (s) avant disparition
  color: string;     // teinte principale (mesh + émissif)
}

// Catalogue des projectiles. Ajouter un type = une entrée ici + un cas de rendu
// dans <Projectiles> (mesh). Aucune logique à dupliquer ailleurs.
export const PROJECTILE_KINDS: Record<ProjectileKind, ProjectileKindDef> = {
  acid: { speed: 9, radius: 0.14, life: 3, color: "#8bd34a" },
  arrow: { speed: 18, radius: 0.1, life: 3, color: "#caa46a" },
  bolt: { speed: 11, radius: 0.16, life: 3, color: "#a060ff" },
};

export interface Projectile {
  id: number;
  kind: ProjectileKind;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  dmg: number;
  radius: number;
  life: number;
  /** Vrai = éclat d'impact (FX) : immobile, grossit puis s'efface, aucune collision. */
  burst: boolean;
  /** Durée totale (s), pour normaliser l'animation du burst. */
  maxLife: number;
}

// Liste autoritaire des projectiles vivants (lue chaque frame par <Projectiles>).
export const projectiles: Projectile[] = [];

// Ids par COMPTEUR monotone (jamais Date.now : déterministe, zéro collision d'id).
let nextId = 1;

// Abonnement aux changements STRUCTURELS (ajout/retrait) — pour que <Projectiles>
// re-render et monte/démonte les meshes. Les déplacements frame-à-frame, eux, ne
// passent pas par React (mutation directe des refs).
const listeners = new Set<() => void>();
export function subscribeProjectiles(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify(): void {
  for (const fn of listeners) fn();
}

/** Tire un projectile depuis `pos` dans la direction `dir` (XZ normalisée ou 3D). */
export function spawnProjectile(opts: {
  kind: ProjectileKind;
  pos: THREE.Vector3 | { x: number; y: number; z: number };
  dir: THREE.Vector3 | { x: number; y: number; z: number };
  dmg: number;
}): void {
  const def = PROJECTILE_KINDS[opts.kind];
  const dir = new THREE.Vector3(opts.dir.x, opts.dir.y, opts.dir.z);
  if (dir.lengthSq() < 1e-6) return;
  dir.normalize();
  projectiles.push({
    id: nextId++,
    kind: opts.kind,
    pos: new THREE.Vector3(opts.pos.x, opts.pos.y, opts.pos.z),
    vel: dir.multiplyScalar(def.speed),
    dmg: opts.dmg,
    radius: def.radius,
    life: def.life,
    burst: false,
    maxLife: def.life,
  });
  notify();
}

/** Émet un éclat d'impact (FX, sans collision) à la position donnée. */
export function spawnImpact(kind: ProjectileKind, pos: THREE.Vector3): void {
  const def = PROJECTILE_KINDS[kind];
  const life = 0.16;
  projectiles.push({
    id: nextId++,
    kind,
    pos: pos.clone(),
    vel: new THREE.Vector3(),
    dmg: 0,
    radius: def.radius * 2.4,
    life,
    burst: true,
    maxLife: life,
  });
  notify();
}

/** Retire un projectile (par identité). Appelé par <Projectiles> quand il meurt. */
export function removeProjectile(p: Projectile): void {
  const i = projectiles.indexOf(p);
  if (i >= 0) {
    projectiles.splice(i, 1);
    notify();
  }
}

/** Vide tous les projectiles (changement de monde/donjon). */
export function clearProjectiles(): void {
  if (projectiles.length === 0) return;
  projectiles.length = 0;
  notify();
}

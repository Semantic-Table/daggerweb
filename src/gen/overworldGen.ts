import { makeRng, randInt, type Rng } from "../rng";
import { LEVEL_MAX, LEVEL_DIST_STEP } from "../config";

// Overworld minimal (cf. GDD §3) en DONNÉES PURES : décor épars + entrées de
// donjon de différents types. Le rendu/physique est délégué aux composants R3F.

export const GROUND = 200;

export type EntranceKind = "keep" | "crypt" | "cave";

export interface Decor {
  type: "rock" | "tree";
  x: number;
  z: number;
  rotY: number;
  scaleY: number;
  radius: number; // rayon de collision
  height: number; // pour le tronc des arbres
}

export interface Entrance {
  id: number;
  kind: EntranceKind;
  x: number;
  z: number;
  rotY: number;
  seed: number;
  approach: [number, number, number]; // point de réapparition devant le seuil
  level: number; // niveau de difficulté (≥ 1), croît avec l'éloignement du spawn
}

export interface OverworldData {
  decor: Decor[];
  entrances: Entrance[];
  spawn: [number, number, number];
}

const KINDS: EntranceKind[] = ["keep", "crypt", "cave"];

export function generateOverworld(seed: number): OverworldData {
  const rng: Rng = makeRng(seed);

  const decor: Decor[] = [];
  for (let i = 0; i < 80; i++) {
    const isTree = rng() < 0.4;
    const x = (rng() - 0.5) * GROUND * 0.9;
    const z = (rng() - 0.5) * GROUND * 0.9;
    if (Math.hypot(x, z) < 8) continue; // dégage le spawn
    if (isTree) {
      decor.push({ type: "tree", x, z, rotY: rng() * Math.PI * 2, scaleY: 1, radius: 0.45, height: 2.5 + rng() * 2 });
    } else {
      const s = 0.6 + rng() * 1.8;
      decor.push({ type: "rock", x, z, rotY: rng() * Math.PI * 2, scaleY: 0.6 + rng() * 0.5, radius: s, height: 0 });
    }
  }

  const entrances: Entrance[] = [];
  const count = 4;
  const radius = 28;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    const rotY = -a + Math.PI / 2;
    // "Avant" de la porte = +z local après rotation. C'est le côté où s'ouvre
    // le seuil ; on y place le point de réapparition, quelques mètres devant.
    const fx = Math.sin(rotY);
    const fz = Math.cos(rotY);
    // Niveau : base donnée par la distance au spawn (origine), ± un écart seedé.
    // Le gradient géographique restera léger tant que les entrées sont sur un
    // cercle, mais la formule tient quand l'overworld s'étalera (cf. roadmap-niveaux).
    const dist = Math.hypot(x, z);
    const base = 1 + Math.floor(dist / LEVEL_DIST_STEP);
    const level = Math.max(1, Math.min(LEVEL_MAX, base + randInt(rng, 0, 2)));
    entrances.push({
      id: i,
      kind: KINDS[i % KINDS.length],
      x,
      z,
      rotY,
      seed: seed * 31 + i + 1,
      approach: [x + fx * 6, 1.6, z + fz * 6],
      level,
    });
  }

  return { decor, entrances, spawn: [0, 1.6, 0] };
}

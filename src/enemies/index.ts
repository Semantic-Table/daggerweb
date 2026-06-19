// =============================================================================
// ENEMY INDEX - Export centralisé de tous les ennemis
// =============================================================================

// Types et configurations
export * from "./enemyTypes";

// Ré-export du gobelin existant pour uniformité
import { Enemy as Goblin } from "../components/Enemy";
export { Goblin };

// Composants d'ennemis et leurs types
import { Skeleton, skeletonEnemyType } from "./Skeleton";
import { SkeletonArcher, skeletonArcherEnemyType } from "./SkeletonArcher";
import { Slime, slimeEnemyType } from "./Slime";
import { Orc, orcEnemyType } from "./Orc";
import { Wolf, wolfEnemyType } from "./Wolf";
import { Troll, trollEnemyType } from "./Troll";
import { Spider, spiderEnemyType } from "./Spider";
import { Necromancer, necromancerEnemyType } from "./Necromancer";

export {
  Skeleton, skeletonEnemyType,
  SkeletonArcher, skeletonArcherEnemyType,
  Slime, slimeEnemyType,
  Orc, orcEnemyType,
  Wolf, wolfEnemyType,
  Troll, trollEnemyType,
  Spider, spiderEnemyType,
  Necromancer, necromancerEnemyType,
};

// =============================================================================
// UTILITAIRES - Sélection et génération d'ennemis
// =============================================================================

import { ENEMY_TYPES, getEnemyForBiome, getRandomEnemyType } from "./enemyTypes";
import type { EnemyProps } from "./useEnemyAI";

/**
 * Sélectionne un composant d'ennemi en fonction de son type
 * Usage: const EnemyComponent = getEnemyComponent("skeleton");
 *        <EnemyComponent spawn={[0, 0]} index={0} level={1} />
 */
export function getEnemyComponent(typeId: string) {
  const components: Record<string, React.ComponentType<EnemyProps>> = {
    goblin: Goblin,
    skeleton: Skeleton,
    skeletonArcher: SkeletonArcher,
    slime: Slime,
    orc: Orc,
    wolf: Wolf,
    troll: Troll,
    spider: Spider,
    necromancer: Necromancer,
  };

  // Type non implémenté → on retombe sur le gobelin (jamais d'ennemi invisible).
  return components[typeId] || components.goblin;
}

/**
 * Crée un ennemi aléatoire pour un biome donné
 * Retourne { typeId, Component, spawn }
 */
export function createRandomEnemyForBiome(biome: string, spawn: [number, number], index: number) {
  const type = getEnemyForBiome(biome);
  const Component = getEnemyComponent(type.id);
  return { typeId: type.id, Component, spawn, index };
}

/**
 * Crée un ennemi aléatoire (tous biomes confondus)
 */
export function createRandomEnemy(spawn: [number, number], index: number) {
  const type = getRandomEnemyType();
  const Component = getEnemyComponent(type.id);
  return { typeId: type.id, Component, spawn, index };
}

// =============================================================================
// LISTE DES ENNEMIS IMPLEMENTÉS
// =============================================================================

/** Liste des ennemis actuellement implémentés et prêts à l'emploi */
export const IMPLEMENTED_ENEMIES = [
  "goblin",
  "skeleton",
  "skeletonArcher",
  "slime",
  "orc",
  "wolf",
  "troll",
  "spider",
  "necromancer",
] as const;

export type ImplementedEnemyId = typeof IMPLEMENTED_ENEMIES[number];

// =============================================================================
// STATISTIQUES et BILAN
// =============================================================================

/**
 * Retourne les stats d'un ennemi par son ID
 */
export function getEnemyStats(typeId: string) {
  return ENEMY_TYPES[typeId]?.stats;
}

/**
 * Retourne la couleur principale d'un ennemi
 */
export function getEnemyColor(typeId: string) {
  return ENEMY_TYPES[typeId]?.appearance.primaryColor;
}

/**
 * Retourne le comportement d'un ennemi
 */
export function getEnemyBehavior(typeId: string) {
  return ENEMY_TYPES[typeId]?.behavior;
}

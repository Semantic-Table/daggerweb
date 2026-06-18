import type { EnemyType } from "./enemyTypes";
import type { EnemyAIStats } from "./useEnemyAI";
import { HP_GROWTH, DMG_GROWTH, ARMOR_GROWTH } from "../config";

// Scaling des stats d'ennemi par niveau (cf. docs/roadmap-niveaux.md).
//
// Le catalogue `enemyTypes` porte les stats au NIVEAU 1 sur l'échelle proto. Cette
// fonction PURE en dérive les stats effectives pour un niveau donné — croissance
// LINÉAIRE. On ne mute jamais le catalogue (même discipline que `skillBonus` /
// `scaledStats` côté joueur) ; le résultat alimente directement `useEnemyAI`.
//
// Au niveau 1 (g = 0) → stats catalogue inchangées : le gobelin live reste
// strictement identique à ce qu'il était avant le système de niveaux.

export function scaledStats(type: EnemyType, level: number): EnemyAIStats {
  const g = Math.max(0, level - 1); // 0 au niveau 1
  return {
    hp: Math.round(type.stats.hp * (1 + HP_GROWTH * g)),
    attackDmg: Math.round(type.stats.attackDamage * (1 + DMG_GROWTH * g)),
    // Mouvement & cadence : suivent le type, plats en niveau.
    speed: type.stats.speed,
    stopDist: type.stats.stopDistance,
    attackDist: type.stats.attackRange,
    attackCd: type.stats.attackCooldown,
    // Armure : légère montée possible, plafonnée pour ne jamais devenir immunité.
    armor: Math.min(0.9, type.stats.armor + ARMOR_GROWTH * g),
    walkSpeed: type.animations.walkSpeed,
    attackAnimSpeed: type.animations.attackAnimSpeed,
    deathSpeed: type.animations.deathSpeed,
  };
}

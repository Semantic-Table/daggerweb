import type { EnemyType, EnemyBehavior } from "./enemyTypes";
import type { EnemyAIStats } from "./useEnemyAI";
import { HP_GROWTH, DMG_GROWTH, ARMOR_GROWTH, ENEMY_WINDUP, ENEMY_RECOVERY, ENEMY_STAGGER } from "../config";

// Scaling des stats d'ennemi par niveau (cf. docs/roadmap-niveaux.md).
//
// Le catalogue `enemyTypes` porte les stats au NIVEAU 1 sur l'échelle proto. Cette
// fonction PURE en dérive les stats effectives pour un niveau donné — croissance
// LINÉAIRE. On ne mute jamais le catalogue (même discipline que `skillBonus` /
// `scaledStats` côté joueur) ; le résultat alimente directement `useEnemyAI`.
//
// Au niveau 1 (g = 0) → stats catalogue inchangées : le gobelin live reste
// strictement identique à ce qu'il était avant le système de niveaux.

// Combat télégraphié (refonte ennemis Phase 1) : défauts de windup/recovery par
// archétype quand le type ne les surcharge pas. Les rapides anticipent vite (mais
// frappent souvent), les tanks télégraphient lourdement (coups lents et punissables).
const WINDUP_BY_BEHAVIOR: Record<EnemyBehavior, number> = {
  fast: 0.3,
  swarm: 0.3,
  chaser: ENEMY_WINDUP,
  ranged: 0.7,
  tank: 0.6,
  boss: 0.7,
  passive: ENEMY_WINDUP,
};
const RECOVERY_BY_BEHAVIOR: Record<EnemyBehavior, number> = {
  fast: 0.4,
  swarm: 0.4,
  chaser: ENEMY_RECOVERY,
  ranged: 0.5,
  tank: 0.75,
  boss: 0.7,
  passive: ENEMY_RECOVERY,
};

// Bonus « élite » : au-delà du niveau majoré (+2), une élite frappe plus fort et
// encaisse davantage. Multiplicateurs appliqués à PV/dégâts.
const ELITE_HP_MULT = 1.6;
const ELITE_DMG_MULT = 1.3;

export function scaledStats(type: EnemyType, level: number, elite = false): EnemyAIStats {
  const g = Math.max(0, level - 1); // 0 au niveau 1
  const eHp = elite ? ELITE_HP_MULT : 1;
  const eDmg = elite ? ELITE_DMG_MULT : 1;
  return {
    hp: Math.round(type.stats.hp * (1 + HP_GROWTH * g) * eHp),
    attackDmg: Math.round(type.stats.attackDamage * (1 + DMG_GROWTH * g) * eDmg),
    // Mouvement & cadence : suivent le type, plats en niveau.
    speed: type.stats.speed,
    stopDist: type.stats.stopDistance,
    attackDist: type.stats.attackRange,
    attackCd: type.stats.attackCooldown,
    // Combat télégraphié : windup/recovery du type, sinon défaut par archétype.
    // Stagger sur parade : constant (Phase 1) — un type pourra y résister plus tard.
    windup: type.stats.windup ?? WINDUP_BY_BEHAVIOR[type.behavior],
    recovery: type.stats.recovery ?? RECOVERY_BY_BEHAVIOR[type.behavior],
    stagger: ENEMY_STAGGER,
    // Armure : légère montée possible, plafonnée pour ne jamais devenir immunité.
    armor: Math.min(0.9, type.stats.armor + ARMOR_GROWTH * g),
    walkSpeed: type.animations.walkSpeed,
    attackAnimSpeed: type.animations.attackAnimSpeed,
    deathSpeed: type.animations.deathSpeed,
  };
}

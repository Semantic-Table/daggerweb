import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { enemyRegistry, type EnemyHandle } from "../combat/enemyRegistry";
import { playerPos } from "../combat/playerState";
import { damagePlayer } from "../combat/playerCombat";
import { corpseRegistry, type CorpseHandle } from "../combat/corpseRegistry";
import { gameState } from "../combat/gameState";
import { rollLoot } from "../items/itemDefs";

// ============================================================================
// useEnemyAI — moteur d'IA/combat partagé par TOUS les ennemis.
//
// Avant ce hook, chaque ennemi (gobelin, squelette, slime, orc, loup) copiait
// ~80 % de la même boucle : enregistrement au registre, file de coups en attente
// (pendingHits), poursuite XZ, attaque sur cooldown, effondrement à la mort,
// loot du cadavre, gel sur pause. Seuls les *meshes* et quelques scalaires
// diffèrent réellement.
//
// Le hook est volontairement DÉCOUPLÉ du catalogue `enemyTypes` : il prend des
// NOMBRES bruts (`stats`) et des callbacks de rendu. Ainsi le gobelin peut le
// nourrir avec ses constantes `config.ts` (échelle de balance historique) et les
// autres ennemis avec `type.stats` (échelle catalogue) — sans qu'aucune valeur
// de gameplay ne change. Le composant ne garde que son arbre de meshes + ses
// animations propres (via `onAnimate` / `onFlash` / `onDeath` / `onAttack`).
// ============================================================================

/** État de mouvement exposé chaque frame pour piloter les animations propres. */
export interface EnemyMotion {
  /** Sinusoïde de marche (−1..1), vaut 0 à l'arrêt. */
  ws: number;
  /** Enveloppe d'attaque (0..1), pic au milieu du swing. */
  aa: number;
  /** Distance horizontale au joueur. */
  dist: number;
  /** Phase de marche brute (rad), pour les animations secondaires (ex: queue). */
  phase: number;
  /** Delta-temps de la frame (s), pour les animations propres (ex: pulsation). */
  dt: number;
}

/** Props communes à tous les composants d'ennemi (instanciés par `Enemies.tsx`). */
export interface EnemyProps {
  spawn: [number, number];
  index: number;
  /** Niveau de l'ennemi (≈ niveau du donjon ± écart). Pilote `scaledStats`. */
  level: number;
  /** Tirage « élite » (niveau donjon + 2) — pour le label / les variantes visuelles. */
  elite?: boolean;
}

/** Nombres de gameplay dont le moteur a besoin (source au choix de l'appelant). */
export interface EnemyAIStats {
  hp: number;
  speed: number;
  stopDist: number;
  attackDist: number;
  attackCd: number;
  attackDmg: number;
  /** Réduction des dégâts subis (0 = aucune, 1 = immunité). */
  armor: number;
  /** Vitesse de la phase de marche (rad/s). */
  walkSpeed: number;
  /** Vitesse de décroissance de l'enveloppe d'attaque. */
  attackAnimSpeed: number;
  /** Vitesse de l'animation de mort. */
  deathSpeed: number;
}

export interface UseEnemyAIOptions {
  spawn: [number, number];
  index: number;
  body: RefObject<RapierRigidBody | null>;
  /** Groupe pivoté vers le joueur + animé à la mort. */
  corpseGroup: RefObject<THREE.Group | null>;
  stats: EnemyAIStats;
  /** Recul (impulsion) appliqué au coup encaissé. Défaut {xz:3, y:0.8}. */
  knockback?: { xz: number; y: number };
  /** Distance d'attaque minimale (ex: le slime ne crache pas au contact). Défaut 0. */
  minAttackDist?: number;
  /** Anime les meshes propres à l'ennemi (appelé chaque frame hors pause/mort). */
  onAnimate?: (m: EnemyMotion) => void;
  /** Reçoit l'intensité du flash (0..1) chaque frame — à appliquer au matériau. */
  onFlash?: (flash: number) => void;
  /** Effondrement à la mort : reçoit le groupe-cadavre + progression eased (0..1).
   *  Si absent : bascule avant (rot.x → π/2) + léger enfoncement. */
  onDeath?: (group: THREE.Group, e: number) => void;
  /** Déclenché quand l'attaque part (direction XZ normalisée vers le joueur).
   *  Si absent : inflige `stats.attackDmg` au joueur (mêlée). */
  onAttack?: (dirX: number, dirZ: number) => void;
}

export interface EnemyAIResult {
  /** Vrai une fois le cadavre fouillé (pour assombrir le rendu). */
  looted: boolean;
  /** Vrai dès la mort (réactif) — ex: masquer le label flottant. */
  isDead: boolean;
}

export function useEnemyAI(opts: UseEnemyAIOptions): EnemyAIResult {
  const { spawn, index, body, corpseGroup, stats } = opts;
  const kbXz = opts.knockback?.xz ?? 3;
  const kbY = opts.knockback?.y ?? 0.8;
  const minAttackDist = opts.minAttackDist ?? 0;

  // Callbacks de rendu stockés en ref pour toujours appeler la dernière closure
  // (capture fraîche de `looted`, etc.) sans réenregistrer le useFrame.
  const onAnimate = useRef(opts.onAnimate);
  const onFlash = useRef(opts.onFlash);
  const onDeath = useRef(opts.onDeath);
  const onAttack = useRef(opts.onAttack);
  onAnimate.current = opts.onAnimate;
  onFlash.current = opts.onFlash;
  onDeath.current = opts.onDeath;
  onAttack.current = opts.onAttack;

  const hp = useRef(stats.hp);
  const dead = useRef(false);
  const deathT = useRef(0);
  const flash = useRef(0);
  const atkCd = useRef(0);
  const walkPhase = useRef(0);
  const attackAnim = useRef(0);
  const [looted, setLooted] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  // Coups en attente : `hit` (appelé depuis un event DOM par l'épée) n'altère
  // jamais le corps Rapier directement — il empile, et useFrame applique tout
  // en phase frame. Muter un corps depuis un event DOM, surtout pendant qu'un
  // autre ragdolle, déclenche l'aliasing wasm de Rapier.
  const pendingHits = useRef<{ dx: number; dz: number; dmg: number }[]>([]);
  const handleRef = useRef<EnemyHandle | null>(null);
  const corpseHandleRef = useRef<CorpseHandle | null>(null);

  // Seed de loot : coordonnées de spawn + index pour éviter les collisions.
  const lootSeed = useRef(
    (((Math.round(spawn[0] * 100) * 73856093) ^ (Math.round(spawn[1] * 100) * 19349663) ^ (index * 83492791)) >>> 0) % 0xffffff,
  );

  useEffect(() => {
    const handle: EnemyHandle = {
      getPosition: (out) => {
        const t = body.current?.translation();
        return t ? out.set(t.x, t.y, t.z) : out;
      },
      hit: (dx, dz, dmg) => {
        if (dead.current) return;
        pendingHits.current.push({ dx, dz, dmg: dmg * (1 - stats.armor) });
      },
    };
    handleRef.current = handle;
    enemyRegistry.add(handle);
    return () => {
      enemyRegistry.delete(handle);
      // Cadavre persistant : retiré du registre au démontage (sortie du donjon)
      // pour ne pas laisser de mesh détaché derrière soi.
      if (corpseHandleRef.current) corpseRegistry.delete(corpseHandleRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mort : l'ennemi s'effondre (animé dans useFrame), le cadavre reste sur place.
  // Sort du registre tout de suite pour ne plus être ciblé ni lu par l'épée.
  function die() {
    dead.current = true;
    setIsDead(true);
    if (handleRef.current) enemyRegistry.delete(handleRef.current);
    // Génère le loot et enregistre le cadavre une fois qu'il a touché le sol.
    setTimeout(() => {
      const mesh = corpseGroup.current;
      if (!mesh) return;
      let s = lootSeed.current;
      const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
      const loot = rollLoot(rng);
      const handle: CorpseHandle = {
        mesh,
        loot,
        looted: false,
        markLooted: () => {
          handle.looted = true;
          setLooted(true);
        },
      };
      corpseHandleRef.current = handle;
      corpseRegistry.add(handle);
    }, 600);
  }

  useFrame((_, dt) => {
    const b = body.current;
    if (!b) return;

    // Menu bloquant ouvert : la physique est déjà gelée (<Physics paused>), on
    // coupe l'IA (poursuite, attaque, cooldown) pour ne plus infliger de dégâts,
    // et on annule les vélocités (lin + ang, y compris cadavres) pour un gel net.
    if (gameState.paused) {
      b.setLinvel({ x: 0, y: 0, z: 0 }, false);
      b.setAngvel({ x: 0, y: 0, z: 0 }, false);
      return;
    }

    // Décroissance du flash de coup (le composant l'applique à son matériau).
    flash.current = Math.max(0, flash.current - dt * 4);
    onFlash.current?.(flash.current);

    // Application des coups encaissés (toutes les mutations Rapier ici, en frame).
    while (pendingHits.current.length > 0 && !dead.current) {
      const h = pendingHits.current.shift()!;
      hp.current -= h.dmg;
      flash.current = 1;
      b.applyImpulse({ x: h.dx * kbXz, y: kbY, z: h.dz * kbXz }, true);
      if (hp.current <= 0) die();
    }

    // Mort : effondrement (animé), corps figé sur le plan XZ.
    if (dead.current) {
      const g = corpseGroup.current;
      if (g) {
        deathT.current = Math.min(1, deathT.current + dt * stats.deathSpeed);
        const e = deathT.current;
        if (onDeath.current) onDeath.current(g, e);
        else {
          g.rotation.x = (e * Math.PI) / 2;
          g.position.y = -e * 0.5;
        }
      }
      const lv = b.linvel();
      b.setLinvel({ x: 0, y: lv.y, z: 0 }, true);
      return;
    }

    // Poursuite sur le plan XZ.
    const t = b.translation();
    tmp.set(playerPos.x - t.x, 0, playerPos.z - t.z);
    const d = tmp.length();

    // Orientation : le modèle (face/yeux sur +Z) pivote sur Y vers le joueur.
    const g = corpseGroup.current;
    if (g && d > 0.001) {
      g.rotation.y = Math.atan2(playerPos.x - t.x, playerPos.z - t.z);
    }
    const v = b.linvel();
    if (d > stats.stopDist) {
      tmp.normalize().multiplyScalar(stats.speed);
      b.setLinvel({ x: tmp.x, y: v.y, z: tmp.z }, true);
    } else {
      b.setLinvel({ x: 0, y: v.y, z: 0 }, true);
    }

    // Attaque sur cooldown (mêlée par défaut, override possible via onAttack).
    atkCd.current -= dt;
    if (d <= stats.attackDist && d >= minAttackDist && atkCd.current <= 0) {
      const nx = d > 0.001 ? (playerPos.x - t.x) / d : 0;
      const nz = d > 0.001 ? (playerPos.z - t.z) / d : 0;
      if (onAttack.current) onAttack.current(nx, nz);
      else damagePlayer(stats.attackDmg);
      atkCd.current = stats.attackCd;
      attackAnim.current = 1;
    }

    // Phases d'animation partagées (le composant les applique à ses meshes).
    const isMoving = d > stats.stopDist;
    if (isMoving) walkPhase.current += dt * stats.walkSpeed;
    const ws = isMoving ? Math.sin(walkPhase.current) : 0;

    if (attackAnim.current > 0) {
      attackAnim.current = Math.max(0, attackAnim.current - dt * stats.attackAnimSpeed);
    }
    const aa = Math.sin(attackAnim.current * Math.PI);

    onAnimate.current?.({ ws, aa, dist: d, phase: walkPhase.current, dt });
  });

  return { looted, isDead };
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { enemyRegistry, type EnemyHandle } from "../combat/enemyRegistry";
import { playerPos } from "../combat/playerState";
import { damagePlayer } from "../combat/playerCombat";
import { corpseRegistry, type CorpseHandle } from "../combat/corpseRegistry";
import { gameState } from "../combat/gameState";
import { rollLoot } from "../items/itemDefs";
import {
  ENEMY_SPEED,
  ENEMY_STOP_DIST,
  ENEMY_HP,
  ENEMY_ATTACK_DIST,
  ENEMY_ATTACK_CD,
  ENEMY_ATTACK_DMG,
} from "../config";

// Ennemi "poursuiveur" (cf. GDD §5) : capsule dynamique Rapier qui avance vers le
// joueur (lent et lisible). Flash + recul au coup, petite chute à la mort.

export function Enemy({ spawn, index }: { spawn: [number, number]; index: number }) {
  const body = useRef<RapierRigidBody>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const corpseGroup = useRef<THREE.Group>(null);
  const bodyRigRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const hp = useRef(ENEMY_HP);
  const dead = useRef(false);
  const deathT = useRef(0);
  const flash = useRef(0);
  const atkCd = useRef(0);
  const walkPhase = useRef(0);
  const attackAnim = useRef(0); // décroît 1→0 après l'attaque (enveloppe sin)
  const [looted, setLooted] = useState(false);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  // Coups en attente : `hit` (appelé depuis un event DOM par l'épée) ne touche
  // jamais le corps Rapier directement — il empile, et useFrame applique tout
  // dans la phase frame. Muter un corps depuis un event DOM, surtout pendant
  // qu'un autre corps ragdolle, déclenche l'aliasing wasm de Rapier.
  const pendingHits = useRef<{ dx: number; dz: number; dmg: number }[]>([]);
  const handleRef = useRef<EnemyHandle | null>(null);
  // Cadavre enregistré (persistant) — supprimé du registre au démontage du donjon.
  const corpseHandleRef = useRef<CorpseHandle | null>(null);
  // Seed de loot : coordonnées de spawn + index pour éviter les collisions entre ennemis.
  const lootSeed = useRef(
    (((Math.round(spawn[0] * 100) * 73856093) ^ (Math.round(spawn[1] * 100) * 19349663) ^ (index * 83492791)) >>> 0) % 0xffffff
  );
  // Variation visuelle déterministe par spawn (taille, teinte, couleur des yeux).
  const variant = useMemo(() => {
    let s = (Math.floor(Math.abs(spawn[0] * 131 + spawn[1] * 57)) % 9973) + 1;
    const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    return { scale: 0.92 + r() * 0.18, tint: r(), warmEyes: r() > 0.45 };
  }, [spawn]);

  useEffect(() => {
    const handle: EnemyHandle = {
      getPosition: (out) => {
        const t = body.current?.translation();
        return t ? out.set(t.x, t.y, t.z) : out;
      },
      hit: (dx, dz, dmg) => {
        if (dead.current) return;
        pendingHits.current.push({ dx, dz, dmg });
      },
    };
    handleRef.current = handle;
    enemyRegistry.add(handle);
    return () => {
      enemyRegistry.delete(handle);
      // Cadavre persistant : on le retire du registre au démontage (sortie du
      // donjon) pour ne pas laisser de mesh détaché derrière soi.
      if (corpseHandleRef.current) corpseRegistry.delete(corpseHandleRef.current);
    };
  }, []);

  // Mort : l'ennemi s'effondre au sol (animé dans useFrame), le cadavre reste sur
  // place. Sort tout de suite du registre pour ne plus être ciblé ni lu par l'épée.
  function die() {
    dead.current = true;
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
    // coupe juste l'IA (poursuite, attaque, cooldown) pour ne plus infliger de
    // dégâts. On annule aussi la vélocité (lin + ang) — y compris des cadavres
    // qui ragdollent — par sécurité, pour un figeage net.
    if (gameState.paused) {
      b.setLinvel({ x: 0, y: 0, z: 0 }, false);
      b.setAngvel({ x: 0, y: 0, z: 0 }, false);
      return;
    }

    // Décroissance du flash de coup.
    if (mat.current) {
      flash.current = Math.max(0, flash.current - dt * 4);
      mat.current.emissive.setScalar(flash.current * 0.9);
    }

    // Application des coups encaissés (toutes les mutations Rapier ici, en frame).
    while (pendingHits.current.length > 0 && !dead.current) {
      const h = pendingHits.current.shift()!;
      hp.current -= h.dmg;
      flash.current = 1;
      b.applyImpulse({ x: h.dx * 4, y: 1.2, z: h.dz * 4 }, true);
      if (hp.current <= 0) die();
    }

    // Mort : effondrement au sol (bascule + enfoncement), corps figé sur le plan
    // XZ. Pas de ragdoll — une simple chute lisible, puis le cadavre reste.
    if (dead.current) {
      const g = corpseGroup.current;
      if (g) {
        deathT.current = Math.min(1, deathT.current + dt * 3.5);
        const e = deathT.current;
        g.rotation.x = e * Math.PI / 2;
        g.position.y = -e * 0.5;
      }
      const lv = b.linvel();
      b.setLinvel({ x: 0, y: lv.y, z: 0 }, true);
      return;
    }

    // Poursuite sur le plan XZ.
    const t = b.translation();
    tmp.set(playerPos.x - t.x, 0, playerPos.z - t.z);
    const d = tmp.length();

    // Orientation : le modèle (face/yeux sur +Z) pivote sur Y vers le joueur. Le
    // RigidBody ayant ses rotations désactivées, on tourne le groupe visuel.
    if (corpseGroup.current && d > 0.001) {
      corpseGroup.current.rotation.y = Math.atan2(playerPos.x - t.x, playerPos.z - t.z);
    }
    const v = b.linvel();
    if (d > ENEMY_STOP_DIST) {
      tmp.normalize().multiplyScalar(ENEMY_SPEED);
      b.setLinvel({ x: tmp.x, y: v.y, z: tmp.z }, true);
    } else {
      b.setLinvel({ x: 0, y: v.y, z: 0 }, true);
    }

    // Attaque au contact, sur cooldown.
    atkCd.current -= dt;
    if (d <= ENEMY_ATTACK_DIST && atkCd.current <= 0) {
      damagePlayer(ENEMY_ATTACK_DMG);
      atkCd.current = ENEMY_ATTACK_CD;
      attackAnim.current = 1; // déclenche l'animation de griffe
    }

    // ── Animations ──────────────────────────────────────────────────────────

    // Walk : phase continue quand le gobelin avance.
    const isMoving = d > ENEMY_STOP_DIST;
    if (isMoving) walkPhase.current += dt * 5.5;
    const ws = isMoving ? Math.sin(walkPhase.current) : 0;

    // Attack : enveloppe sin(t·π) → 0 au déclenchement, pic au milieu, retour à 0.
    if (attackAnim.current > 0) attackAnim.current = Math.max(0, attackAnim.current - dt * 3.8);
    const aa = Math.sin(attackAnim.current * Math.PI);

    // Body rig : bob vertical + lunge avant sur attaque.
    if (bodyRigRef.current) {
      bodyRigRef.current.position.y = ws * 0.06;
      bodyRigRef.current.rotation.x = aa * 0.55;
    }

    // Bras : swing opposé en marche, ruée vers l'avant sur attaque.
    if (leftArmRef.current)  leftArmRef.current.rotation.set(0.1 + ws * 0.5 - aa * 1.2, 0, 0.48);
    if (rightArmRef.current) rightArmRef.current.rotation.set(0.1 - ws * 0.5 - aa * 1.2, 0, -0.48);

    // Jambes : phase inverse des bras (foulée naturelle).
    if (leftLegRef.current)  leftLegRef.current.rotation.set(-ws * 0.35, 0, 0);
    if (rightLegRef.current) rightLegRef.current.rotation.set(ws * 0.35, 0, 0);
  });

  // Peau verte variable (vert frais → vert boueux), assombrie une fois fouillé.
  const base = new THREE.Color().lerpColors(
    new THREE.Color("#4a7c2e"),
    new THREE.Color("#3a6040"),
    variant.tint,
  );
  const skinColor = looted ? base.clone().multiplyScalar(0.38) : base;
  const darkColor = looted ? base.clone().multiplyScalar(0.28) : base.clone().multiplyScalar(0.72);
  // Yeux jaunes perçants — éteints une fois mort/fouillé.
  const eyeColor = variant.warmEyes ? "#f0d020" : "#c8e030";
  const eyeGlow = looted ? 0 : 3.0;
  return (
    <RigidBody
      ref={body}
      colliders={false}
      type="dynamic"
      mass={1}
      canSleep={false}
      enabledRotations={[false, false, false]}
      position={[spawn[0], 0.9, spawn[1]]}
    >
      <CapsuleCollider args={[0.5, 0.4]} />
      {/* corpseGroup : orientation + animation de mort. bodyRigRef : walk + attack. */}
      <group ref={corpseGroup} scale={variant.scale * 0.78}>
        <group ref={bodyRigRef}>
          {/* Torse trapu. */}
          <mesh>
            <capsuleGeometry args={[0.32, 0.55, 4, 8]} />
            <meshStandardMaterial ref={mat} color={skinColor} roughness={1} flatShading />
          </mesh>
          {/* Jambes courtes (animées). */}
          <mesh ref={leftLegRef} position={[-0.15, -0.52, 0]}>
            <capsuleGeometry args={[0.1, 0.28, 4, 6]} />
            <meshStandardMaterial color={darkColor} roughness={1} flatShading />
          </mesh>
          <mesh ref={rightLegRef} position={[0.15, -0.52, 0]}>
            <capsuleGeometry args={[0.1, 0.28, 4, 6]} />
            <meshStandardMaterial color={darkColor} roughness={1} flatShading />
          </mesh>
          {/* Longs bras (animés). */}
          <mesh ref={leftArmRef} position={[-0.38, -0.12, 0.06]} rotation={[0.1, 0, 0.48]}>
            <capsuleGeometry args={[0.09, 0.82, 4, 6]} />
            <meshStandardMaterial color={skinColor} roughness={1} flatShading />
          </mesh>
          <mesh ref={rightArmRef} position={[0.38, -0.12, 0.06]} rotation={[0.1, 0, -0.48]}>
            <capsuleGeometry args={[0.09, 0.82, 4, 6]} />
            <meshStandardMaterial color={skinColor} roughness={1} flatShading />
          </mesh>
          {/* Grosse tête. */}
          <mesh position={[0, 0.88, 0.16]}>
            <sphereGeometry args={[0.34, 8, 6]} />
            <meshStandardMaterial color={skinColor} roughness={1} flatShading />
          </mesh>
          {/* Oreilles pointues (cône 3 segments = triangle). */}
          <mesh position={[-0.34, 1.04, 0.1]} rotation={[0.1, 0.2, -0.9]}>
            <coneGeometry args={[0.1, 0.38, 3]} />
            <meshStandardMaterial color={darkColor} roughness={1} flatShading />
          </mesh>
          <mesh position={[0.34, 1.04, 0.1]} rotation={[0.1, -0.2, 0.9]}>
            <coneGeometry args={[0.1, 0.38, 3]} />
            <meshStandardMaterial color={darkColor} roughness={1} flatShading />
          </mesh>
          {/* Nez crochu. */}
          <mesh position={[0, 0.84, 0.46]} rotation={[0.6, 0, 0]}>
            <coneGeometry args={[0.06, 0.22, 4]} />
            <meshStandardMaterial color={darkColor} roughness={1} flatShading />
          </mesh>
          {/* Yeux jaunes émissifs. */}
          <mesh position={[-0.13, 0.94, 0.42]}>
            <sphereGeometry args={[0.06, 6, 5]} />
            <meshStandardMaterial color="#000" emissive={eyeColor} emissiveIntensity={eyeGlow} toneMapped={false} />
          </mesh>
          <mesh position={[0.13, 0.94, 0.42]}>
            <sphereGeometry args={[0.06, 6, 5]} />
            <meshStandardMaterial color="#000" emissive={eyeColor} emissiveIntensity={eyeGlow} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </RigidBody>
  );
}

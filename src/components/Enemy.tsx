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

// Ennemi "poursuiveur" (cf. GDD §5) : capsule dynamique Rapier qui avance vers le
// joueur (lent et lisible). 3 PV. Flash + recul au coup, petite chute à la mort.

const SPEED = 1.8;
const STOP_DIST = 1.3;
const HP = 3;
const ATTACK_DIST = 1.7;
const ATTACK_CD = 1; // secondes entre deux coups
const ATTACK_DMG = 8;

export function Enemy({ spawn }: { spawn: [number, number] }) {
  const body = useRef<RapierRigidBody>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const corpseGroup = useRef<THREE.Group>(null);
  const hp = useRef(HP);
  const dead = useRef(false);
  const deathT = useRef(0); // progression de la chute au sol (0→1)
  const flash = useRef(0);
  const atkCd = useRef(0);
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
  // Seed de loot basé sur la position de spawn pour être déterministe.
  const lootSeed = useRef(Math.floor(Math.abs(spawn[0] * 73 + spawn[1] * 37)) % 1000);
  // Variation visuelle déterministe par spawn (taille, teinte, couleur des yeux).
  // Seed distinct du loot pour ne pas coupler apparence et butin.
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
        g.rotation.x = 0.14 + e * (Math.PI / 2 - 0.14);
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
    if (d > STOP_DIST) {
      tmp.normalize().multiplyScalar(SPEED);
      b.setLinvel({ x: tmp.x, y: v.y, z: tmp.z }, true);
    } else {
      b.setLinvel({ x: 0, y: v.y, z: 0 }, true);
    }

    // Attaque au contact, sur cooldown.
    atkCd.current -= dt;
    if (d <= ATTACK_DIST && atkCd.current <= 0) {
      damagePlayer(ATTACK_DMG);
      atkCd.current = ATTACK_CD;
      flash.current = 1; // petit flash de l'ennemi qui frappe
    }
  });

  // Teinte de base variable (rouge sombre → brun), assombrie une fois fouillé.
  const base = new THREE.Color().lerpColors(
    new THREE.Color("#5a241f"),
    new THREE.Color("#74402a"),
    variant.tint,
  );
  const bodyColor = looted ? base.clone().multiplyScalar(0.42) : base;
  const headColor = (looted ? base.clone().multiplyScalar(0.3) : base.clone().multiplyScalar(0.68));
  // Yeux brillants — éteints une fois mort/fouillé.
  const eyeColor = variant.warmEyes ? "#ffb24a" : "#ff3a2a";
  const eyeGlow = looted ? 0 : 2.4;
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
      {/* Léger voûtement vers l'avant + variation de taille (visuel uniquement,
          le collider reste fixe). */}
      <group ref={corpseGroup} rotation={[0.14, 0, 0]} scale={variant.scale}>
        {/* Torse. */}
        <mesh>
          <capsuleGeometry args={[0.4, 1, 4, 8]} />
          <meshStandardMaterial ref={mat} color={bodyColor} roughness={1} flatShading />
        </mesh>
        {/* Bras tombants, légèrement écartés. */}
        <mesh position={[-0.42, 0.12, 0.04]} rotation={[0, 0, 0.22]}>
          <capsuleGeometry args={[0.12, 0.55, 4, 6]} />
          <meshStandardMaterial color={headColor} roughness={1} flatShading />
        </mesh>
        <mesh position={[0.42, 0.12, 0.04]} rotation={[0, 0, -0.22]}>
          <capsuleGeometry args={[0.12, 0.55, 4, 6]} />
          <meshStandardMaterial color={headColor} roughness={1} flatShading />
        </mesh>
        {/* Tête avancée (renforce la posture voûtée). */}
        <mesh position={[0, 0.92, 0.14]}>
          <sphereGeometry args={[0.28, 8, 6]} />
          <meshStandardMaterial color={headColor} roughness={1} flatShading />
        </mesh>
        {/* Yeux émissifs. */}
        <mesh position={[-0.11, 0.95, 0.36]}>
          <sphereGeometry args={[0.055, 6, 5]} />
          <meshStandardMaterial color="#000" emissive={eyeColor} emissiveIntensity={eyeGlow} toneMapped={false} />
        </mesh>
        <mesh position={[0.11, 0.95, 0.36]}>
          <sphereGeometry args={[0.055, 6, 5]} />
          <meshStandardMaterial color="#000" emissive={eyeColor} emissiveIntensity={eyeGlow} toneMapped={false} />
        </mesh>
      </group>
    </RigidBody>
  );
}

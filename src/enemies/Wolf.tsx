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
import { ENEMY_TYPES } from "./enemyTypes";

// Configuration spécifique au Loup
const wolfType = ENEMY_TYPES.wolf;

const WOLF_SPEED = wolfType.stats.speed;
const WOLF_STOP_DIST = wolfType.stats.stopDistance;
const WOLF_HP = wolfType.stats.hp;
const WOLF_ATTACK_DIST = wolfType.stats.attackRange;
const WOLF_ATTACK_CD = wolfType.stats.attackCooldown;
const WOLF_ATTACK_DMG = wolfType.stats.attackDamage;
const WOLF_MASS = wolfType.stats.mass;
const WOLF_COLLIDER_RADIUS = wolfType.stats.colliderRadius;
const WOLF_COLLIDER_HEIGHT = wolfType.stats.colliderHeight;

// Couleurs du loup
const PRIMARY_COLOR = new THREE.Color(wolfType.appearance.primaryColor as string);
const SECONDARY_COLOR = new THREE.Color(wolfType.appearance.secondaryColor as string);
const ACCENT_COLOR = new THREE.Color(wolfType.appearance.accentColor as string);
const EYE_COLOR = new THREE.Color(wolfType.appearance.eyeColor as string);

export function Wolf({ spawn, index }: { spawn: [number, number]; index: number }) {
  const body = useRef<RapierRigidBody>(null);
  const mainMeshRef = useRef<THREE.Mesh>(null);
  const corpseGroup = useRef<THREE.Group>(null);
  const bodyRigRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  const leftLegFrontRef = useRef<THREE.Mesh>(null);
  const rightLegFrontRef = useRef<THREE.Mesh>(null);
  const leftLegBackRef = useRef<THREE.Mesh>(null);
  const rightLegBackRef = useRef<THREE.Mesh>(null);
  
  const hp = useRef(WOLF_HP);
  const dead = useRef(false);
  const deathT = useRef(0);
  const flash = useRef(0);
  const atkCd = useRef(0);
  const walkPhase = useRef(0);
  const attackAnim = useRef(0);
  const [looted, setLooted] = useState(false);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  
  const pendingHits = useRef<{ dx: number; dz: number; dmg: number }[]>([]);
  const handleRef = useRef<EnemyHandle | null>(null);
  const corpseHandleRef = useRef<CorpseHandle | null>(null);
  
  // Seed de loot
  const lootSeed = useRef(
    (((Math.round(spawn[0] * 100) * 73856093) ^ (Math.round(spawn[1] * 100) * 19349663) ^ (index * 83492791)) >>> 0) % 0xffffff
  );
  
  // Variation visuelle
  const variant = useMemo(() => {
    let s = (Math.floor(Math.abs(spawn[0] * 131 + spawn[1] * 57)) % 9973) + 1;
    const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    return { 
      scale: 0.9 + r() * 0.2, 
      furTint: r(),
      eyeGlow: r() * 3.0,
      isAlpha: r() > 0.7, // 30% de chance d'être un loup alpha (plus grand)
      tailPosition: r() * 0.2 - 0.1 // Variation de position de queue
    };
  }, [spawn]);

  // Couleurs calculées avec variation
  const furColor = useMemo(() => {
    return PRIMARY_COLOR.clone().lerp(SECONDARY_COLOR, variant.furTint);
  }, [variant.furTint]);
  
  const darkFurColor = useMemo(() => {
    return furColor.clone().multiplyScalar(0.6);
  }, [furColor]);
  
  const bellyColor = useMemo(() => {
    return furColor.clone().multiplyScalar(1.3).lerp(new THREE.Color("#e0e0e0"), 0.4);
  }, [furColor]);

  const eyeGlow = looted ? 0 : variant.eyeGlow;

  useEffect(() => {
    const handle: EnemyHandle = {
      getPosition: (out) => {
        const t = body.current?.translation();
        return t ? out.set(t.x, t.y, t.z) : out;
      },
      hit: (dx, dz, dmg) => {
        if (dead.current) return;
        pendingHits.current.push({ dx, dz, dmg: dmg * (1 - wolfType.stats.armor) });
      },
    };
    handleRef.current = handle;
    enemyRegistry.add(handle);
    return () => {
      enemyRegistry.delete(handle);
      if (corpseHandleRef.current) corpseRegistry.delete(corpseHandleRef.current);
    };
  }, []);

  function die() {
    dead.current = true;
    if (handleRef.current) enemyRegistry.delete(handleRef.current);
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

    if (gameState.paused) {
      b.setLinvel({ x: 0, y: 0, z: 0 }, false);
      b.setAngvel({ x: 0, y: 0, z: 0 }, false);
      return;
    }

    // Flash de coup
    if (mainMeshRef.current) {
      flash.current = Math.max(0, flash.current - dt * 4);
      const mat = mainMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = flash.current * 1.0;
    }

    // Application des coups
    while (pendingHits.current.length > 0 && !dead.current) {
      const h = pendingHits.current.shift()!;
      hp.current -= h.dmg;
      flash.current = 1;
      b.applyImpulse({ x: h.dx * 3, y: 1.0, z: h.dz * 3 }, true);
      if (hp.current <= 0) die();
    }

    // Mort - chute sur le côté
    if (dead.current) {
      const g = corpseGroup.current;
      if (g) {
        deathT.current = Math.min(1, deathT.current + dt * wolfType.animations.deathSpeed);
        const e = deathT.current;
        g.rotation.x = e * Math.PI / 2;
        g.rotation.z = e * 0.8;
        g.position.y = -e * wolfType.animations.deathSquash;
      }
      const lv = b.linvel();
      b.setLinvel({ x: 0, y: lv.y, z: 0 }, true);
      return;
    }

    // Poursuite
    const t = b.translation();
    tmp.set(playerPos.x - t.x, 0, playerPos.z - t.z);
    const d = tmp.length();

    if (corpseGroup.current && d > 0.001) {
      corpseGroup.current.rotation.y = Math.atan2(playerPos.x - t.x, playerPos.z - t.z);
    }
    
    const v = b.linvel();
    if (d > WOLF_STOP_DIST) {
      tmp.normalize().multiplyScalar(WOLF_SPEED);
      b.setLinvel({ x: tmp.x, y: v.y, z: tmp.z }, true);
    } else {
      b.setLinvel({ x: 0, y: v.y, z: 0 }, true);
    }

    // Attaque - morsure
    atkCd.current -= dt;
    if (d <= WOLF_ATTACK_DIST && atkCd.current <= 0) {
      damagePlayer(WOLF_ATTACK_DMG);
      atkCd.current = WOLF_ATTACK_CD;
      attackAnim.current = 1;
    }

    // Animations
    const isMoving = d > WOLF_STOP_DIST;
    if (isMoving) walkPhase.current += dt * wolfType.animations.walkSpeed;
    const ws = isMoving ? Math.sin(walkPhase.current) : 0;

    if (attackAnim.current > 0) attackAnim.current = Math.max(0, attackAnim.current - dt * wolfType.animations.attackAnimSpeed);
    const aa = Math.sin(attackAnim.current * Math.PI);

    // Body rig
    if (bodyRigRef.current) {
      bodyRigRef.current.position.y = ws * wolfType.animations.walkAmplitude * 1.5;
      bodyRigRef.current.rotation.x = aa * wolfType.animations.attackLunge * 0.5;
    }

    // Tête - regard haut/bas uniquement (la rotation gauche/droite est gérée par le corps)
    if (headRef.current) {
      headRef.current.rotation.x = ws * 0.1 - aa * 0.3;
      // Réinitialiser la rotation Y pour éviter l'accumulation
      headRef.current.rotation.y = 0;
      headRef.current.rotation.z = 0;
    }

    // Queue - remue quand il court
    if (tailRef.current) {
      tailRef.current.rotation.x = Math.sin(walkPhase.current * 2) * 0.3 + ws * 0.2;
      tailRef.current.rotation.y = ws * 0.3;
    }

    // Pattes avant
    if (leftLegFrontRef.current) {
      leftLegFrontRef.current.rotation.x = -ws * 0.8 + aa * 0.3;
    }
    if (rightLegFrontRef.current) {
      rightLegFrontRef.current.rotation.x = ws * 0.8 - aa * 0.3;
    }

    // Pattes arrière
    if (leftLegBackRef.current) {
      leftLegBackRef.current.rotation.x = ws * 0.8 + aa * 0.2;
    }
    if (rightLegBackRef.current) {
      rightLegBackRef.current.rotation.x = -ws * 0.8 - aa * 0.2;
    }
  });

  // Taille ajustée pour les loups alpha
  const finalScale = variant.scale * wolfType.scale * (variant.isAlpha ? 1.15 : 1);

  return (
    <RigidBody
      ref={body}
      colliders={false}
      type="dynamic"
      mass={WOLF_MASS * (variant.isAlpha ? 1.3 : 1)}
      canSleep={false}
      enabledRotations={[false, false, false]}
      position={[spawn[0], wolfType.colliderOffsetY, spawn[1]]}
    >
      <CapsuleCollider args={[WOLF_COLLIDER_RADIUS, WOLF_COLLIDER_HEIGHT]} />
      <group ref={corpseGroup} scale={finalScale}>
        <group ref={bodyRigRef}>
          {/* Corps principal */}
          <mesh ref={mainMeshRef}>
            <sphereGeometry args={[0.35, 12, 10]} />
            <meshStandardMaterial 
              color={furColor} 
              roughness={wolfType.appearance.roughness} 
              flatShading={wolfType.appearance.flatShading}
              emissive={furColor}
              emissiveIntensity={0}
            />
          </mesh>

          {/* Dos plus foncé */}
          <mesh position={[0, 0.1, -0.2]} rotation={[0.2, 0, 0]}>
            <sphereGeometry args={[0.32, 10, 8]} />
            <meshStandardMaterial color={darkFurColor} roughness={wolfType.appearance.roughness} flatShading />
          </mesh>

          {/* Ventre clair */}
          <mesh position={[0, -0.2, 0.15]} rotation={[-0.1, 0, 0]}>
            <sphereGeometry args={[0.28, 10, 8]} />
            <meshStandardMaterial color={bellyColor} roughness={wolfType.appearance.roughness} flatShading />
          </mesh>

          {/* Tête - centrée sur Z=0 pour éviter la rotation latérale */}
          <mesh ref={headRef} position={[0.35, 0.05, 0]}>
            <sphereGeometry args={[0.25, 10, 8]} />
            <meshStandardMaterial color={furColor} roughness={wolfType.appearance.roughness} flatShading />
          </mesh>

          {/* Museau */}
          <mesh position={[0.5, -0.05, 0.05]}>
            <coneGeometry args={[0.12, 0.25, 6]} />
            <meshStandardMaterial color={darkFurColor} roughness={wolfType.appearance.roughness} flatShading />
          </mesh>

          {/* Nez noir */}
          <mesh position={[0.58, -0.08, 0.08]}>
            <sphereGeometry args={[0.04, 4, 4]} />
            <meshStandardMaterial color="#000000" roughness={1} />
          </mesh>

          {/* Yeux */}
          <mesh position={[0.45, 0.1, 0.1]}>
            <sphereGeometry args={[0.05, 5, 4]} />
            <meshStandardMaterial color={ACCENT_COLOR} roughness={1} flatShading />
          </mesh>
          <mesh position={[0.55, 0.1, 0.1]}>
            <sphereGeometry args={[0.05, 5, 4]} />
            <meshStandardMaterial color={ACCENT_COLOR} roughness={1} flatShading />
          </mesh>

          {/* Yeux émissifs */}
          <mesh position={[0.45, 0.12, 0.12]}>
            <sphereGeometry args={[0.025, 4, 4]} />
            <meshStandardMaterial 
              color="#000" 
              emissive={EYE_COLOR} 
              emissiveIntensity={eyeGlow} 
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0.55, 0.12, 0.12]}>
            <sphereGeometry args={[0.025, 4, 4]} />
            <meshStandardMaterial 
              color="#000" 
              emissive={EYE_COLOR} 
              emissiveIntensity={eyeGlow} 
              toneMapped={false}
            />
          </mesh>

          {/* Oreilles */}
          <mesh position={[0.4, 0.25, 0.2]} rotation={[0, 0, -0.4]}>
            <coneGeometry args={[0.07, 0.15, 3]} />
            <meshStandardMaterial color={furColor} roughness={wolfType.appearance.roughness} flatShading />
          </mesh>
          <mesh position={[0.52, 0.25, 0.2]} rotation={[0, 0, 0.4]}>
            <coneGeometry args={[0.07, 0.15, 3]} />
            <meshStandardMaterial color={furColor} roughness={wolfType.appearance.roughness} flatShading />
          </mesh>

          {/* Intérieur des oreilles */}
          <mesh position={[0.42, 0.2, 0.15]} rotation={[0, 0, -0.3]}>
            <coneGeometry args={[0.04, 0.08, 2]} />
            <meshStandardMaterial color={bellyColor} roughness={1} />
          </mesh>
          <mesh position={[0.5, 0.2, 0.15]} rotation={[0, 0, 0.3]}>
            <coneGeometry args={[0.04, 0.08, 2]} />
            <meshStandardMaterial color={bellyColor} roughness={1} />
          </mesh>

          {/* Queue */}
          <mesh ref={tailRef} position={[-0.3, -0.1, -0.3 + variant.tailPosition]} rotation={[0.2, 0, 0]}>
            <capsuleGeometry args={[0.05, 0.35, 4, 6]} />
            <meshStandardMaterial color={furColor} roughness={wolfType.appearance.roughness} flatShading />
          </mesh>

          {/* Pattes avant */}
          <mesh ref={leftLegFrontRef} position={[-0.1, -0.25, 0.1]}>
            <capsuleGeometry args={[0.06, 0.35, 4, 6]} />
            <meshStandardMaterial color={furColor} roughness={wolfType.appearance.roughness} flatShading />
          </mesh>
          <mesh ref={rightLegFrontRef} position={[-0.05, -0.25, 0.1]}>
            <capsuleGeometry args={[0.06, 0.35, 4, 6]} />
            <meshStandardMaterial color={furColor} roughness={wolfType.appearance.roughness} flatShading />
          </mesh>

          {/* Pattes arrière */}
          <mesh ref={leftLegBackRef} position={[-0.2, -0.3, -0.2]}>
            <capsuleGeometry args={[0.07, 0.4, 4, 6]} />
            <meshStandardMaterial color={furColor} roughness={wolfType.appearance.roughness} flatShading />
          </mesh>
          <mesh ref={rightLegBackRef} position={[-0.15, -0.3, -0.2]}>
            <capsuleGeometry args={[0.07, 0.4, 4, 6]} />
            <meshStandardMaterial color={furColor} roughness={wolfType.appearance.roughness} flatShading />
          </mesh>

          {/* Griffes (sur les pattes avant) */}
          <mesh position={[-0.08, -0.55, 0.1]} rotation={[0.5, 0, 0]}>
            <coneGeometry args={[0.02, 0.08, 3]} />
            <meshStandardMaterial color="#333333" metalness={0.3} />
          </mesh>
          <mesh position={[-0.03, -0.55, 0.1]} rotation={[0.5, 0, 0]}>
            <coneGeometry args={[0.02, 0.08, 3]} />
            <meshStandardMaterial color="#333333" metalness={0.3} />
          </mesh>
          <mesh position={[-0.1, -0.55, 0.1]} rotation={[0.5, 0, 0]}>
            <coneGeometry args={[0.02, 0.08, 3]} />
            <meshStandardMaterial color="#333333" metalness={0.3} />
          </mesh>
          <mesh position={[-0.05, -0.55, 0.1]} rotation={[0.5, 0, 0]}>
            <coneGeometry args={[0.02, 0.08, 3]} />
            <meshStandardMaterial color="#333333" metalness={0.3} />
          </mesh>

          {/* Crocs visibles quand il attaque */}
          {attackAnim.current > 0 && (
            <>
              <mesh position={[0.55, -0.05, 0.32]} rotation={[0.2, 0, 0]}>
                <coneGeometry args={[0.015, 0.06, 3]} />
                <meshStandardMaterial color="#e0e0e0" metalness={0.5} />
              </mesh>
              <mesh position={[0.55, -0.08, 0.32]} rotation={[-0.1, 0, 0]}>
                <coneGeometry args={[0.015, 0.06, 3]} />
                <meshStandardMaterial color="#e0e0e0" metalness={0.5} />
              </mesh>
            </>
          )}

          {/* Collar pour les loups alpha */}
          {variant.isAlpha && (
            <mesh position={[0, -0.15, 0]} rotation={[0, 0, 0]}>
              <torusGeometry args={[0.38, 0.02, 6, 10]} />
              <meshStandardMaterial color="#886633" metalness={0.4} roughness={0.5} />
            </mesh>
          )}
        </group>
      </group>
    </RigidBody>
  );
}

export { wolfType as wolfEnemyType };

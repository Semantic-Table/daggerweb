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

// Configuration spécifique au Squelette
const skeletonType = ENEMY_TYPES.skeleton;

const SKELETON_SPEED = skeletonType.stats.speed;
const SKELETON_STOP_DIST = skeletonType.stats.stopDistance;
const SKELETON_HP = skeletonType.stats.hp;
const SKELETON_ATTACK_DIST = skeletonType.stats.attackRange;
const SKELETON_ATTACK_CD = skeletonType.stats.attackCooldown;
const SKELETON_ATTACK_DMG = skeletonType.stats.attackDamage;
const SKELETON_MASS = skeletonType.stats.mass;
const SKELETON_COLLIDER_RADIUS = skeletonType.stats.colliderRadius;
const SKELETON_COLLIDER_HEIGHT = skeletonType.stats.colliderHeight;

// Couleurs du squelette
const PRIMARY_COLOR = new THREE.Color(skeletonType.appearance.primaryColor as string);
const SECONDARY_COLOR = new THREE.Color(skeletonType.appearance.secondaryColor as string);
const ACCENT_COLOR = new THREE.Color(skeletonType.appearance.accentColor as string);
const EYE_COLOR = new THREE.Color(skeletonType.appearance.eyeColor as string);

// Export pour permettre l'import dans d'autres fichiers
export const skeletonEnemyType = ENEMY_TYPES.skeleton;

export function Skeleton({ spawn, index }: { spawn: [number, number]; index: number }) {
  const body = useRef<RapierRigidBody>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const corpseGroup = useRef<THREE.Group>(null);
  const bodyRigRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const swordRef = useRef<THREE.Mesh>(null);
  
  const hp = useRef(SKELETON_HP);
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
      scale: 0.92 + r() * 0.18, 
      tint: r(), 
      boneTint: 0.85 + r() * 0.2, // Variation de teinte des os
      hasSword: r() > 0.3, // 70% de chance d'avoir une épée
      warmEyes: r() > 0.5 
    };
  }, [spawn]);

  // Couleurs calculées avec variation
  const boneColor = useMemo(() => {
    return PRIMARY_COLOR.clone().lerp(SECONDARY_COLOR, variant.tint * 0.5);
  }, [variant.tint]);
  
  const darkBoneColor = useMemo(() => {
    return boneColor.clone().multiplyScalar(0.7);
  }, [boneColor]);
  
  const eyeGlow = looted ? 0 : (variant.warmEyes ? skeletonType.appearance.eyeGlow! * 1.2 : skeletonType.appearance.eyeGlow!);

  useEffect(() => {
    const handle: EnemyHandle = {
      getPosition: (out) => {
        const t = body.current?.translation();
        return t ? out.set(t.x, t.y, t.z) : out;
      },
      hit: (dx, dz, dmg) => {
        if (dead.current) return;
        pendingHits.current.push({ dx, dz, dmg: dmg * (1 - skeletonType.stats.armor) });
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
    if (mat.current) {
      flash.current = Math.max(0, flash.current - dt * 4);
      mat.current.emissive.setScalar(flash.current * 0.5);
    }

    // Application des coups
    while (pendingHits.current.length > 0 && !dead.current) {
      const h = pendingHits.current.shift()!;
      hp.current -= h.dmg;
      flash.current = 1;
      b.applyImpulse({ x: h.dx * 3, y: 0.8, z: h.dz * 3 }, true);
      if (hp.current <= 0) die();
    }

    // Mort
    if (dead.current) {
      const g = corpseGroup.current;
      if (g) {
        deathT.current = Math.min(1, deathT.current + dt * skeletonType.animations.deathSpeed);
        const e = deathT.current;
        g.rotation.x = e * Math.PI / 2;
        g.position.y = -e * skeletonType.animations.deathSquash;
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
    if (d > SKELETON_STOP_DIST) {
      tmp.normalize().multiplyScalar(SKELETON_SPEED);
      b.setLinvel({ x: tmp.x, y: v.y, z: tmp.z }, true);
    } else {
      b.setLinvel({ x: 0, y: v.y, z: 0 }, true);
    }

    // Attaque
    atkCd.current -= dt;
    if (d <= SKELETON_ATTACK_DIST && atkCd.current <= 0) {
      damagePlayer(SKELETON_ATTACK_DMG);
      atkCd.current = SKELETON_ATTACK_CD;
      attackAnim.current = 1;
    }

    // Animations
    const isMoving = d > SKELETON_STOP_DIST;
    if (isMoving) walkPhase.current += dt * skeletonType.animations.walkSpeed;
    const ws = isMoving ? Math.sin(walkPhase.current) : 0;

    if (attackAnim.current > 0) attackAnim.current = Math.max(0, attackAnim.current - dt * skeletonType.animations.attackAnimSpeed);
    const aa = Math.sin(attackAnim.current * Math.PI);

    // Body rig
    if (bodyRigRef.current) {
      bodyRigRef.current.position.y = ws * skeletonType.animations.walkAmplitude;
      bodyRigRef.current.rotation.x = aa * skeletonType.animations.attackLunge;
    }

    // Bras
    if (leftArmRef.current) {
      leftArmRef.current.rotation.set(
        0.2 + ws * 0.6 - aa * 1.5,
        0,
        -0.3 + ws * 0.2
      );
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.set(
        0.2 - ws * 0.6 - aa * 1.5,
        0,
        0.3 - ws * 0.2
      );
    }

    // Jambes
    if (leftLegRef.current) {
      leftLegRef.current.rotation.set(
        -ws * 0.4,
        0,
        ws * 0.1
      );
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.set(
        ws * 0.4,
        0,
        -ws * 0.1
      );
    }

    // Tête
    if (headRef.current) {
      headRef.current.rotation.x = ws * 0.05;
    }

    // Épée (animation d'attaque)
    if (swordRef.current && variant.hasSword) {
      swordRef.current.rotation.x = -aa * 2.0;
      swordRef.current.position.z = 0.1 - aa * 0.3;
    }
  });

  return (
    <RigidBody
      ref={body}
      colliders={false}
      type="dynamic"
      mass={SKELETON_MASS}
      canSleep={false}
      enabledRotations={[false, false, false]}
      position={[spawn[0], skeletonType.colliderOffsetY, spawn[1]]}
    >
      <CapsuleCollider args={[SKELETON_COLLIDER_RADIUS, SKELETON_COLLIDER_HEIGHT]} />
      <group ref={corpseGroup} scale={variant.scale * skeletonType.scale}>
        <group ref={bodyRigRef}>
          {/* Colonne vertébrale - série de capsules */}
          <mesh position={[0, 0.2, 0]}>
            <capsuleGeometry args={[0.12, 0.25, 4, 6]} />
            <meshStandardMaterial 
              ref={mat} 
              color={boneColor} 
              roughness={skeletonType.appearance.roughness} 
              flatShading={skeletonType.appearance.flatShading}
            />
          </mesh>
          <mesh position={[0, -0.3, 0]}>
            <capsuleGeometry args={[0.12, 0.25, 4, 6]} />
            <meshStandardMaterial color={boneColor} roughness={skeletonType.appearance.roughness} flatShading />
          </mesh>
          
          {/* Bassin */}
          <mesh position={[0, -0.8, 0]}>
            <capsuleGeometry args={[0.18, 0.15, 4, 6]} />
            <meshStandardMaterial color={boneColor} roughness={skeletonType.appearance.roughness} flatShading />
          </mesh>

          {/* Jambes */}
          <mesh ref={leftLegRef} position={[-0.18, -1.1, 0]}>
            <capsuleGeometry args={[0.08, 0.45, 4, 6]} />
            <meshStandardMaterial color={boneColor} roughness={skeletonType.appearance.roughness} flatShading />
          </mesh>
          <mesh ref={rightLegRef} position={[0.18, -1.1, 0]}>
            <capsuleGeometry args={[0.08, 0.45, 4, 6]} />
            <meshStandardMaterial color={boneColor} roughness={skeletonType.appearance.roughness} flatShading />
          </mesh>

          {/* Épaules */}
          <mesh position={[-0.25, 0.4, 0]} rotation={[0, 0, Math.PI / 6]}>
            <sphereGeometry args={[0.12, 6, 5]} />
            <meshStandardMaterial color={boneColor} roughness={skeletonType.appearance.roughness} flatShading />
          </mesh>
          <mesh position={[0.25, 0.4, 0]} rotation={[0, 0, -Math.PI / 6]}>
            <sphereGeometry args={[0.12, 6, 5]} />
            <meshStandardMaterial color={boneColor} roughness={skeletonType.appearance.roughness} flatShading />
          </mesh>

          {/* Bras */}
          <mesh ref={leftArmRef} position={[-0.35, 0.25, 0]}>
            <capsuleGeometry args={[0.06, 0.5, 4, 6]} />
            <meshStandardMaterial color={boneColor} roughness={skeletonType.appearance.roughness} flatShading />
          </mesh>
          <mesh ref={rightArmRef} position={[0.35, 0.25, 0]}>
            <capsuleGeometry args={[0.06, 0.5, 4, 6]} />
            <meshStandardMaterial color={boneColor} roughness={skeletonType.appearance.roughness} flatShading />
          </mesh>

          {/* Mains */}
          <mesh position={[-0.45, -0.1, 0]}>
            <sphereGeometry args={[0.07, 5, 4]} />
            <meshStandardMaterial color={darkBoneColor} roughness={skeletonType.appearance.roughness} flatShading />
          </mesh>
          <mesh position={[0.45, -0.1, 0]}>
            <sphereGeometry args={[0.07, 5, 4]} />
            <meshStandardMaterial color={darkBoneColor} roughness={skeletonType.appearance.roughness} flatShading />
          </mesh>

          {/* Tête */}
          <mesh ref={headRef} position={[0, 0.85, 0]}>
            <sphereGeometry args={[0.22, 8, 6]} />
            <meshStandardMaterial color={boneColor} roughness={skeletonType.appearance.roughness} flatShading />
          </mesh>

          {/* Mâchoire */}
          <mesh position={[0, 0.75, 0.15]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.14, 0.08, 0.2]} />
            <meshStandardMaterial color={darkBoneColor} roughness={skeletonType.appearance.roughness} flatShading />
          </mesh>

          {/* Orbites */}
          <mesh position={[-0.12, 0.88, 0.2]}>
            <sphereGeometry args={[0.08, 6, 4]} />
            <meshStandardMaterial color={ACCENT_COLOR} roughness={1} flatShading />
          </mesh>
          <mesh position={[0.12, 0.88, 0.2]}>
            <sphereGeometry args={[0.08, 6, 4]} />
            <meshStandardMaterial color={ACCENT_COLOR} roughness={1} flatShading />
          </mesh>

          {/* Yeux (émissifs) */}
          <mesh position={[-0.12, 0.88, 0.25]}>
            <sphereGeometry args={[0.04, 5, 4]} />
            <meshStandardMaterial 
              color="#000" 
              emissive={EYE_COLOR} 
              emissiveIntensity={eyeGlow} 
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0.12, 0.88, 0.25]}>
            <sphereGeometry args={[0.04, 5, 4]} />
            <meshStandardMaterial 
              color="#000" 
              emissive={EYE_COLOR} 
              emissiveIntensity={eyeGlow} 
              toneMapped={false}
            />
          </mesh>

          {/* Épée (si équipée) */}
          {variant.hasSword && (
            <mesh ref={swordRef} position={[0.2, 0.05, 0.1]} rotation={[0, 0, -Math.PI / 4]}>
              <boxGeometry args={[0.03, 0.08, 0.6]} />
              <meshStandardMaterial 
                color="#666666" 
                metalness={0.6} 
                roughness={0.3} 
                flatShading={false}
              />
            </mesh>
          )}

          {/* Garde de l'épée */}
          {variant.hasSword && (
            <mesh position={[0.15, 0.05, 0.1]} rotation={[0, 0, -Math.PI / 4]}>
              <boxGeometry args={[0.08, 0.1, 0.12]} />
              <meshStandardMaterial 
                color="#444444" 
                metalness={0.8} 
                roughness={0.2}
              />
            </mesh>
          )}
        </group>
      </group>
    </RigidBody>
  );
}


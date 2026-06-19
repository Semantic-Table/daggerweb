import { useEffect, useMemo, useRef } from "react";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { spawnProjectile } from "../combat/projectileRegistry";
import { useEnemyAI, type EnemyProps } from "./useEnemyAI";
import { animateBiped, telegraphTint } from "./rig";
import { EnemyLabel } from "./EnemyLabel";
import { scaledStats } from "./scaling";
import { ENEMY_TYPES } from "./enemyTypes";

// Archer squelette — biped à distance (Phase 4). Réutilise le rig partagé : il
// garde ses distances (stopDistance 6, portée 8) et, à la frappe, décoche une
// FLÈCHE via le système de projectiles unifié (kind "arrow"). Le windup
// (armateBiped lève les bras) lit comme une mise en joue.

const archerType = ENEMY_TYPES.skeletonArcher;
const PRIMARY_COLOR = new THREE.Color(archerType.appearance.primaryColor as string);
const SECONDARY_COLOR = new THREE.Color(archerType.appearance.secondaryColor as string);
const EYE_COLOR = new THREE.Color(archerType.appearance.eyeColor as string);

export function SkeletonArcher({ spawn, index, level, elite }: EnemyProps) {
  const body = useRef<RapierRigidBody>(null);
  const corpseGroup = useRef<THREE.Group>(null);
  const bodyRigRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const flashRef = useRef(0);

  const variant = useMemo(() => {
    let s = (Math.floor(Math.abs(spawn[0] * 131 + spawn[1] * 57)) % 9973) + 1;
    const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    return { scale: 0.9 + r() * 0.16, tint: r() };
  }, [spawn]);

  const baseBone = useMemo(() => PRIMARY_COLOR.clone().lerp(SECONDARY_COLOR, variant.tint * 0.5), [variant.tint]);
  const boneMat = useMemo(() => new THREE.MeshStandardMaterial({ color: baseBone.clone(), roughness: archerType.appearance.roughness, flatShading: true }), [baseBone]);
  const darkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: baseBone.clone().multiplyScalar(0.7), roughness: archerType.appearance.roughness, flatShading: true }), [baseBone]);
  const eyeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#000", emissive: EYE_COLOR.clone(), emissiveIntensity: archerType.appearance.eyeGlow!, toneMapped: false }), []);

  const stats = useMemo(() => scaledStats(archerType, level, elite), [level, elite]);
  const { looted, isDead, hpFraction } = useEnemyAI({
    spawn,
    index,
    body,
    corpseGroup,
    stats,
    knockback: { xz: 3, y: 0.8 },
    lootLevel: level + (archerType.stats.lootTier - 1),
    onAttack: (nx, nz) => {
      const t = body.current?.translation();
      if (!t) return;
      spawnProjectile({ kind: "arrow", pos: { x: t.x, y: t.y + 0.4, z: t.z }, dir: { x: nx, y: 0, z: nz }, dmg: stats.attackDmg });
    },
    onFlash: (f) => {
      flashRef.current = f;
      boneMat.emissive.setScalar(f * 0.5);
    },
    onDeath: (g, e) => {
      g.rotation.x = (e * Math.PI) / 2;
      g.position.y = -e * archerType.animations.deathSquash;
    },
    onAnimate: (m) => {
      animateBiped(
        { bodyRig: bodyRigRef, leftArm: leftArmRef, rightArm: rightArmRef, leftLeg: leftLegRef, rightLeg: rightLegRef, head: headRef },
        m,
        { restLean: 0, walkAmp: 0.07, lunge: 0.3, armSwing: 0.4, armRaise: 1.3, armSlam: 0.6, legStride: 0.35, armRestZ: 0.25 },
      );
      telegraphTint(boneMat, flashRef.current, m.wind, 0.5);
    },
  });

  useEffect(() => {
    const k = looted ? 0.4 : 1;
    boneMat.color.copy(baseBone).multiplyScalar(k);
    darkMat.color.copy(baseBone).multiplyScalar(0.7 * k);
    eyeMat.emissiveIntensity = looted ? 0 : archerType.appearance.eyeGlow!;
  }, [looted, baseBone, boneMat, darkMat, eyeMat]);

  return (
    <RigidBody
      ref={body}
      colliders={false}
      type="dynamic"
      mass={archerType.stats.mass}
      canSleep={false}
      enabledRotations={[false, false, false]}
      position={[spawn[0], archerType.colliderOffsetY, spawn[1]]}
    >
      <CapsuleCollider args={[archerType.stats.colliderRadius, archerType.stats.colliderHeight]} />
      <group ref={corpseGroup} scale={variant.scale * archerType.scale}>
        <group ref={bodyRigRef}>
          {/* Tronc + bassin. */}
          <mesh position={[0, 0.15, 0]} material={boneMat}>
            <capsuleGeometry args={[0.15, 0.34, 6, 8]} />
          </mesh>
          <mesh position={[0, -0.32, 0]} material={boneMat}>
            <capsuleGeometry args={[0.15, 0.12, 4, 8]} />
          </mesh>

          {/* Tête. */}
          <group ref={headRef} position={[0, 0.62, 0.02]}>
            <mesh material={boneMat}>
              <sphereGeometry args={[0.2, 9, 8]} />
            </mesh>
            <mesh position={[0, -0.15, 0.08]} rotation={[0.25, 0, 0]} material={darkMat}>
              <boxGeometry args={[0.15, 0.08, 0.18]} />
            </mesh>
            <mesh position={[-0.09, 0.02, 0.18]} material={eyeMat}>
              <sphereGeometry args={[0.035, 5, 4]} />
            </mesh>
            <mesh position={[0.09, 0.02, 0.18]} material={eyeMat}>
              <sphereGeometry args={[0.035, 5, 4]} />
            </mesh>
          </group>

          {/* Bras gauche : tient l'ARC (demi-anneau). */}
          <group ref={leftArmRef} position={[-0.26, 0.36, 0.04]} rotation={[0.15, 0, -0.25]}>
            <mesh position={[0, -0.3, 0]} material={boneMat}>
              <capsuleGeometry args={[0.05, 0.52, 4, 6]} />
            </mesh>
            <group position={[0, -0.6, 0.04]}>
              <mesh rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.28, 0.018, 6, 14, Math.PI * 1.2]} />
                <meshStandardMaterial color="#6a513a" roughness={0.8} flatShading />
              </mesh>
            </group>
          </group>
          {/* Bras droit : tire la corde. */}
          <group ref={rightArmRef} position={[0.26, 0.36, 0.04]} rotation={[0.15, 0, 0.25]}>
            <mesh position={[0, -0.3, 0]} material={boneMat}>
              <capsuleGeometry args={[0.05, 0.52, 4, 6]} />
            </mesh>
            <mesh position={[0, -0.6, 0]} material={darkMat}>
              <sphereGeometry args={[0.06, 5, 4]} />
            </mesh>
          </group>

          {/* Jambes. */}
          <group ref={leftLegRef} position={[-0.13, -0.42, 0]}>
            <mesh position={[0, -0.3, 0]} material={boneMat}>
              <capsuleGeometry args={[0.055, 0.56, 4, 6]} />
            </mesh>
          </group>
          <group ref={rightLegRef} position={[0.13, -0.42, 0]}>
            <mesh position={[0, -0.3, 0]} material={boneMat}>
              <capsuleGeometry args={[0.055, 0.56, 4, 6]} />
            </mesh>
          </group>
        </group>
      </group>
      {!isDead && <EnemyLabel name={archerType.name} level={level} elite={elite} y={archerType.height} hpFraction={hpFraction} />}
    </RigidBody>
  );
}

export { archerType as skeletonArcherEnemyType };

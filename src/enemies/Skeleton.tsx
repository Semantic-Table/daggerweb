import { useEffect, useMemo, useRef } from "react";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useEnemyAI, type EnemyProps } from "./useEnemyAI";
import { animateBiped, telegraphTint } from "./rig";
import { EnemyLabel } from "./EnemyLabel";
import { scaledStats } from "./scaling";
import { ENEMY_TYPES } from "./enemyTypes";

// Squelette — biped au rig hiérarchique partagé (Phase 3). Mort-vivant raide,
// os clairs, épée rouillée optionnelle tenue dans la main droite (elle suit donc
// le bras à l'attaque). Combat via useEnemyAI + animateBiped (comme le gobelin).

const skeletonType = ENEMY_TYPES.skeleton;
const SKELETON_MASS = skeletonType.stats.mass;
const SKELETON_COLLIDER_RADIUS = skeletonType.stats.colliderRadius;
const SKELETON_COLLIDER_HEIGHT = skeletonType.stats.colliderHeight;

const PRIMARY_COLOR = new THREE.Color(skeletonType.appearance.primaryColor as string);
const SECONDARY_COLOR = new THREE.Color(skeletonType.appearance.secondaryColor as string);
const EYE_COLOR = new THREE.Color(skeletonType.appearance.eyeColor as string);

export const skeletonEnemyType = ENEMY_TYPES.skeleton;

export function Skeleton({ spawn, index, level, elite }: EnemyProps) {
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
    return { scale: 0.92 + r() * 0.18, tint: r(), hasSword: r() > 0.3, warmEyes: r() > 0.5 };
  }, [spawn]);

  const baseBone = useMemo(() => PRIMARY_COLOR.clone().lerp(SECONDARY_COLOR, variant.tint * 0.5), [variant.tint]);
  const boneMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: baseBone.clone(), roughness: skeletonType.appearance.roughness, flatShading: true }),
    [baseBone],
  );
  const darkBoneMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: baseBone.clone().multiplyScalar(0.7), roughness: skeletonType.appearance.roughness, flatShading: true }),
    [baseBone],
  );
  const eyeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#000", emissive: EYE_COLOR.clone(), emissiveIntensity: skeletonType.appearance.eyeGlow!, toneMapped: false }),
    [],
  );

  const stats = useMemo(() => scaledStats(skeletonType, level, elite), [level, elite]);
  const { looted, isDead, hpFraction } = useEnemyAI({
    spawn,
    index,
    body,
    corpseGroup,
    stats,
    knockback: { xz: 3, y: 0.8 },
    lootLevel: level + (skeletonType.stats.lootTier - 1),
    onFlash: (f) => {
      flashRef.current = f;
      boneMat.emissive.setScalar(f * 0.5);
    },
    onDeath: (g, e) => {
      g.rotation.x = (e * Math.PI) / 2;
      g.position.y = -e * skeletonType.animations.deathSquash;
    },
    // Mort-vivant raide : pas de voûte, bras près du corps, foulée modérée.
    onAnimate: (m) => {
      animateBiped(
        { bodyRig: bodyRigRef, leftArm: leftArmRef, rightArm: rightArmRef, leftLeg: leftLegRef, rightLeg: rightLegRef, head: headRef },
        m,
        { restLean: 0, walkAmp: 0.08, lunge: 0.5, armSwing: 0.55, armRaise: 1.2, armSlam: 1.5, legStride: 0.4, armRestZ: 0.22 },
      );
      telegraphTint(boneMat, flashRef.current, m.wind, 0.5);
    },
  });

  useEffect(() => {
    const k = looted ? 0.4 : 1;
    boneMat.color.copy(baseBone).multiplyScalar(k);
    darkBoneMat.color.copy(baseBone).multiplyScalar(0.7 * k);
    eyeMat.emissiveIntensity = looted ? 0 : (variant.warmEyes ? skeletonType.appearance.eyeGlow! * 1.2 : skeletonType.appearance.eyeGlow!);
  }, [looted, baseBone, boneMat, darkBoneMat, eyeMat, variant.warmEyes]);

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
          {/* Cage thoracique (côtes suggérées par 3 anneaux) + colonne. */}
          <mesh position={[0, 0.15, 0]} material={boneMat}>
            <capsuleGeometry args={[0.16, 0.34, 6, 8]} />
          </mesh>
          {[0.28, 0.13, -0.02].map((y, i) => (
            <mesh key={i} position={[0, y, 0.02]} rotation={[Math.PI / 2, 0, 0]} material={darkBoneMat}>
              <torusGeometry args={[0.17, 0.025, 6, 10]} />
            </mesh>
          ))}
          {/* Bassin. */}
          <mesh position={[0, -0.32, 0]} material={boneMat}>
            <capsuleGeometry args={[0.16, 0.12, 4, 8]} />
          </mesh>

          {/* Tête (groupe). */}
          <group ref={headRef} position={[0, 0.62, 0.02]}>
            <mesh material={boneMat}>
              <sphereGeometry args={[0.21, 9, 8]} />
            </mesh>
            {/* Mâchoire. */}
            <mesh position={[0, -0.16, 0.08]} rotation={[0.25, 0, 0]} material={darkBoneMat}>
              <boxGeometry args={[0.16, 0.09, 0.2]} />
            </mesh>
            {/* Orbites + yeux émissifs. */}
            <mesh position={[-0.09, 0.02, 0.15]} material={darkBoneMat}>
              <sphereGeometry args={[0.06, 6, 5]} />
            </mesh>
            <mesh position={[0.09, 0.02, 0.15]} material={darkBoneMat}>
              <sphereGeometry args={[0.06, 6, 5]} />
            </mesh>
            <mesh position={[-0.09, 0.02, 0.19]} material={eyeMat}>
              <sphereGeometry args={[0.035, 5, 4]} />
            </mesh>
            <mesh position={[0.09, 0.02, 0.19]} material={eyeMat}>
              <sphereGeometry args={[0.035, 5, 4]} />
            </mesh>
          </group>

          {/* Bras (groupes : pivot épaule, écartés). Le droit tient l'épée. */}
          <group ref={leftArmRef} position={[-0.26, 0.36, 0.02]} rotation={[0.15, 0, -0.22]}>
            <mesh position={[0, -0.3, 0]} material={boneMat}>
              <capsuleGeometry args={[0.05, 0.52, 4, 6]} />
            </mesh>
            <mesh position={[0, -0.6, 0]} material={darkBoneMat}>
              <sphereGeometry args={[0.06, 5, 4]} />
            </mesh>
          </group>
          <group ref={rightArmRef} position={[0.26, 0.36, 0.02]} rotation={[0.15, 0, 0.22]}>
            <mesh position={[0, -0.3, 0]} material={boneMat}>
              <capsuleGeometry args={[0.05, 0.52, 4, 6]} />
            </mesh>
            <mesh position={[0, -0.6, 0]} material={darkBoneMat}>
              <sphereGeometry args={[0.06, 5, 4]} />
            </mesh>
            {/* Épée rouillée tenue dans la main (suit le bras à l'attaque). */}
            {variant.hasSword && (
              <group position={[0, -0.62, 0.05]} rotation={[-0.5, 0, 0]}>
                <mesh position={[0, 0.32, 0]}>
                  <boxGeometry args={[0.05, 0.62, 0.02]} />
                  <meshStandardMaterial color="#8a7d66" metalness={0.5} roughness={0.5} flatShading />
                </mesh>
                <mesh position={[0, 0.02, 0]}>
                  <boxGeometry args={[0.18, 0.05, 0.05]} />
                  <meshStandardMaterial color="#4a4036" metalness={0.6} roughness={0.4} />
                </mesh>
              </group>
            )}
          </group>

          {/* Jambes (groupes : pivot hanche). */}
          <group ref={leftLegRef} position={[-0.13, -0.42, 0]}>
            <mesh position={[0, -0.3, 0]} material={boneMat}>
              <capsuleGeometry args={[0.055, 0.56, 4, 6]} />
            </mesh>
            <mesh position={[0, -0.62, 0.07]} material={darkBoneMat}>
              <boxGeometry args={[0.12, 0.07, 0.22]} />
            </mesh>
          </group>
          <group ref={rightLegRef} position={[0.13, -0.42, 0]}>
            <mesh position={[0, -0.3, 0]} material={boneMat}>
              <capsuleGeometry args={[0.055, 0.56, 4, 6]} />
            </mesh>
            <mesh position={[0, -0.62, 0.07]} material={darkBoneMat}>
              <boxGeometry args={[0.12, 0.07, 0.22]} />
            </mesh>
          </group>
        </group>
      </group>
      {!isDead && <EnemyLabel name={skeletonType.name} level={level} elite={elite} y={skeletonType.height} hpFraction={hpFraction} />}
    </RigidBody>
  );
}

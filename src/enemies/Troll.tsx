import { useEffect, useMemo, useRef } from "react";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useEnemyAI, type EnemyProps } from "./useEnemyAI";
import { animateBiped, telegraphTint } from "./rig";
import { EnemyLabel } from "./EnemyLabel";
import { scaledStats } from "./scaling";
import { ENEMY_TYPES } from "./enemyTypes";

// Troll des cavernes — gros tank biped (Phase 4). Colosse voûté, longs bras qui
// traînent (knuckle-dragger), petite tête enfoncée dans les épaules. Mêlée lente
// et lourde : énorme télégraphe via animateBiped (bras levés très haut au windup).

const trollType = ENEMY_TYPES.troll;
const PRIMARY_COLOR = new THREE.Color(trollType.appearance.primaryColor as string);
const SECONDARY_COLOR = new THREE.Color(trollType.appearance.secondaryColor as string);
const EYE_COLOR = new THREE.Color(trollType.appearance.eyeColor as string);

export function Troll({ spawn, index, level, elite }: EnemyProps) {
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
    return { scale: 0.95 + r() * 0.15, tint: r() };
  }, [spawn]);

  const baseSkin = useMemo(() => PRIMARY_COLOR.clone().lerp(SECONDARY_COLOR, variant.tint), [variant.tint]);
  const skinMat = useMemo(() => new THREE.MeshStandardMaterial({ color: baseSkin.clone(), roughness: trollType.appearance.roughness, flatShading: true }), [baseSkin]);
  const darkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: baseSkin.clone().multiplyScalar(0.6), roughness: trollType.appearance.roughness, flatShading: true }), [baseSkin]);
  const eyeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#000", emissive: EYE_COLOR.clone(), emissiveIntensity: trollType.appearance.eyeGlow!, toneMapped: false }), []);

  const stats = useMemo(() => scaledStats(trollType, level, elite), [level, elite]);
  const { looted, isDead, hpFraction } = useEnemyAI({
    spawn,
    index,
    body,
    corpseGroup,
    stats,
    knockback: { xz: 1.5, y: 0.4 }, // lourd : encaisse peu de recul
    lootLevel: level + (trollType.stats.lootTier - 1),
    // Régénération : ~4 % des PV max/s → il faut le tuer vite ou il revient à plein.
    regenPerSec: stats.hp * 0.04,
    onFlash: (f) => {
      flashRef.current = f;
      skinMat.emissive.setScalar(f * 0.6);
    },
    onDeath: (g, e) => {
      g.rotation.x = (e * Math.PI) / 2;
      g.rotation.z = e * 0.2;
      g.position.y = -e * trollType.animations.deathSquash;
    },
    onAnimate: (m) => {
      animateBiped(
        { bodyRig: bodyRigRef, leftArm: leftArmRef, rightArm: rightArmRef, leftLeg: leftLegRef, rightLeg: rightLegRef, head: headRef },
        m,
        { restLean: 0.2, walkAmp: 0.12, lunge: 0.6, armSwing: 0.45, armRaise: 1.9, armSlam: 2.1, legStride: 0.35, armRestZ: 0.3 },
      );
      telegraphTint(skinMat, flashRef.current, m.wind, 0.6);
    },
  });

  useEffect(() => {
    const k = looted ? 0.4 : 1;
    skinMat.color.copy(baseSkin).multiplyScalar(k);
    darkMat.color.copy(baseSkin).multiplyScalar(0.6 * k);
    eyeMat.emissiveIntensity = looted ? 0 : trollType.appearance.eyeGlow!;
  }, [looted, baseSkin, skinMat, darkMat, eyeMat]);

  return (
    <RigidBody
      ref={body}
      colliders={false}
      type="dynamic"
      mass={trollType.stats.mass}
      canSleep={false}
      enabledRotations={[false, false, false]}
      position={[spawn[0], trollType.colliderOffsetY, spawn[1]]}
    >
      <CapsuleCollider args={[trollType.stats.colliderRadius, trollType.stats.colliderHeight]} />
      <group ref={corpseGroup} scale={variant.scale * trollType.scale}>
        <group ref={bodyRigRef}>
          {/* Torse énorme + bas-ventre. */}
          <mesh position={[0, 0.15, 0]} material={skinMat}>
            <capsuleGeometry args={[0.5, 0.6, 6, 10]} />
          </mesh>
          <mesh position={[0, -0.35, 0.08]} material={darkMat}>
            <sphereGeometry args={[0.46, 8, 7]} />
          </mesh>
          {/* Bosse dorsale (silhouette voûtée). */}
          <mesh position={[0, 0.5, -0.18]} material={darkMat}>
            <sphereGeometry args={[0.3, 8, 7]} />
          </mesh>

          {/* Tête (petite, enfoncée, avancée). */}
          <group ref={headRef} position={[0, 0.7, 0.22]}>
            <mesh material={skinMat}>
              <sphereGeometry args={[0.26, 9, 8]} />
            </mesh>
            <mesh position={[0, -0.16, 0.12]} material={darkMat}>
              <boxGeometry args={[0.3, 0.14, 0.2]} />
            </mesh>
            {/* Défenses inférieures. */}
            <mesh position={[-0.1, -0.14, 0.2]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.035, 0.18, 4]} />
              <meshStandardMaterial color="#d8cfb4" roughness={0.6} flatShading />
            </mesh>
            <mesh position={[0.1, -0.14, 0.2]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.035, 0.18, 4]} />
              <meshStandardMaterial color="#d8cfb4" roughness={0.6} flatShading />
            </mesh>
            <mesh position={[-0.11, 0.04, 0.2]} material={eyeMat}>
              <sphereGeometry args={[0.045, 5, 4]} />
            </mesh>
            <mesh position={[0.11, 0.04, 0.2]} material={eyeMat}>
              <sphereGeometry args={[0.045, 5, 4]} />
            </mesh>
          </group>

          {/* Bras massifs et longs (pivot épaule), gros poings près du sol. */}
          <group ref={leftArmRef} position={[-0.56, 0.5, 0.02]} rotation={[0.2, 0, -0.3]}>
            <mesh position={[0, -0.55, 0]} material={skinMat}>
              <capsuleGeometry args={[0.17, 0.9, 5, 8]} />
            </mesh>
            <mesh position={[0, -1.05, 0.04]} material={darkMat}>
              <sphereGeometry args={[0.19, 7, 6]} />
            </mesh>
          </group>
          <group ref={rightArmRef} position={[0.56, 0.5, 0.02]} rotation={[0.2, 0, 0.3]}>
            <mesh position={[0, -0.55, 0]} material={skinMat}>
              <capsuleGeometry args={[0.17, 0.9, 5, 8]} />
            </mesh>
            <mesh position={[0, -1.05, 0.04]} material={darkMat}>
              <sphereGeometry args={[0.19, 7, 6]} />
            </mesh>
          </group>

          {/* Jambes courtes et épaisses. */}
          <group ref={leftLegRef} position={[-0.26, -0.6, 0]}>
            <mesh position={[0, -0.38, 0]} material={darkMat}>
              <capsuleGeometry args={[0.2, 0.5, 5, 8]} />
            </mesh>
            <mesh position={[0, -0.74, 0.1]} material={darkMat}>
              <boxGeometry args={[0.3, 0.14, 0.4]} />
            </mesh>
          </group>
          <group ref={rightLegRef} position={[0.26, -0.6, 0]}>
            <mesh position={[0, -0.38, 0]} material={darkMat}>
              <capsuleGeometry args={[0.2, 0.5, 5, 8]} />
            </mesh>
            <mesh position={[0, -0.74, 0.1]} material={darkMat}>
              <boxGeometry args={[0.3, 0.14, 0.4]} />
            </mesh>
          </group>
        </group>
      </group>
      {!isDead && <EnemyLabel name={trollType.name} level={level} elite={elite} y={trollType.height} hpFraction={hpFraction} />}
    </RigidBody>
  );
}

export { trollType as trollEnemyType };

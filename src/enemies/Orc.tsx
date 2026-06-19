import { useEffect, useMemo, useRef } from "react";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useEnemyAI, type EnemyProps } from "./useEnemyAI";
import { animateBiped, telegraphTint } from "./rig";
import { EnemyLabel } from "./EnemyLabel";
import { scaledStats } from "./scaling";
import { ENEMY_TYPES } from "./enemyTypes";

// Orc — gros tank biped (rig hiérarchique partagé, Phase 3). Massif et voûté,
// hache tenue dans la main droite (suit le bras à l'attaque). Gros télégraphe
// (la hache se lève haut au windup) via animateBiped.

const orcType = ENEMY_TYPES.orc;
const ORC_MASS = orcType.stats.mass;
const ORC_COLLIDER_RADIUS = orcType.stats.colliderRadius;
const ORC_COLLIDER_HEIGHT = orcType.stats.colliderHeight;

const PRIMARY_COLOR = new THREE.Color(orcType.appearance.primaryColor as string);
const SECONDARY_COLOR = new THREE.Color(orcType.appearance.secondaryColor as string);
const EYE_COLOR = new THREE.Color(orcType.appearance.eyeColor as string);

export function Orc({ spawn, index, level, elite }: EnemyProps) {
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
    return { scale: 0.92 + r() * 0.16, skinTint: r(), hasAxe: r() > 0.2, hasHelmet: r() > 0.5, warmEyes: r() > 0.5 };
  }, [spawn]);

  const baseSkin = useMemo(() => PRIMARY_COLOR.clone().lerp(SECONDARY_COLOR, variant.skinTint * 0.5), [variant.skinTint]);
  const skinMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: baseSkin.clone(), roughness: orcType.appearance.roughness, flatShading: true }),
    [baseSkin],
  );
  const darkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: baseSkin.clone().multiplyScalar(0.65), roughness: orcType.appearance.roughness, flatShading: true }),
    [baseSkin],
  );
  const eyeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#000", emissive: EYE_COLOR.clone(), emissiveIntensity: orcType.appearance.eyeGlow!, toneMapped: false }),
    [],
  );

  const stats = useMemo(() => scaledStats(orcType, level, elite), [level, elite]);
  const { looted, isDead, hpFraction } = useEnemyAI({
    spawn,
    index,
    body,
    corpseGroup,
    stats,
    knockback: { xz: 2, y: 0.5 },
    lootLevel: level + (orcType.stats.lootTier - 1),
    onFlash: (f) => {
      flashRef.current = f;
      skinMat.emissive.setScalar(f * 0.7);
    },
    onDeath: (g, e) => {
      g.rotation.x = (e * Math.PI) / 2;
      g.rotation.z = e * 0.3;
      g.position.y = -e * orcType.animations.deathSquash;
    },
    // Tank : voûté, gros télégraphe (bras/hache levés haut), frappe lourde et lente.
    onAnimate: (m) => {
      animateBiped(
        { bodyRig: bodyRigRef, leftArm: leftArmRef, rightArm: rightArmRef, leftLeg: leftLegRef, rightLeg: rightLegRef, head: headRef },
        m,
        { restLean: 0.12, walkAmp: 0.1, lunge: 0.7, armSwing: 0.4, armRaise: 1.7, armSlam: 2.0, legStride: 0.4, armRestZ: 0.35 },
      );
      telegraphTint(skinMat, flashRef.current, m.wind, 0.7);
    },
  });

  useEffect(() => {
    const k = looted ? 0.4 : 1;
    skinMat.color.copy(baseSkin).multiplyScalar(k);
    darkMat.color.copy(baseSkin).multiplyScalar(0.65 * k);
    eyeMat.emissiveIntensity = looted ? 0 : (variant.warmEyes ? orcType.appearance.eyeGlow! * 1.3 : orcType.appearance.eyeGlow!);
  }, [looted, baseSkin, skinMat, darkMat, eyeMat, variant.warmEyes]);

  return (
    <RigidBody
      ref={body}
      colliders={false}
      type="dynamic"
      mass={ORC_MASS}
      canSleep={false}
      enabledRotations={[false, false, false]}
      position={[spawn[0], orcType.colliderOffsetY, spawn[1]]}
    >
      <CapsuleCollider args={[ORC_COLLIDER_RADIUS, ORC_COLLIDER_HEIGHT]} />
      <group ref={corpseGroup} scale={variant.scale * orcType.scale}>
        <group ref={bodyRigRef}>
          {/* Torse massif + ventre. */}
          <mesh position={[0, 0.1, 0]} material={skinMat}>
            <capsuleGeometry args={[0.42, 0.5, 6, 10]} />
          </mesh>
          <mesh position={[0, -0.25, 0.06]} material={darkMat}>
            <sphereGeometry args={[0.4, 8, 7]} />
          </mesh>
          {/* Épaules trapézoïdales (silhouette). */}
          <mesh position={[-0.42, 0.45, 0]} material={skinMat}>
            <sphereGeometry args={[0.22, 7, 6]} />
          </mesh>
          <mesh position={[0.42, 0.45, 0]} material={skinMat}>
            <sphereGeometry args={[0.22, 7, 6]} />
          </mesh>

          {/* Tête (groupe) : enfoncée dans les épaules, grosse mâchoire + défenses. */}
          <group ref={headRef} position={[0, 0.78, 0.04]}>
            <mesh material={skinMat}>
              <sphereGeometry args={[0.3, 9, 8]} />
            </mesh>
            <mesh position={[0, -0.18, 0.14]} material={darkMat}>
              <boxGeometry args={[0.32, 0.16, 0.24]} />
            </mesh>
            {/* Défenses. */}
            <mesh position={[-0.1, -0.16, 0.24]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.035, 0.16, 4]} />
              <meshStandardMaterial color="#e8e0c8" roughness={0.6} flatShading />
            </mesh>
            <mesh position={[0.1, -0.16, 0.24]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.035, 0.16, 4]} />
              <meshStandardMaterial color="#e8e0c8" roughness={0.6} flatShading />
            </mesh>
            {/* Yeux émissifs. */}
            <mesh position={[-0.12, 0.04, 0.25]} material={eyeMat}>
              <sphereGeometry args={[0.045, 5, 4]} />
            </mesh>
            <mesh position={[0.12, 0.04, 0.25]} material={eyeMat}>
              <sphereGeometry args={[0.045, 5, 4]} />
            </mesh>
            {/* Casque optionnel. */}
            {variant.hasHelmet && (
              <mesh position={[0, 0.16, 0]} material={darkMat}>
                <sphereGeometry args={[0.32, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
              </mesh>
            )}
          </group>

          {/* Bras épais (groupes : pivot épaule, écartés). Le droit tient la hache. */}
          <group ref={leftArmRef} position={[-0.5, 0.42, 0.02]} rotation={[0.3, 0, -0.35]}>
            <mesh position={[0, -0.4, 0]} material={skinMat}>
              <capsuleGeometry args={[0.13, 0.6, 4, 8]} />
            </mesh>
            <mesh position={[0, -0.78, 0]} material={darkMat}>
              <sphereGeometry args={[0.13, 6, 5]} />
            </mesh>
          </group>
          <group ref={rightArmRef} position={[0.5, 0.42, 0.02]} rotation={[0.3, 0, 0.35]}>
            <mesh position={[0, -0.4, 0]} material={skinMat}>
              <capsuleGeometry args={[0.13, 0.6, 4, 8]} />
            </mesh>
            <mesh position={[0, -0.78, 0]} material={darkMat}>
              <sphereGeometry args={[0.13, 6, 5]} />
            </mesh>
            {/* Hache (suit la main). */}
            {variant.hasAxe && (
              <group position={[0, -0.82, 0.06]} rotation={[-0.4, 0, 0]}>
                <mesh position={[0, 0.32, 0]}>
                  <cylinderGeometry args={[0.04, 0.045, 0.7, 6]} />
                  <meshStandardMaterial color="#4a3a2a" roughness={0.8} flatShading />
                </mesh>
                <mesh position={[0.02, 0.6, 0]}>
                  <boxGeometry args={[0.2, 0.28, 0.05]} />
                  <meshStandardMaterial color="#6a6a72" metalness={0.6} roughness={0.4} flatShading />
                </mesh>
              </group>
            )}
          </group>

          {/* Jambes courtes et épaisses (groupes : pivot hanche). */}
          <group ref={leftLegRef} position={[-0.22, -0.55, 0]}>
            <mesh position={[0, -0.34, 0]} material={darkMat}>
              <capsuleGeometry args={[0.16, 0.5, 4, 8]} />
            </mesh>
            <mesh position={[0, -0.68, 0.08]} material={darkMat}>
              <boxGeometry args={[0.24, 0.12, 0.34]} />
            </mesh>
          </group>
          <group ref={rightLegRef} position={[0.22, -0.55, 0]}>
            <mesh position={[0, -0.34, 0]} material={darkMat}>
              <capsuleGeometry args={[0.16, 0.5, 4, 8]} />
            </mesh>
            <mesh position={[0, -0.68, 0.08]} material={darkMat}>
              <boxGeometry args={[0.24, 0.12, 0.34]} />
            </mesh>
          </group>
        </group>
      </group>
      {!isDead && <EnemyLabel name={orcType.name} level={level} elite={elite} y={orcType.height} hpFraction={hpFraction} />}
    </RigidBody>
  );
}

export { orcType as orcEnemyType };

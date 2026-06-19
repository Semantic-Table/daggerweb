import { useEffect, useMemo, useRef } from "react";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useEnemyAI, type EnemyProps } from "./useEnemyAI";
import { telegraphGlow } from "./rig";
import { EnemyLabel } from "./EnemyLabel";
import { scaledStats } from "./scaling";
import { ENEMY_TYPES } from "./enemyTypes";

// Loup — refait de zéro (Phase 3), épuré. Quadrupède orienté tête sur +Z (l'axe
// que useEnemyAI tourne vers le joueur), corps allongé sur Z, 4 pattes en groupes
// qui pivotent à la hanche (gait diagonal), matériau fourrure PARTAGÉ pour que tout
// le corps rougeoie au windup via telegraphGlow. Pas de fioritures : corps, tête
// (museau + oreilles + yeux), 4 pattes, queue.

const wolfType = ENEMY_TYPES.wolf;
const WOLF_MASS = wolfType.stats.mass;
const WOLF_COLLIDER_RADIUS = wolfType.stats.colliderRadius;
const WOLF_COLLIDER_HEIGHT = wolfType.stats.colliderHeight;

const PRIMARY_COLOR = new THREE.Color(wolfType.appearance.primaryColor as string);
const SECONDARY_COLOR = new THREE.Color(wolfType.appearance.secondaryColor as string);
const EYE_COLOR = new THREE.Color(wolfType.appearance.eyeColor as string);

export function Wolf({ spawn, index, level, elite }: EnemyProps) {
  const body = useRef<RapierRigidBody>(null);
  const corpseGroup = useRef<THREE.Group>(null);
  const bodyRigRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);
  const flRef = useRef<THREE.Group>(null); // patte avant gauche
  const frRef = useRef<THREE.Group>(null); // patte avant droite
  const blRef = useRef<THREE.Group>(null); // patte arrière gauche
  const brRef = useRef<THREE.Group>(null); // patte arrière droite
  const flashRef = useRef(0);

  const variant = useMemo(() => {
    let s = (Math.floor(Math.abs(spawn[0] * 131 + spawn[1] * 57)) % 9973) + 1;
    const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    return { scale: 0.9 + r() * 0.2, furTint: r(), isAlpha: r() > 0.7 };
  }, [spawn]);

  const baseFur = useMemo(() => PRIMARY_COLOR.clone().lerp(SECONDARY_COLOR, variant.furTint), [variant.furTint]);
  const furMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: baseFur.clone(), emissive: baseFur.clone(), emissiveIntensity: 0, roughness: wolfType.appearance.roughness, flatShading: true }),
    [baseFur],
  );
  const darkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: baseFur.clone().multiplyScalar(0.55), roughness: wolfType.appearance.roughness, flatShading: true }),
    [baseFur],
  );
  const eyeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#000", emissive: EYE_COLOR.clone(), emissiveIntensity: 2.5, toneMapped: false }),
    [],
  );

  const stats = useMemo(() => scaledStats(wolfType, level, elite), [level, elite]);
  const { looted, isDead, hpFraction } = useEnemyAI({
    spawn,
    index,
    body,
    corpseGroup,
    stats,
    knockback: { xz: 3, y: 1.0 },
    lootLevel: level + (wolfType.stats.lootTier - 1),
    onFlash: (f) => {
      flashRef.current = f;
      furMat.emissiveIntensity = f; // décroît tout seul pendant la mort (onAnimate gelé)
    },
    // Chute sur le côté : bascule avant + fort roulis.
    onDeath: (g, e) => {
      g.rotation.x = (e * Math.PI) / 2;
      g.rotation.z = e * 0.8;
      g.position.y = -e * wolfType.animations.deathSquash;
    },
    // Quadrupède : gait diagonal, le windup le RAMASSE (rein relevé) pour bondir,
    // la frappe (aa) projette le corps + la tête vers l'avant.
    onAnimate: ({ ws, aa, wind, flinch, phase }) => {
      if (bodyRigRef.current) {
        bodyRigRef.current.position.y = ws * 0.05 + wind * 0.06 - flinch * 0.05;
        bodyRigRef.current.rotation.x = aa * 0.4 - wind * 0.25 + flinch * 0.35;
      }
      if (headRef.current) headRef.current.rotation.x = ws * 0.05 - aa * 0.35 + wind * 0.2;
      // Queue relevée vers l'arrière, frétille à la course.
      if (tailRef.current) tailRef.current.rotation.y = Math.sin(phase * 2) * 0.4 * (0.3 + Math.abs(ws));
      // Foulée diagonale (avant-gauche & arrière-droite ensemble, etc.).
      const s = ws * 0.8;
      if (flRef.current) flRef.current.rotation.x = s + aa * 0.3;
      if (frRef.current) frRef.current.rotation.x = -s + aa * 0.3;
      if (blRef.current) blRef.current.rotation.x = -s;
      if (brRef.current) brRef.current.rotation.x = s;
      telegraphGlow(furMat, flashRef.current, wind, baseFur, 0);
    },
  });

  useEffect(() => {
    const k = looted ? 0.4 : 1;
    furMat.color.copy(baseFur).multiplyScalar(k);
    darkMat.color.copy(baseFur).multiplyScalar(0.55 * k);
    eyeMat.emissiveIntensity = looted ? 0 : 2.5;
  }, [looted, baseFur, furMat, darkMat, eyeMat]);

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
          {/* Corps allongé sur Z (avant = +Z). */}
          <mesh rotation={[Math.PI / 2, 0, 0]} material={furMat}>
            <capsuleGeometry args={[0.26, 0.5, 6, 10]} />
          </mesh>

          {/* Tête (groupe) à l'avant. */}
          <group ref={headRef} position={[0, 0.12, 0.5]}>
            <mesh material={furMat}>
              <sphereGeometry args={[0.2, 8, 7]} />
            </mesh>
            {/* Museau. */}
            <mesh position={[0, -0.05, 0.18]} material={darkMat}>
              <boxGeometry args={[0.14, 0.12, 0.18]} />
            </mesh>
            {/* Oreilles. */}
            <mesh position={[-0.11, 0.18, -0.02]} rotation={[-0.2, 0, -0.2]} material={darkMat}>
              <coneGeometry args={[0.07, 0.16, 4]} />
            </mesh>
            <mesh position={[0.11, 0.18, -0.02]} rotation={[-0.2, 0, 0.2]} material={darkMat}>
              <coneGeometry args={[0.07, 0.16, 4]} />
            </mesh>
            {/* Yeux émissifs. */}
            <mesh position={[-0.09, 0.04, 0.16]} material={eyeMat}>
              <sphereGeometry args={[0.035, 5, 4]} />
            </mesh>
            <mesh position={[0.09, 0.04, 0.16]} material={eyeMat}>
              <sphereGeometry args={[0.035, 5, 4]} />
            </mesh>
          </group>

          {/* Pattes (groupes : pivot à l'épaule/hanche), une capsule chacune. */}
          <group ref={flRef} position={[-0.18, -0.12, 0.3]}>
            <mesh position={[0, -0.2, 0]} material={darkMat}>
              <capsuleGeometry args={[0.06, 0.3, 4, 6]} />
            </mesh>
          </group>
          <group ref={frRef} position={[0.18, -0.12, 0.3]}>
            <mesh position={[0, -0.2, 0]} material={darkMat}>
              <capsuleGeometry args={[0.06, 0.3, 4, 6]} />
            </mesh>
          </group>
          <group ref={blRef} position={[-0.18, -0.12, -0.3]}>
            <mesh position={[0, -0.2, 0]} material={darkMat}>
              <capsuleGeometry args={[0.06, 0.3, 4, 6]} />
            </mesh>
          </group>
          <group ref={brRef} position={[0.18, -0.12, -0.3]}>
            <mesh position={[0, -0.2, 0]} material={darkMat}>
              <capsuleGeometry args={[0.06, 0.3, 4, 6]} />
            </mesh>
          </group>

          {/* Queue (groupe au derrière, relevée). */}
          <group ref={tailRef} position={[0, 0.1, -0.5]}>
            <mesh position={[0, 0.05, -0.12]} rotation={[-0.9, 0, 0]} material={furMat}>
              <capsuleGeometry args={[0.05, 0.3, 4, 6]} />
            </mesh>
          </group>
        </group>
      </group>
      {!isDead && <EnemyLabel name={wolfType.name} level={level} elite={elite} y={wolfType.height} hpFraction={hpFraction} />}
    </RigidBody>
  );
}

export { wolfType as wolfEnemyType };

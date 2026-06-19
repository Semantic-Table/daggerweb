import { useEffect, useMemo, useRef } from "react";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useEnemyAI, type EnemyProps } from "../enemies/useEnemyAI";
import { animateBiped, telegraphTint } from "../enemies/rig";
import { EnemyLabel } from "../enemies/EnemyLabel";
import { scaledStats } from "../enemies/scaling";
import { ENEMY_TYPES } from "../enemies/enemyTypes";

// Gobelin (cf. GDD §5) — ennemi de base, vitrine du rig procédural (Phase 3).
// Capsule dynamique Rapier qui avance vers le joueur ; toute l'IA/combat vit dans
// useEnemyAI. Ici : un RIG HIÉRARCHIQUE (les membres sont des GROUPES qui pivotent
// à l'épaule / la hanche, plus des meshes qui tournent sur leur centre) animé par
// `animateBiped`, et des MATÉRIAUX PARTAGÉS (un seul matériau peau → tout le corps
// rougeoie d'un coup au windup). Petite brute verte voûtée, mâchoire lourde,
// longs bras griffus.

const goblinType = ENEMY_TYPES.goblin;

export function Enemy({ spawn, index, level, elite }: EnemyProps) {
  const body = useRef<RapierRigidBody>(null);
  const corpseGroup = useRef<THREE.Group>(null);
  const bodyRigRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const flashRef = useRef(0); // intensité du flash de coup, combinée au télégraphe

  // Variation visuelle déterministe par spawn (taille, teinte, couleur des yeux).
  const variant = useMemo(() => {
    let s = (Math.floor(Math.abs(spawn[0] * 131 + spawn[1] * 57)) % 9973) + 1;
    const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    return { scale: 0.92 + r() * 0.18, tint: r(), warmEyes: r() > 0.45 };
  }, [spawn]);

  // Couleurs de base (indépendantes de l'état « fouillé », appliqué ensuite).
  const baseSkin = useMemo(
    () => new THREE.Color().lerpColors(new THREE.Color("#4a7c2e"), new THREE.Color("#3a6040"), variant.tint),
    [variant.tint],
  );
  const eyeColor = variant.warmEyes ? "#f0d020" : "#c8e030";

  // Matériaux PARTAGÉS (objets stables) : permet de re-teinter tout le corps en une
  // fois (télégraphe/flash) et de l'assombrir au pillage sans re-render.
  const skinMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: baseSkin.clone(), roughness: 1, flatShading: true }),
    [baseSkin],
  );
  const darkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: baseSkin.clone().multiplyScalar(0.62), roughness: 1, flatShading: true }),
    [baseSkin],
  );
  const eyeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#000", emissive: new THREE.Color(eyeColor), emissiveIntensity: 3, toneMapped: false }),
    [eyeColor],
  );

  const stats = useMemo(() => scaledStats(goblinType, level, elite), [level, elite]);
  const { looted, isDead, hpFraction } = useEnemyAI({
    spawn,
    index,
    body,
    corpseGroup,
    stats,
    knockback: { xz: 4, y: 1.2 },
    lootLevel: level + (goblinType.stats.lootTier - 1),
    onFlash: (f) => {
      flashRef.current = f;
      // Pendant la mort onAnimate ne tourne plus : on garde le flash seul ici.
      skinMat.emissive.setScalar(f * 0.9);
    },
    // Rig partagé : voûté (restLean), grands bras, foulée marquée.
    onAnimate: (m) => {
      animateBiped(
        { bodyRig: bodyRigRef, leftArm: leftArmRef, rightArm: rightArmRef, leftLeg: leftLegRef, rightLeg: rightLegRef, head: headRef },
        m,
        { restLean: 0.2, walkAmp: 0.06, lunge: 0.6, armSwing: 0.5, armRaise: 1.4, armSlam: 1.5, legStride: 0.45, armRestZ: 0.42 },
      );
      // Télégraphe : tout le corps rougeoie au windup + flash blanc au coup.
      telegraphTint(skinMat, flashRef.current, m.wind);
    },
  });

  // Pillage : assombrit le corps et éteint les yeux (réactif, une seule fois).
  useEffect(() => {
    const k = looted ? 0.38 : 1;
    skinMat.color.copy(baseSkin).multiplyScalar(k);
    darkMat.color.copy(baseSkin).multiplyScalar(0.62 * k);
    eyeMat.emissiveIntensity = looted ? 0 : 3;
  }, [looted, baseSkin, skinMat, darkMat, eyeMat]);

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
          {/* Torse voûté (poitrine large, ventre rond). */}
          <mesh position={[0, 0.05, 0]} rotation={[0.12, 0, 0]} material={skinMat}>
            <capsuleGeometry args={[0.34, 0.42, 6, 10]} />
          </mesh>
          <mesh position={[0, -0.18, 0.08]} material={darkMat}>
            <sphereGeometry args={[0.3, 8, 7]} />
          </mesh>
          {/* Pagne / ceinture (silhouette). */}
          <mesh position={[0, -0.34, 0]} material={darkMat}>
            <cylinderGeometry args={[0.3, 0.26, 0.22, 8]} />
          </mesh>

          {/* Tête (groupe : ballant de marche). */}
          <group ref={headRef} position={[0, 0.62, 0.06]}>
            <mesh material={skinMat}>
              <sphereGeometry args={[0.3, 9, 8]} />
            </mesh>
            {/* Mâchoire prognathe. */}
            <mesh position={[0, -0.2, 0.16]} material={skinMat}>
              <boxGeometry args={[0.34, 0.18, 0.26]} />
            </mesh>
            {/* Oreilles pointues. */}
            <mesh position={[-0.3, 0.12, 0]} rotation={[0.1, 0.3, -1.0]} material={darkMat}>
              <coneGeometry args={[0.1, 0.42, 4]} />
            </mesh>
            <mesh position={[0.3, 0.12, 0]} rotation={[0.1, -0.3, 1.0]} material={darkMat}>
              <coneGeometry args={[0.1, 0.42, 4]} />
            </mesh>
            {/* Yeux jaunes émissifs (enfoncés sous l'arcade). */}
            <mesh position={[-0.13, 0.0, 0.27]} material={eyeMat}>
              <sphereGeometry args={[0.055, 6, 5]} />
            </mesh>
            <mesh position={[0.13, 0.0, 0.27]} material={eyeMat}>
              <sphereGeometry args={[0.055, 6, 5]} />
            </mesh>
            {/* Crocs inférieurs. */}
            <mesh position={[-0.08, -0.28, 0.26]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.03, 0.1, 4]} />
              <meshStandardMaterial color="#e8e0c8" roughness={0.6} flatShading />
            </mesh>
            <mesh position={[0.08, -0.28, 0.26]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.03, 0.1, 4]} />
              <meshStandardMaterial color="#e8e0c8" roughness={0.6} flatShading />
            </mesh>
          </group>

          {/* Bras (groupes : pivot à l'épaule, écartées du torse). Long, main griffue.
              rotation initiale = pose de repos d'animateBiped (z = ∓restZ). */}
          <group ref={leftArmRef} position={[-0.42, 0.32, 0.02]} rotation={[0.1, 0, -0.42]}>
            <mesh position={[0, -0.36, 0]} material={skinMat}>
              <capsuleGeometry args={[0.085, 0.66, 4, 6]} />
            </mesh>
            <Claws mat={darkMat} y={-0.74} />
          </group>
          <group ref={rightArmRef} position={[0.42, 0.32, 0.02]} rotation={[0.1, 0, 0.42]}>
            <mesh position={[0, -0.36, 0]} material={skinMat}>
              <capsuleGeometry args={[0.085, 0.66, 4, 6]} />
            </mesh>
            <Claws mat={darkMat} y={-0.74} />
          </group>

          {/* Jambes (groupes : pivot à la hanche). Courtes, trapues, accroupies. */}
          <group ref={leftLegRef} position={[-0.17, -0.4, 0]}>
            <mesh position={[0, -0.22, 0]} material={darkMat}>
              <capsuleGeometry args={[0.12, 0.3, 4, 6]} />
            </mesh>
            <mesh position={[0, -0.44, 0.08]} material={darkMat}>
              <boxGeometry args={[0.2, 0.1, 0.3]} />
            </mesh>
          </group>
          <group ref={rightLegRef} position={[0.17, -0.4, 0]}>
            <mesh position={[0, -0.22, 0]} material={darkMat}>
              <capsuleGeometry args={[0.12, 0.3, 4, 6]} />
            </mesh>
            <mesh position={[0, -0.44, 0.08]} material={darkMat}>
              <boxGeometry args={[0.2, 0.1, 0.3]} />
            </mesh>
          </group>
        </group>
      </group>
      {!isDead && <EnemyLabel name={goblinType.name} level={level} elite={elite} y={goblinType.height} hpFraction={hpFraction} />}
    </RigidBody>
  );
}

// Main griffue : paume + trois griffes (réutilisée pour les deux bras).
function Claws({ mat, y }: { mat: THREE.MeshStandardMaterial; y: number }) {
  return (
    <group position={[0, y, 0.02]}>
      <mesh material={mat}>
        <sphereGeometry args={[0.1, 6, 5]} />
      </mesh>
      {[-0.06, 0, 0.06].map((x, i) => (
        <mesh key={i} position={[x, -0.08, 0.04]} rotation={[0.4, 0, 0]}>
          <coneGeometry args={[0.02, 0.12, 4]} />
          <meshStandardMaterial color="#2a2018" roughness={0.7} flatShading />
        </mesh>
      ))}
    </group>
  );
}

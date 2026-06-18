import { useMemo, useRef } from "react";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useEnemyAI, type EnemyProps } from "../enemies/useEnemyAI";
import { EnemyLabel } from "../enemies/EnemyLabel";
import { scaledStats } from "../enemies/scaling";
import { ENEMY_TYPES } from "../enemies/enemyTypes";

// Ennemi "poursuiveur" de base — le gobelin (cf. GDD §5) : capsule dynamique
// Rapier qui avance vers le joueur (lent et lisible). Flash + recul au coup,
// petite chute à la mort. Toute l'IA/combat vit dans useEnemyAI ; ici on ne
// garde que l'apparence et les animations propres. Comme les autres ennemis, le
// gobelin tire ses stats du catalogue via scaledStats (son entrée porte les
// anciennes valeurs config.ts ENEMY_* à l'échelle proto, niveau 1).

const goblinType = ENEMY_TYPES.goblin;

export function Enemy({ spawn, index, level, elite }: EnemyProps) {
  const body = useRef<RapierRigidBody>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const corpseGroup = useRef<THREE.Group>(null);
  const bodyRigRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  // Variation visuelle déterministe par spawn (taille, teinte, couleur des yeux).
  const variant = useMemo(() => {
    let s = (Math.floor(Math.abs(spawn[0] * 131 + spawn[1] * 57)) % 9973) + 1;
    const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    return { scale: 0.92 + r() * 0.18, tint: r(), warmEyes: r() > 0.45 };
  }, [spawn]);

  const stats = useMemo(() => scaledStats(goblinType, level), [level]);
  const { looted, isDead } = useEnemyAI({
    spawn,
    index,
    body,
    corpseGroup,
    stats,
    knockback: { xz: 4, y: 1.2 },
    onFlash: (f) => {
      if (mat.current) mat.current.emissive.setScalar(f * 0.9);
    },
    // Bob vertical + lunge sur attaque ; bras en swing opposé ; jambes en
    // foulée inverse. (death : bascule + enfoncement par défaut, squash 0.5)
    onAnimate: ({ ws, aa }) => {
      if (bodyRigRef.current) {
        bodyRigRef.current.position.y = ws * 0.06;
        bodyRigRef.current.rotation.x = aa * 0.55;
      }
      if (leftArmRef.current)  leftArmRef.current.rotation.set(0.1 + ws * 0.5 - aa * 1.2, 0, 0.48);
      if (rightArmRef.current) rightArmRef.current.rotation.set(0.1 - ws * 0.5 - aa * 1.2, 0, -0.48);
      if (leftLegRef.current)  leftLegRef.current.rotation.set(-ws * 0.35, 0, 0);
      if (rightLegRef.current) rightLegRef.current.rotation.set(ws * 0.35, 0, 0);
    },
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
      {!isDead && <EnemyLabel name={goblinType.name} level={level} elite={elite} y={goblinType.height} />}
    </RigidBody>
  );
}

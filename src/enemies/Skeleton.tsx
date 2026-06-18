import { useMemo, useRef } from "react";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useEnemyAI, type EnemyProps } from "./useEnemyAI";
import { EnemyLabel } from "./EnemyLabel";
import { scaledStats } from "./scaling";
import { ENEMY_TYPES } from "./enemyTypes";

// Configuration spécifique au Squelette
const skeletonType = ENEMY_TYPES.skeleton;

// Stats de combat → scaledStats(type, level). Ici on ne garde que les paramètres
// physiques/visuels fixes (collider, masse), indépendants du niveau.
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

export function Skeleton({ spawn, index, level, elite }: EnemyProps) {
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
  
  const stats = useMemo(() => scaledStats(skeletonType, level), [level]);
  const { looted, isDead } = useEnemyAI({
    spawn,
    index,
    body,
    corpseGroup,
    stats,
    knockback: { xz: 3, y: 0.8 },
    onFlash: (f) => {
      if (mat.current) mat.current.emissive.setScalar(f * 0.5);
    },
    onDeath: (g, e) => {
      g.rotation.x = (e * Math.PI) / 2;
      g.position.y = -e * skeletonType.animations.deathSquash;
    },
    onAnimate: ({ ws, aa }) => {
      if (bodyRigRef.current) {
        bodyRigRef.current.position.y = ws * skeletonType.animations.walkAmplitude;
        bodyRigRef.current.rotation.x = aa * skeletonType.animations.attackLunge;
      }
      if (leftArmRef.current) {
        leftArmRef.current.rotation.set(0.2 + ws * 0.6 - aa * 1.5, 0, -0.3 + ws * 0.2);
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.set(0.2 - ws * 0.6 - aa * 1.5, 0, 0.3 - ws * 0.2);
      }
      if (leftLegRef.current) leftLegRef.current.rotation.set(-ws * 0.4, 0, ws * 0.1);
      if (rightLegRef.current) rightLegRef.current.rotation.set(ws * 0.4, 0, -ws * 0.1);
      if (headRef.current) headRef.current.rotation.x = ws * 0.05;
      if (swordRef.current && variant.hasSword) {
        swordRef.current.rotation.x = -aa * 2.0;
        swordRef.current.position.z = 0.1 - aa * 0.3;
      }
    },
  });

  const eyeGlow = looted ? 0 : (variant.warmEyes ? skeletonType.appearance.eyeGlow! * 1.2 : skeletonType.appearance.eyeGlow!);

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
      {!isDead && <EnemyLabel name={skeletonType.name} level={level} elite={elite} y={skeletonType.height} />}
    </RigidBody>
  );
}


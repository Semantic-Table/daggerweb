import { useMemo, useRef } from "react";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useEnemyAI } from "./useEnemyAI";
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
  // Crocs : visibles seulement pendant l'attaque (toggle dans onAnimate).
  const fangsRef = useRef<THREE.Group>(null);

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

  const { looted } = useEnemyAI({
    spawn,
    index,
    body,
    corpseGroup,
    stats: {
      hp: WOLF_HP,
      speed: WOLF_SPEED,
      stopDist: WOLF_STOP_DIST,
      attackDist: WOLF_ATTACK_DIST,
      attackCd: WOLF_ATTACK_CD,
      attackDmg: WOLF_ATTACK_DMG,
      armor: wolfType.stats.armor,
      walkSpeed: wolfType.animations.walkSpeed,
      attackAnimSpeed: wolfType.animations.attackAnimSpeed,
      deathSpeed: wolfType.animations.deathSpeed,
    },
    knockback: { xz: 3, y: 1.0 },
    onFlash: (f) => {
      if (mainMeshRef.current) {
        const m = mainMeshRef.current.material as THREE.MeshStandardMaterial;
        m.emissiveIntensity = f;
      }
    },
    // Chute sur le côté : bascule avant + fort roulis.
    onDeath: (g, e) => {
      g.rotation.x = (e * Math.PI) / 2;
      g.rotation.z = e * 0.8;
      g.position.y = -e * wolfType.animations.deathSquash;
    },
    onAnimate: ({ ws, aa, phase }) => {
      if (bodyRigRef.current) {
        bodyRigRef.current.position.y = ws * wolfType.animations.walkAmplitude * 1.5;
        bodyRigRef.current.rotation.x = aa * wolfType.animations.attackLunge * 0.5;
      }
      // Tête : regard haut/bas seulement (le corps gère la rotation latérale).
      if (headRef.current) {
        headRef.current.rotation.x = ws * 0.1 - aa * 0.3;
        headRef.current.rotation.y = 0;
        headRef.current.rotation.z = 0;
      }
      // Queue : remue quand il court.
      if (tailRef.current) {
        tailRef.current.rotation.x = Math.sin(phase * 2) * 0.3 + ws * 0.2;
        tailRef.current.rotation.y = ws * 0.3;
      }
      if (leftLegFrontRef.current) leftLegFrontRef.current.rotation.x = -ws * 0.8 + aa * 0.3;
      if (rightLegFrontRef.current) rightLegFrontRef.current.rotation.x = ws * 0.8 - aa * 0.3;
      if (leftLegBackRef.current) leftLegBackRef.current.rotation.x = ws * 0.8 + aa * 0.2;
      if (rightLegBackRef.current) rightLegBackRef.current.rotation.x = -ws * 0.8 - aa * 0.2;
      // Crocs visibles pendant la morsure.
      if (fangsRef.current) fangsRef.current.visible = aa > 0.01;
    },
  });

  const eyeGlow = looted ? 0 : variant.eyeGlow;

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

          {/* Crocs visibles quand il attaque (visibilité pilotée dans onAnimate) */}
          <group ref={fangsRef} visible={false}>
            <mesh position={[0.55, -0.05, 0.32]} rotation={[0.2, 0, 0]}>
              <coneGeometry args={[0.015, 0.06, 3]} />
              <meshStandardMaterial color="#e0e0e0" metalness={0.5} />
            </mesh>
            <mesh position={[0.55, -0.08, 0.32]} rotation={[-0.1, 0, 0]}>
              <coneGeometry args={[0.015, 0.06, 3]} />
              <meshStandardMaterial color="#e0e0e0" metalness={0.5} />
            </mesh>
          </group>

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

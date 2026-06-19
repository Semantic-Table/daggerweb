import { useMemo, useRef } from "react";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useEnemyAI, type EnemyProps } from "./useEnemyAI";
import { EnemyLabel } from "./EnemyLabel";
import { scaledStats } from "./scaling";
import { ENEMY_TYPES } from "./enemyTypes";

// Configuration spécifique à l'Orc
const orcType = ENEMY_TYPES.orc;

// Stats de combat → scaledStats(type, level). On ne garde que le fixe (collider, masse).
const ORC_MASS = orcType.stats.mass;
const ORC_COLLIDER_RADIUS = orcType.stats.colliderRadius;
const ORC_COLLIDER_HEIGHT = orcType.stats.colliderHeight;

// Couleurs de l'orc
const PRIMARY_COLOR = new THREE.Color(orcType.appearance.primaryColor as string);
const SECONDARY_COLOR = new THREE.Color(orcType.appearance.secondaryColor as string);
const ACCENT_COLOR = new THREE.Color(orcType.appearance.accentColor as string);
const EYE_COLOR = new THREE.Color(orcType.appearance.eyeColor as string);

export function Orc({ spawn, index, level, elite }: EnemyProps) {
  const body = useRef<RapierRigidBody>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const corpseGroup = useRef<THREE.Group>(null);
  const bodyRigRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const axeRef = useRef<THREE.Group>(null);
  
  // Variation visuelle
  const variant = useMemo(() => {
    let s = (Math.floor(Math.abs(spawn[0] * 131 + spawn[1] * 57)) % 9973) + 1;
    const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    return { 
      scale: 0.92 + r() * 0.16, 
      skinTint: r(), 
      hasAxe: r() > 0.2, // 80% de chance d'avoir une hache
      hasHelmet: r() > 0.5, // 50% de chance d'avoir un casque
      scars: r() > 0.6, // 40% de chance d'avoir des cicatrices
      warmEyes: r() > 0.5 
    };
  }, [spawn]);

  // Couleurs calculées avec variation
  const skinColor = useMemo(() => {
    return PRIMARY_COLOR.clone().lerp(SECONDARY_COLOR, variant.skinTint * 0.5);
  }, [variant.skinTint]);
  
  const darkSkinColor = useMemo(() => {
    return skinColor.clone().multiplyScalar(0.65);
  }, [skinColor]);

  const stats = useMemo(() => scaledStats(orcType, level), [level]);
  const { looted, isDead, hpFraction } = useEnemyAI({
    spawn,
    index,
    body,
    corpseGroup,
    stats,
    knockback: { xz: 2, y: 0.5 },
    lootLevel: level + (orcType.stats.lootTier - 1),
    onFlash: (f) => {
      if (mat.current) mat.current.emissive.setScalar(f * 0.7);
    },
    // Chute lourde : bascule avant + léger roulis.
    onDeath: (g, e) => {
      g.rotation.x = (e * Math.PI) / 2;
      g.rotation.z = e * 0.3;
      g.position.y = -e * orcType.animations.deathSquash;
    },
    onAnimate: ({ ws, aa }) => {
      if (bodyRigRef.current) {
        bodyRigRef.current.position.y = ws * orcType.animations.walkAmplitude * 0.8;
        bodyRigRef.current.rotation.x = aa * orcType.animations.attackLunge * 0.8;
      }
      if (leftArmRef.current) {
        leftArmRef.current.rotation.set(0.3 + ws * 0.5 - aa * 2.0, 0, -0.4 + ws * 0.3);
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.set(0.3 - ws * 0.5 - aa * 2.0, 0, 0.4 - ws * 0.3);
      }
      if (leftLegRef.current) leftLegRef.current.rotation.set(-ws * 0.5, 0, ws * 0.2);
      if (rightLegRef.current) rightLegRef.current.rotation.set(ws * 0.5, 0, -ws * 0.2);
      if (headRef.current) headRef.current.rotation.x = ws * 0.03;
      if (axeRef.current && variant.hasAxe) {
        axeRef.current.rotation.x = -aa * 3.0;
        axeRef.current.position.z = 0.15 - aa * 0.5;
        axeRef.current.position.y = -aa * 0.2;
      }
    },
  });

  const eyeGlow = looted ? 0 : (variant.warmEyes ? orcType.appearance.eyeGlow! * 1.3 : orcType.appearance.eyeGlow!);

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
          {/* Torse massif */}
          <mesh>
            <capsuleGeometry args={[0.4, 0.65, 4, 8]} />
            <meshStandardMaterial 
              ref={mat} 
              color={skinColor} 
              roughness={orcType.appearance.roughness} 
              flatShading={orcType.appearance.flatShading}
            />
          </mesh>

          {/* Abdomen */}
          <mesh position={[0, -0.6, 0]}>
            <capsuleGeometry args={[0.35, 0.4, 4, 8]} />
            <meshStandardMaterial color={darkSkinColor} roughness={orcType.appearance.roughness} flatShading />
          </mesh>

          {/* Épaules larges */}
          <mesh position={[-0.35, 0.35, 0]} rotation={[0, 0, Math.PI / 8]}>
            <sphereGeometry args={[0.18, 6, 5]} />
            <meshStandardMaterial color={skinColor} roughness={orcType.appearance.roughness} flatShading />
          </mesh>
          <mesh position={[0.35, 0.35, 0]} rotation={[0, 0, -Math.PI / 8]}>
            <sphereGeometry args={[0.18, 6, 5]} />
            <meshStandardMaterial color={skinColor} roughness={orcType.appearance.roughness} flatShading />
          </mesh>

          {/* Bras musclés */}
          <mesh ref={leftArmRef} position={[-0.45, 0.2, 0]}>
            <capsuleGeometry args={[0.14, 0.7, 4, 6]} />
            <meshStandardMaterial color={skinColor} roughness={orcType.appearance.roughness} flatShading />
          </mesh>
          <mesh ref={rightArmRef} position={[0.45, 0.2, 0]}>
            <capsuleGeometry args={[0.14, 0.7, 4, 6]} />
            <meshStandardMaterial color={skinColor} roughness={orcType.appearance.roughness} flatShading />
          </mesh>

          {/* Avant-bras */}
          <mesh position={[-0.62, -0.25, 0]}>
            <capsuleGeometry args={[0.12, 0.45, 4, 6]} />
            <meshStandardMaterial color={darkSkinColor} roughness={orcType.appearance.roughness} flatShading />
          </mesh>
          <mesh position={[0.62, -0.25, 0]}>
            <capsuleGeometry args={[0.12, 0.45, 4, 6]} />
            <meshStandardMaterial color={darkSkinColor} roughness={orcType.appearance.roughness} flatShading />
          </mesh>

          {/* Mains */}
          <mesh position={[-0.75, -0.5, 0]}>
            <sphereGeometry args={[0.1, 5, 4]} />
            <meshStandardMaterial color={darkSkinColor} roughness={orcType.appearance.roughness} flatShading />
          </mesh>
          <mesh position={[0.75, -0.5, 0]}>
            <sphereGeometry args={[0.1, 5, 4]} />
            <meshStandardMaterial color={darkSkinColor} roughness={orcType.appearance.roughness} flatShading />
          </mesh>

          {/* Jambes */}
          <mesh ref={leftLegRef} position={[-0.25, -1.05, 0]}>
            <capsuleGeometry args={[0.16, 0.6, 4, 6]} />
            <meshStandardMaterial color={darkSkinColor} roughness={orcType.appearance.roughness} flatShading />
          </mesh>
          <mesh ref={rightLegRef} position={[0.25, -1.05, 0]}>
            <capsuleGeometry args={[0.16, 0.6, 4, 6]} />
            <meshStandardMaterial color={darkSkinColor} roughness={orcType.appearance.roughness} flatShading />
          </mesh>

          {/* Mollets */}
          <mesh position={[-0.25, -1.65, 0]}>
            <capsuleGeometry args={[0.14, 0.4, 4, 6]} />
            <meshStandardMaterial color={ACCENT_COLOR} roughness={orcType.appearance.roughness} flatShading />
          </mesh>
          <mesh position={[0.25, -1.65, 0]}>
            <capsuleGeometry args={[0.14, 0.4, 4, 6]} />
            <meshStandardMaterial color={ACCENT_COLOR} roughness={orcType.appearance.roughness} flatShading />
          </mesh>

          {/* Pieds */}
          <mesh position={[-0.25, -2.05, 0.1]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.22, 0.1, 0.3]} />
            <meshStandardMaterial color="#333333" roughness={1} flatShading />
          </mesh>
          <mesh position={[0.25, -2.05, 0.1]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.22, 0.1, 0.3]} />
            <meshStandardMaterial color="#333333" roughness={1} flatShading />
          </mesh>

          {/* Tête */}
          <mesh ref={headRef} position={[0, 1.1, 0.05]}>
            <sphereGeometry args={[0.32, 8, 6]} />
            <meshStandardMaterial color={skinColor} roughness={orcType.appearance.roughness} flatShading />
          </mesh>

          {/* Mâchoire */}
          <mesh position={[0, 1.0, 0.25]} rotation={[0.4, 0, 0]}>
            <boxGeometry args={[0.25, 0.12, 0.2]} />
            <meshStandardMaterial color={darkSkinColor} roughness={orcType.appearance.roughness} flatShading />
          </mesh>

          {/* Nez */}
          <mesh position={[0, 1.05, 0.35]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.08, 0.06, 0.1]} />
            <meshStandardMaterial color={darkSkinColor} roughness={orcType.appearance.roughness} flatShading />
          </mesh>

          {/* Oreilles pointues (optionnelles - certains orcs en ont) */}
          <mesh position={[-0.3, 1.15, 0.05]} rotation={[0, 0, -0.3]}>
            <coneGeometry args={[0.08, 0.2, 3]} />
            <meshStandardMaterial color={darkSkinColor} roughness={orcType.appearance.roughness} flatShading />
          </mesh>
          <mesh position={[0.3, 1.15, 0.05]} rotation={[0, 0, 0.3]}>
            <coneGeometry args={[0.08, 0.2, 3]} />
            <meshStandardMaterial color={darkSkinColor} roughness={orcType.appearance.roughness} flatShading />
          </mesh>

          {/* Yeux */}
          <mesh position={[-0.12, 1.12, 0.3]}>
            <sphereGeometry args={[0.06, 5, 4]} />
            <meshStandardMaterial color={ACCENT_COLOR} roughness={1} flatShading />
          </mesh>
          <mesh position={[0.12, 1.12, 0.3]}>
            <sphereGeometry args={[0.06, 5, 4]} />
            <meshStandardMaterial color={ACCENT_COLOR} roughness={1} flatShading />
          </mesh>

          {/* Yeux émissifs */}
          <mesh position={[-0.12, 1.12, 0.33]}>
            <sphereGeometry args={[0.03, 4, 4]} />
            <meshStandardMaterial 
              color="#000" 
              emissive={EYE_COLOR} 
              emissiveIntensity={eyeGlow} 
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0.12, 1.12, 0.33]}>
            <sphereGeometry args={[0.03, 4, 4]} />
            <meshStandardMaterial 
              color="#000" 
              emissive={EYE_COLOR} 
              emissiveIntensity={eyeGlow} 
              toneMapped={false}
            />
          </mesh>

          {/* Dents/Defenses */}
          <mesh position={[-0.08, 1.0, 0.28]} rotation={[0.3, 0, 0]}>
            <coneGeometry args={[0.03, 0.06, 3]} />
            <meshStandardMaterial color="#e0e0e0" roughness={0.5} flatShading />
          </mesh>
          <mesh position={[0.08, 1.0, 0.28]} rotation={[0.3, 0, 0]}>
            <coneGeometry args={[0.03, 0.06, 3]} />
            <meshStandardMaterial color="#e0e0e0" roughness={0.5} flatShading />
          </mesh>

          {/* Casque (optionnel) */}
          {variant.hasHelmet && (
            <>
              <mesh position={[0, 1.22, 0]} rotation={[0.1, 0, 0]}>
                <torusGeometry args={[0.34, 0.04, 8, 12]} />
                <meshStandardMaterial color="#444444" metalness={0.6} roughness={0.3} />
              </mesh>
              <mesh position={[0, 1.25, 0]}>
                <sphereGeometry args={[0.08, 6, 4]} />
                <meshStandardMaterial color="#555555" metalness={0.8} roughness={0.2} />
              </mesh>
              <mesh position={[0, 1.18, -0.2]} rotation={[0.3, 0, 0]}>
                <boxGeometry args={[0.1, 0.1, 0.08]} />
                <meshStandardMaterial color="#333333" metalness={0.7} roughness={0.3} />
              </mesh>
            </>
          )}

          {/* Hache (optionnelle) */}
          {variant.hasAxe && (
            <group ref={axeRef} position={[0.2, -0.15, 0.1]} rotation={[0, 0, -Math.PI / 3]}>
              {/* Manche */}
              <mesh position={[0, 0, 0]}>
                <capsuleGeometry args={[0.04, 0.5, 4, 6]} />
                <meshStandardMaterial color="#4a3a2a" roughness={0.8} />
              </mesh>
              {/* Lame */}
              <mesh position={[0, 0, 0.5]}>
                <boxGeometry args={[0.12, 0.35, 0.05]} />
                <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
              </mesh>
              <mesh position={[0, 0, 0.45]} rotation={[0, Math.PI / 4, 0]}>
                <boxGeometry args={[0.08, 0.06, 0.4]} />
                <meshStandardMaterial color="#777777" metalness={0.8} roughness={0.2} />
              </mesh>
            </group>
          )}

          {/* Ceinture avec trophées */}
          <mesh position={[0, -0.55, -0.15]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.38, 0.03, 8, 12]} />
            <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
          </mesh>
          {variant.scars && (
            <>
              {/* Cicatrice sur la joue */}
              <mesh position={[-0.15, 1.05, 0.25]} rotation={[0, 0, Math.PI / 4]}>
                <boxGeometry args={[0.12, 0.02, 0.01]} />
                <meshStandardMaterial color="#884444" roughness={1} />
              </mesh>
              <mesh position={[0.1, 1.05, 0.25]} rotation={[0, 0, -Math.PI / 6]}>
                <boxGeometry args={[0.08, 0.02, 0.01]} />
                <meshStandardMaterial color="#884444" roughness={1} />
              </mesh>
            </>
          )}
        </group>
      </group>
      {!isDead && <EnemyLabel name={orcType.name} level={level} elite={elite} y={orcType.height} hpFraction={hpFraction} />}
    </RigidBody>
  );
}

export { orcType as orcEnemyType };

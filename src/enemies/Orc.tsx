import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { enemyRegistry, type EnemyHandle } from "../combat/enemyRegistry";
import { playerPos } from "../combat/playerState";
import { damagePlayer } from "../combat/playerCombat";
import { corpseRegistry, type CorpseHandle } from "../combat/corpseRegistry";
import { gameState } from "../combat/gameState";
import { rollLoot } from "../items/itemDefs";
import { ENEMY_TYPES } from "./enemyTypes";

// Configuration spécifique à l'Orc
const orcType = ENEMY_TYPES.orc;

const ORC_SPEED = orcType.stats.speed;
const ORC_STOP_DIST = orcType.stats.stopDistance;
const ORC_HP = orcType.stats.hp;
const ORC_ATTACK_DIST = orcType.stats.attackRange;
const ORC_ATTACK_CD = orcType.stats.attackCooldown;
const ORC_ATTACK_DMG = orcType.stats.attackDamage;
const ORC_MASS = orcType.stats.mass;
const ORC_COLLIDER_RADIUS = orcType.stats.colliderRadius;
const ORC_COLLIDER_HEIGHT = orcType.stats.colliderHeight;

// Couleurs de l'orc
const PRIMARY_COLOR = new THREE.Color(orcType.appearance.primaryColor as string);
const SECONDARY_COLOR = new THREE.Color(orcType.appearance.secondaryColor as string);
const ACCENT_COLOR = new THREE.Color(orcType.appearance.accentColor as string);
const EYE_COLOR = new THREE.Color(orcType.appearance.eyeColor as string);

export function Orc({ spawn, index }: { spawn: [number, number]; index: number }) {
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
  
  const hp = useRef(ORC_HP);
  const dead = useRef(false);
  const deathT = useRef(0);
  const flash = useRef(0);
  const atkCd = useRef(0);
  const walkPhase = useRef(0);
  const attackAnim = useRef(0);
  const [looted, setLooted] = useState(false);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  
  const pendingHits = useRef<{ dx: number; dz: number; dmg: number }[]>([]);
  const handleRef = useRef<EnemyHandle | null>(null);
  const corpseHandleRef = useRef<CorpseHandle | null>(null);
  
  // Seed de loot
  const lootSeed = useRef(
    (((Math.round(spawn[0] * 100) * 73856093) ^ (Math.round(spawn[1] * 100) * 19349663) ^ (index * 83492791)) >>> 0) % 0xffffff
  );
  
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

  const eyeGlow = looted ? 0 : (variant.warmEyes ? orcType.appearance.eyeGlow! * 1.3 : orcType.appearance.eyeGlow!);

  useEffect(() => {
    const handle: EnemyHandle = {
      getPosition: (out) => {
        const t = body.current?.translation();
        return t ? out.set(t.x, t.y, t.z) : out;
      },
      hit: (dx, dz, dmg) => {
        if (dead.current) return;
        pendingHits.current.push({ dx, dz, dmg: dmg * (1 - orcType.stats.armor) });
      },
    };
    handleRef.current = handle;
    enemyRegistry.add(handle);
    return () => {
      enemyRegistry.delete(handle);
      if (corpseHandleRef.current) corpseRegistry.delete(corpseHandleRef.current);
    };
  }, []);

  function die() {
    dead.current = true;
    if (handleRef.current) enemyRegistry.delete(handleRef.current);
    setTimeout(() => {
      const mesh = corpseGroup.current;
      if (!mesh) return;
      let s = lootSeed.current;
      const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
      const loot = rollLoot(rng);
      const handle: CorpseHandle = {
        mesh,
        loot,
        looted: false,
        markLooted: () => {
          handle.looted = true;
          setLooted(true);
        },
      };
      corpseHandleRef.current = handle;
      corpseRegistry.add(handle);
    }, 600);
  }

  useFrame((_, dt) => {
    const b = body.current;
    if (!b) return;

    if (gameState.paused) {
      b.setLinvel({ x: 0, y: 0, z: 0 }, false);
      b.setAngvel({ x: 0, y: 0, z: 0 }, false);
      return;
    }

    // Flash de coup
    if (mat.current) {
      flash.current = Math.max(0, flash.current - dt * 4);
      mat.current.emissive.setScalar(flash.current * 0.7);
    }

    // Application des coups
    while (pendingHits.current.length > 0 && !dead.current) {
      const h = pendingHits.current.shift()!;
      hp.current -= h.dmg;
      flash.current = 1;
      b.applyImpulse({ x: h.dx * 2, y: 0.5, z: h.dz * 2 }, true);
      if (hp.current <= 0) die();
    }

    // Mort - chute lourde
    if (dead.current) {
      const g = corpseGroup.current;
      if (g) {
        deathT.current = Math.min(1, deathT.current + dt * orcType.animations.deathSpeed);
        const e = deathT.current;
        g.rotation.x = e * Math.PI / 2;
        g.rotation.z = e * 0.3;
        g.position.y = -e * orcType.animations.deathSquash;
      }
      const lv = b.linvel();
      b.setLinvel({ x: 0, y: lv.y, z: 0 }, true);
      return;
    }

    // Poursuite
    const t = b.translation();
    tmp.set(playerPos.x - t.x, 0, playerPos.z - t.z);
    const d = tmp.length();

    if (corpseGroup.current && d > 0.001) {
      corpseGroup.current.rotation.y = Math.atan2(playerPos.x - t.x, playerPos.z - t.z);
    }
    
    const v = b.linvel();
    if (d > ORC_STOP_DIST) {
      tmp.normalize().multiplyScalar(ORC_SPEED);
      b.setLinvel({ x: tmp.x, y: v.y, z: tmp.z }, true);
    } else {
      b.setLinvel({ x: 0, y: v.y, z: 0 }, true);
    }

    // Attaque puissante
    atkCd.current -= dt;
    if (d <= ORC_ATTACK_DIST && atkCd.current <= 0) {
      damagePlayer(ORC_ATTACK_DMG);
      atkCd.current = ORC_ATTACK_CD;
      attackAnim.current = 1;
    }

    // Animations
    const isMoving = d > ORC_STOP_DIST;
    if (isMoving) walkPhase.current += dt * orcType.animations.walkSpeed;
    const ws = isMoving ? Math.sin(walkPhase.current) : 0;

    if (attackAnim.current > 0) attackAnim.current = Math.max(0, attackAnim.current - dt * orcType.animations.attackAnimSpeed);
    const aa = Math.sin(attackAnim.current * Math.PI);

    // Body rig - l'orc a des mouvements lourds
    if (bodyRigRef.current) {
      bodyRigRef.current.position.y = ws * orcType.animations.walkAmplitude * 0.8;
      bodyRigRef.current.rotation.x = aa * orcType.animations.attackLunge * 0.8;
    }

    // Bras - mouvements puissants
    if (leftArmRef.current) {
      leftArmRef.current.rotation.set(
        0.3 + ws * 0.5 - aa * 2.0,
        0,
        -0.4 + ws * 0.3
      );
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.set(
        0.3 - ws * 0.5 - aa * 2.0,
        0,
        0.4 - ws * 0.3
      );
    }

    // Jambes - pas lourds
    if (leftLegRef.current) {
      leftLegRef.current.rotation.set(
        -ws * 0.5,
        0,
        ws * 0.2
      );
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.set(
        ws * 0.5,
        0,
        -ws * 0.2
      );
    }

    // Tête
    if (headRef.current) {
      headRef.current.rotation.x = ws * 0.03;
    }

    // Hache (animation d'attaque puissante)
    if (axeRef.current && variant.hasAxe) {
      axeRef.current.rotation.x = -aa * 3.0;
      axeRef.current.position.z = 0.15 - aa * 0.5;
      axeRef.current.position.y = -aa * 0.2;
    }
  });

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
    </RigidBody>
  );
}

export { orcType as orcEnemyType };

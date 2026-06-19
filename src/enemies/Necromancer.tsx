import { useEffect, useMemo, useRef } from "react";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { spawnProjectile } from "../combat/projectileRegistry";
import { addSummon } from "../combat/summonRegistry";
import { useEnemyAI, type EnemyProps } from "./useEnemyAI";
import { animateBiped, telegraphTint } from "./rig";
import { EnemyLabel } from "./EnemyLabel";
import { scaledStats } from "./scaling";
import { ENEMY_TYPES } from "./enemyTypes";

// Nécromancien — caster à distance (Phase 4). Silhouette en robe (cône), capuche,
// bras-manches qui se lèvent pour lancer. Flotte légèrement (pas de jambes). À la
// frappe, projette un BOLT nécrotique via le système de projectiles (kind "bolt").
// Le windup (bras levés + robe qui rougeoie) lit comme une incantation.

const necroType = ENEMY_TYPES.necromancer;
const MAX_SUMMONS = 3; // squelettes qu'un nécromancien peut lever avant de passer aux bolts
const PRIMARY_COLOR = new THREE.Color(necroType.appearance.primaryColor as string);
const SECONDARY_COLOR = new THREE.Color(necroType.appearance.secondaryColor as string);
const ACCENT_COLOR = new THREE.Color(necroType.appearance.accentColor as string);
const EYE_COLOR = new THREE.Color(necroType.appearance.eyeColor as string);

export function Necromancer({ spawn, index, level, elite }: EnemyProps) {
  const body = useRef<RapierRigidBody>(null);
  const corpseGroup = useRef<THREE.Group>(null);
  const bodyRigRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const flashRef = useRef(0);
  const hover = useRef(Math.random() * Math.PI * 2);
  const summonCount = useRef(0);

  const variant = useMemo(() => {
    let s = (Math.floor(Math.abs(spawn[0] * 131 + spawn[1] * 57)) % 9973) + 1;
    const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    return { scale: 0.92 + r() * 0.14, tint: r() };
  }, [spawn]);

  const baseRobe = useMemo(() => PRIMARY_COLOR.clone().lerp(SECONDARY_COLOR, variant.tint), [variant.tint]);
  const robeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: baseRobe.clone(), roughness: 0.6, flatShading: true }), [baseRobe]);
  const trimMat = useMemo(() => new THREE.MeshStandardMaterial({ color: ACCENT_COLOR.clone(), roughness: 0.5, flatShading: true }), []);
  const eyeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#000", emissive: EYE_COLOR.clone(), emissiveIntensity: necroType.appearance.eyeGlow!, toneMapped: false }), []);

  const stats = useMemo(() => scaledStats(necroType, level, elite), [level, elite]);
  const { looted, isDead, hpFraction } = useEnemyAI({
    spawn,
    index,
    body,
    corpseGroup,
    stats,
    knockback: { xz: 3, y: 0.8 },
    lootLevel: level + (necroType.stats.lootTier - 1),
    onAttack: (nx, nz) => {
      const t = body.current?.translation();
      if (!t) return;
      // Alterne : lève un squelette tant qu'il est sous son plafond, sinon bolt.
      if (summonCount.current < MAX_SUMMONS) {
        const a = Math.random() * Math.PI * 2;
        addSummon("skeleton", Math.max(1, level - 1), t.x + Math.cos(a) * 1.6, t.z + Math.sin(a) * 1.6);
        summonCount.current++;
      } else {
        spawnProjectile({ kind: "bolt", pos: { x: t.x, y: t.y + 0.5, z: t.z }, dir: { x: nx, y: 0, z: nz }, dmg: stats.attackDmg });
      }
    },
    onFlash: (f) => {
      flashRef.current = f;
      robeMat.emissive.setScalar(f * 0.6);
    },
    onDeath: (g, e) => {
      g.rotation.x = (e * Math.PI) / 2;
      g.position.y = -e * 0.4;
    },
    onAnimate: (m) => {
      animateBiped(
        { bodyRig: bodyRigRef, leftArm: leftArmRef, rightArm: rightArmRef, head: headRef },
        m,
        { restLean: 0, walkAmp: 0.03, lunge: 0.2, armSwing: 0.2, armRaise: 1.6, armSlam: 0.5, armRestZ: 0.35 },
      );
      // Lévitation : flotte en continu (s'ajoute au bob d'animateBiped).
      hover.current += m.dt * 1.5;
      if (bodyRigRef.current) bodyRigRef.current.position.y += 0.05 + Math.sin(hover.current) * 0.05;
      telegraphTint(robeMat, flashRef.current, m.wind, 0.6);
    },
  });

  useEffect(() => {
    robeMat.color.copy(baseRobe).multiplyScalar(looted ? 0.4 : 1);
    eyeMat.emissiveIntensity = looted ? 0 : necroType.appearance.eyeGlow!;
  }, [looted, baseRobe, robeMat, eyeMat]);

  return (
    <RigidBody
      ref={body}
      colliders={false}
      type="dynamic"
      mass={necroType.stats.mass}
      canSleep={false}
      enabledRotations={[false, false, false]}
      position={[spawn[0], necroType.colliderOffsetY, spawn[1]]}
    >
      <CapsuleCollider args={[necroType.stats.colliderRadius, necroType.stats.colliderHeight]} />
      <group ref={corpseGroup} scale={variant.scale * necroType.scale}>
        <group ref={bodyRigRef}>
          {/* Robe (cône évasé). */}
          <mesh position={[0, -0.35, 0]} material={robeMat}>
            <coneGeometry args={[0.42, 1.0, 10]} />
          </mesh>
          {/* Buste / épaules. */}
          <mesh position={[0, 0.18, 0]} material={robeMat}>
            <capsuleGeometry args={[0.24, 0.2, 6, 8]} />
          </mesh>
          {/* Liseré de col. */}
          <mesh position={[0, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]} material={trimMat}>
            <torusGeometry args={[0.2, 0.03, 6, 12]} />
          </mesh>

          {/* Tête encapuchonnée (capuche = cône, yeux rouges dans l'ombre). */}
          <group ref={headRef} position={[0, 0.5, 0.02]}>
            <mesh material={robeMat}>
              <sphereGeometry args={[0.16, 8, 7]} />
            </mesh>
            <mesh position={[0, 0.08, -0.02]} material={robeMat}>
              <coneGeometry args={[0.22, 0.34, 8]} />
            </mesh>
            <mesh position={[-0.06, 0.0, 0.13]} material={eyeMat}>
              <sphereGeometry args={[0.03, 5, 4]} />
            </mesh>
            <mesh position={[0.06, 0.0, 0.13]} material={eyeMat}>
              <sphereGeometry args={[0.03, 5, 4]} />
            </mesh>
          </group>

          {/* Bras-manches (pivot épaule), mains lumineuses. */}
          <group ref={leftArmRef} position={[-0.24, 0.28, 0.02]} rotation={[0.1, 0, -0.35]}>
            <mesh position={[0, -0.26, 0]} material={robeMat}>
              <capsuleGeometry args={[0.07, 0.4, 5, 7]} />
            </mesh>
            <mesh position={[0, -0.5, 0]} material={eyeMat}>
              <sphereGeometry args={[0.06, 6, 5]} />
            </mesh>
          </group>
          <group ref={rightArmRef} position={[0.24, 0.28, 0.02]} rotation={[0.1, 0, 0.35]}>
            <mesh position={[0, -0.26, 0]} material={robeMat}>
              <capsuleGeometry args={[0.07, 0.4, 5, 7]} />
            </mesh>
            <mesh position={[0, -0.5, 0]} material={eyeMat}>
              <sphereGeometry args={[0.06, 6, 5]} />
            </mesh>
          </group>
        </group>
      </group>
      {!isDead && <EnemyLabel name={necroType.name} level={level} elite={elite} y={necroType.height} hpFraction={hpFraction} />}
    </RigidBody>
  );
}

export { necroType as necromancerEnemyType };

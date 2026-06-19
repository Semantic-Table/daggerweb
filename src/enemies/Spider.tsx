import { useEffect, useMemo, useRef } from "react";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useEnemyAI, type EnemyProps } from "./useEnemyAI";
import { telegraphTint } from "./rig";
import { EnemyLabel } from "./EnemyLabel";
import { scaledStats } from "./scaling";
import { ENEMY_TYPES } from "./enemyTypes";

// Araignée géante — rapide, mêlée (Phase 4). Corps bas (céphalothorax + abdomen)
// + 6 pattes en groupes qui « scuttle » (gait tripode). Orientée tête sur +Z. Le
// windup la RAMASSE (abdomen relevé) avant un bond/morsure. Matériau corps partagé
// → tout rougeoie via telegraphTint.

const spiderType = ENEMY_TYPES.spider;
const PRIMARY_COLOR = new THREE.Color(spiderType.appearance.primaryColor as string);
const SECONDARY_COLOR = new THREE.Color(spiderType.appearance.secondaryColor as string);
const EYE_COLOR = new THREE.Color(spiderType.appearance.eyeColor as string);

// 6 pattes : 3 par côté (avant/milieu/arrière). ph = déphasage pour le gait tripode.
const LEGS = (() => {
  const rows = [0.22, 0.04, -0.16];
  const arr: { x: number; z: number; sgn: number; ph: number }[] = [];
  rows.forEach((z, ri) => {
    arr.push({ x: -0.2, z, sgn: -1, ph: ri % 2 === 0 ? 0 : Math.PI });
    arr.push({ x: 0.2, z, sgn: 1, ph: ri % 2 === 0 ? Math.PI : 0 });
  });
  return arr;
})();

export function Spider({ spawn, index, level, elite }: EnemyProps) {
  const body = useRef<RapierRigidBody>(null);
  const corpseGroup = useRef<THREE.Group>(null);
  const bodyRigRef = useRef<THREE.Group>(null);
  const legRefs = useRef<(THREE.Group | null)[]>([]);
  const flashRef = useRef(0);

  const variant = useMemo(() => {
    let s = (Math.floor(Math.abs(spawn[0] * 131 + spawn[1] * 57)) % 9973) + 1;
    const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    return { scale: 0.9 + r() * 0.25, tint: r() };
  }, [spawn]);

  const baseBody = useMemo(() => PRIMARY_COLOR.clone().lerp(SECONDARY_COLOR, variant.tint), [variant.tint]);
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: baseBody.clone(), roughness: spiderType.appearance.roughness, flatShading: true }), [baseBody]);
  const legMat = useMemo(() => new THREE.MeshStandardMaterial({ color: baseBody.clone().multiplyScalar(0.65), roughness: spiderType.appearance.roughness, flatShading: true }), [baseBody]);
  const eyeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#000", emissive: EYE_COLOR.clone(), emissiveIntensity: spiderType.appearance.eyeGlow!, toneMapped: false }), []);

  const stats = useMemo(() => scaledStats(spiderType, level, elite), [level, elite]);
  const { looted, isDead, hpFraction } = useEnemyAI({
    spawn,
    index,
    body,
    corpseGroup,
    stats,
    knockback: { xz: 3.5, y: 0.6 },
    lootLevel: level + (spiderType.stats.lootTier - 1),
    // Morsure venimeuse : poison en DoT (≈80 % des dégâts de base, étalés).
    meleePoison: Math.round(stats.attackDmg * 0.8),
    onFlash: (f) => {
      flashRef.current = f;
      bodyMat.emissive.setScalar(f * 0.7);
    },
    onDeath: (g, e) => {
      // Pattes repliées : on aplatit + bascule.
      g.rotation.x = (e * Math.PI) / 2.2;
      g.position.y = -e * 0.2;
    },
    onAnimate: ({ ws, aa, wind, flinch, phase }) => {
      if (bodyRigRef.current) {
        bodyRigRef.current.position.y = Math.abs(ws) * 0.03 + wind * 0.08 - flinch * 0.04;
        bodyRigRef.current.rotation.x = aa * 0.5 - wind * 0.3 + flinch * 0.3;
      }
      const moving = Math.abs(ws) > 0.01 ? 1 : 0;
      for (let i = 0; i < LEGS.length; i++) {
        const g = legRefs.current[i];
        if (!g) continue;
        const leg = LEGS[i];
        const skit = Math.sin(phase * 3 + leg.ph) * 0.35 * moving + wind * 0.2;
        g.rotation.set(skit, 0, leg.sgn * 0.95);
      }
      telegraphTint(bodyMat, flashRef.current, wind, 0.7);
    },
  });

  useEffect(() => {
    const k = looted ? 0.4 : 1;
    bodyMat.color.copy(baseBody).multiplyScalar(k);
    legMat.color.copy(baseBody).multiplyScalar(0.65 * k);
    eyeMat.emissiveIntensity = looted ? 0 : spiderType.appearance.eyeGlow!;
  }, [looted, baseBody, bodyMat, legMat, eyeMat]);

  return (
    <RigidBody
      ref={body}
      colliders={false}
      type="dynamic"
      mass={spiderType.stats.mass}
      canSleep={false}
      enabledRotations={[false, false, false]}
      position={[spawn[0], spiderType.colliderOffsetY, spawn[1]]}
    >
      <CapsuleCollider args={[spiderType.stats.colliderRadius, spiderType.stats.colliderHeight]} />
      <group ref={corpseGroup} scale={variant.scale * spiderType.scale}>
        <group ref={bodyRigRef}>
          {/* Abdomen (arrière, gros). */}
          <mesh position={[0, 0.05, -0.28]} material={bodyMat}>
            <sphereGeometry args={[0.32, 9, 8]} />
          </mesh>
          {/* Céphalothorax (avant). */}
          <mesh position={[0, 0, 0.12]} material={bodyMat}>
            <sphereGeometry args={[0.22, 8, 7]} />
          </mesh>
          {/* Chélicères (crochets) + grappe d'yeux à l'avant. */}
          <mesh position={[0, -0.06, 0.32]} material={legMat}>
            <coneGeometry args={[0.1, 0.16, 5]} />
          </mesh>
          {[[-0.08, 0.06], [0.08, 0.06], [-0.13, 0.0], [0.13, 0.0]].map(([x, y], i) => (
            <mesh key={i} position={[x, 0.06 + y, 0.3]} material={eyeMat}>
              <sphereGeometry args={[0.03, 5, 4]} />
            </mesh>
          ))}

          {/* 6 pattes (groupes, pivot au corps, scuttle). */}
          {LEGS.map((leg, i) => (
            <group
              key={i}
              ref={(el) => { legRefs.current[i] = el; }}
              position={[leg.x, 0.02, leg.z]}
              rotation={[0, 0, leg.sgn * 0.95]}
            >
              {/* fémur (vers l'extérieur) */}
              <mesh position={[leg.sgn * 0.18, -0.02, 0]} rotation={[0, 0, leg.sgn * -0.6]} material={legMat}>
                <capsuleGeometry args={[0.028, 0.34, 4, 5]} />
              </mesh>
              {/* tibia (vers le sol) */}
              <mesh position={[leg.sgn * 0.32, -0.22, 0]} material={legMat}>
                <capsuleGeometry args={[0.024, 0.34, 4, 5]} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
      {!isDead && <EnemyLabel name={spiderType.name} level={level} elite={elite} y={spiderType.height} hpFraction={hpFraction} />}
    </RigidBody>
  );
}

export { spiderType as spiderEnemyType };

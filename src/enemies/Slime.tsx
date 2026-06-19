import { useEffect, useMemo, useRef } from "react";
import { BallCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { spawnProjectile } from "../combat/projectileRegistry";
import { useEnemyAI, type EnemyProps } from "./useEnemyAI";
import { telegraphGlow } from "./rig";
import { EnemyLabel } from "./EnemyLabel";
import { scaledStats } from "./scaling";
import { ENEMY_TYPES } from "./enemyTypes";

// Slime — refait de zéro (Phase 3), épuré. Blob gélatineux translucide avec un
// noyau sombre visible à l'intérieur et deux yeux flottants. Pulse en continu,
// sautille en se déplaçant, GONFLE quand il charge son crachat (windup) et tout
// le corps rougeoie via telegraphGlow. Attaque à distance : crache de l'acide
// par le système de projectiles unifié (kind "acid").

const slimeType = ENEMY_TYPES.slime;
const SLIME_STOP_DIST = slimeType.stats.stopDistance;
const SLIME_MASS = slimeType.stats.mass;
// Blob bas et large → collider sphère posé au sol (pas la grande capsule héritée).
const SLIME_BALL_R = 0.4;     // rayon du collider sphère
const SLIME_GROUND_Y = 0.4;   // hauteur de repos = rayon (le bas touche le sol)

const PRIMARY_COLOR = new THREE.Color(slimeType.appearance.primaryColor as string);
const SECONDARY_COLOR = new THREE.Color(slimeType.appearance.secondaryColor as string);
const BASE_EMISSIVE = slimeType.appearance.emissiveIntensity || 0.3;

export function Slime({ spawn, index, level, elite }: EnemyProps) {
  const body = useRef<RapierRigidBody>(null);
  const corpseGroup = useRef<THREE.Group>(null);
  const blobRef = useRef<THREE.Mesh>(null);
  const eyesRef = useRef<THREE.Group>(null);
  const flashRef = useRef(0);
  const pulse = useRef(Math.random() * Math.PI * 2);

  const variant = useMemo(() => {
    let s = (Math.floor(Math.abs(spawn[0] * 131 + spawn[1] * 57)) % 9973) + 1;
    const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    return { scale: 0.9 + r() * 0.25, colorVariant: r(), pulseSpeed: 1.6 + r() * 0.8, bounce: 0.04 + r() * 0.04 };
  }, [spawn]);

  const slimeColor = useMemo(() => PRIMARY_COLOR.clone().lerp(SECONDARY_COLOR, variant.colorVariant), [variant.colorVariant]);
  const slimeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: slimeColor.clone(), emissive: slimeColor.clone(), emissiveIntensity: BASE_EMISSIVE, roughness: 0.35, transparent: true, opacity: 0.82 }),
    [slimeColor],
  );
  const coreMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: slimeColor.clone().multiplyScalar(0.45), roughness: 0.5 }),
    [slimeColor],
  );
  const eyeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.3 }), []);

  const stats = useMemo(() => scaledStats(slimeType, level, elite), [level, elite]);
  const { looted, isDead, hpFraction } = useEnemyAI({
    spawn,
    index,
    body,
    corpseGroup,
    stats,
    knockback: { xz: 2, y: 2.5 }, // rebondit fort quand frappé
    lootLevel: level + (slimeType.stats.lootTier - 1),
    minAttackDist: 1.5, // ne crache pas au contact
    onAttack: (nx, nz) => {
      const t = body.current?.translation();
      if (!t) return;
      spawnProjectile({ kind: "acid", pos: { x: t.x, y: t.y + 0.4, z: t.z }, dir: { x: nx, y: 0, z: nz }, dmg: stats.attackDmg });
    },
    onFlash: (f) => {
      flashRef.current = f;
      slimeMat.emissiveIntensity = f * 0.8 + (looted ? 0 : BASE_EMISSIVE);
    },
    // Mort : s'aplatit et s'étale.
    onDeath: (g, e) => {
      g.scale.set(1 + e * 0.7, 1 - e * slimeType.animations.deathSquash, 1 + e * 0.7);
      g.position.y = -e * 0.3;
    },
    onAnimate: ({ dt, dist, wind, flinch, phase }) => {
      // Pulsation continue + gonflement de charge (windup) + squish au flinch.
      pulse.current += dt * variant.pulseSpeed;
      const p = Math.sin(pulse.current) * 0.05;
      const swell = wind * 0.22 - flinch * 0.16;
      if (blobRef.current) {
        blobRef.current.scale.set(1 + p * 0.4 + swell * 0.6, 0.82 - p * 0.5 - swell * 0.25, 1 + p * 0.4 + swell * 0.6);
      }
      // Sautillement en se déplaçant.
      if (corpseGroup.current) {
        corpseGroup.current.position.y = dist > SLIME_STOP_DIST ? Math.abs(Math.sin(phase * 1.5)) * variant.bounce : 0;
      }
      // Yeux qui flottent légèrement.
      if (eyesRef.current) eyesRef.current.position.y = 0.16 + Math.sin(pulse.current * 0.7) * 0.02;
      telegraphGlow(slimeMat, flashRef.current, wind, slimeColor, looted ? 0 : BASE_EMISSIVE, 0.8);
    },
  });

  useEffect(() => {
    const k = looted ? 0.45 : 1;
    slimeMat.color.copy(slimeColor).multiplyScalar(k);
    coreMat.color.copy(slimeColor).multiplyScalar(0.45 * k);
    slimeMat.emissiveIntensity = looted ? 0 : BASE_EMISSIVE;
  }, [looted, slimeColor, slimeMat, coreMat]);

  return (
    <RigidBody
      ref={body}
      colliders={false}
      type="dynamic"
      canSleep={false}
      enabledRotations={[false, false, false]}
      position={[spawn[0], SLIME_GROUND_Y, spawn[1]]}
    >
      {/* Masse explicite : sinon elle dériverait du volume (petite sphère = très
          léger) et le knockback l'enverrait voler. */}
      <BallCollider args={[SLIME_BALL_R]} mass={SLIME_MASS} />
      <group ref={corpseGroup} scale={variant.scale * slimeType.scale}>
        {/* Corps gélatineux translucide (squashé). */}
        <mesh ref={blobRef} scale={[1, 0.82, 1]} material={slimeMat}>
          <sphereGeometry args={[0.5, 14, 11]} />
        </mesh>
        {/* Noyau sombre visible à travers le corps. */}
        <mesh position={[0, -0.08, 0]} material={coreMat}>
          <sphereGeometry args={[0.2, 8, 7]} />
        </mesh>
        {/* Deux yeux flottants à l'avant (+Z). */}
        <group ref={eyesRef} position={[0, 0.16, 0.34]}>
          <mesh position={[-0.13, 0, 0]} material={eyeMat}>
            <sphereGeometry args={[0.07, 7, 6]} />
          </mesh>
          <mesh position={[0.13, 0, 0]} material={eyeMat}>
            <sphereGeometry args={[0.07, 7, 6]} />
          </mesh>
        </group>
      </group>
      {!isDead && <EnemyLabel name={slimeType.name} level={level} elite={elite} y={slimeType.height} hpFraction={hpFraction} />}
    </RigidBody>
  );
}

export { slimeType as slimeEnemyType };

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { BallCollider, CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { playerPos } from "../combat/playerState";
import { damagePlayer } from "../combat/playerCombat";
import { useEnemyAI, type EnemyProps } from "./useEnemyAI";
import { EnemyLabel } from "./EnemyLabel";
import { scaledStats } from "./scaling";
import { ENEMY_TYPES } from "./enemyTypes";

// Configuration spécifique au Slime
const slimeType = ENEMY_TYPES.slime;

// Stats de combat → scaledStats(type, level). On garde le fixe (collider, masse) +
// la distance d'arrêt (utilisée dans l'animation de rebond), indépendants du niveau.
const SLIME_STOP_DIST = slimeType.stats.stopDistance;
const SLIME_MASS = slimeType.stats.mass;
const SLIME_COLLIDER_RADIUS = slimeType.stats.colliderRadius;
const SLIME_COLLIDER_HEIGHT = slimeType.stats.colliderHeight;

// Couleurs du slime
const PRIMARY_COLOR = new THREE.Color(slimeType.appearance.primaryColor as string);
const SECONDARY_COLOR = new THREE.Color(slimeType.appearance.secondaryColor as string);
const ACCENT_COLOR = new THREE.Color(slimeType.appearance.accentColor as string);

// Composant Projectile pour l'acide — RigidBody Rapier pour collisions avec les murs
function AcidProjectile({
  position,
  direction,
  dmg,
  onHit
}: {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  dmg: number;
  onHit: () => void
}) {
  const projectileRef = useRef<RapierRigidBody>(null);
  const [alive, setAlive] = useState(true);
  const speed = 8;
  const lifetime = useRef(0);

  useEffect(() => {
    if (!projectileRef.current) return;
    const vel = direction.clone().normalize().multiplyScalar(speed);
    projectileRef.current.setLinvel({ x: vel.x, y: vel.y, z: vel.z }, true);
  }, []);

  useFrame((_, dt) => {
    if (!alive || !projectileRef.current) return;

    lifetime.current += dt;
    if (lifetime.current > 3) {
      setAlive(false);
      return;
    }

    const t = projectileRef.current.translation();
    const distToPlayer = new THREE.Vector3(
      playerPos.x - t.x,
      0,
      playerPos.z - t.z
    ).length();

    if (distToPlayer < 0.5) {
      damagePlayer(dmg);
      onHit();
      setAlive(false);
    }
  });

  if (!alive) return null;

  return (
    <RigidBody
      ref={projectileRef}
      type="dynamic"
      colliders={false}
      gravityScale={0}
      position={[position.x, position.y, position.z]}
    >
      <BallCollider args={[0.08]} />
      <mesh>
        <sphereGeometry args={[0.08, 6, 5]} />
        <meshStandardMaterial
          color={ACCENT_COLOR}
          emissive={ACCENT_COLOR}
          emissiveIntensity={1.5}
          roughness={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>
    </RigidBody>
  );
}

export function Slime({ spawn, index, level, elite }: EnemyProps) {
  const body = useRef<RapierRigidBody>(null);
  const mainMeshRef = useRef<THREE.Mesh>(null);
  const corpseGroup = useRef<THREE.Group>(null);
  const eyeGroupRef = useRef<THREE.Group>(null);
  
  const pulsePhase = useRef(Math.random() * Math.PI * 2);

  // Projectiles actifs (chacun porte ses dégâts scalés au moment du tir)
  const [projectiles, setProjectiles] = useState<{
    position: THREE.Vector3;
    direction: THREE.Vector3;
    dmg: number;
    id: number;
  }[]>([]);

  // Variation visuelle
  const variant = useMemo(() => {
    let s = (Math.floor(Math.abs(spawn[0] * 131 + spawn[1] * 57)) % 9973) + 1;
    const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    return { 
      scale: 0.9 + r() * 0.2, 
      colorVariant: r(),
      hasEyes: r() > 0.3,
      eyeSize: 0.08 + r() * 0.06,
      pulseSpeed: 0.8 + r() * 0.4,
      bounceAmplitude: 0.03 + r() * 0.03
    };
  }, [spawn]);

  // Couleur principale avec variation
  const slimeColor = useMemo(() => {
    return PRIMARY_COLOR.clone().lerp(SECONDARY_COLOR, variant.colorVariant);
  }, [variant.colorVariant]);

  // Couleur plus foncée pour les détails
  const darkSlimeColor = useMemo(() => {
    return slimeColor.clone().multiplyScalar(0.6);
  }, [slimeColor]);

  // Gestion des projectiles
  const addProjectile = (startPos: THREE.Vector3, dir: THREE.Vector3, dmg: number) => {
    const newProjectile = {
      position: new THREE.Vector3(startPos.x, startPos.y + 0.5, startPos.z),
      direction: dir.clone().normalize(),
      dmg,
      id: Date.now()
    };
    setProjectiles(prev => [...prev, newProjectile]);
    
    // Retirer après 3 secondes
    setTimeout(() => {
      setProjectiles(prev => prev.filter(p => p.id !== newProjectile.id));
    }, 3000);
  };

  const removeProjectile = (id: number) => {
    setProjectiles(prev => prev.filter(p => p.id !== id));
  };

  const stats = useMemo(() => scaledStats(slimeType, level), [level]);
  const { looted, isDead } = useEnemyAI({
    spawn,
    index,
    body,
    corpseGroup,
    stats,
    // Le slime rebondit fort quand il est frappé.
    knockback: { xz: 2, y: 2.5 },
    lootLevel: level + (slimeType.stats.lootTier - 1),
    // Attaque à distance : ne crache pas au contact (rester au-delà de 1.5).
    minAttackDist: 1.5,
    onAttack: (nx, nz) => {
      const t = body.current?.translation();
      if (!t) return;
      addProjectile(new THREE.Vector3(t.x, t.y, t.z), new THREE.Vector3(nx, 0, nz), stats.attackDmg);
    },
    onFlash: (f) => {
      if (mainMeshRef.current) {
        const m = mainMeshRef.current.material as THREE.MeshStandardMaterial;
        m.emissiveIntensity = f * 0.8 + (looted ? 0 : slimeType.appearance.emissiveIntensity || 0);
      }
    },
    // Mort : le slime s'aplatit et s'étale en largeur.
    onDeath: (g, e) => {
      g.scale.set(1 + e * 0.8, 1 - e * slimeType.animations.deathSquash, 1 + e * 0.8);
      g.position.y = -e * 0.3;
    },
    onAnimate: ({ dt, dist }) => {
      // Pulsation (le slime gonfle/dégonfle en permanence).
      pulsePhase.current += dt * variant.pulseSpeed;
      const pulse = Math.sin(pulsePhase.current) * 0.05;
      if (mainMeshRef.current) {
        mainMeshRef.current.scale.set(1 + pulse * 0.5, 1 + pulse, 1 + pulse * 0.5);
      }
      // Rebond en marchant.
      if (dist > SLIME_STOP_DIST && corpseGroup.current) {
        corpseGroup.current.position.y = Math.sin(Date.now() * 0.003) * variant.bounceAmplitude;
      }
      // Yeux qui flottent légèrement.
      if (eyeGroupRef.current && variant.hasEyes) {
        eyeGroupRef.current.position.y = 0.15 + Math.sin(Date.now() * 0.002) * 0.02;
      }
    },
  });

  return (
    <>
      <RigidBody
        ref={body}
        colliders={false}
        type="dynamic"
        mass={SLIME_MASS}
        canSleep={false}
        enabledRotations={[false, false, false]}
        position={[spawn[0], slimeType.colliderOffsetY, spawn[1]]}
      >
        <CapsuleCollider args={[SLIME_COLLIDER_RADIUS, SLIME_COLLIDER_HEIGHT]} />
        <group ref={corpseGroup} scale={variant.scale * slimeType.scale}>
          {/* Corps principal - sphère déformée */}
          <mesh ref={mainMeshRef}>
            <sphereGeometry args={[0.5, 16, 12]} />
            <meshStandardMaterial 
              color={slimeColor} 
              roughness={slimeType.appearance.roughness} 
              flatShading={slimeType.appearance.flatShading}
              emissive={slimeColor}
              emissiveIntensity={looted ? 0 : (slimeType.appearance.emissiveIntensity || 0)}
            />
          </mesh>

          {/* Bouche/sourire */}
          <mesh position={[0, -0.15, 0.35]} rotation={[0.5, 0, 0]}>
            <torusGeometry args={[0.25, 0.03, 8, 12, Math.PI]} />
            <meshStandardMaterial color={darkSlimeColor} roughness={1} flatShading />
          </mesh>

          {/* Yeux (si présents) */}
          {variant.hasEyes && (
            <group ref={eyeGroupRef}>
              <mesh position={[-0.18, 0.2, 0.4]}>
                <sphereGeometry args={[variant.eyeSize, 8, 6]} />
                <meshStandardMaterial 
                  color="#ffffff" 
                  roughness={0.7} 
                  flatShading
                />
              </mesh>
              <mesh position={[0.18, 0.2, 0.4]}>
                <sphereGeometry args={[variant.eyeSize, 8, 6]} />
                <meshStandardMaterial 
                  color="#ffffff" 
                  roughness={0.7} 
                  flatShading
                />
              </mesh>
              {/* Pupilles */}
              <mesh position={[-0.18, 0.2, 0.45]}>
                <sphereGeometry args={[variant.eyeSize * 0.4, 6, 4]} />
                <meshStandardMaterial 
                  color="#000000" 
                  roughness={1} 
                  flatShading
                />
              </mesh>
              <mesh position={[0.18, 0.2, 0.45]}>
                <sphereGeometry args={[variant.eyeSize * 0.4, 6, 4]} />
                <meshStandardMaterial 
                  color="#000000" 
                  roughness={1} 
                  flatShading
                />
              </mesh>
            </group>
          )}

          {/* Reflets sur le corps */}
          <mesh position={[0, 0.3, 0.2]} rotation={[0.3, 0, 0]}>
            <sphereGeometry args={[0.12, 6, 4]} />
            <meshStandardMaterial 
              color={ACCENT_COLOR} 
              roughness={0.5} 
              metalness={0.3}
              transparent
              opacity={0.4}
            />
          </mesh>
          <mesh position={[-0.2, -0.1, 0.1]} rotation={[0.2, 0, Math.PI / 4]}>
            <sphereGeometry args={[0.08, 5, 4]} />
            <meshStandardMaterial 
              color={ACCENT_COLOR} 
              roughness={0.5} 
              metalness={0.3}
              transparent
              opacity={0.3}
            />
          </mesh>
        </group>
        {!isDead && <EnemyLabel name={slimeType.name} level={level} elite={elite} y={slimeType.height} />}
      </RigidBody>

      {/* Projectiles d'acide */}
      {projectiles.map((p) => (
        <AcidProjectile
          key={p.id}
          position={p.position}
          direction={p.direction}
          dmg={p.dmg}
          onHit={() => removeProjectile(p.id)}
        />
      ))}
    </>
  );
}

export { slimeType as slimeEnemyType };

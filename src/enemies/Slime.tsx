import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { playerPos } from "../combat/playerState";
import { damagePlayer } from "../combat/playerCombat";
import { useEnemyAI } from "./useEnemyAI";
import { ENEMY_TYPES } from "./enemyTypes";

// Configuration spécifique au Slime
const slimeType = ENEMY_TYPES.slime;

const SLIME_SPEED = slimeType.stats.speed;
const SLIME_STOP_DIST = slimeType.stats.stopDistance;
const SLIME_HP = slimeType.stats.hp;
const SLIME_ATTACK_DIST = slimeType.stats.attackRange;
const SLIME_ATTACK_CD = slimeType.stats.attackCooldown;
const SLIME_ATTACK_DMG = slimeType.stats.attackDamage;
const SLIME_MASS = slimeType.stats.mass;
const SLIME_COLLIDER_RADIUS = slimeType.stats.colliderRadius;
const SLIME_COLLIDER_HEIGHT = slimeType.stats.colliderHeight;

// Couleurs du slime
const PRIMARY_COLOR = new THREE.Color(slimeType.appearance.primaryColor as string);
const SECONDARY_COLOR = new THREE.Color(slimeType.appearance.secondaryColor as string);
const ACCENT_COLOR = new THREE.Color(slimeType.appearance.accentColor as string);

// Composant Projectile pour l'acide
function AcidProjectile({ 
  position, 
  direction, 
  onHit 
}: { 
  position: THREE.Vector3; 
  direction: THREE.Vector3; 
  onHit: () => void 
}) {
  const projectileRef = useRef<THREE.Mesh>(null);
  const [alive, setAlive] = useState(true);
  const speed = 8;
  const lifetime = useRef(0);
  
  useFrame((_, dt) => {
    if (!alive || !projectileRef.current) return;
    
    lifetime.current += dt;
    if (lifetime.current > 3) {
      setAlive(false);
      return;
    }
    
    const p = projectileRef.current.position;
    p.add(direction.clone().multiplyScalar(speed * dt));
    
    // Vérifier collision avec le joueur (simplifié)
    const distToPlayer = new THREE.Vector3(
      playerPos.x - p.x,
      0,
      playerPos.z - p.z
    ).length();
    
    if (distToPlayer < 0.5) {
      damagePlayer(SLIME_ATTACK_DMG);
      onHit();
      setAlive(false);
    }
  });
  
  if (!alive) return null;
  
  return (
    <mesh ref={projectileRef} position={[position.x, position.y, position.z]}>
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
  );
}

export function Slime({ spawn, index }: { spawn: [number, number]; index: number }) {
  const body = useRef<RapierRigidBody>(null);
  const mainMeshRef = useRef<THREE.Mesh>(null);
  const corpseGroup = useRef<THREE.Group>(null);
  const eyeGroupRef = useRef<THREE.Group>(null);
  
  const pulsePhase = useRef(Math.random() * Math.PI * 2);

  // Projectiles actifs
  const [projectiles, setProjectiles] = useState<{
    position: THREE.Vector3;
    direction: THREE.Vector3;
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
  const addProjectile = (startPos: THREE.Vector3, dir: THREE.Vector3) => {
    const newProjectile = {
      position: new THREE.Vector3(startPos.x, startPos.y + 0.5, startPos.z),
      direction: dir.clone().normalize(),
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

  const { looted } = useEnemyAI({
    spawn,
    index,
    body,
    corpseGroup,
    stats: {
      hp: SLIME_HP,
      speed: SLIME_SPEED,
      stopDist: SLIME_STOP_DIST,
      attackDist: SLIME_ATTACK_DIST,
      attackCd: SLIME_ATTACK_CD,
      attackDmg: SLIME_ATTACK_DMG,
      armor: slimeType.stats.armor,
      walkSpeed: slimeType.animations.walkSpeed,
      attackAnimSpeed: slimeType.animations.attackAnimSpeed,
      deathSpeed: slimeType.animations.deathSpeed,
    },
    // Le slime rebondit fort quand il est frappé.
    knockback: { xz: 2, y: 2.5 },
    // Attaque à distance : ne crache pas au contact (rester au-delà de 1.5).
    minAttackDist: 1.5,
    onAttack: (nx, nz) => {
      const t = body.current?.translation();
      if (!t) return;
      addProjectile(new THREE.Vector3(t.x, t.y, t.z), new THREE.Vector3(nx, 0, nz));
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
        const t = body.current?.translation();
        if (t) corpseGroup.current.position.y = t.y + Math.sin(Date.now() * 0.003) * variant.bounceAmplitude;
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
      </RigidBody>
      
      {/* Projectiles d'acide */}
      {projectiles.map((p) => (
        <AcidProjectile
          key={p.id}
          position={p.position}
          direction={p.direction}
          onHit={() => removeProjectile(p.id)}
        />
      ))}
    </>
  );
}

export { slimeType as slimeEnemyType };

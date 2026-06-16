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
  
  const hp = useRef(SLIME_HP);
  const dead = useRef(false);
  const deathT = useRef(0);
  const flash = useRef(0);
  const atkCd = useRef(0);
  const pulsePhase = useRef(Math.random() * Math.PI * 2);
  const [looted, setLooted] = useState(false);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  
  const pendingHits = useRef<{ dx: number; dz: number; dmg: number }[]>([]);
  const handleRef = useRef<EnemyHandle | null>(null);
  const corpseHandleRef = useRef<CorpseHandle | null>(null);
  
  // Projectiles actifs
  const [projectiles, setProjectiles] = useState<{
    position: THREE.Vector3;
    direction: THREE.Vector3;
    id: number;
  }[]>([]);

  // Seed de loot
  const lootSeed = useRef(
    (((Math.round(spawn[0] * 100) * 73856093) ^ (Math.round(spawn[1] * 100) * 19349663) ^ (index * 83492791)) >>> 0) % 0xffffff
  );
  
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

  useEffect(() => {
    const handle: EnemyHandle = {
      getPosition: (out) => {
        const t = body.current?.translation();
        return t ? out.set(t.x, t.y, t.z) : out;
      },
      hit: (dx, dz, dmg) => {
        if (dead.current) return;
        pendingHits.current.push({ dx, dz, dmg: dmg * (1 - slimeType.stats.armor) });
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
    if (mainMeshRef.current) {
      flash.current = Math.max(0, flash.current - dt * 4);
      const mat = mainMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = flash.current * 0.8 + (looted ? 0 : slimeType.appearance.emissiveIntensity || 0);
    }

    // Application des coups
    while (pendingHits.current.length > 0 && !dead.current) {
      const h = pendingHits.current.shift()!;
      hp.current -= h.dmg;
      flash.current = 1;
      // Le slime rebondit quand il est frappé
      b.applyImpulse({ x: h.dx * 2, y: 2.5, z: h.dz * 2 }, true);
      if (hp.current <= 0) die();
    }

    // Mort - éclate et s'aplatit
    if (dead.current) {
      const g = corpseGroup.current;
      if (g) {
        deathT.current = Math.min(1, deathT.current + dt * slimeType.animations.deathSpeed);
        const e = deathT.current;
        // Le slime s'aplatit et grandit en largeur
        g.scale.set(1 + e * 0.8, 1 - e * slimeType.animations.deathSquash, 1 + e * 0.8);
        g.position.y = -e * 0.3;
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
    if (d > SLIME_STOP_DIST) {
      tmp.normalize().multiplyScalar(SLIME_SPEED);
      b.setLinvel({ x: tmp.x, y: v.y, z: tmp.z }, true);
    } else {
      b.setLinvel({ x: 0, y: v.y, z: 0 }, true);
    }

    // Attaque à distance - crache de l'acide
    atkCd.current -= dt;
    if (d <= SLIME_ATTACK_DIST && d > 1.5 && atkCd.current <= 0) {
      // Calculer la direction vers le joueur
      const dir = new THREE.Vector3(playerPos.x - t.x, 0, playerPos.z - t.z).normalize();
      addProjectile(new THREE.Vector3(t.x, t.y, t.z), dir);
      atkCd.current = SLIME_ATTACK_CD;
    }

    // Animation de pulsation (le slime gonfle/dégonfle)
    pulsePhase.current += dt * variant.pulseSpeed;
    const pulse = Math.sin(pulsePhase.current) * 0.05;
    
    if (mainMeshRef.current) {
      mainMeshRef.current.scale.set(
        1 + pulse * 0.5,
        1 + pulse,
        1 + pulse * 0.5
      );
    }

    // Animation de rebond en marchant
    const isMoving = d > SLIME_STOP_DIST;
    if (isMoving) {
      const bounce = Math.sin(Date.now() * 0.003) * variant.bounceAmplitude;
      if (corpseGroup.current) {
        corpseGroup.current.position.y = t.y + bounce;
      }
    }

    // Animation des yeux (si présents)
    if (eyeGroupRef.current && variant.hasEyes) {
      eyeGroupRef.current.position.y = 0.15 + Math.sin(Date.now() * 0.002) * 0.02;
    }
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

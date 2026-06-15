import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { enemyRegistry, type EnemyHandle } from "../combat/enemyRegistry";
import { playerPos } from "../combat/playerState";
import { damagePlayer } from "../combat/playerCombat";

// Ennemi "poursuiveur" (cf. GDD §5) : capsule dynamique Rapier qui avance vers le
// joueur (lent et lisible). 3 PV. Flash + recul au coup, petite chute à la mort.

const SPEED = 1.8;
const STOP_DIST = 1.3;
const HP = 3;
const ATTACK_DIST = 1.7;
const ATTACK_CD = 1; // secondes entre deux coups
const ATTACK_DMG = 8;

export function Enemy({ spawn }: { spawn: [number, number] }) {
  const body = useRef<RapierRigidBody>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const hp = useRef(HP);
  const dead = useRef(false);
  const flash = useRef(0);
  const atkCd = useRef(0);
  const [removed, setRemoved] = useState(false);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const handle: EnemyHandle = {
      getPosition: (out) => {
        const t = body.current?.translation();
        return t ? out.set(t.x, t.y, t.z) : out;
      },
      hit: (dx, dz, dmg) => {
        if (dead.current) return;
        hp.current -= dmg;
        flash.current = 1;
        const b = body.current;
        b?.applyImpulse({ x: dx * 4, y: 1.2, z: dz * 4 }, true);
        if (hp.current <= 0) {
          dead.current = true;
          if (b) {
            b.setEnabledRotations(true, true, true, true);
            b.applyTorqueImpulse({ x: dx * 2.5, y: 0, z: dz * 2.5 }, true);
          }
          setTimeout(() => setRemoved(true), 1500);
        }
      },
    };
    enemyRegistry.add(handle);
    return () => {
      enemyRegistry.delete(handle);
    };
  }, []);

  useFrame((_, dt) => {
    const b = body.current;
    if (!b) return;

    // Décroissance du flash de coup.
    if (mat.current) {
      flash.current = Math.max(0, flash.current - dt * 4);
      mat.current.emissive.setScalar(flash.current * 0.9);
    }
    if (dead.current) return;

    // Poursuite sur le plan XZ.
    const t = b.translation();
    tmp.set(playerPos.x - t.x, 0, playerPos.z - t.z);
    const d = tmp.length();
    const v = b.linvel();
    if (d > STOP_DIST) {
      tmp.normalize().multiplyScalar(SPEED);
      b.setLinvel({ x: tmp.x, y: v.y, z: tmp.z }, true);
    } else {
      b.setLinvel({ x: 0, y: v.y, z: 0 }, true);
    }

    // Attaque au contact, sur cooldown.
    atkCd.current -= dt;
    if (d <= ATTACK_DIST && atkCd.current <= 0) {
      damagePlayer(ATTACK_DMG);
      atkCd.current = ATTACK_CD;
      flash.current = 1; // petit flash de l'ennemi qui frappe
    }
  });

  if (removed) return null;
  return (
    <RigidBody
      ref={body}
      colliders={false}
      type="dynamic"
      mass={1}
      canSleep={false}
      enabledRotations={[false, false, false]}
      position={[spawn[0], 0.9, spawn[1]]}
    >
      <CapsuleCollider args={[0.5, 0.4]} />
      <mesh>
        <capsuleGeometry args={[0.4, 1, 4, 8]} />
        <meshStandardMaterial ref={mat} color="#6a2b2b" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <sphereGeometry args={[0.28, 8, 6]} />
        <meshStandardMaterial color="#4a1f1f" roughness={1} flatShading />
      </mesh>
    </RigidBody>
  );
}

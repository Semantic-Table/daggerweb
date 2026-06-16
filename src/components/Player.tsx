import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { playerPos } from "../combat/playerState";
import { gameState } from "../combat/gameState";
import {
  moveMult,
  regenStamina,
  canRun,
  useStamina,
  encumbranceMult,
  maxStamina,
} from "../combat/character";
import { getTotalWeight } from "../combat/inventory";
import { PLAYER_WALK, PLAYER_RUN, PLAYER_EYE, RUN_STAMINA_COST } from "../config";

// Joueur FPS : capsule DYNAMIQUE pilotée par Rapier (gravité + collisions réelles).
// On lit les touches, on impose la vitesse horizontale, et la caméra suit le corps.

export function Player({ spawn }: { spawn: [number, number, number] }) {
  const body = useRef<RapierRigidBody>(null);
  const { camera } = useThree();
  const [, get] = useKeyboardControls();

  const fwd = useRef(new THREE.Vector3()).current;
  const right = useRef(new THREE.Vector3()).current;
  const dir = useRef(new THREE.Vector3()).current;

  useFrame((_, dt) => {
    const b = body.current;
    if (!b) return;

    // Menu bloquant ouvert : physique gelée (<Physics paused>), on ignore les
    // entrées et on annule la vélocité par sécurité, sans bouger la caméra.
    if (gameState.paused) {
      b.setLinvel({ x: 0, y: 0, z: 0 }, false);
      return;
    }

    // ========================================================================
    // Vigueur (Fatigue) - Phase 4
    // ========================================================================
    // 1. Régénération passive de la vigueur
    regenStamina(dt);

    // 2. Coût de la course (si on court ET qu'on a assez de vigueur)
    const { forward, back, left, right: rk, run } = get();
    const isMoving = forward || back || left || rk;
    
    // En courant : coût de vigueur par frame
    if (run && isMoving && canRun()) {
      // Coût proportionnel au temps écoulé
      const staminaCost = RUN_STAMINA_COST * dt;
      if (!useStamina(staminaCost * maxStamina())) {
        // Plus assez de vigueur pour courir
        return;
      }
    }

    // ========================================================================
    // Déplacement
    // ========================================================================
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    right.crossVectors(fwd, camera.up).normalize();

    const wx = (rk ? 1 : 0) - (left ? 1 : 0);
    const wz = (forward ? 1 : 0) - (back ? 1 : 0);
    dir.set(0, 0, 0).addScaledVector(right, wx).addScaledVector(fwd, wz);
    if (dir.lengthSq() > 0) dir.normalize();

    // Vitesse de base modifiée par l'attribut VIT
    const baseSpeed = run && canRun() ? PLAYER_RUN : PLAYER_WALK;
    
    // Malus d'encombrement si trop chargé
    const currentWeight = getTotalWeight();
    const encumbrance = encumbranceMult(currentWeight);
    
    const speed = baseSpeed * moveMult() * encumbrance;
    const v = b.linvel();
    b.setLinvel({ x: dir.x * speed, y: v.y, z: dir.z * speed }, true);

    const t = b.translation();
    camera.position.set(t.x, t.y + PLAYER_EYE, t.z);
    playerPos.copy(camera.position);
  });

  return (
    <RigidBody
      ref={body}
      colliders={false}
      type="dynamic"
      mass={1}
      canSleep={false}
      enabledRotations={[false, false, false]}
      position={[spawn[0], spawn[1] - PLAYER_EYE, spawn[2]]}
    >
      <CapsuleCollider args={[0.6, 0.4]} />
    </RigidBody>
  );
}

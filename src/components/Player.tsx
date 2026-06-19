import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { playerPos, playerForward } from "../combat/playerState";
import { gameState } from "../combat/gameState";
import {
  moveMult,
  regenStamina,
  canRun,
  useStamina,
  encumbranceMult,
} from "../combat/character";
import { playerDefense, endGuard } from "../combat/playerDefense";
import { damagePlayer } from "../combat/playerCombat";
import { tickPoison, clearPoison } from "../combat/playerStatus";
import { getTotalWeight } from "../combat/inventory";
import { gainMovementXp, movementBonus } from "../combat/skills";
import { PLAYER_WALK, PLAYER_RUN, PLAYER_EYE, RUN_STAMINA_COST, JUMP_FORCE, GUARD_DRAIN } from "../config";

// Joueur FPS : capsule DYNAMIQUE pilotée par Rapier (gravité + collisions réelles).
// On lit les touches, on impose la vitesse horizontale, et la caméra suit le corps.

export function Player({ spawn }: { spawn: [number, number, number] }) {
  const body = useRef<RapierRigidBody>(null);
  const { camera } = useThree();
  const [, get] = useKeyboardControls();

  const fwd = useRef(new THREE.Vector3()).current;
  const right = useRef(new THREE.Vector3()).current;
  const dir = useRef(new THREE.Vector3()).current;
  const bobPhase = useRef(0);
  const wasJumpDown = useRef(false);

  // Purge le poison à l'apparition (nouveau monde / respawn : Player est keyé par monde).
  useEffect(() => { clearPoison(); }, []);

  useFrame((_, dt) => {
    const b = body.current;
    if (!b) return;

    // Menu bloquant ouvert : physique gelée (<Physics paused>), on ignore les
    // entrées et on annule la vélocité par sécurité, sans bouger la caméra.
    if (gameState.paused) {
      b.setLinvel({ x: 0, y: 0, z: 0 }, false);
      return;
    }

    // Poison (DoT) : tick éventuel cette frame, via le canal de dégâts normal.
    const poisonDmg = tickPoison(dt);
    if (poisonDmg > 0) damagePlayer(poisonDmg);

    // ========================================================================
    // Vigueur (Fatigue) - Phase 4
    // ========================================================================
    // 1. Régénération passive — SAUF en garde : maintenir la garde fatigue, et
    //    la jauge vide fait tomber la garde (cf. combat télégraphié).
    if (playerDefense.guarding) {
      if (!useStamina(GUARD_DRAIN * dt)) endGuard();
    } else {
      regenStamina(dt);
    }

    // 2. Coût de la course (si on court ET qu'on a assez de vigueur)
    const { forward, back, left, right: rk, run, jump } = get() as { forward: boolean; back: boolean; left: boolean; right: boolean; run: boolean; jump: boolean };
    const isMoving = forward || back || left || rk;
    
    // Bonus athlétisme (compétences de mouvement)
    const athlBonus = movementBonus("athletics");
    const jumpBonus = movementBonus("jumping");

    // En courant : coût de vigueur par frame (fraction de jauge, ∝ temps écoulé)
    const runCost = RUN_STAMINA_COST * athlBonus.staminaMult;
    if (run && isMoving && canRun()) {
      if (!useStamina(runCost * dt)) {
        // Plus assez de vigueur pour courir
        return;
      }
      gainMovementXp("athletics", dt * 1.5);
    }

    // ========================================================================
    // Déplacement
    // ========================================================================
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    // Regard projeté XZ : lu par combat/playerDefense (on ne pare/bloque que de face).
    playerForward.copy(fwd);
    right.crossVectors(fwd, camera.up).normalize();

    const wx = (rk ? 1 : 0) - (left ? 1 : 0);
    const wz = (forward ? 1 : 0) - (back ? 1 : 0);
    dir.set(0, 0, 0).addScaledVector(right, wx).addScaledVector(fwd, wz);
    if (dir.lengthSq() > 0) dir.normalize();

    // Vitesse de base modifiée par l'attribut VIT + compétence athlétisme
    const runSpeed = PLAYER_RUN * athlBonus.speedMult;
    const baseSpeed = run && canRun() ? runSpeed : PLAYER_WALK;

    // Malus d'encombrement si trop chargé
    const currentWeight = getTotalWeight();
    const encumbrance = encumbranceMult(currentWeight);

    const speed = baseSpeed * moveMult() * encumbrance;
    const v = b.linvel();

    // ========================================================================
    // Saut
    // ========================================================================
    const isGrounded = Math.abs(v.y) < 0.55;
    let vy = v.y;
    if (jump && !wasJumpDown.current && isGrounded) {
      vy = JUMP_FORCE * jumpBonus.jumpMult;
      gainMovementXp("jumping", 1);
    }
    wasJumpDown.current = jump;

    b.setLinvel({ x: dir.x * speed, y: vy, z: dir.z * speed }, true);

    const t = b.translation();

    // ========================================================================
    // View bobbing
    // ========================================================================
    const horizSq = dir.x * dir.x + dir.z * dir.z;
    if (isGrounded && horizSq > 0.01) {
      bobPhase.current += dt * speed * 1.8;
    }
    const bob = isGrounded ? Math.sin(bobPhase.current) * 0.034 : 0;

    camera.position.set(t.x, t.y + PLAYER_EYE + bob, t.z);
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

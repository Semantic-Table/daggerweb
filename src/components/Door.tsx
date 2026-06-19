import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { CELL, WALL_H } from "../gen/dungeonGen";
import { doorRegistry, type DoorHandle } from "../combat/doorRegistry";

// La porte occupe la moitié de la largeur du couloir et 2/3 de la hauteur.
// Le reste (côtés + dessus) est comblé par de la pierre — même matériau que les murs.
const DOOR_W  = CELL / 2;          // 2 u  (couloir = 4 u)
const DOOR_H  = WALL_H / 1.5;      // ~2.33 u  (mur = 3.5 u)
const DOOR_D  = 0.20;              // épaisseur du panneau
const FRAME_D = 0.36;              // profondeur de l'encadrement / remplissage
const SIDE_W  = (CELL - DOOR_W) / 2;          // 1 u de chaque côté
const TOP_H   = WALL_H - DOOR_H;              // ~1.17 u au-dessus de la porte

export function Door({ x, z, rot, wallColor = "#706865" }: {
  x: number;
  z: number;
  rot: number;
  wallColor?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hingeRef = useRef<THREE.Group>(null);
  const meshRef  = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;
    const handle: DoorHandle = {
      mesh: meshRef.current,
      open: false,
      markOpen: () => { handle.open = true; setIsOpen(true); },
    };
    doorRegistry.add(handle);
    return () => { doorRegistry.delete(handle); };
  }, []);

  useFrame(() => {
    if (!hingeRef.current) return;
    const target = isOpen ? -Math.PI / 2 : 0;
    const curr   = hingeRef.current.rotation.y;
    if (Math.abs(curr - target) > 0.001)
      hingeRef.current.rotation.y = THREE.MathUtils.lerp(curr, target, 0.14);
  });

  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>

      {/* ── Remplissage pierre : côtés + dessus (statiques, toujours présents) ── */}
      {/* Côté gauche */}
      <mesh position={[-(DOOR_W / 2 + SIDE_W / 2), WALL_H / 2, 0]}>
        <boxGeometry args={[SIDE_W, WALL_H, FRAME_D]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>
      {/* Côté droit */}
      <mesh position={[DOOR_W / 2 + SIDE_W / 2, WALL_H / 2, 0]}>
        <boxGeometry args={[SIDE_W, WALL_H, FRAME_D]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>
      {/* Dessus (au-dessus de la porte jusqu'au plafond) */}
      <mesh position={[0, DOOR_H + TOP_H / 2, 0]}>
        <boxGeometry args={[DOOR_W, TOP_H, FRAME_D]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>

      {/* ── Encadrement de la porte ── */}
      {/* Montant gauche */}
      <mesh position={[-DOOR_W / 2 - 0.09, DOOR_H / 2, 0]}>
        <boxGeometry args={[0.18, DOOR_H + 0.18, FRAME_D + 0.04]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>
      {/* Montant droit */}
      <mesh position={[DOOR_W / 2 + 0.09, DOOR_H / 2, 0]}>
        <boxGeometry args={[0.18, DOOR_H + 0.18, FRAME_D + 0.04]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>
      {/* Linteau */}
      <mesh position={[0, DOOR_H + 0.09, 0]}>
        <boxGeometry args={[DOOR_W + 0.36, 0.18, FRAME_D + 0.04]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>

      {/* ── Panneau de porte (pivot côté gauche) ── */}
      <group ref={hingeRef} position={[-DOOR_W / 2, 0, 0]}>
        <mesh ref={meshRef} position={[DOOR_W / 2, DOOR_H / 2, 0]} castShadow>
          <boxGeometry args={[DOOR_W - 0.06, DOOR_H - 0.06, DOOR_D]} />
          <meshStandardMaterial color="#6a4420" roughness={0.78} />
        </mesh>
        {/* Planche centrale décorative */}
        <mesh position={[DOOR_W / 2, DOOR_H * 0.4, DOOR_D / 2 + 0.01]}>
          <boxGeometry args={[DOOR_W - 0.18, 0.07, 0.03]} />
          <meshStandardMaterial color="#5a3a18" roughness={0.82} />
        </mesh>
        {/* Poignée */}
        <mesh position={[DOOR_W * 0.82, DOOR_H * 0.5, DOOR_D / 2 + 0.06]}>
          <sphereGeometry args={[0.06, 6, 6]} />
          <meshStandardMaterial color="#b08030" roughness={0.4} metalness={0.6} />
        </mesh>
      </group>

      {/* ── Colliders physiques ── */}
      {/* Remplissage côtés + dessus : toujours solides */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[SIDE_W / 2, WALL_H / 2, FRAME_D / 2]}
          position={[-(DOOR_W / 2 + SIDE_W / 2), WALL_H / 2, 0]}
        />
        <CuboidCollider
          args={[SIDE_W / 2, WALL_H / 2, FRAME_D / 2]}
          position={[DOOR_W / 2 + SIDE_W / 2, WALL_H / 2, 0]}
        />
        <CuboidCollider
          args={[DOOR_W / 2, TOP_H / 2, FRAME_D / 2]}
          position={[0, DOOR_H + TOP_H / 2, 0]}
        />
      </RigidBody>

      {/* Panneau de porte : retiré quand ouvert */}
      {!isOpen && (
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider
            args={[DOOR_W / 2, DOOR_H / 2, DOOR_D / 2]}
            position={[0, DOOR_H / 2, 0]}
          />
        </RigidBody>
      )}
    </group>
  );
}

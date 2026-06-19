import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Instance, Instances } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { CELL, WALL_H, type DungeonData, type ChestSpawn, type WallTorch } from "../gen/dungeonGen";
import {
  getWallAppearance,
  getFloorAppearance,
  getCeilingAppearance,
  type WallBlockType,
  type FloorBlockType,
  type CeilingBlockType,
} from "../gen/blockTypes";
import { chestRegistry, type ChestHandle } from "../combat/chestRegistry";
import { rollLoot } from "../items/itemDefs";
import { makeRng } from "../rng";

// ─── Coffre ──────────────────────────────────────────────────────────────────

// Offset du coffre depuis le centre de cellule vers le mur (en world units)
// Face intérieure du mur = CELL/2 - demi-épaisseur(0.2) = 1.8
// Coffre depth = 0.5 → centre à 1.8 - 0.25 - 0.05 (gap) = 1.5
const CHEST_WALL_OFFSET = CELL / 2 - 1;

function Chest({ chest, index, dungeonSeed, dungeonLevel }: {
  chest: ChestSpawn;
  index: number;
  dungeonSeed: number;
  dungeonLevel: number;
}) {
  const [opened, setOpened] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const lidGroupRef = useRef<THREE.Group>(null);

  // Position contre le mur (poussé dans la direction -nx/-nz depuis le centre de cellule)
  const wx = chest.x - chest.nx * CHEST_WALL_OFFSET;
  const wz = chest.z - chest.nz * CHEST_WALL_OFFSET;
  // Rotation : la face avant (+Z) du coffre pointe vers (nx, nz)
  const rotY = Math.atan2(-chest.nx, chest.nz);

  const loot = useMemo(() => {
    const rng = makeRng(dungeonSeed + index * 997 + 42);
    return rollLoot(rng, dungeonLevel);
  }, [dungeonSeed, index, dungeonLevel]);

  useEffect(() => {
    if (!meshRef.current) return;
    const handle: ChestHandle = {
      mesh: meshRef.current,
      loot,
      opened: false,
      markOpened: () => {
        handle.opened = true;
        setOpened(true);
      },
    };
    chestRegistry.add(handle);
    return () => { chestRegistry.delete(handle); };
  }, [loot]);

  useFrame(() => {
    if (!lidGroupRef.current) return;
    const target = opened ? -Math.PI * 0.7 : 0;
    const curr = lidGroupRef.current.rotation.x;
    if (Math.abs(curr - target) > 0.001) {
      lidGroupRef.current.rotation.x = THREE.MathUtils.lerp(curr, target, 0.12);
    }
  });

  return (
    <group position={[wx, 0, wz]} rotation={[0, rotY, 0]}>
      {/* Base du coffre */}
      <mesh ref={meshRef} position={[0, 0.22, 0]}>
        <boxGeometry args={[0.78, 0.44, 0.50]} />
        <meshStandardMaterial color={opened ? "#5a3818" : "#7a4c22"} roughness={0.9} />
      </mesh>
      {/* Ferrure avant */}
      <mesh position={[0, 0.22, 0.26]}>
        <boxGeometry args={[0.18, 0.10, 0.02]} />
        <meshStandardMaterial color="#b08030" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Couvercle — pivoté depuis l'arête arrière */}
      <group ref={lidGroupRef} position={[0, 0.44, -0.25]}>
        <mesh position={[0, 0.12, 0.25]}>
          <boxGeometry args={[0.80, 0.24, 0.52]} />
          <meshStandardMaterial color={opened ? "#5a3818" : "#7a4c22"} roughness={0.88} />
        </mesh>
      </group>
    </group>
  );
}

// ─── Torche murale ────────────────────────────────────────────────────────────

const TORCH_HEIGHT = 1.8;
const TORCH_OFFSET = 0.25; // offset depuis la face du mur vers l'intérieur

function WallTorchMesh({ t }: { t: WallTorch }) {
  const tx = t.x + t.nx * TORCH_OFFSET;
  const tz = t.z + t.nz * TORCH_OFFSET;
  // angle du manche (incliné vers le mur)
  const angleX = t.nz !== 0 ? Math.PI * 0.18 * t.nz : 0;
  const angleZ = t.nx !== 0 ? Math.PI * 0.18 * -t.nx : 0;

  return (
    <group position={[tx, TORCH_HEIGHT, tz]}>
      {/* Manche */}
      <mesh rotation={[angleX, 0, angleZ]}>
        <cylinderGeometry args={[0.03, 0.04, 0.28, 6]} />
        <meshStandardMaterial color="#6a4420" roughness={0.9} />
      </mesh>
      {/* Flamme (sphère émissive) */}
      <mesh position={[0.1, 0.15, 0]}>
        <sphereGeometry args={[0.05, 5, 5]} />
        <meshStandardMaterial
          color="#ff8820"
          emissive="#ff6600"
          emissiveIntensity={2.0}
          roughness={1.0}
        />
      </mesh>
      {/* Lumière ponctuelle */}
      <pointLight
        color="#ff9940"
        intensity={2.2}
        distance={9}
        decay={2}
      />
    </group>
  );
}

// ─── Dungeon principal ────────────────────────────────────────────────────────

export function Dungeon({ data }: { data: DungeonData }) {
  const half = (data.size * CELL) / 2;

  const wallAppearance = getWallAppearance(data.wallType as WallBlockType);
  const floorAppearance = getFloorAppearance(data.floorType as FloorBlockType);
  const ceilingAppearance = getCeilingAppearance(data.ceilingType as CeilingBlockType);

  return (
    <group>
      {/* Sol */}
      <Instances limit={data.floors.length}>
        <planeGeometry args={[CELL, CELL]} />
        <meshStandardMaterial
          color={floorAppearance.color}
          roughness={floorAppearance.roughness}
          metalness={floorAppearance.metalness ?? 0}
        />
        {data.floors.map(([x, z], i) => (
          <Instance key={i} position={[x, 0, z]} rotation={[-Math.PI / 2, 0, 0]} />
        ))}
      </Instances>

      {/* Plafond */}
      {data.ceilingType !== "none" && (
        <Instances limit={data.floors.length}>
          <planeGeometry args={[CELL, CELL]} />
          <meshStandardMaterial
            color={ceilingAppearance.color}
            roughness={ceilingAppearance.roughness}
            metalness={ceilingAppearance.metalness ?? 0}
          />
          {data.floors.map(([x, z], i) => (
            <Instance key={i} position={[x, WALL_H, z]} rotation={[Math.PI / 2, 0, 0]} />
          ))}
        </Instances>
      )}

      {/* Murs */}
      <Instances limit={data.panels.length}>
        <boxGeometry args={[CELL, WALL_H, 0.4]} />
        <meshStandardMaterial
          color={wallAppearance.color}
          roughness={wallAppearance.roughness}
          metalness={wallAppearance.metalness ?? 0}
        />
        {data.panels.map((p, i) => (
          <Instance key={i} position={[p.x, WALL_H / 2, p.z]} rotation={[0, p.rot, 0]} />
        ))}
      </Instances>

      {/* Piliers */}
      {data.pillars.length > 0 && (
        <>
          <Instances limit={data.pillars.length}>
            <boxGeometry args={[0.42, WALL_H, 0.42]} />
            <meshStandardMaterial
              color={wallAppearance.color}
              roughness={wallAppearance.roughness}
              metalness={wallAppearance.metalness ?? 0}
            />
            {data.pillars.map(([x, z], i) => (
              <Instance key={i} position={[x, WALL_H / 2, z]} />
            ))}
          </Instances>
          <RigidBody type="fixed" colliders={false}>
            {data.pillars.map(([x, z], i) => (
              <CuboidCollider key={i} args={[0.21, WALL_H / 2, 0.21]} position={[x, WALL_H / 2, z]} />
            ))}
          </RigidBody>
        </>
      )}

      {/* Torches murales */}
      {data.wallTorches.map((t, i) => (
        <WallTorchMesh key={i} t={t} />
      ))}

      {/* Coffres */}
      {data.chests.map((chest, i) => (
        <Chest
          key={i}
          chest={chest}
          index={i}
          dungeonSeed={data.seed}
          dungeonLevel={data.level}
        />
      ))}

      {/* Physique : murs + sol (+ plafond) */}
      <RigidBody type="fixed" colliders={false}>
        {data.panels.map((p, i) => (
          <CuboidCollider
            key={i}
            args={[CELL / 2, WALL_H / 2, 0.2]}
            position={[p.x, WALL_H / 2, p.z]}
            rotation={[0, p.rot, 0]}
          />
        ))}
        <CuboidCollider args={[half, 0.5, half]} position={[0, -0.5, 0]} />
        {data.ceilingType !== "none" && (
          <CuboidCollider args={[half, 0.5, half]} position={[0, WALL_H + 0.5, 0]} />
        )}
      </RigidBody>
    </group>
  );
}

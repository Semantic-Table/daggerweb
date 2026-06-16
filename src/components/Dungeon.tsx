import { Instance, Instances } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { CELL, WALL_H, type DungeonData } from "../gen/dungeonGen";
import type { EntranceKind } from "../gen/overworldGen";

// Palette visuelle selon le type d'entrée (keep = forteresse, crypt = tombeau froid, cave = roche brute).
const THEMES: Record<EntranceKind, { floor: string; ceiling: string; wall: string }> = {
  keep:  { floor: "#4f4538", ceiling: "#29251f", wall: "#5c523f" },
  crypt: { floor: "#353540", ceiling: "#1c1c26", wall: "#484858" },
  cave:  { floor: "#3d3c2a", ceiling: "#1e1d14", wall: "#4e4c36" },
};

// Rendu du donjon : sol/plafond/murs en INSTANCES (visuel léger), et colliders
// Rapier explicites (un cuboïde orienté par panneau + un sol plat).
export function Dungeon({ data, theme }: { data: DungeonData; theme: EntranceKind }) {
  const half = (data.size * CELL) / 2;
  const colors = THEMES[theme];

  return (
    <group>
      {/* Sol (instancié). */}
      <Instances limit={data.floors.length}>
        <planeGeometry args={[CELL, CELL]} />
        <meshStandardMaterial color={colors.floor} roughness={1} />
        {data.floors.map(([x, z], i) => (
          <Instance key={i} position={[x, 0, z]} rotation={[-Math.PI / 2, 0, 0]} />
        ))}
      </Instances>

      {/* Plafond (instancié). */}
      <Instances limit={data.floors.length}>
        <planeGeometry args={[CELL, CELL]} />
        <meshStandardMaterial color={colors.ceiling} roughness={1} />
        {data.floors.map(([x, z], i) => (
          <Instance key={i} position={[x, WALL_H, z]} rotation={[Math.PI / 2, 0, 0]} />
        ))}
      </Instances>

      {/* Murs (instanciés). */}
      <Instances limit={data.panels.length}>
        <boxGeometry args={[CELL, WALL_H, 0.4]} />
        <meshStandardMaterial color={colors.wall} roughness={1} />
        {data.panels.map((p, i) => (
          <Instance key={i} position={[p.x, WALL_H / 2, p.z]} rotation={[0, p.rot, 0]} />
        ))}
      </Instances>

      {/* Physique : un cuboïde par panneau + le sol. */}
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
      </RigidBody>
    </group>
  );
}

import { Instance, Instances } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { CELL, WALL_H, type DungeonData } from "../gen/dungeonGen";

// Rendu du donjon : sol/plafond/murs en INSTANCES (visuel léger), et colliders
// Rapier explicites (un cuboïde orienté par panneau + un sol plat).
export function Dungeon({ data }: { data: DungeonData }) {
  const half = (data.size * CELL) / 2;

  return (
    <group>
      {/* Sol (instancié). */}
      <Instances limit={data.floors.length}>
        <planeGeometry args={[CELL, CELL]} />
        <meshStandardMaterial color="#4f4538" roughness={1} />
        {data.floors.map(([x, z], i) => (
          <Instance key={i} position={[x, 0, z]} rotation={[-Math.PI / 2, 0, 0]} />
        ))}
      </Instances>

      {/* Plafond (instancié). */}
      <Instances limit={data.floors.length}>
        <planeGeometry args={[CELL, CELL]} />
        <meshStandardMaterial color="#29251f" roughness={1} />
        {data.floors.map(([x, z], i) => (
          <Instance key={i} position={[x, WALL_H, z]} rotation={[Math.PI / 2, 0, 0]} />
        ))}
      </Instances>

      {/* Murs (instanciés). */}
      <Instances limit={data.panels.length}>
        <boxGeometry args={[CELL, WALL_H, 0.4]} />
        <meshStandardMaterial color="#5c523f" roughness={1} />
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

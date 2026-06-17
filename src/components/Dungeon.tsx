import { Instance, Instances } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { CELL, WALL_H, type DungeonData } from "../gen/dungeonGen";
import { 
  getWallAppearance, 
  getFloorAppearance, 
  getCeilingAppearance,
  type WallBlockType,
  type FloorBlockType,
  type CeilingBlockType
} from "../gen/blockTypes";

// Rendu du donjon : sol/plafond/murs en INSTANCES avec un seul type par catégorie,
// et colliders Rapier explicites (un cuboïde orienté par panneau + un sol plat).
export function Dungeon({ data }: { data: DungeonData }) {
  const half = (data.size * CELL) / 2;
  
  // Utiliser les types de blocs uniques pour ce donjon
  const wallAppearance = getWallAppearance(data.wallType as WallBlockType);
  const floorAppearance = getFloorAppearance(data.floorType as FloorBlockType);
  const ceilingAppearance = getCeilingAppearance(data.ceilingType as CeilingBlockType);

  return (
    <group>
      {/* Sol (instancié - un seul type pour tout le donjon). Toujours rendu :
          un donjon a toujours un sol, même les grottes sans plafond. */}
      <Instances limit={data.floors.length}>
        <planeGeometry args={[CELL, CELL]} />
        <meshStandardMaterial
          color={floorAppearance.color}
          roughness={floorAppearance.roughness}
          metalness={floorAppearance.metalness || 0}
        />
        {data.floors.map(([x, z], i) => (
          <Instance
            key={i}
            position={[x, 0, z]}
            rotation={[-Math.PI / 2, 0, 0]}
          />
        ))}
      </Instances>

      {/* Plafond (instancié - un seul type pour tout le donjon).
          Absent quand le biome est à ciel ouvert (ceilingType === "none"). */}
      {data.ceilingType !== "none" && (
        <Instances limit={data.floors.length}>
          <planeGeometry args={[CELL, CELL]} />
          <meshStandardMaterial 
            color={ceilingAppearance.color} 
            roughness={ceilingAppearance.roughness}
            metalness={ceilingAppearance.metalness || 0}
          />
          {data.floors.map(([x, z], i) => (
            <Instance 
              key={i} 
              position={[x, WALL_H, z]} 
              rotation={[Math.PI / 2, 0, 0]} 
            />
          ))}
        </Instances>
      )}

      {/* Murs (instanciés - un seul type pour tout le donjon). */}
      <Instances limit={data.panels.length}>
        <boxGeometry args={[CELL, WALL_H, 0.4]} />
        <meshStandardMaterial 
          color={wallAppearance.color} 
          roughness={wallAppearance.roughness}
          metalness={wallAppearance.metalness || 0}
        />
        {data.panels.map((p, i) => (
          <Instance 
            key={i} 
            position={[p.x, WALL_H / 2, p.z]} 
            rotation={[0, p.rot, 0]} 
          />
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

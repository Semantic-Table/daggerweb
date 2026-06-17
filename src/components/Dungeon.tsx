import { Instance, Instances } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { CELL, WALL_H, type DungeonData, type FloorCell, type WallPanel, type CeilingCell } from "../gen/dungeonGen";
import { 
  getWallAppearance, 
  getFloorAppearance, 
  getCeilingAppearance,
  type WallBlockType,
  type FloorBlockType,
  type CeilingBlockType
} from "../gen/blockTypes";

// Rendu du donjon : sol/plafond/murs en INSTANCES groupées par type (visuel léger),
// et colliders Rapier explicites (un cuboïde orienté par panneau + un sol plat).
export function Dungeon({ data }: { data: DungeonData }) {
  const half = (data.size * CELL) / 2;
  
  // Grouper les sols, plafonds et murs par type de bloc pour optimiser les instances
  const floorsByType = new Map<FloorBlockType, FloorCell[]>();
  const ceilingsByType = new Map<CeilingBlockType, CeilingCell[]>();
  const wallsByType = new Map<WallBlockType, WallPanel[]>();
  
  data.floors.forEach((cell) => {
    const key = cell.blockType as FloorBlockType;
    if (!floorsByType.has(key)) {
      floorsByType.set(key, []);
    }
    floorsByType.get(key)!.push(cell);
  });
  
  data.ceilings.forEach((cell) => {
    const key = cell.blockType as CeilingBlockType;
    if (!ceilingsByType.has(key)) {
      ceilingsByType.set(key, []);
    }
    ceilingsByType.get(key)!.push(cell);
  });
  
  data.panels.forEach((panel) => {
    const key = panel.blockType as WallBlockType;
    if (!wallsByType.has(key)) {
      wallsByType.set(key, []);
    }
    wallsByType.get(key)!.push(panel);
  });

  return (
    <group>
      {/* Sol (instancié par type de bloc). */}
      {Array.from(floorsByType.entries()).map(([type, cells]) => (
        <Instances key={`floor-${type}-${data.seed}`} limit={cells.length}>
          <planeGeometry args={[CELL, CELL]} />
          <meshStandardMaterial 
            color={getFloorAppearance(type).color} 
            roughness={getFloorAppearance(type).roughness}
            metalness={getFloorAppearance(type).metalness || 0}
          />
          {cells.map((cell, i) => (
            <Instance 
              key={i} 
              position={[cell.x, 0, cell.z]} 
              rotation={[-Math.PI / 2, 0, 0]} 
            />
          ))}
        </Instances>
      ))}

      {/* Plafond (instancié par type de bloc). */}
      {Array.from(ceilingsByType.entries()).map(([type, cells]) => {
        if (type === "none") return null; // Ne pas rendre les plafonds "none"
        return (
          <Instances key={`ceiling-${type}-${data.seed}`} limit={cells.length}>
            <planeGeometry args={[CELL, CELL]} />
            <meshStandardMaterial 
              color={getCeilingAppearance(type).color} 
              roughness={getCeilingAppearance(type).roughness}
              metalness={getCeilingAppearance(type).metalness || 0}
            />
            {cells.map((cell, i) => (
              <Instance 
                key={i} 
                position={[cell.x, WALL_H, cell.z]} 
                rotation={[Math.PI / 2, 0, 0]} 
              />
            ))}
          </Instances>
        );
      })}

      {/* Murs (instanciés par type de bloc). */}
      {Array.from(wallsByType.entries()).map(([type, panels]) => (
        <Instances key={`wall-${type}-${data.seed}`} limit={panels.length}>
          <boxGeometry args={[CELL, WALL_H, 0.4]} />
          <meshStandardMaterial 
            color={getWallAppearance(type).color} 
            roughness={getWallAppearance(type).roughness}
            metalness={getWallAppearance(type).metalness || 0}
          />
          {panels.map((p, i) => (
            <Instance 
              key={i} 
              position={[p.x, WALL_H / 2, p.z]} 
              rotation={[0, p.rot, 0]} 
            />
          ))}
        </Instances>
      ))}

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

import { useEffect, useRef } from "react";
import { Instance, Instances } from "@react-three/drei";
import { BallCollider, CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { GROUND, type Decor, type OverworldData } from "../gen/overworldGen";
import { Entrance } from "./Entrance";
import { gatherableRegistry, type GatherableHandle } from "../combat/gatherableRegistry";
import { wellRegistry, type WellHandle } from "../combat/wellRegistry";
import { ITEMS, type GatherableDef } from "../items/itemDefs";

// Fleur interactive — enregistrée dans gatherableRegistry, se masque après cueillette.
function FlowerMesh({ d, color, itemId }: { d: Decor; color: string; itemId: string }) {
  const ref = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!ref.current) return;
    const item = ITEMS[itemId] as GatherableDef;
    const handle: GatherableHandle = {
      mesh: ref.current,
      item,
      gathered: false,
      markGathered() {
        this.gathered = true;
        if (ref.current) ref.current.visible = false;
      },
    };
    gatherableRegistry.add(handle);
    return () => { gatherableRegistry.delete(handle); };
  }, [itemId]);

  return (
    <group ref={ref} position={[d.x, 0, d.z]}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.025, 0.04, 0.5, 4]} />
        <meshStandardMaterial color="#1e3a0a" roughness={1} />
      </mesh>
      <mesh position={[0, 0.58, 0]} rotation={[0, d.rotY, 0]}>
        <icosahedronGeometry args={[0.13, 0]} />
        <meshStandardMaterial color={color} roughness={0.8} flatShading />
      </mesh>
    </group>
  );
}

// Puits interactable — enregistré dans wellRegistry pour le raycast.
function WellMesh({ d }: { d: Decor }) {
  const ref = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!ref.current) return;
    const handle: WellHandle = { mesh: ref.current };
    wellRegistry.add(handle);
    return () => { wellRegistry.delete(handle); };
  }, []);

  return (
    <group ref={ref} position={[d.x, 0, d.z]} rotation={[0, d.rotY, 0]}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.1, 8]} />
        <meshStandardMaterial color="#55514c" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.62, 0.65, 1.0, 8, 1, true]} />
        <meshStandardMaterial color="#5a5650" roughness={1} flatShading side={2} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 0.08, 8]} />
        <meshStandardMaterial color="#4a4640" roughness={1} flatShading />
      </mesh>
      <mesh position={[-0.5, 1.44, 0]}>
        <boxGeometry args={[0.09, 0.6, 0.09]} />
        <meshStandardMaterial color="#2e2820" roughness={1} />
      </mesh>
      <mesh position={[0.5, 1.44, 0]}>
        <boxGeometry args={[0.09, 0.6, 0.09]} />
        <meshStandardMaterial color="#2e2820" roughness={1} />
      </mesh>
      <mesh position={[0, 1.78, 0]}>
        <boxGeometry args={[1.12, 0.09, 0.09]} />
        <meshStandardMaterial color="#2e2820" roughness={1} />
      </mesh>
    </group>
  );
}

// Rendu de l'overworld (cf. GDD §3). Décor instancié (peu de draw calls) +
// colliders Rapier regroupés dans un seul RigidBody statique.
export function Overworld({ data }: { data: OverworldData }) {
  const rocks = data.decor.filter((d) => d.type === "rock");
  const trees = data.decor.filter((d) => d.type === "tree");
  const foliage = data.decor.filter((d) => d.type === "foliage");
  const flowerA = data.decor.filter((d) => d.type === "flower_a");
  const flowerB = data.decor.filter((d) => d.type === "flower_b");
  const wells = data.decor.filter((d) => d.type === "well");

  return (
    <group>
      {/* Sol + collider plat. */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[GROUND / 2, 0.5, GROUND / 2]} position={[0, -0.5, 0]} />
      </RigidBody>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[GROUND, GROUND]} />
        <meshStandardMaterial color="#3b3a33" roughness={1} />
      </mesh>

      {/* Rochers (1 draw call). */}
      <Instances limit={Math.max(1, rocks.length)}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#4a4742" roughness={1} flatShading />
        {rocks.map((d, i) => (
          <Instance
            key={i}
            position={[d.x, 0.2, d.z]}
            rotation={[0, d.rotY, 0]}
            scale={[d.radius, d.radius * d.scaleY, d.radius]}
          />
        ))}
      </Instances>

      {/* Troncs d'arbres morts (1 draw call). */}
      <Instances limit={Math.max(1, trees.length)}>
        <cylinderGeometry args={[0.12, 0.22, 1, 5]} />
        <meshStandardMaterial color="#2e2820" roughness={1} flatShading />
        {trees.map((d, i) => (
          <Instance key={i} position={[d.x, d.height / 2, d.z]} scale={[1, d.height, 1]} />
        ))}
      </Instances>

      {/* Branches (1 draw call). */}
      <Instances limit={Math.max(1, trees.length * 3)}>
        <cylinderGeometry args={[0.05, 0.1, 1.1, 4]} />
        <meshStandardMaterial color="#2e2820" roughness={1} flatShading />
        {trees.flatMap((d, i) =>
          [0, 1, 2].map((b) => (
            <Instance
              key={`${i}-${b}`}
              position={[d.x, d.height * (0.55 + b * 0.12), d.z]}
              rotation={[0, d.rotY + b * 2.1, 0.9 - b * 0.3]}
            />
          ))
        )}
      </Instances>

      {/* Feuillage / buissons (1 draw call, pas de collider). */}
      {foliage.length > 0 && (
        <Instances limit={foliage.length}>
          <coneGeometry args={[0.5, 1, 6]} />
          <meshStandardMaterial color="#1e3a12" roughness={1} flatShading />
          {foliage.map((d, i) => (
            <Instance
              key={i}
              position={[d.x, 0.5 * d.scaleY, d.z]}
              rotation={[0, d.rotY, 0]}
              scale={[1, d.scaleY, 1]}
            />
          ))}
        </Instances>
      )}

      {/* Fleurs wildrose (rouge) — interactables, rendu individuel pour le raycast. */}
      {flowerA.map((d, i) => (
        <FlowerMesh key={i} d={d} color="#cc2a2a" itemId="flower_wildrose" />
      ))}

      {/* Fleurs sunbloom (jaune) — interactables. */}
      {flowerB.map((d, i) => (
        <FlowerMesh key={i} d={d} color="#d4b800" itemId="flower_sunbloom" />
      ))}

      {/* Puits interactable. */}
      {wells.map((d, i) => (
        <WellMesh key={i} d={d} />
      ))}

      {/* Colliders du décor (un seul RigidBody). */}
      <RigidBody type="fixed" colliders={false}>
        {rocks.map((d, i) => (
          <BallCollider key={`r${i}`} args={[d.radius * 0.85]} position={[d.x, 0.2 + d.radius * 0.4, d.z]} />
        ))}
        {trees.map((d, i) => (
          <CylinderCollider key={`t${i}`} args={[d.height / 2, 0.25]} position={[d.x, d.height / 2, d.z]} />
        ))}
        {wells.map((d, i) => (
          <CylinderCollider key={`w${i}`} args={[0.55, d.radius]} position={[d.x, 0.55, d.z]} />
        ))}
      </RigidBody>

      {data.entrances.map((e) => (
        <Entrance key={e.id} data={e} />
      ))}
    </group>
  );
}

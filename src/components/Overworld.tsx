import { Instance, Instances } from "@react-three/drei";
import { BallCollider, CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import { GROUND, type OverworldData } from "../gen/overworldGen";
import { Entrance } from "./Entrance";
import { Skeleton, Slime, Orc, Wolf } from "../enemies";

// Rendu de l'overworld (cf. GDD §3). Décor instancié (peu de draw calls) +
// colliders Rapier regroupés dans un seul RigidBody statique.
export function Overworld({ data }: { data: OverworldData }) {
  const rocks = data.decor.filter((d) => d.type === "rock");
  const trees = data.decor.filter((d) => d.type === "tree");

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

      {/* Colliders du décor (un seul RigidBody). */}
      <RigidBody type="fixed" colliders={false}>
        {rocks.map((d, i) => (
          <BallCollider key={`r${i}`} args={[d.radius * 0.85]} position={[d.x, 0.2 + d.radius * 0.4, d.z]} />
        ))}
        {trees.map((d, i) => (
          <CylinderCollider key={`t${i}`} args={[d.height / 2, 0.25]} position={[d.x, d.height / 2, d.z]} />
        ))}
      </RigidBody>

      {data.entrances.map((e) => (
        <Entrance key={e.id} data={e} />
      ))}

      {/* ======================================================================== */}
      {/* 🎯 ENNEMIS DE TEST - Pour tester rapidement les nouveaux ennemis */}
      {/* ======================================================================== */}
      
      {/* Slime - un peu plus loin */}
      <Slime spawn={[-3, -3]} index={1} />
      
      {/* Orc - près des rochers */}
      {/* <Orc spawn={[8, 5]} index={2} />
       */}
      {/* Loup - en mouvement */}
      <Wolf spawn={[-5, 4]} index={3} />
      
      {/* Un slime acide près de l'orc */}
      <Slime spawn={[10, 7]} index={5} />

    </group>
  );
}

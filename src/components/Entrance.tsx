import { useEffect, useRef } from "react";
import type { Mesh } from "three";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import type { Entrance as EntranceData } from "../gen/overworldGen";
import { portalRegistry } from "../portals";

// Une entrée de donjon. Les meshes pleins sont enveloppés dans un RigidBody
// `colliders="hull"` : Rapier crée UN collider convexe par mesh automatiquement
// (tours, colonnes, rochers...). Le seuil noir (plan) est rendu HORS physique
// — sinon son hull serait dégénéré — et porte `userData.entrance` pour le raycast.
// Un CuboidCollider ferme l'embrasure pour qu'on ne traverse pas le portail.

const stone = "#595348";
const dark = "#33312b";

export function Entrance({ data }: { data: EntranceData }) {
  return (
    <group position={[data.x, 0, data.z]} rotation={[0, data.rotY, 0]}>
      {data.kind === "keep" && <Keep />}
      {data.kind === "crypt" && <Crypt />}
      {data.kind === "cave" && <Cave />}
      <Portal kind={data.kind} data={data} />
    </group>
  );
}

function Portal({ kind, data }: { kind: string; data: EntranceData }) {
  // Position/taille du seuil selon le type.
  const cfg =
    kind === "keep"
      ? { w: 2.4, h: 4, y: 2, z: 3.02 }
      : kind === "crypt"
        ? { w: 2, h: 2.7, y: 1.35, z: 2.17 }
        : { w: 2.6, h: 3.2, y: 1.7, z: 1.62 };
  const ref = useRef<Mesh>(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    portalRegistry.add(m);
    return () => {
      portalRegistry.delete(m);
    };
  }, []);
  return (
    <mesh ref={ref} position={[0, cfg.y, cfg.z]} userData={{ entrance: data }}>
      <planeGeometry args={[cfg.w, cfg.h]} />
      <meshBasicMaterial color="black" />
    </mesh>
  );
}

function Keep() {
  const W = 7, D = 6, H = 5;
  return (
    <RigidBody type="fixed" colliders="hull">
      <mesh position={[0, H / 2, -D / 2]}>
        <boxGeometry args={[W, H, 0.6]} /><meshStandardMaterial color={stone} flatShading />
      </mesh>
      <mesh position={[-W / 2, H / 2, 0]}>
        <boxGeometry args={[0.6, H, D]} /><meshStandardMaterial color={stone} flatShading />
      </mesh>
      <mesh position={[W / 2, H / 2, 0]}>
        <boxGeometry args={[0.6, H, D]} /><meshStandardMaterial color={stone} flatShading />
      </mesh>
      <mesh position={[-(W / 4 + 0.5), H / 2, D / 2]}>
        <boxGeometry args={[W / 2 - 1, H, 0.6]} /><meshStandardMaterial color={stone} flatShading />
      </mesh>
      <mesh position={[W / 4 + 0.5, H / 2, D / 2]}>
        <boxGeometry args={[W / 2 - 1, H, 0.6]} /><meshStandardMaterial color={stone} flatShading />
      </mesh>
      <mesh position={[0, H - 0.6, D / 2]}>
        <boxGeometry args={[2.6, 1.2, 0.6]} /><meshStandardMaterial color={stone} flatShading />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[(sx * W) / 2, (H + 1.5) / 2, (sz * D) / 2]}>
            <cylinderGeometry args={[1, 1.1, H + 1.5, 6]} /><meshStandardMaterial color={stone} flatShading />
          </mesh>
        ))
      )}
      {[-2, -1, 0, 1, 2].map((i) => (
        <mesh key={i} position={[i * 1.4, H + 0.35, -D / 2]}>
          <boxGeometry args={[0.7, 0.7, 0.6]} /><meshStandardMaterial color={stone} flatShading />
        </mesh>
      ))}
      {/* Seuil bloquant (le portail visuel est rendu à part). */}
      <CuboidCollider args={[1.3, H / 2, 0.3]} position={[0, H / 2, D / 2]} />
    </RigidBody>
  );
}

function Crypt() {
  const W = 5, D = 4.5, H = 3.4;
  const cz = D / 2 - 0.4 + 0.6;
  return (
    <RigidBody type="fixed" colliders="hull">
      <mesh position={[0, H / 2, -0.4]}>
        <boxGeometry args={[W, H, D]} /><meshStandardMaterial color="#504a40" flatShading />
      </mesh>
      <mesh position={[0, H + 1, -0.4]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[W * 0.8, 2, 4]} /><meshStandardMaterial color="#423d34" flatShading />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * 1.5, H / 2, cz]}>
          <cylinderGeometry args={[0.35, 0.4, H, 7]} /><meshStandardMaterial color={stone} flatShading />
        </mesh>
      ))}
      <mesh position={[0, H - 0.3, cz]}>
        <boxGeometry args={[3.4, 0.6, 0.8]} /><meshStandardMaterial color={stone} flatShading />
      </mesh>
      <CuboidCollider args={[1, (H - 0.7) / 2, 0.3]} position={[0, (H - 0.7) / 2, D / 2 - 0.4 + 0.3]} />
    </RigidBody>
  );
}

function Cave() {
  return (
    <RigidBody type="fixed" colliders="hull">
      <mesh position={[0, 2.4, -3.8]} scale={[1.3, 1, 0.9]} rotation={[0.3, 0.7, 0.1]}>
        <dodecahedronGeometry args={[5, 0]} /><meshStandardMaterial color="#4a473f" flatShading />
      </mesh>
      <mesh position={[0, 1.7, -0.4]}>
        <dodecahedronGeometry args={[2.4, 0]} /><meshStandardMaterial color={dark} flatShading />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * 2.5, 1.7, 1.2]} scale={[0.9, 1.5, 0.9]} rotation={[0.2, sx, 0.4]}>
          <dodecahedronGeometry args={[2, 0]} /><meshStandardMaterial color="#4a473f" flatShading />
        </mesh>
      ))}
      <mesh position={[0, 4, 0.9]} scale={[1.5, 0.6, 0.9]} rotation={[0, 0.5, 0]}>
        <dodecahedronGeometry args={[2.6, 0]} /><meshStandardMaterial color="#4a473f" flatShading />
      </mesh>
      <CuboidCollider args={[1.3, 1.6, 0.3]} position={[0, 1.6, 1.6]} />
    </RigidBody>
  );
}

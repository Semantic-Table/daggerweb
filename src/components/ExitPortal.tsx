import { useEffect, useRef } from "react";
import { DoubleSide, type Mesh } from "three";
import { portalRegistry } from "../portals";

// Sortie de donjon : une arche de pierre (déco, sans collider — on la traverse)
// dont l'ouverture est barrée par un voile lumineux froid (lumière du jour =
// surface), à l'opposé de la torche chaude. Le voile porte `userData.exit` et
// s'enregistre dans `portalRegistry` : l'interaction au regard le raycaste
// exactement comme les seuils d'entrée (cf. Entrance.tsx) — plus de "magie"
// de proximité.

const stone = "#595348";
const W = 2.2;
const H = 3;

export function ExitPortal({
  pos,
  rot,
}: {
  pos: [number, number, number];
  rot: number;
}) {
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
    <group position={[pos[0], 0, pos[2]]} rotation={[0, rot, 0]}>
      <mesh position={[-W / 2, H / 2, 0]}>
        <boxGeometry args={[0.5, H, 0.5]} /><meshStandardMaterial color={stone} flatShading />
      </mesh>
      <mesh position={[W / 2, H / 2, 0]}>
        <boxGeometry args={[0.5, H, 0.5]} /><meshStandardMaterial color={stone} flatShading />
      </mesh>
      <mesh position={[0, H - 0.25, 0]}>
        <boxGeometry args={[W + 0.5, 0.5, 0.5]} /><meshStandardMaterial color={stone} flatShading />
      </mesh>
      {/* Voile = seuil de sortie (raycast). DoubleSide : visible des deux côtés. */}
      <mesh ref={ref} position={[0, (H - 0.5) / 2, 0]} userData={{ exit: true }}>
        <planeGeometry args={[W - 0.5, H - 0.5]} />
        <meshBasicMaterial color="#cfe8ff" side={DoubleSide} transparent opacity={0.55} />
      </mesh>
      <pointLight color="#bcd6ff" intensity={6} distance={12} position={[0, H / 2, 0]} />
    </group>
  );
}

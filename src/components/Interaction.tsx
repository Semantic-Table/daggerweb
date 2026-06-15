import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Entrance } from "../gen/overworldGen";
import { portalRegistry } from "../portals";

type Target =
  | { kind: "enter"; entrance: Entrance }
  | { kind: "exit" }
  | null;

const LABELS: Record<string, string> = {
  keep: "[E] Entrer dans le donjon",
  crypt: "[E] Entrer dans la crypte",
  cave: "[E] Entrer dans la grotte",
};

// Interaction "au regard" : raycast depuis le centre de l'écran vers les seuils
// (overworld) ou proximité du point d'entrée pour ressortir (donjon).
export function Interaction({
  mode,
  exitPoint,
  onLabel,
  onEnter,
  onExit,
}: {
  mode: "overworld" | "dungeon";
  exitPoint: [number, number, number] | null;
  onLabel: (label: string | null) => void;
  onEnter: (e: Entrance) => void;
  onExit: () => void;
}) {
  const { camera } = useThree();
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const fwd = useMemo(() => new THREE.Vector3(), []);
  const target = useRef<Target>(null);
  const lastLabel = useRef<string | null>(null);

  useFrame(() => {
    let next: Target = null;

    if (mode === "overworld") {
      camera.getWorldDirection(fwd);
      ray.set(camera.position, fwd);
      ray.far = 7;
      // On ne teste QUE les seuils enregistrés (3 meshes) -> quasi gratuit.
      const hits = ray.intersectObjects([...portalRegistry], false);
      const e = hits[0]?.object.userData.entrance as Entrance | undefined;
      if (e) next = { kind: "enter", entrance: e };
    } else if (exitPoint) {
      const d = camera.position.distanceTo(
        new THREE.Vector3(exitPoint[0], exitPoint[1], exitPoint[2])
      );
      if (d < 4) next = { kind: "exit" };
    }

    target.current = next;
    const label =
      next?.kind === "enter"
        ? LABELS[next.entrance.kind]
        : next?.kind === "exit"
          ? "[E] Remonter à la surface"
          : null;
    if (label !== lastLabel.current) {
      lastLabel.current = label;
      onLabel(label);
    }
  });

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code !== "KeyE") return;
      const t = target.current;
      if (!t) return;
      if (t.kind === "enter") onEnter(t.entrance);
      else onExit();
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  }, [onEnter, onExit]);

  return null;
}

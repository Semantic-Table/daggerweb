import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Entrance } from "../gen/overworldGen";
import { portalRegistry } from "../portals";
import { corpseRegistry, type CorpseHandle } from "../combat/corpseRegistry";
import { ENTRANCE_CONFIG } from "./Entrance";
import { INTERACT_PORTAL_FAR, INTERACT_CORPSE_FAR } from "../config";

type Target =
  | { kind: "enter"; entrance: Entrance }
  | { kind: "exit" }
  | { kind: "corpse"; handle: CorpseHandle }
  | null;

export function Interaction({
  onLabel,
  onEnter,
  onExit,
  onCorpse,
}: {
  onLabel: (label: string | null) => void;
  onEnter: (e: Entrance) => void;
  onExit: () => void;
  onCorpse: (handle: CorpseHandle) => void;
}) {
  const { camera } = useThree();
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const fwd = useMemo(() => new THREE.Vector3(), []);
  const target = useRef<Target>(null);
  const lastLabel = useRef<string | null>(null);

  useFrame(() => {
    camera.getWorldDirection(fwd);
    ray.set(camera.position, fwd);
    ray.far = INTERACT_PORTAL_FAR;

    // Portails (entrées + sortie).
    const portalHits = ray.intersectObjects([...portalRegistry], false);
    const ud = portalHits[0]?.object.userData;
    let next: Target = null;
    if (ud?.entrance) next = { kind: "enter", entrance: ud.entrance as Entrance };
    else if (ud?.exit) next = { kind: "exit" };

    // Cadavres — on raycaste les meshes enregistrés.
    if (!next) {
      ray.far = INTERACT_CORPSE_FAR;
      const corpseMeshes = [...corpseRegistry].map((h) => h.mesh);
      const corpseHits = ray.intersectObjects(corpseMeshes, true);
      if (corpseHits.length > 0) {
        const hit = corpseHits[0].object;
        // Remonter jusqu'à un groupe enregistré.
        let obj: THREE.Object3D | null = hit;
        while (obj) {
          const handle = [...corpseRegistry].find((h) => h.mesh === obj);
          if (handle) { next = { kind: "corpse", handle }; break; }
          obj = obj.parent;
        }
      }
    }

    target.current = next;
    const label =
      next?.kind === "enter"
        ? ENTRANCE_CONFIG[next.entrance.kind].label
        : next?.kind === "exit"
          ? "[E] Remonter à la surface"
          : next?.kind === "corpse"
            ? next.handle.looted
              ? "Déjà fouillé"
              : "[E] Fouiller le cadavre"
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
      else if (t.kind === "exit") onExit();
      else if (t.kind === "corpse" && !t.handle.looted) onCorpse(t.handle);
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  }, [onEnter, onExit, onCorpse]);

  return null;
}

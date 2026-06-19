import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Entrance } from "../gen/overworldGen";
import { portalRegistry } from "../portals";
import { corpseRegistry, type CorpseHandle } from "../combat/corpseRegistry";
import { gatherableRegistry, type GatherableHandle } from "../combat/gatherableRegistry";
import { wellRegistry, type WellHandle } from "../combat/wellRegistry";
import { chestRegistry, type ChestHandle } from "../combat/chestRegistry";
import { doorRegistry, type DoorHandle } from "../combat/doorRegistry";
import { ENTRANCE_CONFIG } from "./Entrance";
import { INTERACT_PORTAL_FAR, INTERACT_CORPSE_FAR } from "../config";

type Target =
  | { kind: "enter"; entrance: Entrance }
  | { kind: "exit" }
  | { kind: "corpse"; handle: CorpseHandle }
  | { kind: "gather"; handle: GatherableHandle }
  | { kind: "well"; handle: WellHandle }
  | { kind: "chest"; handle: ChestHandle }
  | { kind: "door"; handle: DoorHandle }
  | null;

export function Interaction({
  onLabel,
  onEnter,
  onExit,
  onCorpse,
  onGather,
  onWell,
  onChest,
}: {
  onLabel: (label: string | null) => void;
  onEnter: (e: Entrance) => void;
  onExit: () => void;
  onCorpse: (handle: CorpseHandle) => void;
  onGather: (handle: GatherableHandle) => void;
  onWell: () => void;
  onChest: (handle: ChestHandle) => void;
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

    // Portails
    const portalHits = ray.intersectObjects([...portalRegistry], false);
    const ud = portalHits[0]?.object.userData;
    let next: Target = null;
    if (ud?.entrance) next = { kind: "enter", entrance: ud.entrance as Entrance };
    else if (ud?.exit) next = { kind: "exit" };

    // Cadavres
    if (!next) {
      ray.far = INTERACT_CORPSE_FAR;
      const byMesh = new Map<THREE.Object3D, CorpseHandle>();
      for (const h of corpseRegistry) byMesh.set(h.mesh, h);
      const corpseHits = ray.intersectObjects([...byMesh.keys()], true);
      if (corpseHits.length > 0) {
        let obj: THREE.Object3D | null = corpseHits[0].object;
        while (obj) {
          const handle = byMesh.get(obj);
          if (handle) { next = { kind: "corpse", handle }; break; }
          obj = obj.parent;
        }
      }
    }

    // Coffres
    if (!next) {
      ray.far = INTERACT_CORPSE_FAR;
      const byMesh = new Map<THREE.Object3D, ChestHandle>();
      for (const h of chestRegistry) byMesh.set(h.mesh, h);
      const chestHits = ray.intersectObjects([...byMesh.keys()], true);
      if (chestHits.length > 0) {
        let obj: THREE.Object3D | null = chestHits[0].object;
        while (obj) {
          const handle = byMesh.get(obj);
          if (handle) { next = { kind: "chest", handle }; break; }
          obj = obj.parent;
        }
      }
    }

    // Portes
    if (!next) {
      ray.far = INTERACT_CORPSE_FAR;
      const byMesh = new Map<THREE.Object3D, DoorHandle>();
      for (const h of doorRegistry) byMesh.set(h.mesh, h);
      const doorHits = ray.intersectObjects([...byMesh.keys()], true);
      if (doorHits.length > 0) {
        let obj: THREE.Object3D | null = doorHits[0].object;
        while (obj) {
          const handle = byMesh.get(obj);
          if (handle && !handle.open) { next = { kind: "door", handle }; break; }
          obj = obj.parent;
        }
      }
    }

    // Gatherables
    if (!next) {
      ray.far = INTERACT_CORPSE_FAR;
      const byMesh = new Map<THREE.Object3D, GatherableHandle>();
      for (const h of gatherableRegistry) if (!h.gathered) byMesh.set(h.mesh, h);
      const gatherHits = ray.intersectObjects([...byMesh.keys()], true);
      if (gatherHits.length > 0) {
        let obj: THREE.Object3D | null = gatherHits[0].object;
        while (obj) {
          const handle = byMesh.get(obj);
          if (handle) { next = { kind: "gather", handle }; break; }
          obj = obj.parent;
        }
      }
    }

    // Puits
    if (!next) {
      ray.far = INTERACT_CORPSE_FAR;
      const meshes = [...wellRegistry].map((h) => h.mesh);
      const wellHits = ray.intersectObjects(meshes, true);
      if (wellHits.length > 0) {
        let obj: THREE.Object3D | null = wellHits[0].object;
        while (obj) {
          const handle = [...wellRegistry].find((h) => h.mesh === obj);
          if (handle) { next = { kind: "well", handle }; break; }
          obj = obj.parent;
        }
      }
    }

    target.current = next;
    const label =
      next?.kind === "enter"
        ? `${ENTRANCE_CONFIG[next.entrance.kind].label} — niv. ${next.entrance.level}`
        : next?.kind === "exit"
          ? "[E] Remonter à la surface"
          : next?.kind === "corpse"
            ? next.handle.looted ? "Déjà fouillé" : "[E] Fouiller le cadavre"
            : next?.kind === "chest"
              ? next.handle.opened ? "Coffre vide" : "[E] Ouvrir le coffre"
              : next?.kind === "door"
                ? "[E] Ouvrir"
                : next?.kind === "gather"
                  ? `[E] Cueillir ${next.handle.item.name}`
                  : next?.kind === "well"
                    ? "[E] Puiser de l'eau"
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
      else if (t.kind === "chest" && !t.handle.opened) onChest(t.handle);
      else if (t.kind === "door" && !t.handle.open) t.handle.markOpen();
      else if (t.kind === "gather" && !t.handle.gathered) onGather(t.handle);
      else if (t.kind === "well") onWell();
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  }, [onEnter, onExit, onCorpse, onChest, onGather, onWell]);

  return null;
}

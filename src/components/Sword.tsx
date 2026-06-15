import { useEffect, useMemo, useRef } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { button, useControls } from "leva";
import * as THREE from "three";
import { enemyRegistry } from "../combat/enemyRegistry";

// Épée corps-à-corps (cf. GDD §5). Le viewmodel est rendu comme ENFANT de la
// caméra (via createPortal) : il hérite exactement de sa transform, donc aucun
// décalage/clip quand on bouge. Swing au clic gauche ; le hit est un balayage
// (cône + distance), pas un raycast fin.

const SWING_DUR = 0.32;
const REACH = 2.6;
const DMG = 1;
const CONE = 0.5; // cos de l'angle du cône (≈ 60°)

// Valeurs par défaut du viewmodel (modifiables en direct via leva, Échap pour le panneau).
const DEFAULTS = { px: 0.47, py: -0.35, pz: -0.7, rx: -0.23, ry: 0.41, rz: 0.3, scale: 1 };

export function Sword({ onHit }: { onHit: () => void }) {
  const { camera, scene } = useThree();
  const inner = useRef<THREE.Group>(null);
  const swinging = useRef(false);
  const t = useRef(0);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const fwd = useMemo(() => new THREE.Vector3(), []);
  const toE = useMemo(() => new THREE.Vector3(), []);

  // Panneau de réglage en direct + bouton "Copier la conf".
  const copyRef = useRef<() => void>(() => {});
  const c = useControls("Épée", {
    px: { value: DEFAULTS.px, min: -1, max: 1, step: 0.01, label: "pos X" },
    py: { value: DEFAULTS.py, min: -1, max: 1, step: 0.01, label: "pos Y" },
    pz: { value: DEFAULTS.pz, min: -1.5, max: 0, step: 0.01, label: "pos Z" },
    rx: { value: DEFAULTS.rx, min: -Math.PI, max: Math.PI, step: 0.01, label: "rot X" },
    ry: { value: DEFAULTS.ry, min: -Math.PI, max: Math.PI, step: 0.01, label: "rot Y" },
    rz: { value: DEFAULTS.rz, min: -Math.PI, max: Math.PI, step: 0.01, label: "rot Z" },
    scale: { value: DEFAULTS.scale, min: 0.3, max: 2, step: 0.05 },
    "Copier la conf": button(() => copyRef.current()),
  });
  copyRef.current = () => {
    const txt =
      `position={[${c.px}, ${c.py}, ${c.pz}]} scale={${c.scale}}\n` +
      `REST = new THREE.Euler(${c.rx}, ${c.ry}, ${c.rz})`;
    navigator.clipboard?.writeText(txt).catch(() => {});
    console.log("[Épée] conf copiée :\n" + txt);
  };

  // La caméra doit être dans la scène pour que ses enfants (le viewmodel) rendent.
  useEffect(() => {
    scene.add(camera);
  }, [scene, camera]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0 || document.pointerLockElement == null || swinging.current) return;
      swinging.current = true;
      t.current = 0;

      camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();
      let hitAny = false;
      for (const en of enemyRegistry) {
        en.getPosition(tmp);
        toE.set(tmp.x - camera.position.x, 0, tmp.z - camera.position.z);
        const d = toE.length();
        if (d > REACH) continue;
        toE.normalize();
        if (fwd.dot(toE) > CONE) {
          en.hit(toE.x, toE.z, DMG);
          hitAny = true;
        }
      }
      if (hitAny) onHit();
    };
    addEventListener("mousedown", onDown);
    return () => removeEventListener("mousedown", onDown);
  }, [camera, onHit, fwd, tmp, toE]);

  useFrame((_, dt) => {
    if (!inner.current) return;
    if (swinging.current) {
      t.current += dt / SWING_DUR;
      if (t.current >= 1) {
        swinging.current = false;
        t.current = 0;
        inner.current.rotation.set(c.rx, c.ry, c.rz);
      } else {
        const s = Math.sin(t.current * Math.PI); // aller-retour
        inner.current.rotation.set(c.rx - s * 2.0, c.ry + s * 0.6, c.rz + s * 0.8);
      }
    } else {
      inner.current.rotation.set(c.rx, c.ry, c.rz);
    }
  });

  return createPortal(
    <group position={[c.px, c.py, c.pz]} scale={c.scale}>
      <group ref={inner} rotation={[c.rx, c.ry, c.rz]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.06, 0.9, 0.12]} />
          <meshStandardMaterial color="#cdd2da" metalness={0.1} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[0.34, 0.08, 0.14]} />
          <meshStandardMaterial color="#7a6a44" roughness={1} />
        </mesh>
        <mesh position={[0, -0.16, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.28, 6]} />
          <meshStandardMaterial color="#3a2c1c" roughness={1} />
        </mesh>
      </group>
    </group>,
    camera
  );
}

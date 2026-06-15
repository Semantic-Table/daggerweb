import { useEffect, useMemo, useRef } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { enemyRegistry } from "../combat/enemyRegistry";
import { getInventory, subscribeInventory } from "../combat/inventory";

// Arme corps-à-corps (cf. GDD §5). Le viewmodel est rendu comme ENFANT de la
// caméra (via createPortal) : il hérite exactement de sa transform, donc aucun
// décalage/clip quand on bouge. Coup au clic gauche ; le hit est un balayage
// (cône + distance), pas un raycast fin. Selon l'arme équipée, on affiche une
// lame (swing) ou les poings (jab) — cf. `render` dans itemDefs.

const REACH = 2.6; // portée d'une lame
const FIST_REACH = 1.9; // portée plus courte à mains nues
const CONE = 0.5; // cos de l'angle du cône (≈ 60°)

// Transform du viewmodel lame (position / rotation au repos / échelle).
const VM = { px: 0.47, py: -0.35, pz: -0.7, rx: -0.23, ry: 0.41, rz: 0.3, scale: 1 };
// Position de repos du poing droit (celui qui frappe).
const FIST = { px: 0.32, py: -0.46, pz: -0.62 };

// Maillage d'un poing : avant-bras + poing fermé.
function FistMesh({ color }: { color: string }) {
  return (
    <>
      <mesh position={[0, 0, 0.16]}>
        <boxGeometry args={[0.12, 0.12, 0.32]} />
        <meshStandardMaterial color={color} roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 0.01, -0.04]}>
        <boxGeometry args={[0.15, 0.16, 0.16]} />
        <meshStandardMaterial color={color} roughness={1} flatShading />
      </mesh>
    </>
  );
}

export function Sword({ onHit }: { onHit: () => void }) {
  const { camera, scene } = useThree();
  const inner = useRef<THREE.Group>(null);
  const swinging = useRef(false);
  const t = useRef(0);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const fwd = useMemo(() => new THREE.Vector3(), []);
  const toE = useMemo(() => new THREE.Vector3(), []);
  // Arme équipée : re-render sur changement d'inventaire.
  const equippedRef = useRef(getInventory().equipped);
  useEffect(() => {
    return subscribeInventory(() => {
      equippedRef.current = getInventory().equipped;
    });
  }, []);

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
      const weapon = equippedRef.current;
      const reach = weapon.render === "fists" ? FIST_REACH : REACH;
      let hitAny = false;
      for (const en of enemyRegistry) {
        en.getPosition(tmp);
        toE.set(tmp.x - camera.position.x, 0, tmp.z - camera.position.z);
        const d = toE.length();
        if (d > reach) continue;
        toE.normalize();
        if (fwd.dot(toE) > CONE) {
          en.hit(toE.x, toE.z, weapon.dmg);
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
    const weapon = equippedRef.current;
    const isFists = weapon.render === "fists";
    const g = inner.current;

    if (swinging.current) {
      t.current += dt / weapon.swingDur;
      if (t.current >= 1) {
        swinging.current = false;
        t.current = 0;
      }
    }
    const active = swinging.current ? Math.sin(t.current * Math.PI) : 0;

    if (isFists) {
      // Jab : le poing droit s'enfonce vers l'avant puis revient.
      g.position.set(FIST.px, FIST.py, FIST.pz - active * 0.42);
      g.rotation.set(0.15 - active * 0.3, -0.25, 0);
    } else {
      // Swing : balayage diagonal de la lame.
      g.rotation.set(VM.rx - active * 2.0, VM.ry + active * 0.6, VM.rz + active * 0.8);
    }
  });

  const weapon = equippedRef.current;

  if (weapon.render === "fists") {
    return createPortal(
      <group>
        {/* Poing gauche, statique. */}
        <group position={[-FIST.px, FIST.py, FIST.pz]} rotation={[0.15, 0.25, 0]}>
          <FistMesh color={weapon.color} />
        </group>
        {/* Poing droit, celui qui frappe (animé via `inner`). */}
        <group ref={inner} position={[FIST.px, FIST.py, FIST.pz]} rotation={[0.15, -0.25, 0]}>
          <FistMesh color={weapon.color} />
        </group>
      </group>,
      camera,
    );
  }

  if (weapon.render === "axe") {
    return createPortal(
      <group position={[VM.px, VM.py, VM.pz]} scale={VM.scale}>
        <group ref={inner} rotation={[VM.rx, VM.ry, VM.rz]}>
          {/* Manche en bois */}
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.035, 0.04, 0.92, 6]} />
            <meshStandardMaterial color="#5a4226" roughness={1} flatShading />
          </mesh>
          {/* Fer : tête épaisse adossée au manche... */}
          <mesh position={[0.12, 0.66, 0]}>
            <boxGeometry args={[0.16, 0.26, 0.1]} />
            <meshStandardMaterial color={weapon.color} metalness={0.2} roughness={0.5} flatShading />
          </mesh>
          {/* ...prolongée par un tranchant évasé. */}
          <mesh position={[0.27, 0.66, 0]} rotation={[0, 0, 0.05]}>
            <boxGeometry args={[0.16, 0.4, 0.03]} />
            <meshStandardMaterial color={weapon.color} metalness={0.2} roughness={0.5} flatShading />
          </mesh>
          {/* Pommeau */}
          <mesh position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.06, 6]} />
            <meshStandardMaterial color="#3a2c1c" roughness={1} flatShading />
          </mesh>
        </group>
      </group>,
      camera,
    );
  }

  const bladeH = 0.9 * weapon.bladeLen;
  return createPortal(
    <group position={[VM.px, VM.py, VM.pz]} scale={VM.scale}>
      <group ref={inner} rotation={[VM.rx, VM.ry, VM.rz]}>
        {/* Lame — couleur et longueur selon l'arme équipée */}
        <mesh position={[0, bladeH / 2, 0]}>
          <boxGeometry args={[0.06, bladeH, 0.12]} />
          <meshStandardMaterial color={weapon.color} metalness={0.1} roughness={0.6} />
        </mesh>
        {/* Garde */}
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[0.34, 0.08, 0.14]} />
          <meshStandardMaterial color="#7a6a44" roughness={1} />
        </mesh>
        {/* Poignée */}
        <mesh position={[0, -0.16, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.28, 6]} />
          <meshStandardMaterial color="#3a2c1c" roughness={1} />
        </mesh>
      </group>
    </group>,
    camera,
  );
}

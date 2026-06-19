import { useEffect, useMemo, useRef } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { enemyRegistry } from "../combat/enemyRegistry";
import { getInventory, subscribeInventory } from "../combat/inventory";
import { gainXp, effectiveDmg, effectiveSwingDur } from "../combat/skills";
import { gainAttrPractice, SKILL_GOV, meleeMult, critChance, useStamina } from "../combat/character";
import { playerDefense, beginGuard, endGuard } from "../combat/playerDefense";
import { SWORD_REACH, SWORD_FIST_REACH, SWORD_CONE, SKILL_XP_PER_HIT, ATTACK_STAMINA_COST } from "../config";

// Arme corps-à-corps (cf. GDD §5). Le viewmodel est rendu comme ENFANT de la
// caméra (via createPortal) : il hérite exactement de sa transform, donc aucun
// décalage/clip quand on bouge. Coup au clic gauche ; le hit est un balayage
// (cône + distance), pas un raycast fin. Selon l'arme équipée, on affiche une
// lame (swing) ou les poings (jab) — cf. `render` dans itemDefs.

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

interface SwordProps {
  onHit: () => void;
  onCrit?: () => void;
}

export function Sword({ onHit, onCrit }: SwordProps) {
  const { camera, scene } = useThree();
  const inner = useRef<THREE.Group>(null);
  const swinging = useRef(false);
  const guardAmt = useRef(0); // 0..1 lissé : interpolation vers la pose de garde
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
      // Pas d'attaque tant qu'on garde (clic droit) : garde et attaque s'excluent.
      if (playerDefense.guarding) return;

      // Vérifier si on a assez de vigueur pour attaquer (coût = fraction de jauge)
      if (!useStamina(ATTACK_STAMINA_COST)) {
        // Pas assez de vigueur, ne pas attaquer
        return;
      }
      
      swinging.current = true;
      t.current = 0;

      camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();
      const weapon = equippedRef.current;
      const reach = weapon.render === "fists" ? SWORD_FIST_REACH : SWORD_REACH;
      // Dégâts modulés par la compétence ET la FORCE (lecture à la volée —
      // on ne mute jamais la def d'arme).
      const baseDmg = effectiveDmg(weapon);
      const dmg = baseDmg * meleeMult();
      let hitAny = false;
      for (const en of enemyRegistry) {
        en.getPosition(tmp);
        toE.set(tmp.x - camera.position.x, 0, tmp.z - camera.position.z);
        const d = toE.length();
        if (d > reach) continue;
        toE.normalize();
        if (fwd.dot(toE) > SWORD_CONE) {
          // Vérifier si coup critique
          const isCrit = Math.random() < critChance();
          const finalDmg = isCrit ? dmg * 1.5 : dmg;
          en.hit(toE.x, toE.z, finalDmg);
          // XP au coup CONFIRMÉ, par ennemi touché (cf. GDD §6).
          gainXp(weapon.category, SKILL_XP_PER_HIT);
          // Pratique de l'attribut gouverneur (cf. docs/roadmap-attributs.md)
          gainAttrPractice(SKILL_GOV[weapon.category], 1);
          if (isCrit && onCrit) onCrit();
          hitAny = true;
        }
      }
      if (hitAny) onHit();
    };
    addEventListener("mousedown", onDown);
    return () => removeEventListener("mousedown", onDown);
  }, [camera, onHit, fwd, tmp, toE]);

  // Garde / parade (clic droit). L'ENFONCEMENT arme une fenêtre de parade
  // (beginGuard) ; tant que le bouton reste pressé, on est en garde simple.
  // resolveMeleeHit (côté ennemi, à la frappe) arbitre parade/bloc/touché.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (e.button !== 2 || document.pointerLockElement == null) return;
      beginGuard();
    };
    const onUp = (e: MouseEvent) => {
      if (e.button !== 2) return;
      endGuard();
    };
    // Empêche le menu contextuel du navigateur sur clic droit.
    const onCtx = (e: Event) => e.preventDefault();
    addEventListener("mousedown", onDown);
    addEventListener("mouseup", onUp);
    addEventListener("contextmenu", onCtx);
    return () => {
      removeEventListener("mousedown", onDown);
      removeEventListener("mouseup", onUp);
      removeEventListener("contextmenu", onCtx);
      endGuard();
    };
  }, []);

  useFrame((_, dt) => {
    if (!inner.current) return;
    const weapon = equippedRef.current;
    const isFists = weapon.render === "fists";
    const g = inner.current;

    if (swinging.current) {
      t.current += dt / effectiveSwingDur(weapon);
      if (t.current >= 1) {
        swinging.current = false;
        t.current = 0;
      }
    }
    const active = swinging.current ? Math.sin(t.current * Math.PI) : 0;

    // Lissage de la pose de garde (montée/descente rapides, ~10/s).
    const gt = playerDefense.guarding ? 1 : 0;
    guardAmt.current += (gt - guardAmt.current) * Math.min(1, dt * 12);
    const gd = guardAmt.current;

    if (isFists) {
      // Jab : le poing droit s'enfonce vers l'avant puis revient.
      // Garde : poing ramené haut au centre (protection).
      g.position.set(FIST.px - gd * 0.16, FIST.py + gd * 0.26, FIST.pz + gd * 0.14 - active * 0.42);
      g.rotation.set(0.15 - active * 0.3 - gd * 0.5, -0.25 + gd * 0.3, gd * 0.4);
    } else {
      // Swing : balayage diagonal de la lame. Garde : lame levée en travers.
      g.rotation.set(
        VM.rx - active * 2.0 + gd * 1.1,
        VM.ry + active * 0.6 - gd * 0.5,
        VM.rz + active * 0.8 + gd * 0.55,
      );
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

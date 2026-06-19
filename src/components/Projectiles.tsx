import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import * as THREE from "three";
import { playerPos } from "../combat/playerState";
import { damagePlayer } from "../combat/playerCombat";
import { gameState } from "../combat/gameState";
import {
  projectiles,
  subscribeProjectiles,
  removeProjectile,
  spawnImpact,
  clearProjectiles,
  PROJECTILE_KINDS,
  type Projectile,
} from "../combat/projectileRegistry";

// Renderer UNIQUE des projectiles (monté une fois dans <Physics>). Lit la liste
// autoritaire du registre ; chaque projectile a son propre useFrame qui l'avance
// et résout les collisions :
//   - MURS  : raycast Rapier `EXCLUDE_DYNAMIC` (touche la géométrie fixe réelle,
//             en 3D — fini la « distance XZ manuelle » de l'ancien AcidProjectile).
//   - JOUEUR: proximité 3D contre playerPos (centre caméra), Y compris.
// Le déplacement frame-à-frame ne passe PAS par React (mutation de la ref) ; seuls
// les ajouts/retraits déclenchent un re-render (subscribeProjectiles).

function ProjectileMesh({ p }: { p: Projectile }) {
  const ref = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const { rapier, world } = useRapier();
  const def = PROJECTILE_KINDS[p.kind];
  const dir = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g || gameState.paused) return;

    // ── Éclat d'impact (FX) : immobile, grossit + s'efface, aucune collision ──
    if (p.burst) {
      p.life -= dt;
      if (p.life <= 0) {
        removeProjectile(p);
        return;
      }
      const t = 1 - p.life / p.maxLife; // 0 → 1
      g.scale.setScalar(0.4 + t * 1.8);
      if (matRef.current) matRef.current.opacity = (1 - t) * 0.8;
      g.position.copy(p.pos);
      return;
    }

    // ── Projectile en vol ────────────────────────────────────────────────────
    const speed = p.vel.length();
    const step = speed * dt;
    if (step > 0) {
      dir.copy(p.vel).multiplyScalar(1 / speed);
      // Raycast contre la géométrie FIXE uniquement (murs/sol/plafond/décor) :
      // les corps dynamiques (ennemis, joueur, autres projectiles) sont ignorés.
      const ray = new rapier.Ray(p.pos, dir);
      const hit = world.castRay(ray, step + p.radius, true, rapier.QueryFilterFlags.EXCLUDE_DYNAMIC);
      if (hit && hit.timeOfImpact <= step + p.radius) {
        // Impact mur : on pose l'éclat au point de contact puis on retire.
        p.pos.addScaledVector(dir, Math.max(0, hit.timeOfImpact - p.radius));
        spawnImpact(p.kind, p.pos);
        removeProjectile(p);
        return;
      }
    }

    // Avance.
    p.pos.addScaledVector(p.vel, dt);

    // Collision joueur : proximité 3D (centre caméra), Y compris.
    const dx = playerPos.x - p.pos.x;
    const dy = playerPos.y - p.pos.y;
    const dz = playerPos.z - p.pos.z;
    const hitR = p.radius + 0.45;
    if (dx * dx + dy * dy + dz * dz <= hitR * hitR) {
      damagePlayer(p.dmg);
      spawnImpact(p.kind, p.pos);
      removeProjectile(p);
      return;
    }

    // Durée de vie.
    p.life -= dt;
    if (p.life <= 0) {
      removeProjectile(p);
      return;
    }

    g.position.copy(p.pos);
    // Flèche : orientée le long de la trajectoire (le mesh pointe sur +Z).
    if (p.kind === "arrow") g.lookAt(p.pos.x + p.vel.x, p.pos.y + p.vel.y, p.pos.z + p.vel.z);
  });

  // ── Rendu (par type) ───────────────────────────────────────────────────────
  if (p.burst) {
    return (
      <group ref={ref} position={[p.pos.x, p.pos.y, p.pos.z]}>
        <mesh>
          <sphereGeometry args={[def.radius, 8, 6]} />
          <meshStandardMaterial
            ref={matRef}
            color={def.color}
            emissive={def.color}
            emissiveIntensity={2}
            transparent
            opacity={0.8}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    );
  }

  if (p.kind === "arrow") {
    return (
      <group ref={ref} position={[p.pos.x, p.pos.y, p.pos.z]}>
        {/* Hampe le long de +Z, pointe vers l'avant. */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[p.radius * 0.4, p.radius * 0.4, 0.5, 5]} />
          <meshStandardMaterial color={def.color} roughness={0.8} flatShading />
        </mesh>
        <mesh position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[p.radius, 0.16, 6]} />
          <meshStandardMaterial color="#999" metalness={0.4} roughness={0.4} flatShading />
        </mesh>
      </group>
    );
  }

  // acid (défaut) : goutte gélatineuse lumineuse.
  return (
    <group ref={ref} position={[p.pos.x, p.pos.y, p.pos.z]}>
      <mesh>
        <sphereGeometry args={[p.radius, 8, 6]} />
        <meshStandardMaterial
          color={def.color}
          emissive={def.color}
          emissiveIntensity={1.6}
          roughness={0.3}
          transparent
          opacity={0.85}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export function Projectiles() {
  const [, force] = useState(0);

  // Re-render sur changement STRUCTUREL (ajout/retrait) seulement.
  useEffect(() => subscribeProjectiles(() => force((v) => v + 1)), []);

  // Vide les projectiles à l'entrée et à la sortie d'un monde (évite les
  // projectiles fantômes d'un donjon à l'autre). <Projectiles> est keyé par monde.
  useEffect(() => {
    clearProjectiles();
    return () => clearProjectiles();
  }, []);

  return (
    <>
      {projectiles.map((p) => (
        <ProjectileMesh key={p.id} p={p} />
      ))}
    </>
  );
}

import { useEffect, useState } from "react";
import { getEnemyComponent } from "../enemies";
import type { EnemySpawn } from "../gen/dungeonGen";
import { summons, subscribeSummons, clearSummons } from "../combat/summonRegistry";

// Instancie les ennemis d'un donjon : chaque spawn porte son type (id catalogue)
// et son niveau ; on résout le composant via getEnemyComponent (fallback gobelin).
// En plus des spawns FIXES (générés), on rend les ennemis INVOQUÉS à l'exécution
// (nécromancien) lus dans summonRegistry — vidés au changement de donjon.
export function Enemies({ spawns }: { spawns: EnemySpawn[] }) {
  const [, force] = useState(0);

  // Re-render quand une invocation apparaît (ou que la liste est purgée).
  useEffect(() => subscribeSummons(() => force((v) => v + 1)), []);
  useEffect(() => {
    clearSummons();
    return () => clearSummons();
  }, []);

  return (
    <>
      {spawns.map((s, i) => {
        const EnemyComponent = getEnemyComponent(s.typeId);
        return <EnemyComponent key={`base-${i}`} spawn={[s.x, s.z]} index={i} level={s.level} elite={s.elite} />;
      })}
      {summons.map((s) => {
        const EnemyComponent = getEnemyComponent(s.typeId);
        // index décalé (10000+) pour ne pas collisionner les seeds de loot des fixes.
        return <EnemyComponent key={`sum-${s.id}`} spawn={[s.x, s.z]} index={10000 + s.id} level={s.level} />;
      })}
    </>
  );
}

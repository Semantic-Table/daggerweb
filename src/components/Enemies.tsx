import { getEnemyComponent } from "../enemies";
import type { EnemySpawn } from "../gen/dungeonGen";

// Instancie les ennemis d'un donjon : chaque spawn porte son type (id catalogue)
// et son niveau ; on résout le composant via getEnemyComponent (fallback gobelin).
export function Enemies({ spawns }: { spawns: EnemySpawn[] }) {
  return (
    <>
      {spawns.map((s, i) => {
        const EnemyComponent = getEnemyComponent(s.typeId);
        return <EnemyComponent key={i} spawn={[s.x, s.z]} index={i} level={s.level} elite={s.elite} />;
      })}
    </>
  );
}

import { Enemy } from "./Enemy";

// Instancie les ennemis d'un donjon à partir des positions générées.
export function Enemies({ spawns }: { spawns: [number, number][] }) {
  return (
    <>
      {spawns.map((s, i) => (
        <Enemy key={i} spawn={s} />
      ))}
    </>
  );
}

import { useEffect, useState } from "react";
import { Html } from "@react-three/drei";
import { getDmgEvents, subscribeDmg, type DmgEvent } from "../combat/damageNumbers";

// Chiffres de dégâts flottants rendus dans le Canvas via <Html> drei.
// La position 3D est fixée au moment du coup ; l'animation CSS gère la montée
// et le fondu (pas de useFrame pour éviter le surcoût — on re-rend uniquement
// sur ajout/suppression d'événement via le registre).

export function DamageNumbers() {
  const [evs, setEvs] = useState<readonly DmgEvent[]>(() => getDmgEvents());

  useEffect(() => {
    return subscribeDmg(() => setEvs([...getDmgEvents()]));
  }, []);

  return (
    <>
      {evs.map((ev) => (
        <Html
          key={ev.id}
          position={[ev.x, ev.y, ev.z]}
          center
          distanceFactor={8}
          zIndexRange={[20, 0]}
          wrapperClass="dmg-number-wrap"
        >
          <div className="dmg-number">{ev.dmg}</div>
        </Html>
      ))}
    </>
  );
}

import { Html } from "@react-three/drei";

// Étiquette flottante au-dessus d'un ennemi : son NOM + son NIVEAU.
//
// ⚠️ Lisibilité : le jeu rend à `dpr` très bas (pixelisation, cf. App.tsx).
// Un <Text> 3D vivrait DANS ce framebuffer basse résolution → illisible. On
// passe donc par <Html> de drei : le label est un vrai nœud DOM projeté à la
// position 3D, rendu PAR-DESSUS le canvas → net, hors pixelisation. Le style
// vit dans `.mob-label` (style.css), police pixel + contour dur 1px pour rester
// raccord avec le rendu. <Html> fait face-caméra par défaut (plus de Billboard).
//
// `distanceFactor` lie la taille du label à la distance 3D (il rapetisse au
// loin) ; sans lui le label garderait une taille écran constante.

export function EnemyLabel({
  name,
  level,
  elite = false,
  y,
}: {
  name: string;
  level: number;
  elite?: boolean;
  y: number;
}) {
  const text = elite ? `Élite · ${name} — niv. ${level}` : `${name} — niv. ${level}`;
  return (
    <Html
      position={[0, y - 0.4, 0]}
      center
      distanceFactor={9}
      zIndexRange={[10, 0]}
      wrapperClass="mob-label-wrap"
    >
      <div className={elite ? "mob-label elite" : "mob-label"}>{text}</div>
    </Html>
  );
}

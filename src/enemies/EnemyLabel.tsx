import { Billboard, Text } from "@react-three/drei";

// Étiquette flottante au-dessus d'un ennemi : son NOM + son NIVEAU, orientée
// caméra (Billboard). Placée comme FRÈRE du groupe d'orientation (corpseGroup)
// pour ne pas tourner avec le corps — le Billboard gère le face-caméra.
//
// ⚠️ Lisibilité : le jeu rend à `dpr` très bas (pixelisation). On compense avec
// une police généreuse + un fort contour noir. Si le texte 3D « bave » trop,
// repli possible sur <Html> de drei (overlay DOM net) — cf. docs/roadmap-niveaux.md.

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
    <Billboard position={[0, y, 0]}>
      <Text
        fontSize={0.26}
        color={elite ? "#ffd36b" : "#e8e2d0"}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.022}
        outlineColor="#000000"
        // Évite que le texte traverse les murs de façon trop visible.
        depthOffset={-1}
      >
        {text}
      </Text>
    </Billboard>
  );
}

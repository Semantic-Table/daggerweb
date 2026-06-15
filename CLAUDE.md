# CLAUDE.md — Dungeon FPS (proto)

FPS fantasy procédural : overworld à l'abandon parsemé d'entrées de donjon,
donjons block-based générés par seed, combat temps réel, rendu pixelisé.
Voir [`GDD.md`](GDD.md) pour la vision, [`docs/`](docs/) pour les détails techniques.

## Stack

- **React Three Fiber** (R3F 8) — rendu déclaratif sur Three.js
- **@react-three/drei** — controls, clavier, instances, stats
- **@react-three/rapier** — physique & collisions
- **leva** — panneau de réglage dev (orientation de l'épée)
- **Vite + TypeScript**, `build.target: esnext` (top-level await du wasm Rapier)

> ⚠️ Le proto est en R3F, **pas** en Three.js vanilla.

## Lancer

- Dev : `npm run dev` (sert sur **:5174**). **Ne pas démarrer de serveur soi-même** —
  l'utilisateur a déjà le sien sur ce port.
- Vérifier le code : `npm run build` ou `npx tsc --noEmit`.

## Structure

```
src/
  main.tsx            Racine React + <Canvas>
  App.tsx             État des mondes, lumière/fog/post-process, UI (HUD), spawn
  style.css           HUD + pixelisation (image-rendering)
  rng.ts              PRNG déterministe (mulberry32) — seed reproductible
  portals.ts          Registre des seuils (raycast d'interaction)
  gen/                GÉNÉRATION = DONNÉES PURES (zéro Three.js)
    dungeonGen.ts       Donjon block-based + spawns ennemis
    overworldGen.ts     Overworld : décor + entrées de donjon
  components/         RENDU (R3F)
    Player.tsx          Capsule dynamique Rapier + caméra + entrées clavier
    Torch.tsx           Torche qui suit la caméra (donjons)
    Overworld.tsx       Sol, décor instancié, entrées
    Dungeon.tsx         Sol/plafond/murs instanciés + colliders
    Entrance.tsx        Donjon / crypte / grotte (colliders auto "hull")
    Interaction.tsx     Interaction au regard (raycast seuil + touche E)
    Sword.tsx           Viewmodel épée (enfant caméra) + swing + hit
    Enemy.tsx           Poursuiveur : poursuite, hit, mort ragdoll, attaque
    Enemies.tsx         Instancie les ennemis d'un donjon
  combat/             ÉTAT PARTAGÉ (hors arbre React)
    playerState.ts      Position monde du joueur (lue par les ennemis)
    enemyRegistry.ts    Ennemis vivants (interrogés par l'épée)
    playerCombat.ts     Canal de dégâts vers le joueur
```

## Conventions

- **Génération découplée du rendu** : tout `gen/` renvoie des données pures
  (positions, seeds). Le Three.js vit uniquement dans `components/`.
- **Collisions = Rapier**, jamais d'AABB maison. Privilégier les colliders auto
  (`<RigidBody colliders="hull">`) ; colliders explicites pour murs/décor répétés.
- **Communication inter-composants** via registres de module (pattern récurrent :
  `portalRegistry`, `enemyRegistry`, `playerState`, `playerCombat`) plutôt que du
  prop-drilling ou un store global.
- **Seed** : même seed ⇒ même monde (cf. GDD §4). Tout l'aléatoire passe par `rng.ts`.
- **Pixelisation** : rendu basse résolution (`dpr` bas) + `image-rendering: pixelated`
  (cf. GDD §7), pas de post-process. Le `dpr` (App.tsx) règle la taille des pixels.
- **leva = outil de dev** (réglage épée). À masquer/retirer pour une build propre.

## État actuel

Overworld + 3 types d'entrées, donjons procéduraux, déplacement FPS physique,
épée corps-à-corps, ennemis poursuiveurs, PV joueur + mort/respawn, HUD minimal.
Suite possible : [`docs/roadmap.md`](docs/roadmap.md).

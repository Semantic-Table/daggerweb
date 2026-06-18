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
  config.ts           Constantes de gameplay centralisées (joueur, attributs, donjon…)
  portals.ts          Registre des seuils (raycast d'interaction)
  gen/                GÉNÉRATION = DONNÉES PURES (zéro Three.js)
    dungeonGen.ts       Donjon block-based + spawns ennemis (un type de bloc par donjon)
    overworldGen.ts     Overworld : décor + entrées de donjon
    blockTypes.ts       Catalogue de blocs (murs/sols/plafonds) + presets de biome
    dungeonNames.ts     Noms de donjons déterministes (préfixe + suffixe par type)
  items/
    itemDefs.ts         Définitions d'objets (armes, armures, consommables) + stats
  enemies/            CATALOGUE & COMPOSANTS D'ENNEMIS (au-delà du gobelin de base)
    enemyTypes.ts       Catalogue de 9 types (stats niveau 1 échelle proto/apparence/comportement)
    useEnemyAI.ts       Hook moteur IA/combat PARTAGÉ (registre, poursuite, attaque,
                        mort, loot, pause) — paramétré par nombres bruts + callbacks
    scaling.ts          scaledStats(type, level) : stats effectives par niveau (croissance linéaire)
    EnemyLabel.tsx      Label flottant nom + niveau (billboard Text) au-dessus de l'ennemi
    index.ts            Exports + getEnemyComponent (résolution type → composant)
    Skeleton/Slime/Orc/Wolf.tsx   Composants d'ennemis (meshes + anims via useEnemyAI)
  components/         RENDU (R3F)
    Player.tsx          Capsule dynamique Rapier + caméra + entrées clavier
    Torch.tsx           Torche qui suit la caméra (donjons)
    Overworld.tsx       Sol, décor instancié, entrées
    Dungeon.tsx         Sol/plafond/murs instanciés (matériaux du type de bloc) + colliders
    Entrance.tsx        Donjon / crypte / grotte (colliders auto "hull")
    Interaction.tsx     Interaction au regard (raycast seuil/cadavre + touche E)
    Sword.tsx           Viewmodel épée (enfant caméra) + swing + hit
    Enemy.tsx           Poursuiveur (gobelin) : meshes + anims via useEnemyAI
    Enemies.tsx         Instancie les ennemis d'un donjon
    ExitPortal.tsx      Seuil de retour vers l'overworld dans un donjon
    GrimoireUI.tsx      Menu RPG plein écran (6 écrans + 4 palettes) — voir docs/todo-ui-rpg.md
  combat/             ÉTAT PARTAGÉ (hors arbre React)
    playerState.ts      Position monde du joueur (lue par les ennemis)
    enemyRegistry.ts    Ennemis vivants (interrogés par l'épée)
    corpseRegistry.ts   Cadavres fouillables (raycast Interaction + inventaire)
    playerCombat.ts     Canal de dégâts vers le joueur
    gameState.ts        Drapeau `paused` (menu bloquant) lu par les boucles useFrame
    character.ts        8 attributs + stats dérivées (PV/mana/charge) + vigueur
    skills.ts           Compétences à l'usage par catégorie d'arme (XP + bonus)
    inventory.ts        Slots + arme/armures équipées (équiper/consommer/ramasser/AC)
  ui/
    themes.ts           Palettes du Grimoire (ordre/libellés) + persistance localStorage
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

Overworld + 3 types d'entrées, donjons procéduraux (noms + variété de blocs +
**niveau** par donjon), déplacement FPS physique, épée corps-à-corps, ennemis
poursuiveurs, PV joueur + mort/respawn, attributs & armures (AC), HUD minimal, menu
RPG « Grimoire » (touche I) inspiré de Daggerfall. Beaucoup d'écrans du menu sont des
**placeholders** en attendant les mécaniques (or, magie) — état détaillé dans
[`docs/todo-ui-rpg.md`](docs/todo-ui-rpg.md).

Le module `enemies/` fournit un **catalogue** de 9 types (stats au niveau 1, échelle
proto) ; les 5 composants (gobelin + Skeleton/Slime/Orc/Wolf) partagent le moteur
`useEnemyAI` et tirent leurs stats du catalogue via `scaledStats(type, level)`. En jeu,
`dungeonGen` choisit pour chaque spawn un **type** (pool débloqué par niveau de donjon)
et un **niveau** (≈ niveau du donjon ±), et `Enemies.tsx` instancie via
`getEnemyComponent`. Un **label flottant** (nom + niveau) coiffe chaque ennemi.
Détail & suites : [`docs/roadmap-niveaux.md`](docs/roadmap-niveaux.md) (Phases 1-2 faites).
Autres pistes : [`docs/roadmap.md`](docs/roadmap.md).

# Génération procédurale

Tout passe par `src/rng.ts` (mulberry32) : **même seed ⇒ même résultat**. Aucun
appel à `Math.random()` dans `gen/`.

## Overworld (`gen/overworldGen.ts`)

Renvoie `{ decor, entrances, spawn }` :

- **decor** : ~80 rochers / arbres morts épars (positions, rotation, échelle,
  rayon de collision). Les abords du spawn (< 8 m) sont laissés dégagés.
- **entrances** : 4 entrées disposées en cercle (rayon 28 m), de type cyclique
  `keep` / `crypt` / `cave`. Chaque entrée a sa **seed dérivée** (`seed*31 + i + 1`)
  et un `approach` (point de réapparition devant le seuil).

Le rendu (`components/Overworld.tsx`) instancie le décor (peu de draw calls) et
regroupe les colliders dans un seul `RigidBody`. Les structures d'entrée
(`components/Entrance.tsx`) utilisent `colliders="hull"` : Rapier crée un collider
convexe par mesh automatiquement (tours, colonnes, rochers — rien n'est oublié).

## Donjon (`gen/dungeonGen.ts`)

Approche **block-based** sur grille d'occupation 24×24 (constantes dans
`src/config.ts`) :

1. **Salles** : ~60 tentatives de pose de rectangles (3–6 cellules de côté) ;
   rejet si chevauchement (avec une marge d'1 cellule). La grille réserve les
   cases ⇒ **zéro chevauchement** possible.
2. **Couloirs** : chaque salle est reliée à la précédente par un couloir en L
   d'1 cellule de large ⇒ **donjon connexe par construction** (vérifié : toutes
   les cases de sol sont atteignables depuis le spawn).
3. **Murs** : pour chaque cellule de sol, un panneau sur chaque côté bordant le vide.
4. **Spawn / sortie** : spawn au centre de la 1re salle ; sortie au centre de la
   salle la plus éloignée, plaquée contre un mur.
5. **Type de bloc** : un seul type de mur / sol / plafond est tiré par donjon
   (déterministe, dérivé de la seed) depuis `gen/blockTypes.ts`. Le plafond peut être
   `"none"` (zone ouverte).
6. **Ennemis** : quelques cases praticables tirées au sort (via `rng`) à > 12 m
   du point d'entrée.

Renvoie `{ floors, panels, enemies, spawn, exit, exitRot, size, seed, wallType,
floorType, ceilingType }`. Le rendu (`components/Dungeon.tsx`) instancie sol/plafond/murs
(matériaux issus du type de bloc) et pose un `CuboidCollider` orienté par panneau + un
grand collider de sol. La sortie (`exit`/`exitRot`) est matérialisée par
`components/ExitPortal.tsx`.

### Blocs (`gen/blockTypes.ts`)

Catalogue purement procédural (couleurs/rugosité, pas d'assets) : 7 types de murs,
7 de sols, 5 de plafonds, plus une ébauche de pièges (`TRAP_TYPES`) et de presets de
biome (`BIOME_PRESETS`, `getBlockTypeForBiome`) prévus pour lier le style au type
d'entrée — non encore branchés sur `dungeonGen` (qui tire un type au hasard, sans
distinction de biome).

> **Note** : c'est un générateur salles+couloirs sur grille, robuste et déterministe.
> Le système de **modules à connecteurs** décrit au GDD §4 (couloir/angle/T/salle
> chaînés par points d'accroche, géométrie 3D variée) reste une évolution possible —
> voir `roadmap.md`. La tentative précédente (`dungeonModules.ts`) a été retirée car
> sa détection de chevauchement rejetait tout module adjacent (donjon vide).

### Noms (`gen/dungeonNames.ts`)

Nom déterministe par donjon : préfixe + suffixe combinés selon le type d'entrée et la
seed (même seed ⇒ même nom).

## Étendre

- Nouveau type d'entrée : ajouter un `kind` dans `overworldGen`, un builder dans
  `Entrance.tsx`, une config de seuil dans `Portal`, un label dans `Interaction`.
- Thèmes de donjon (catacombes/cryptes/cavernes, GDD §4) : faire varier matériaux
  et seed selon la zone dans `Dungeon.tsx` / `dungeonGen.ts`.

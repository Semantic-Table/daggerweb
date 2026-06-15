# Architecture

## Vue d'ensemble

Le jeu a deux **mondes** (`overworld`, `dungeon`) gérés par état dans `App.tsx`.
On ne charge qu'un monde à la fois ; `App` choisit quoi rendre selon `mode`.

```
App (état: mode, dungeonSeed, returnId, hp)
 └─ <Canvas>
     ├─ <color> / <fog>            ← réglés par monde
     ├─ lumières                    ← ambiance + (soleil | torche) selon le monde
     ├─ <Physics> (Rapier)
     │   ├─ <Overworld> | <Dungeon> + <Enemies>
     │   └─ <Player>                ← capsule dynamique, remontée par `key` au switch
     ├─ <Interaction>               ← raycast seuil / proximité sortie + touche E
     ├─ <Sword>                     ← viewmodel (enfant caméra)
     └─ <Stats>                     ← compteur FPS (dev)
 └─ HUD DOM (viseur, hitmarker, flash dégât, barre de vie, overlay/hint)
```

## Séparation génération / rendu

Règle clé : **`src/gen/` ne dépend pas de Three.js**. Les générateurs renvoient
des positions, rotations, seeds — du JSON. Les composants `src/components/`
transforment ces données en meshes et colliders.

Avantage : la génération est testable, rejouable (seed) et indépendante du moteur
de rendu. Si on changeait de moteur, `gen/` resterait intact.

## Communication hors arbre React

Plusieurs systèmes doivent se parler sans relation parent/enfant. On utilise des
**registres de module** (un singleton importé là où c'est utile) :

| Module                 | Rôle                                                |
|------------------------|-----------------------------------------------------|
| `portals.ts`           | Seuils enregistrés → cible du raycast d'interaction |
| `combat/playerState`   | Position du joueur → lue par les ennemis            |
| `combat/enemyRegistry` | Ennemis vivants → interrogés par l'épée au swing    |
| `combat/playerCombat`  | Canal de dégâts → ennemis blessent le joueur        |

Chaque composant s'enregistre dans un `useEffect` (avec cleanup au démontage).
C'est volontairement léger : pas de Redux/Zustand tant que ça suffit.

## Transitions de monde

- **Entrer** : `Interaction` détecte un seuil visé → `onEnter(entrance)` →
  `App` fixe `dungeonSeed` + `mode='dungeon'`. Le donjon est `useMemo(seed)`.
- **Sortir** : proximité du point d'entrée → `onExit()` → retour overworld, le
  joueur réapparaît à `entrance.approach` (via `returnId`).
- **Mourir** : `hp<=0` → retour overworld + PV remis.
- Le `<Player>` est **remonté** (`key` qui change) à chaque switch pour réinitialiser
  proprement la capsule physique au bon spawn.

## Rendu pixelisé

Pas de post-process : on rend à basse résolution (`dpr` bas sur `<Canvas>`) et le
CSS `image-rendering: pixelated` agrandit en nearest-neighbor. C'est l'approche du
GDD §7, et c'est aussi un gros gain de perf (≈10× moins de pixels). Le `dpr` est le
curseur de taille de pixel.

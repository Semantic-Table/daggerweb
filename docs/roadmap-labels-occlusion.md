# Roadmap — Occlusion des labels de mob

Labels de mob implémentés via `<Html>` de drei (overlay DOM, échappant au `dpr` bas du canvas).
Le texte est net et lisible. Reste à résoudre : les labels traversent les murs.

## État actuel

`src/enemies/EnemyLabel.tsx` utilise `<Html center distanceFactor={9}>` de drei.  
L'option `occlude` de drei a été testée et abandonnée : elle lance un rayon de la caméra
vers la position du label dans le monde, mais le mesh de l'ennemi lui-même intersecte ce
rayon → self-occlusion, le label disparaît même face à l'ennemi.

## Pourquoi c'est un vrai chantier

Il n'existe pas d'option triviale dans @react-three/drei pour exclure les meshes de
l'ennemi porteur du test d'occlusion. Les pistes sérieuses impliquent toutes soit de
toucher à l'architecture des composants ennemis, soit d'écrire du code Three.js bas
niveau.

---

## Approche A — Raycast custom dans `useEnemyAI` (recommandée)

**Principe** : dans `useEnemyAI.ts`, à chaque frame, lancer un `Raycaster` de la caméra
vers la position monde du label. Filtrer les objets testés pour n'inclure QUE la
géométrie statique (murs/sol/plafond du donjon) via un layer ou un nom de groupe dédié.
Exposer un signal `labelVisible: boolean` au composant ennemi, qui le passe à
`EnemyLabel` pour basculer son CSS `opacity`.

**Avantages** : contrôle total, auto-exclusion du mesh ennemi, compatible avec l'archi
actuelle.

**Travail** :
1. Ajouter un Three.js `Layer` (ex: `LAYER_STATIC = 1`) sur tous les meshes de
   `Dungeon.tsx` (murs/sol/plafond) — ou taguer les groupes avec `userData.isStatic = true`.
2. Dans `useEnemyAI`, calculer la position monde du label (`body.current.translation()` +
   offset Y) et lancer un `Raycaster` filtré par layer/userData chaque frame (coût faible
   car 1 ray par ennemi).
3. Exposer `labelVisible` depuis `useEnemyAI`, brancher sur `EnemyLabel` via `opacity` CSS
   (transition douce 150ms).

**Coût estimé** : moyen (touche `useEnemyAI`, `Dungeon.tsx`, `EnemyLabel`).

---

## Approche B — Depth pre-pass sur canvas secondaire

**Principe** : rendre la scène statique seule dans un render target basse résolution,
lire la profondeur à la position écran du label, comparer avec la distance caméra-label.

**Avantages** : propre, GPU, pas de rayon JS.

**Inconvénients** : complexité R3F élevée (render target custom, shader de lecture depth),
coût GPU non nul, hors scope du proto.

---

## Approche C — Porter les labels en 2D canvas overlay

**Principe** : abandonner `<Html>` et projeter les positions 3D en coordonnées écran
(`Vector3.project(camera)`) dans un `<canvas>` 2D superposé au canvas Three.js.
Faire un test de profondeur manuel via la depth texture de Three.js.

**Avantages** : zéro DOM node par ennemi, rendu batché.

**Inconvénients** : réécriture complète d'`EnemyLabel`, gestion manuelle du texte canvas
2D (chargement police bitmap, etc.). Plus adapté si le nombre de mobs augmente fortement (50+).

---

## Recommandation

Implémenter **l'Approche A** quand le temps le permet. C'est la plus chirurgicale : elle
n'impacte que trois fichiers, s'intègre naturellement dans l'archi existante (registre
`useEnemyAI`) et donne un résultat identique à `occlude="blending"` sans le self-occlusion.

Les Approches B et C sont à considérer seulement si la perf devient un problème (beaucoup
de mobs simultanés) ou si on migre vers un système de labels HUD 2D complet.

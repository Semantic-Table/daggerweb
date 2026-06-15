# Combat

Première tranche jouable (cf. GDD §5) : **épée corps-à-corps** contre des
**ennemis poursuiveurs**, avec PV des deux côtés.

## Épée (`components/Sword.tsx`)

- **Viewmodel** rendu comme **enfant de la caméra** (`createPortal` vers l'objet
  caméra). Il hérite exactement de la transform caméra → aucun décalage/clip.
  La caméra est ajoutée à la scène pour que ses enfants s'affichent.
- **Swing** au clic gauche (si pointer lock actif), animation aller-retour ~0.32 s.
- **Hit = balayage**, pas raycast : tout ennemi à ≤ 2.6 m ET dans le cône frontal
  (cos > 0.5, ≈ 60°) est touché. Plus satisfaisant qu'un tir précis.
- **Réglage** via le panneau **leva** (« Épée ») : position / rotation / échelle,
  avec bouton « Copier la conf ». Les valeurs figées sont dans `DEFAULTS`.

## Ennemi (`components/Enemy.tsx`)

- Capsule **dynamique Rapier** : poursuit le joueur (`playerState.playerPos`) sur
  le plan XZ, bute sur les murs grâce à la physique. Lent et lisible (1.8 m/s).
- **3 PV**. Au coup : flash + recul (`applyImpulse`). À 0 PV : on débloque les
  rotations et on applique une impulsion → petite chute (ragdoll), puis disparition
  après 1.5 s.
- **Attaque** au contact (≤ 1.7 m) sur cooldown (~1 s) → `damagePlayer(8)`.

## Joueur (PV & dégâts)

- PV gérés dans `App.tsx` (100 max). `combat/playerCombat` relaie les dégâts des
  ennemis vers l'état React.
- Feedback : **flash rouge** en vignette, **barre de vie** en bas à gauche,
  **hitmarker** (✕) quand l'épée touche.
- **Mort** (0 PV) : retour overworld + PV remis (la mort n'est pas un reset, GDD §2).

## Tuning rapide

| Paramètre              | Où                          |
|------------------------|-----------------------------|
| Portée / cône / dégâts épée | `Sword.tsx` (REACH, CONE, DMG) |
| Vitesse / PV / attaque ennemi | `Enemy.tsx` (SPEED, HP, ATTACK_*) |
| PV joueur              | `App.tsx` (MAX_HP)          |
| Nombre d'ennemis       | `dungeonGen.ts` (n)         |

## Manques connus

Pas de son, pas de recul caméra, pas d'i-frames (stun-lock possible à plusieurs
ennemis), pas d'écran de game-over, une seule arme. Familles distance / magie du
GDD §5 non implémentées.

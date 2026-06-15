# Roadmap

État indicatif du proto vs la vision du [GDD](../GDD.md). À ajuster selon les envies.

## Fait

- [x] Base R3F + Vite + TS, physique Rapier, rendu pixelisé (GDD §7)
- [x] Déplacement FPS physique (capsule dynamique, collisions, gravité)
- [x] Overworld minimal : sol, décor, 3 types d'entrées (GDD §3)
- [x] Donjons block-based par seed + interaction au regard (GDD §4, partiel)
- [x] Combat épée + ennemis poursuiveurs + PV/mort (GDD §5, partiel)

## Priorités proches

- [ ] **Système de compétences à l'usage** (GDD §6) — XP par type d'arme
  (lame/hache/mains nues), bonus par palier. Plan détaillé :
  [`todo-competences.md`](todo-competences.md). ⬅ prochaine session.
- [ ] **Modules de donjon à connecteurs** — remplacer la grille creusée par de vrais
  modules (couloir/angle/T/salle/dead-end) chaînés par points d'accroche orientés.
  C'est le cœur technique annoncé au GDD §4.
- [ ] **Feel de combat** — son, recul caméra, i-frames, feedback de mort joueur.
- [ ] **Loot / progression** — drop d'objets, début du système de compétences à
  l'usage (GDD §6).

## Plus tard

- [ ] Armes distance & magie + mana (GDD §5)
- [ ] Thèmes visuels de donjon selon zone/seed (GDD §4)
- [ ] Sauvegarde locale (seed + état) à la sortie de donjon (GDD §6)
- [ ] Ambiance sonore générative (GDD §7)
- [ ] Palette de couleurs limitée 16–32 (GDD §7)

## Questions ouvertes (GDD §10)

- Personnage visible (mains/arme) ? → l'épée est déjà à l'écran.
- Mini-map / carte de donjon ?
- Les ennemis droppent-ils de l'équipement ou seulement de l'or ?

## Dette / nettoyage

- Retirer ou masquer le panneau **leva** pour une build propre.
- `<Stats>` est un outil de dev (compteur FPS) — à retirer aussi en prod.
- Pas de tests automatisés ; `gen/` (données pures) serait le premier candidat.

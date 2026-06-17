# Roadmap

État indicatif du proto vs la vision du [GDD](../GDD.md). À ajuster selon les envies.

## Fait

- [x] Base R3F + Vite + TS, physique Rapier, rendu pixelisé (GDD §7)
- [x] Déplacement FPS physique (capsule dynamique, collisions, gravité)
- [x] Overworld minimal : sol, décor, 3 types d'entrées (GDD §3)
- [x] Donjons block-based par seed + interaction au regard (GDD §4, partiel)
- [x] Combat épée + ennemis poursuiveurs + PV/mort (GDD §5, partiel)
- [x] Inventaire, loot sur cadavres, équipement d'armes
- [x] Compétences à l'usage par catégorie d'arme (GDD §6, proto)
- [x] **Attributs & systèmes RPG** — 8 attributs (FOR/INT/VOL/AGI/END/CHA/VIT/CHN) avec
  stats dérivées (PV max, mana, charge), progression par la pratique. Roadmap détaillée :
  [`roadmap-attributs.md`](roadmap-attributs.md).
- [x] **Équipement défensif** — armures/boucliers + Classe d'armure (AC = 10 + Σ armures) + mitigation.
  Paper-doll fonctionnel, loot d'armures. Roadmap détaillée : [`roadmap-armures.md`](roadmap-armures.md).
- [x] **Menu RPG « Grimoire »** : 6 écrans + 4 palettes (cf.
  [`todo-ui-rpg.md`](todo-ui-rpg.md)) — sacoche/équipement/aptitudes/attributs/armures branchés,
  magie et carte restent en placeholders.

## Priorités proches

- [ ] **Modules de donjon à connecteurs** — remplacer la grille creusée par de vrais
  modules (couloir/angle/T/salle/dead-end) chaînés par points d'accroche orientés.
  C'est le cœur technique annoncé au GDD §4.
- [ ] **Feel de combat** — son, recul caméra, i-frames, feedback de mort joueur.
- [ ] **Autres placeholders du Grimoire** (cf. [`todo-ui-rpg.md`](todo-ui-rpg.md)) :
  or & économie, carte branchée sur l'overworld, malus d'encombrement. La magie est un plus gros morceau
  (voir Plus tard).

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

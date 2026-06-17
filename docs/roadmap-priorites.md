# Roadmap — Priorités restantes

État des features **non encore implémentées** après synchronisation de la documentation
(commit `5479ce3`). Classées par ordre de valeur et dépendances.

---

## 🎯 Priorités proches

### 1. Modules de donjon à connecteurs (GDD §4) ✅
Remplacer la grille creusée actuelle par un système modulaire :
- [x] Bibliothèque de modules 3D (couloir/angle/T/salle/dead-end)
- [x] Chaînage par points d'accroche orientés
- [x] Seed déterministe pour la sauvegarde

**Bloc technique central** — Implémenté dans `src/gen/dungeonModules.ts` et `src/gen/dungeonGen.ts`.

---

### 2. Or & économie
- Ajouter une **monnaie** dans `inventory.ts`
- Système de **marchands** dans l'overworld
- Prix des objets liés au `value` dans `itemDefs`
- Pastille OR dans le Grimoire devient réelle

**Débloque** : économie, achat/vente d'équipement, motivation supplémentaire pour le loot.

---

### 3. Carte branchée sur l'overworld
- Dériver **marqueurs/lieux** de `overworldGen`
- Position **réelle du joueur** sur la carte
- **Voyage rapide** entre lieux découverts
- Intégration avec l'onglet Carte du Grimoire

---

### 4. Malus d'encombrement
- Activer le **malus de vitesse** quand `poids > carryMax()`
- Brancher `encumbranceMult()` (déjà dans `character.ts`) sur le mouvement
- Feedback visuel (icône, barre CHARGE en rouge ?)

**Dépend de** : Attributs (FOR → carryMax) déjà implémentés.

---

## 📅 Plus tard

### 5. Magie + mana (GDD §5)
**Gros morceau** — système complet :
- Types de magie : offensive (boule de feu) + utilitaire (lumière, téléportation)
- **Mana** : consommation par sort, régénération liée à INT/VOL
- **Écoles** : Feu, Glace, etc. avec bonus d'attributs
- Bouton **INCANTER** fonctionnel dans le Grimoire
- Loot d'objets magiques (bâtons, baguettes)

**Dépend de** : Attributs (INT → mana max) déjà implémentés.

---

### 6. Vigueur (fatigue)
- Ressource **stamina** déjà présente dans `character.ts`
- **Consommation** : courir, attaquer, bloquer
- **Malus** si vide : mouvement ralenti, dégâts réduits
- **Régénération** : liée à END/VOL

**Débloque** : profondeur tactique (gestion des ressources).

---

### 7. Bijoux (anneaux, amulette)
- Nouveau `kind: "jewelry"` dans `itemDefs`
- **Slots** : ring1, ring2, amulet dans le paper-doll
- **Effets** : bonus d'attributs, résistance, régénération
- Loot rare et puissant

**Dépend de** : Attributs pour les bonus.

---

### 8. Feel de combat
Améliorations sensorielles et feedback :
- **Son** : coups, impacts, level-up
- **Recul caméra** sur les coups puissants
- **I-frames** visuels (effet de flou, freeze frame)
- **Feedback de mort** joueur/ennemi
- **Hitmarkers** renforcés pour les critiques

**À faire en dernier** — polish pur, pas de blocage technique.

---

## 📌 Références
- Détail technique : [`roadmap-attributs.md`](roadmap-attributs.md) ✅ fait
- Détail technique : [`roadmap-armures.md`](roadmap-armures.md) ✅ fait
- Détail technique : [`roadmap-niveaux.md`](roadmap-niveaux.md) 🔜 niveaux de donjon & d'ennemi (scaling)
- État UI : [`todo-ui-rpg.md`](todo-ui-rpg.md)
- Vision globale : [`GDD.md`](../GDD.md)

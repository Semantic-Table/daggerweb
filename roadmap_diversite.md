# 🗺️ Roadmap : Diversité des Donjons & Overworld
*Objectif global* : Rendre l’exploration dynamique, immersive et réjouable, avec des mécaniques variées, des défis adaptés et un sentiment de découverte.

---

## 📌 Phase 0 : Audit & Préparation *(1-2 jours)*
**Objectif** : Comprendre l’existant et définir les contraintes.

### ✅ Livrables
- [ ] Liste des **biomes/thèmes** actuels (ex: forêt, ruine, grotte, désert).
- [ ] Inventaire des **mécaniques** existantes (pièges, énigmes, combats, interactions).
- [ ] Liste des **assets** disponibles (tilesets, modèles 3D, sons, animations).
- [ ] **Document de design** : "Règles de diversité" (ex: "1 donjon = au moins 3 types d’ennemis + 1 mécanique unique").

### 📋 Tâches
1. Lister tous les donjons/overworlds actuels et leurs caractéristiques.
2. Identifier les **points de répétition** (ex: même layout de salle, mêmes ennemis).
3. Noter les **limites techniques** (ex: taille max des cartes, nombre max d’ennemis simultanés).
4. Définir des **critères de diversité** (ex: "20% des salles doivent avoir une mécanique spéciale").

---

## 🌱 Phase 1 : Diversité de Base *(1-2 semaines)*
**Objectif** : Ajouter des variations simples mais impactantes.
**Priorité** : ✅ Faible effort / fort impact

| **Catégorie**       | **Tâches** | **Exemples** | **Livrable** |
|---------------------|------------|--------------|--------------|
| **Thèmes visuels**  | Créer 2-3 nouveaux thèmes de donjons/overworld. | Donjon glacé, temple flottant, jungle toxique. | Tilesets + palettes de couleurs. |
| **Ennemis** | Ajouter 1-2 nouveaux types d’ennemis par biome. | Slime acide (grotte), archer skeleton (ruine), scorpion (désert). | Modèles + comportements (IA). |
| **Pièges** | Implémenter 3-4 nouveaux pièges. | Lames tournantes, sol qui s’effondre, gaz toxique. | Sprites/animations + logique. |
| **Récompenses** | Diversifier les loots (pas que de l’or/exp). | Objets uniques (clef, artefact), crafting materials, sorts temporaires. | Base de données des items étendue. |
| **Musique/Ambiance** | Ajouter des pistes audio par biome. | Musique tendue (donjon), calme (overworld), effrayante (boss). | Fichiers audio + intégration. |

### ✅ Validation
- Tester chaque nouveau thème avec au moins 1 donjon complet.
- Vérifier que les ennemis/pièges sont **équilibrés** (difficulté cohérente).

---

## 🧩 Phase 2 : Mécaniques de Gameplay *(2-3 semaines)*
**Objectif** : Introduire des défis et interactions uniques.
**Priorité** : ⚠️ Effort modéré / impact élevé

| **Catégorie** | **Tâches** | **Exemples** | **Livrable** |
|--------------|------------|--------------|--------------|
| **Énigmes** | Ajouter 2-3 types d’énigmes par biome. | Puzzle de pression (plateformes), hiéroglyphes à décoder, porte verrouillée par une combinaison. | Logique + UI (si nécessaire). |
| **Environnement interactif** | Rendre le décor utilisable. | Ponts à réparer, rochers à pousser, torches à allumer pour révéler un passage. | Scripts d’interaction. |
| **Événements dynamiques** | Créer des événements aléatoires. | Caravane attaquée (overworld), effondrement de plafond (donjon), PNJ perdu. | Système de triggers + dialogues. |
| **Mécaniques de déplacement** | Varier les mouvements possibles. | Grappin, double saut, nage, téléportation (portails). | Contrôles + collisions. |
| **Boss/Miniboss** | Ajouter 1 boss unique par biome. | Dragon de glace (glace), Golem de pierre (ruine), Serpent géant (jungle). | Design + pattern d’attaque. |

### ✅ Validation
- Chaque mécanique doit avoir **au moins 2 variantes** (ex: puzzle de pression simple + version avec timing).
- Tester l’**accessibilité** (ex: énigmes résolvables sans guide).

---

## 🔄 Phase 3 : Génération Procédurale *(3-4 semaines)*
**Objectif** : Automatiser la création de contenu pour une réjouabilité infinie.
**Priorité** : 🔥 Effort élevé / impact long terme

| **Catégorie** | **Tâches** | **Exemples** | **Livrable** |
|--------------|------------|--------------|--------------|
| **Layout des donjons** | Implémenter un générateur de salles. | Salles aléatoires (tailles, formes), connexions non linéaires. | Algorithme (ex: BSP, L-systems). |
| **Placement d’objets** | Générer dynamiquement ennemis/pièges/loots. | Densité variable, règles de placement (ex: pas de piège devant une porte). | Tables de poids (ex: 30% ennemis, 10% pièges). |
| **Quêtes procédurales** | Créer des objectifs dynamiques. | "Trouve 3 artefacts dans ce donjon", "Élimine le chef des bandits". | Système de quêtes + récompenses. |
| **Biomes hybrides** | Mixer les thèmes (ex: forêt + ruine). | Zone de transition entre 2 biomes. | Règles de fusion visuelle/mécanique. |
| **Difficulté adaptative** | Ajuster la difficulté en fonction du joueur. | Plus d’ennemis si le joueur est overlevel, pièges plus complexes. | Système de scaling. |

### ✅ Validation
- Générer **100 donjons** et vérifier :
  - Pas de **soft locks** (salles inaccessibles).
  - Équilibre global (pas de donjon trop facile/trop dur).
  - Temps de génération < 1 seconde.

---

## 🎨 Phase 4 : Immersion & Narration *(2-3 semaines)*
**Objectif** : Donner du sens à l’exploration.
**Priorité** : ✨ Impact émotionnel

| **Catégorie** | **Tâches** | **Exemples** | **Livrable** |
|--------------|------------|--------------|--------------|
| **Lore environnemental** | Ajouter des indices narratifs dans le décor. | Fresques murales, livres abandonnés, dialogues de PNJ. | Textes + assets (ex: parchemins). |
| **Factions/Groupes** | Introduire des groupes avec des relations. | Bandits vs villageois, cultistes vs aventuriers. | Système d’allégeance + quêtes. |
| **Effets visuels** | Ambiance dynamique. | Brouillard, pluie, éclairs, particules de magie. | Shaders + paramètres par biome. |
| **Sons ambiants** | Sons contextuels. | Chuchotements (donjon hanté), chant d’oiseaux (forêt). | Banque de sons + déclencheurs. |
| **Histoire non linéaire** | Permettre des choix avec conséquences. | Sauver ou sacrifier un PNJ → impact sur la fin du donjon. | Arbre de dialogues + flags globaux. |

### ✅ Validation
- Vérifier que le lore est **cohérent** avec l’univers existant.
- Tester l’**immersion** avec des joueurs (feedback sur l’ambiance).

---

## 🎯 Phase 5 : Polish & Équilibrage *(1-2 semaines)*
**Objectif** : Finaliser et peaufiner l’expérience.
**Priorité** : 🎖️ Qualité finale

| **Tâches** | **Critères de succès** |
|------------|-----------------------|
| Équilibrer la difficulté de tous les donjons. | Courbe de progression fluide (pas de "mur" brutal). |
| Corriger les bugs (collisions, soft locks, exploits). | 0 bug critique (ex: joueur bloqué). |
| Optimiser les performances (FPS, temps de chargement). | < 2 secondes de chargement par donjon, 60 FPS stable. |
| Ajouter des **easter eggs** et détails cachés. | 1-2 secrets par donjon (ex: salle secrète, objet rare). |
| Créer un **tutoriel intégré** pour les nouvelles mécaniques. | Le joueur comprend les bases sans lire un guide. |
| **Playtesting** intensif avec des joueurs externes. | Feedback positif sur la diversité et la réjouabilité. |

---

## 📅 Planning Estimé *(Total : ~10-14 semaines)*

| **Phase** | **Durée** | **Dépendance** | **Équipe recommandée** |
|-----------|-----------|----------------|------------------------|
| Phase 0 : Audit | 1-2 jours | Aucune | 1 personne |
| Phase 1 : Diversité base | 1-2 semaines | Phase 0 | 1-2 personnes (art + code) |
| Phase 2 : Mécaniques | 2-3 semaines | Phase 1 | 2-3 personnes (code + design) |
| Phase 3 : Procédural | 3-4 semaines | Phase 2 | 2 personnes (code + maths) |
| Phase 4 : Immersion | 2-3 semaines | Phase 3 | 2 personnes (narratif + art) |
| Phase 5 : Polish | 1-2 semaines | Toutes les phases | Toute l’équipe |

---

## 💡 Conseils Clés
1. **Commence petit** : Phase 1 → Impact immédiat avec peu de code.
2. **Itère souvent** : Teste chaque nouvelle mécanique **dès qu’elle est implémentée**.
3. **Réutilise des assets** : Adapte des modèles/sons existants pour gagner du temps (ex: recolorisation de textures).
4. **Priorise l’équilibre** : Un donjon beau mais injouable = échec. Teste la difficulté **avant** de polish.
5. **Documente tout** :
   - Tableau des **biomes → ennemis → pièges → récompenses**.
   - **Règles de génération** (ex: "1 salle de boss tous les 5 étages").

---

## 📋 Outils Recommandés

| **Besoin** | **Outil** | **Pourquoi** |
|------------|-----------|--------------|
| Design de niveaux | Tiled, LDtk, ou Blender (3D) | Prototypage rapide des donjons. |
| Génération procédurale | Unity (DOTS), Godot (PCG), ou custom | Flexibilité pour tes besoins spécifiques. |
| Gestion de projet | Trello, Notion, ou GitHub Projects | Suivre l’avancement des tâches. |
| Playtesting | Discord (communauté), ou Itch.io | Feedback externe. |

---

## ⚠️ Pièges à Éviter
- **Trop de variété trop tôt** → Risque de **scope creep**. Concentre-toi sur 2-3 biomes **parfaits** avant d’en ajouter d’autres.
- **Mécaniques trop complexes** → Si une énigme prend +5 min à expliquer, simplifie-la.
- **Négliger l’accessibilité** → Prévois des options pour les joueurs colorblind (ex: icônes + couleurs).
- **Oublier la cohérence** → Un donjon glacé avec des ennemis du désert → brise l’immersion.

---

## 🎉 Livrable Final
À la fin de cette roadmap, tu auras :
✅ **10+ biomes/thèmes** uniques (donjons + overworld).
✅ **50+ variantes** de salles, ennemis, pièges et énigmes.
✅ **1 système de génération procédurale** pour des donjons infinis.
✅ **1 univers immersif** avec lore, factions et événements dynamiques.
✅ **1 expérience équilibrée** et polie, prête pour les joueurs.

---
*Généré par Mistral Vibe - Roadmap adaptable selon tes besoins et contraintes.*
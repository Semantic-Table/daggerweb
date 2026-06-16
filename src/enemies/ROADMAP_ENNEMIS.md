# 🎯 Roadmap : Diversité des Ennemis

*Objectif* : Ajouter de la variété aux ennemis du jeu pour rendre les combats plus riches et l'exploration plus immersive.
*Contexte* : Actuellement, seul le Gobelin est implémenté.

---

## 📊 Statut Actuel

### ✅ Implémentés (5/8)
| Ennemi | Type | Stats | Modèle 3D | Comportement | Statut |
|--------|------|-------|-----------|--------------|--------|
| Gobelin | Fast | 40 PV, 8 dmg | ✅ | Corps-à-corps | ✅ Déjà existant |
| Squelette | Chaser | 55 PV, 12 dmg | ✅ | Corps-à-corps | ✅ Nouveau |
| Slime | Ranged | 60 PV, 14 dmg | ✅ | Projectiles | ✅ Nouveau |
| Orc | Tank | 80 PV, 18 dmg | ✅ | Corps-à-corps | ✅ Nouveau |
| Loup | Fast | 35 PV, 10 dmg | ✅ | Corps-à-corps | ✅ Nouveau |

### 🔲 À Implémenter (3/8)
| Ennemi | Type | Stats | Modèle 3D | Comportement | Priorité |
|--------|------|-------|-----------|--------------|----------|
| Archer Squelette | Ranged | 40 PV, 10 dmg | ❌ | Flèches | Moyenne |
| Troll | Tank | 120 PV, 25 dmg | ❌ | Régénération | Moyenne |
| Araignée | Fast | 50 PV, 12 dmg | ❌ | Poison | Basse |
| Nécromancien | Ranged | 70 PV, 0 dmg | ❌ | Invocation | Haute |

---

## 🎨 Modèles Créés

Tous les modèles sont **générés procéduralement** en code (React Three Fiber + Three.js) :

### 1. **Squelette** (`Skeleton.tsx`)
- **Style** : Os blancs/gris, yeux rouges émissifs
- **Détails** : Colonne vertébrale en capsules, crâne avec mâchoire, épaules sphériques
- **Variantes** : 70% avec épée, teintes d'os variables
- **Animations** : Marche avec mouvement des bras, attaque avec lune de l'épée

### 2. **Slime** (`Slime.tsx`)
- **Style** : Sphère gélatineuse verte avec reflets
- **Détails** : Bouche en forme de sourire, yeux blancs avec pupilles, corps semi-transparent émissif
- **Variantes** : 70% avec yeux, taille de pulsation variable
- **Comportement** : Attaque à distance (projectiles d'acide)
- **Animations** : Pulsation constante, rebond en marchant

### 3. **Orc** (`Orc.tsx`)
- **Style** : Peau brune/grise, muscles proéminents
- **Détails** : Torse massif, bras musclés, jambes larges, tête avec défenses
- **Variantes** : 80% avec hache, 50% avec casque, 40% avec cicatrices
- **Animations** : Mouvements lourds, attaque puissante avec la hache

### 4. **Loup** (`Wolf.tsx`)
- **Style** : Fourrure brune, ventre clair, yeux jaunes émissifs
- **Détails** : Corps quadrupède, tête avec museau, oreilles pointues, queue mobile
- **Variantes** : 30% loup alpha (plus grand, avec collier), taille de queue variable
- **Animations** : Course avec mouvement de queue, tête qui suit le joueur

---

## 📁 Structure des Fichiers

```
src/enemies/
├── index.ts              # Exports centralisés + utilitaires
├── enemyTypes.ts        # Définitions des types, stats, apparences
├── ROADMAP_ENNEMIS.md   # Cette roadmap
├── Skeleton.tsx         # Composant Squelette
├── Slime.tsx            # Composant Slime
├── Orc.tsx              # Composant Orc
├── Wolf.tsx             # Composant Loup
└── [À créer]
    ├── SkeletonArcher.tsx
    ├── Troll.tsx
    ├── Spider.tsx
    └── Necromancer.tsx
```

---

## 🚀 Phases d'Implémentation

### Phase 1 : ✅ Terminé - Base de données des ennemis
- [x] Créer `enemyTypes.ts` avec tous les types d'ennemis
- [x] Définir stats, apparences, animations pour chaque ennemi
- [x] Ajouter utilitaires de sélection (par biome, aléatoire)

### Phase 2 : ✅ Terminé - Premiers ennemis (4/8)
- [x] Implémenter Squelette
- [x] Implémenter Slime
- [x] Implémenter Orc
- [x] Implémenter Loup
- [x] Créer `index.ts` pour exports centralisés

### Phase 3 : 🔄 En Cours - Intégration
- [ ] Tester chaque ennemi individuellement
- [ ] Vérifier l'équilibre des stats
- [ ] Corriger les bugs d'animation
- [ ] Intégrer dans les donjons existants

### Phase 4 : 📋 Planifié - Ennemis avancés (3/8)
- [ ] Implémenter Archer Squelette (avec projectiles)
- [ ] Implémenter Troll (avec régénération)
- [ ] Implémenter Araignée (avec poison)
- [ ] Implémenter Nécromancien (avec invocation)

### Phase 5 : 🎯 Future - Améliorations
- [ ] Ajouter des sons spécifiques par ennemi
- [ ] Implémenter des attaques spéciales uniques
- [ ] Ajouter des variantes de couleurs par biome
- [ ] Créer des animations de mort plus élaborées
- [ ] Optimiser les performances (LOD, pooling)

---

## 📊 Équilibrage des Stats

| Ennemi | PV | Dégâts | Vitesse | Portée | Armure | EXP | Tier |
|--------|----|--------|---------|-------|--------|-----|------|
| Gobelin | 40 | 8 | 3.5 | 1.2 | 0% | 25 | 1 |
| Squelette | 55 | 12 | 2.8 | 1.4 | 10% | 35 | 2 |
| Loup | 35 | 10 | 4.5 | 1.1 | 5% | 30 | 1 |
| Slime | 60 | 14 | 1.8 | 7.0 | 30% | 45 | 2 |
| Orc | 80 | 18 | 2.2 | 1.6 | 25% | 50 | 3 |
| Archer Squelette | 40 | 10 | 2.0 | 8.0 | 5% | 40 | 2 |
| Troll | 120 | 25 | 1.5 | 1.8 | 40% | 75 | 4 |
| Araignée | 50 | 12 | 4.0 | 1.3 | 15% | 55 | 3 |
| Nécromancien | 70 | 0 | 2.0 | 10.0 | 10% | 100 | 5 |

---

## 🎨 Palette de Couleurs

| Ennemi | Primaire | Secondaire | Accent | Yeux |
|--------|----------|-----------|--------|------|
| Gobelin | #4a7c2e | #3a6040 | #2a4020 | #f0d020 |
| Squelette | #e0e0e0 | #b8b8b8 | #333333 | #ff4444 |
| Slime | #4caf50 | #2e7d32 | #8bc34a | #ffffff |
| Orc | #5a4d3a | #3a3224 | #8a7d68 | #ffcc44 |
| Loup | #5d4037 | #4e342e | #3e2723 | #ffeb3b |
| Archer Squelette | #d0d0d0 | #a8a8a8 | #2a1a0a | #ff6666 |
| Troll | #4e342e | #3e2723 | #5d4037 | #ff5722 |
| Araignée | #263238 | #37474f | #455a64 | #00bcd4 |
| Nécromancien | #1a237e | #303f9f | #5c6bc0 | #ff1744 |

---

## 🔧 Intégration dans le Jeu

### Utilisation basique

```tsx
import { Skeleton, Slime, Orc, Wolf, getEnemyComponent } from "../enemies";

// Utilisation directe
<Skeleton spawn={[0, 0]} index={0} />
<Slime spawn={[5, 5]} index={1} />

// Utilisation dynamique
const EnemyComponent = getEnemyComponent("skeleton");
<EnemyComponent spawn={[10, 10]} index={2} />
```

### Génération aléatoire par biome

```tsx
import { createRandomEnemyForBiome } from "../enemies";

const { typeId, Component } = createRandomEnemyForBiome("forest", [x, z], index);
<Component spawn={[x, z]} index={index} />
```

### Biomes et ennemis associés

| Biome | Ennemis Primaires | Ennemi Rare |
|-------|-------------------|-------------|
| Forêt | Gobelin, Loup, Araignée | Orc |
| Grotte | Gobelin, Troll, Slime | Nécromancien |
| Ruine | Squelette, Archer Squelette | Nécromancien |
| Désert | Loup, Archer Squelette | Scorpion (à ajouter) |
| Glace | Troll, Loup | Squelette |
| Temple | Squelette, Archer Squelette, Nécromancien | Gobelin |

---

## 🎯 Prochaines Étapes

1. **Tester** les 4 nouveaux ennemis dans un donjon de test
2. **Corriger** les bugs d'animation et de collision
3. **Équilibrer** les stats si nécessaire
4. **Implémenter** les 4 ennemis restants (Archer, Troll, Araignée, Nécromancien)
5. **Intégrer** dans la génération procédurale des donjons

---

## ✅ Checklist de Validation

- [ ] Tous les ennemis se déplacent correctement
- [ ] Tous les ennemis attaquent le joueur
- [ ] Tous les ennemis peuvent être tués
- [ ] Les cadavres restent en place et peuvent être fouillés
- [ ] Les animations sont fluides
- [ ] Les collisions fonctionnent correctement
- [ ] Les stats sont équilibrées
- [ ] Les couleurs sont cohérentes
- [ ] Pas de bugs visuels (clipping, etc.)

---

## 📝 Notes Techniques

### Architecture
- Chaque ennemi est un **composant React** indépendant
- Les modèles sont **100% procéduraux** (pas de fichiers .glb/.fbx)
- Utilisation de **RigidBody** (Rapier) pour la physique
- **CapsuleCollider** pour les collisions
- **useFrame** pour les animations et la logique

### Performances
- Chaque ennemi a son propre RigidBody (coût physique)
- Les projectiles (Slime) sont des meshes simples sans physique
- Les animations sont basées sur des calculs mathématiques (pas de bones/skinning)

### Extensibilité
- Ajouter un nouvel ennemi = créer un nouveau fichier .tsx
- Définir son type dans `enemyTypes.ts`
- L'exporter dans `index.ts`
- Intégrer dans les fonctions utilitaires

---

## 💡 Conseils

1. **Tester un ennemi à la fois** avant d'en ajouter d'autres
2. **Commencer par les plus simples** (Squelette, Slime) avant les complexes (Nécromancien)
3. **Réutiliser le code** des ennemis existants comme base
4. **Vérifier les collisions** avec le joueur et l'environnement
5. **Équilibrer les stats** en jouant chaque ennemi

---

*Généré par Mistral Vibe - Mise à jour : 16 juin 2026*

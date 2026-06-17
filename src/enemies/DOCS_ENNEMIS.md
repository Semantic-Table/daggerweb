# 👹 Documentation : Système d'Ennemis

*Dernière mise à jour : 17 juin 2026*
*Statut : 5/8 ennemis implémentés*

---

## 📋 Sommaire
1. [Architecture](#-architecture)
2. [Types d'Ennemis](#-types-dennemis)
3. [Ennemis Implémentés](#-ennemis-implémentés)
4. [Ennemis Définis mais Non Implémentés](#-ennemis-définis-mais-non-implémentés)
5. [Système de Sélection](#-système-de-sélection)
6. [Intégration dans les Donjons](#-intégration-dans-les-donjons)
7. [Biomes et Ennemis](#-biomes-et-ennemis)

---

## 🏗️ Architecture

### Structure des Fichiers
```
src/enemies/
├── index.ts              # Exports centralisés + utilitaires
├── enemyTypes.ts        # Définitions des types, stats, apparences
├── DOCS_ENNEMIS.md      # Cette documentation
├── Skeleton.tsx         # Composant Squelette ✅
├── Slime.tsx            # Composant Slime ✅
├── Orc.tsx              # Composant Orc ✅
├── Wolf.tsx             # Composant Loup ✅
├── Goblin.tsx           # À créer (actuellement dans components/Enemy.tsx)
├── ROADMAP_ENNEMIS.md   # Roadmap d'implémentation
└── [À implémenter]
    ├── SkeletonArcher.tsx
    ├── Troll.tsx
    ├── Spider.tsx
    └── Necromancer.tsx
```

### Dépendances
- **React + React Three Fiber** : Pour les composants 3D
- **Three.js** : Pour les modèles procéduraux
- **Rapier** : Pour la physique (RigidBody, Colliders)
- **src/rng.ts** : Pour la génération aléatoire

---

## 🎭 Types d'Ennemis

### Comportements (Behaviors)

```typescript
export type EnemyBehavior = 
  | "chaser"        // Poursuit le joueur en corps-à-corps
  | "ranged"       // Attaque à distance (projectiles)
  | "tank"         // Lent mais résistant, attaque puissante
  | "fast"         // Rapide, attaque rapide mais faible
  | "boss"         // Boss avec patterns spéciaux
  | "passive"      // Ne attaque pas (ex: animal, PNJ hostile si provoqué)
  | "swarm";       // Petit ennemi qui attaque en groupe
```

### Structure d'un Type d'Ennemi

```typescript
export interface EnemyType {
  id: string;              // Identifiant unique
  name: string;            // Nom affiché
  description: string;     // Description
  behavior: EnemyBehavior; // Comportement
  stats: EnemyStats;       // Statistiques de combat
  appearance: EnemyAppearance; // Apparence visuelle
  animations: EnemyAnimations; // Paramètres d'animation
  scale: number;           // Échelle du modèle
  height: number;          // Hauteur totale
  colliderOffsetY: number; // Offset vertical du collider
}
```

---

## ✅ Ennemis Implémentés (5/8)

### 1. Gobelin
- **ID** : `goblin`
- **Comportement** : `fast` (rapide, corps-à-corps)
- **Stats** : 40 PV, 8 dégâts, vitesse 3.5
- **Couleur** : Vert (#4a7c2e)
- **Fichier** : Actuellement dans `src/components/Enemy.tsx`
- **Statut** : ✅ Implémenté (déjà existant avant la refonte)

### 2. Squelette
- **ID** : `skeleton`
- **Comportement** : `chaser` (poursuite, corps-à-corps)
- **Stats** : 55 PV, 12 dégâts, vitesse 2.8, armure 10%
- **Couleur** : Blanc/gris (#e0e0e0)
- **Fichier** : `Skeleton.tsx`
- **Statut** : ✅ Implémenté
- **Détails** : Modèle procédural avec colonne vertébrale, crâne, épaules

### 3. Slime
- **ID** : `slime`
- **Comportement** : `ranged` (attaque à distance)
- **Stats** : 60 PV, 14 dégâts, portée 7.0, vitesse 1.8, armure 30%
- **Couleur** : Vert (#4caf50) avec émission
- **Fichier** : `Slime.tsx`
- **Statut** : ✅ Implémenté
- **Détails** : Sphère gélatineuse, attaque avec projectiles d'acide

### 4. Orc
- **ID** : `orc`
- **Comportement** : `tank` (lent mais puissant)
- **Stats** : 80 PV, 18 dégâts, vitesse 2.2, armure 25%
- **Couleur** : Brun (#5a4d3a)
- **Fichier** : `Orc.tsx`
- **Statut** : ✅ Implémenté
- **Détails** : Torse massif, bras musclés, hache

### 5. Loup
- **ID** : `wolf`
- **Comportement** : `fast` (très rapide, corps-à-corps)
- **Stats** : 35 PV, 10 dégâts, vitesse 4.5, armure 5%
- **Couleur** : Brun (#5d4037)
- **Fichier** : `Wolf.tsx`
- **Statut** : ✅ Implémenté
- **Détails** : Quadrupède, yeux jaunes émissifs, queue mobile

---

## ❌ Ennemis Définis mais Non Implémentés (3/8)

| ID | Nom | Comportement | Stats | Fichier | Priorité |
|----|-----|--------------|-------|--------|----------|
| `skeletonArcher` | Archer Squelette | `ranged` | 40 PV, 10 dmg, portée 8.0 | À créer | Moyenne |
| `troll` | Troll des Cavernes | `tank` | 120 PV, 25 dmg, régénération | À créer | Moyenne |
| `spider` | Araignée Géante | `fast` | 50 PV, 12 dmg, poison | À créer | Basse |
| `necromancer` | Nécromancien | `ranged` | 70 PV, invocation | À créer | Haute |

### Stats Détaillées

#### Archer Squelette
```typescript
{
  hp: 40,
  attackDamage: 10,
  attackCooldown: 2.0,
  attackRange: 8.0,
  speed: 2.0,
  stopDistance: 6.0,
  armor: 0.05,
  expValue: 40,
  lootTier: 2
}
```

#### Troll
```typescript
{
  hp: 120,
  attackDamage: 25,
  attackCooldown: 1.5,
  attackRange: 1.8,
  speed: 1.5,
  stopDistance: 1.6,
  armor: 0.4,  // 40% de réduction
  expValue: 75,
  lootTier: 4
}
```
*Spécial : Régénère des PV*

#### Araignée
```typescript
{
  hp: 50,
  attackDamage: 12,
  attackCooldown: 0.7,
  attackRange: 1.3,
  speed: 4.0,
  stopDistance: 1.1,
  armor: 0.15,
  expValue: 55,
  lootTier: 3
}
```
*Spécial : Poison (dégâts continus)*

#### Nécromancien
```typescript
{
  hp: 70,
  attackDamage: 0,  // N'inflige pas de dégâts directement
  attackCooldown: 5.0,  // Temps entre les invocations
  attackRange: 10.0,
  speed: 2.0,
  stopDistance: 8.0,
  armor: 0.1,
  expValue: 100,
  lootTier: 5
}
```
*Spécial : Invoque des squelettes*

---

## 🎯 Système de Sélection

### Fonctions Utilitaires dans `index.ts`

#### `getEnemyComponent(typeId: string)`
Retourne le composant React correspondant à un type d'ennemi.

```typescript
const components: Record<string, React.ComponentType<{ spawn: [number, number]; index: number }>> = {
  goblin: Goblin,
  skeleton: Skeleton,
  slime: Slime,
  orc: Orc,
  wolf: Wolf,
  skeletonArcher: Skeleton, // Fallback
  troll: () => null,        // À implémenter
  spider: () => null,       // À implémenter
  necromancer: () => null,  // À implémenter
};
```

#### `createRandomEnemyForBiome(biome: string, spawn: [number, number], index: number)`
Crée un ennemi aléatoire adapté à un biome.

```typescript
const { typeId, Component, spawn, index } = createRandomEnemyForBiome("forest", [x, z], index);
<Component spawn={[x, z]} index={index} />
```

#### `createRandomEnemy(spawn: [number, number], index: number)`
Crée un ennemi aléatoire (tous biomes confondus).

### Liste des Ennemis Implémentés

```typescript
export const IMPLEMENTED_ENEMIES = [
  "goblin",
  "skeleton", 
  "slime",
  "orc",
  "wolf"
] as const;

export type ImplementedEnemyId = typeof IMPLEMENTED_ENEMIES[number];
```

---

## 🗺️ Intégration dans les Donjons

### Dans `dungeonGen.ts`

Le générateur de donjons place les ennemis ainsi :

```typescript
// 1. Récupère toutes les cellules praticables éloignées du spawn
const pool = floors.filter(([x, z]) => Math.hypot(x - sx, z - sz) > DUNGEON_ENEMY_MIN_DIST);

// 2. Sélectionne un nombre limité d'ennemis (max 4)
const n = Math.min(DUNGEON_MAX_ENEMIES, pool.length);

// 3. Place aléatoirement les ennemis
for (let i = 0; i < n; i++) {
  const idx = Math.floor(rng() * pool.length);
  enemies.push(pool.splice(idx, 1)[0]);
}
```

### Utilisation dans le Rendu

```tsx
// Dans le composant Dungeon
{dungeonData.enemies.map(([x, z], i) => {
  const { typeId, Component } = createRandomEnemy([x, z], i);
  return <Component key={i} spawn={[x, z]} index={i} />;
})}
```

---

## 🌲 Biomes et Ennemis

### Association Biome → Ennemis

Définie dans `enemyTypes.ts` :

```typescript
const biomeEnemies: Record<string, string[]> = {
  forest: ["goblin", "wolf", "spider"],
  cave: ["goblin", "troll", "slime"],
  ruin: ["skeleton", "skeletonArcher", "necromancer"],
  desert: ["wolf", "scorpion", "skeletonArcher"],
  ice: ["troll", "wolf", "skeleton"],
  temple: ["skeleton", "skeletonArcher", "necromancer", "goblin"],
  default: ["goblin", "skeleton", "wolf", "slime"],
};
```

### Fonction `getEnemyForBiome(biome: string, exclude: string[] = [])`

Sélectionne un ennemi aléatoire pour un biome donné, en excluant certains types.

```typescript
const enemy = getEnemyForBiome("cave", ["troll", "spider"]); // Goblin ou Slime
```

---

## 📊 Statistiques Comparées

| Ennemi | PV | Dégâts | Vitesse | Portée | Armure | EXP | Tier |
|--------|----|--------|---------|-------|--------|-----|------|
| Gobelin | 40 | 8 | 3.5 | 1.2 | 0% | 25 | 1 |
| **Loup** | **35** | **10** | **4.5** | 1.1 | 5% | 30 | 1 |
| Squelette | 55 | 12 | 2.8 | 1.4 | 10% | 35 | 2 |
| **Slime** | **60** | **14** | 1.8 | **7.0** | **30%** | 45 | 2 |
| Orc | 80 | 18 | 2.2 | 1.6 | 25% | 50 | 3 |
| Archer Squelette | 40 | 10 | 2.0 | **8.0** | 5% | 40 | 2 |
| Araignée | 50 | 12 | **4.0** | 1.3 | 15% | 55 | 3 |
| Troll | **120** | **25** | 1.5 | 1.8 | **40%** | 75 | 4 |
| Nécromancien | 70 | 0 | 2.0 | **10.0** | 10% | **100** | **5** |

### Observations
- **Plus rapide** : Loup (4.5) > Araignée (4.0) > Gobelin (3.5)
- **Plus résistant** : Troll (120 PV, 40% armure)
- **Plus dangereux à distance** : Nécromancien (portée 10.0, invoque)
- **Meilleur loot** : Nécromancien (Tier 5, 100 EXP)

---

## 🎨 Apparence Visuelle

### Palette de Couleurs

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

### Style des Modèles

Tous les modèles sont **100% procéduraux** :
- **Pas de fichiers .glb/.fbx** externes
- **Générés en code** avec Three.js
- **Low-poly** pour les performances
- **Flat shading** pour un style cohérent

---

## 🚀 Prochaines Étapes

### Priorité 1 : Tester les Ennemis Existants
- [ ] Vérifier que chaque ennemi se déplace correctement
- [ ] Vérifier que chaque ennemi attaque le joueur
- [ ] Vérifier que chaque ennemi peut être tué
- [ ] Vérifier les collisions
- [ ] Équilibrer les stats si nécessaire

### Priorité 2 : Implémenter les Ennemis Manquants
- [ ] Archer Squelette (projectiles)
- [ ] Troll (régénération)
- [ ] Araignée (poison)
- [ ] Nécromancien (invocations)

### Priorité 3 : Améliorations
- [ ] Ajouter des sons spécifiques par ennemi
- [ ] Implémenter des attaques spéciales uniques
- [ ] Ajouter des variantes de couleurs par biome
- [ ] Optimiser les performances (LOD, pooling)

---

## 📝 Notes Techniques

### Architecture
- Chaque ennemi est un **composant React** indépendant
- Les modèles sont **100% procéduraux** (pas de fichiers externes)
- Utilisation de **RigidBody** (Rapier) pour la physique
- **CapsuleCollider** pour les collisions
- **useFrame** pour les animations et la logique

### Performances
- Chaque ennemi a son propre RigidBody (coût physique)
- Les projectiles (Slime) sont des meshes simples sans physique
- Les animations sont basées sur des calculs mathématiques (pas de bones/skinning)

### Extensibilité
Ajouter un nouvel ennemi :
1. Créer un nouveau fichier `.tsx` dans `src/enemies/`
2. Définir son type dans `enemyTypes.ts`
3. L'exporter dans `index.ts`
4. Intégrer dans les fonctions utilitaires

---

*Document généré par Mistral Vibe - À compléter au fur et à mesure*

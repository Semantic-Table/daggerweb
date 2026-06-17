# 🏗️ Documentation : Système de Génération de Donjons

*Dernière mise à jour : 17 juin 2026*
*Statut : En cours de refonte pour plus de diversité*

---

## 📋 Sommaire
1. [Architecture Actuelle](#-architecture-actuelle)
2. [Algorithme de Génération](#-algorithme-de-génération)
3. [Types de Donjons](#-types-de-donjons)
4. [Sorties du Générateur](#-sorties-du-générateur)
5. [Configuration](#-configuration)
6. [Points Forts](#-points-forts)
7. [Limites & Améliorations](#-limites--améliorations)
8. [Roadmap Génération](#-roadmap-génération)

---

## 🏛️ Architecture Actuelle

### Fichiers Clés
```
src/gen/
├── dungeonGen.ts      # Génération des donjons (algorithme + données)
├── dungeonNames.ts    # Génération des noms de donjons
└── overworldGen.ts    # Génération de l'overworld + entrées de donjons

src/config.ts         # Constantes de génération (DUNGEON_SIZE, etc.)
```

### Dépendances
- **Aucune dépendance externe** : Pure TypeScript, pas de Three.js dans la génération
- **`rng.ts`** : Moteur de nombres aléatoires déterministe (pour la reproductibilité)
- **React Three Fiber** : Utilisé pour le rendu, mais **découplé** de la génération

---

## 🎲 Algorithme de Génération

### Méthode : **Drunk Walker + Rooms**

Le système utilise une approche **hybride** :

1. **Drunk Walker** (Marcheur ivre) : Crée des chemins organiques
2. **Rooms** (Salles) : Ajoute des espaces ouverts aléatoires

#### Détail de `carve()` dans `dungeonGen.ts`

```typescript
function carve(rng: Rng, size: number): boolean[] {
  // 1. Initialisation : grille vide
  const floor = new Array<boolean>(size * size).fill(false);
  
  // 2. Drunk Walker : 3-5 marcheurs qui creusent aléatoirement
  const walkers = randInt(rng, 3, 5);
  const steps = Math.floor(size * size * DUNGEON_CELL_RATIO); // ~34 cellules pour size=24
  
  // Chaque marcheur part du centre et creuse des cellules
  for (let w = 0; w < walkers; w++) {
    let x = center, y = center;
    for (let s = 0; s < steps; s++) {
      floor[idx(x, y)] = true; // Creuse la cellule
      const dir = randInt(rng, 0, 3); // Direction aléatoire
      // Déplace le marcheur
    }
  }
  
  // 3. Ajout de salles : 2-4 salles rectangulaires aléatoires
  const rooms = randInt(rng, 2, 4);
  for (let r = 0; r < rooms; r++) {
    const rw = randInt(rng, 2, 4); // Largeur : 2-4
    const rh = randInt(rng, 2, 4); // Hauteur : 2-4
    // Position aléatoire (en évitant les bords)
    for (let y = ry; y < ry + rh; y++)
      for (let x = rx; x < rx + rw; x++) 
        floor[idx(x, y)] = true; // Creuse la salle
  }
  
  floor[idx(center, center)] = true; // Garantit que le centre est praticable
  return floor;
}
```

### Paramètres de Génération
| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| `DUNGEON_SIZE` | 24 | Taille de la grille (24x24 cellules) |
| `DUNGEON_CELL_RATIO` | 0.12 | ~28% des cellules sont creusées |
| `CELL` | 4 | Taille d'une cellule en unités monde |
| `WALL_H` | 3.5 | Hauteur des murs |

---

## 🏰 Types de Donjons

### Définis dans `overworldGen.ts`

```typescript
export type EntranceKind = "keep" | "crypt" | "cave";
```

| Type | Description | Exemple de nom |
|------|-------------|----------------|
| `keep` | Forteresse/Donjon | "Forteresse des Ténèbres", "Citadelle Maudite" |
| `crypt` | Crypte/Tombeau | "Crypte des Âmes", "Nécropole Oubliée" |
| `cave` | Grotte/Caverne | "Grotte du Dragon", "Antre Sombre" |

### Génération des noms
- **Préfixes + Suffixes** combinés aléatoirement mais **déterministe** (même seed = même nom)
- 15 préfixes et 15 suffixes par type → **225 combinaisons uniques par type**
- Exemple : `generateDungeonName("keep", 42)` → "Donjon du Corbeau"

---

## 📤 Sorties du Générateur

### Structure `DungeonData`

```typescript
export interface DungeonData {
  floors: [number, number][];      // Centres des cellules praticables (x, z)
  panels: WallPanel[];            // Murs (position x, z, rotation)
  enemies: [number, number][];    // Positions de spawn des ennemis
  spawn: [number, number, number]; // Position de l'œil du joueur (x, y=1.6, z)
  exit: [number, number, number];  // Position du seuil de sortie
  exitRot: number;               // Orientation du seuil (Y)
  size: number;                   // Taille de la grille
  seed: number;                   // Seed utilisée pour la génération
  wallType: WallBlockType;        // Type de mur unique du donjon (cf. blockTypes.ts)
  floorType: FloorBlockType;      // Type de sol unique du donjon
  ceilingType: CeilingBlockType;  // Type de plafond ("none" = zone ouverte)
}

export interface WallPanel {
  x: number;   // Position X du centre du panneau
  z: number;   // Position Z du centre du panneau  
  rot: number; // Rotation : 0 = N/S, PI/2 = E/O
}
```

### Exemple de sortie
```json
{
  "floors": [[0, 0], [4, 0], [8, 0], ...],
  "panels": [
    {"x": 2, "z": 0, "rot": 1.57},  // Mur Est-Ouest
    {"x": 0, "z": -2, "rot": 0}     // Mur Nord-Sud
  ],
  "enemies": [[10, 5], [15, -8]],
  "spawn": [0, 1.6, 0],
  "exit": [20, 0, 0],
  "exitRot": 0,
  "size": 24,
  "seed": 42,
  "wallType": "brick",
  "floorType": "tiles",
  "ceilingType": "stone"
}
```

### Placement des Ennemis
- **Nombre max** : `DUNGEON_MAX_ENEMIES = 4`
- **Distance min au spawn** : `DUNGEON_ENEMY_MIN_DIST = 12` (unités monde)
- **Sélection aléatoire** parmi les cellules praticables éloignées du centre

---

## ⚙️ Configuration

### Dans `src/config.ts`

```typescript
// Génération de donjon
export const DUNGEON_SIZE = 24;
export const DUNGEON_CELL_RATIO = 0.12;       // ~28% de cellules creusées
export const DUNGEON_ENEMY_MIN_DIST = 12;    // Distance min au spawn
export const DUNGEON_MAX_ENEMIES = 4;        // Max 4 ennemis par donjon
```

### Impact des Paramètres

| Paramètre | Effet si augmenté | Effet si diminué |
|-----------|-------------------|------------------|
| `DUNGEON_SIZE` | Donjons plus grands | Donjons plus petits |
| `DUNGEON_CELL_RATIO` | Plus de cellules creusées | Moins de cellules, plus de murs |
| `DUNGEON_MAX_ENEMIES` | Plus d'ennemis | Moins d'ennemis |
| `DUNGEON_ENEMY_MIN_DIST` | Ennemis plus loin du spawn | Ennemis plus près du spawn |

---

## ✅ Points Forts

### 1. **Approche Données Pures**
- ✅ **Découplage total** entre génération et rendu
- ✅ **Pas de dépendance Three.js** dans la génération
- ✅ **Facile à tester** (pas besoin de rendu)
- ✅ **Réutilisable** pour d'autres jeux

### 2. **Reproductibilité**
- ✅ **Même seed = même donjon** (déterministe)
- ✅ **Noms de donjons déterministes**
- ✅ **Bon pour la sauvegarde** (seed sauvegardée)

### 3. **Simple et Compréhensible**
- ✅ **Algorithme clair** (Drunk Walker + Rooms)
- ✅ **Peu de code** (~125 lignes pour la génération)
- ✅ **Facile à modifier**

### 4. **Types de Donjons**
- ✅ **3 types distincts** (keep, crypt, cave)
- ✅ **Noms variés et thématiques**

---

## ⚠️ Limites & Améliorations

### 🔴 Limites Majeures

| Limite | Impact | Solution Proposée |
|--------|--------|-------------------|
| **Peu de variété de blocs** | Donjons monotones | Ajouter des types de murs/sols |
| **Pas de pièces spéciales** | Pas de salle du trésor, boss, etc. | Ajouter des rules de placement |
| **Génération basique** | Donjons peu intéressants | Algorithme plus sophistiqué |
| **Pas de pièges** | Moins de challenge | Ajouter un système de pièges |
| **Pas de loot** | Moins de motivation | Ajouter des coffres/objets |
| **Placement ennemis basique** | Peu stratégique | Placement intelligent (groupes, etc.) |

### 🟡 Limites Mineures

| Limite | Impact | Solution Proposée |
|--------|--------|-------------------|
| **Taille fixe** | Tous les donjons ont la même taille | Taille variable par type |
| **Forme carrée** | Donjons toujours carrés | Formes variables (rectangle, cercle) |
| **Pas de connexions** | Pas de donjons connectés | Génération multi-donjons |
| **Sortie simple** | Sortie toujours au centre | Sortie variable (bordure) |

### 🟢 Améliorations Immédiates (Priorité)

1. **🎯 Ajouter des types de blocs**
   - Murs de différents styles (pierre, brique, bois)
   - Sols variés (pierre, terre, herbe)
   - Pièges (lames, fosses, pièges à fléchettes)
   - Objets interactifs (leviers, portes)

2. **🎯 Ajouter des salles spéciales**
   - Salle du trésor (avec loot)
   - Salle de boss (avec ennemi puissant)
   - Salle de repos (sans ennemis)
   - Salle piégée (beaucoup de pièges)

3. **🎯 Améliorer l'algorithme**
   - Éviter les zones isolées (soft locks)
   - Garantir un chemin vers la sortie
   - Ajouter des couloirs en L, T, etc.

---

## 🗺️ Roadmap Génération (Proposition)

### Phase 1 : **Blocs de Base** ⭐ *PRIORITÉ*
**Objectif** : Ajouter de la variété visuelle et fonctionnelle aux donjons

| Élément | Tâches | Livrable | Durée |
|---------|--------|----------|-------|
| **Types de murs** | Créer 3-4 types de murs | `blockTypes.ts` | 2-3 jours |
| **Types de sols** | Créer 3-4 types de sols | `blockTypes.ts` | 1-2 jours |
| **Pièges simples** | 2-3 types de pièges | `trapTypes.ts` | 2-3 jours |
| **Intégration** | Modifier `dungeonGen.ts` pour utiliser les nouveaux blocs | Donjon avec blocs variés | 1-2 jours |

**Total** : 1-2 semaines

### Phase 2 : **Salles Spéciales**
**Objectif** : Ajouter des salles avec des fonctions particulières

| Élément | Tâches | Livrable |
|---------|--------|----------|
| **Salle du trésor** | Placement de coffres | Coffres générés |
| **Salle de boss** | Placement d'un ennemi puissant | Boss unique |
| **Salle piégée** | Concentration de pièges | Pièges intelligemment placés |
| **Salle de repos** | Zone sans ennemis | Zone safe |

### Phase 3 : **Algorithme Amélioré**
**Objectif** : Génération plus intelligente et variée

| Élément | Tâches | Livrable |
|---------|--------|----------|
| **Éviter les soft locks** | Vérifier la connectivité | Donjons toujours jouables |
| **Chemins plus naturels** | Utiliser BSP ou L-systems | Donjons plus organiques |
| **Taille variable** | Adapter la taille au type | Donjons de tailles différentes |

### Phase 4 : **Génération Procédurale Complète**
**Objectif** : Système de génération complet et configurable

| Élément | Tâches | Livrable |
|---------|--------|----------|
| **Biomes** | Lier les blocs aux types de donjons | Thèmes cohérents |
| **Difficulté adaptative** | Ajuster selon le niveau du joueur | Donjons équilibrés |
| **Quêtes procédurales** | Objectifs dynamiques | Quêtes générées |

---

## 📚 Références

- **GDD** : `GDD.md` (Game Design Document)
- **Ennemis** : `src/enemies/ROADMAP_ENNEMIS.md`
- **Roadmap Diversité** : `roadmap_diversite.md`
- **Three.js** : Utilisé pour le rendu des blocs (à créer)

---

*Document généré par Mistral Vibe - À compléter au fur et à mesure*

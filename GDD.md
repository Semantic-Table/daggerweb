# GDD Minimal — *Projet Dungeon FPS* (nom de travail)

> FPS fantasy procédural en Three.js — monde ouvert délabré, donjons infinis, progression persistante

---

## 1. Vision

Un FPS d'exploration fantasy dans un monde à l'abandon. Le joueur traverse un overworld désertique parsemé d'entrées de donjons, plonge dans des architectures labyrinthiques générées procéduralement, combat, pille, et revient plus fort. L'esthétique pixel post-process donne une identité visuelle forte sans nécessiter d'assets complexes.

**Piliers de design**
- **Immersion avant tout** — pas de HUD agressif, lumière rare, ambiance sonore
- **Monde crédible** — l'overworld est vide mais cohérent, les donjons ont une logique interne
- **Progression lente et satisfaisante** — on sent chaque niveau gagné, chaque sort débloqué

---

## 2. Gameplay Loop

```
OVERWORLD
  └── Explorer → trouver une entrée de donjon
        └── Descendre → combattre, piller, avancer
              └── Revenir en surface → vendre, s'équiper, monter en compétences
                    └── Recommencer / vers un autre donjon
```

La mort n'est pas un reset — on perd son butin non sauvegardé mais on garde XP et compétences.

---

## 3. Overworld

- **Échelle** : grande map vide, générée procéduralement ou semi-fixe au proto
- **Contenu** : entrées de donjons (visuellement distinctes — arches en ruines, portes enfouies), ruines décoratives, quelques PNJ errants ou campements
- **Navigation** : déplacement FPS à pied, pas de monture au proto
- **Ambiance** : ciel désaturé, végétation morte, vent, lumière rasante
- **Pixel filter actif** en permanence

---

## 4. Donjons

### Génération procédurale
Approche **block-based** (à la Daggerfall / Seredynski) :
- Bibliothèque de modules 3D : couloir droit, angle, jonction T, salle, dead end
- Chaque module a des **connecteurs** (points d'accroche orientés)
- L'algo étend le donjon en chaînant les modules compatibles depuis un point de départ
- **Seed sauvegardée** → même seed = même donjon (permet la sauvegarde)

### Structure d'un donjon
- Entrée unique, profondeur variable
- Culs-de-sac avec butin pour récompenser l'exploration totale
- Thèmes visuels (catacombes, cryptes, cavernes) qui changent selon la seed ou la zone

### Lumière comme tension
- Torche du joueur = rayon limité
- Les ennemis voient dans le noir

---

## 5. Combat (FPS temps réel)

### Armes
| Type | Exemples | Mécanique |
|------|----------|-----------|
| Corps à corps | Épée, hache | Swing directionnel, portée courte |
| Distance | Arc, arbalète | Visée directe, munitions limitées |
| Magie offensive | Boule de feu, projectile de glace | Mana, charge/tir |
| Magie utilitaire | Lumière, téléportation courte | Cooldown |

### Feeling cible
- Exploration, legere tension de tomber sur un ennemi trop gros pour soi
- Pas de rechargement automatique — on gère ses ressources activement
- Les ennemis ont des patterns lisibles mais dangereux

---

## 6. Progression

### Système de compétences
- Points gagnés en utilisant les armes de chaque type (à la Morrowind)
- Pas de classe fixe — on devient ce qu'on pratique

### Équipement
- Trouvé dans les donjons ou acheté aux PNJ de l'overworld
- Stats simples : dégâts, portée, vitesse d'attaque, consommation mana
- Pas de durabilité

### Sauvegarde
- Sauvegarde locale (localStorage ou fichier JSON exportable)
- Sauvegarde automatique à la sortie d'un donjon

---

## 7. Esthétique

### Rendu
- **Three.js** + `EffectComposer`
- Post-process pixelisation via `RenderTarget` basse résolution upscalé
- Palette de couleurs limitée (16-32 couleurs max)
- Effets optionnels : vignette, légère aberration chromatique, brume de distance

### Assets 3D
- Low-poly volontaire — géométrie simple, textures flat
- Modules de donjons : boîtes, cylindres, pas de détail haute résolution
- Ennemis : silhouettes reconnaissables, animations minimales

### Son
- Ambiance générative (vent, gouttes, pierres)
- Sons de combat percutants
- Musique absente ou très discrète (drone ambient)

---

## 8. Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Rendu 3D | Three.js |
| Post-processing | Three.js EffectComposer |
| Contrôles FPS | PointerLockControls |
| Génération donjons | Algorithme block-based maison (JS) |
| Physique / collisions | Raycasting Three.js (proto) → Rapier.js si besoin |
| Sauvegarde | localStorage + export JSON |
| Build | Vite + TypeScript |

---

## 10. Questions ouvertes

- Le joueur a-t-il un personnage visible (mains, arme à l'écran) ?
- Faut-il une mini-map ou carte de donjon (à la Daggerfall) ?
- Les ennemis drop-ils des objets équipables ou seulement de l'or ?
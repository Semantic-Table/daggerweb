# Roadmap — Niveaux de donjon & d'ennemi (scaling de difficulté)

> **🔜 À IMPLÉMENTER** — Donne au monde une **courbe de difficulté** : chaque donjon
> a un niveau, et chaque ennemi qu'il abrite a un niveau ≈ celui du donjon (± un
> écart). Plus on s'enfonce / s'éloigne, plus c'est dur. C'est aussi ce qui
> **branche enfin** le catalogue d'ennemis (Skeleton/Slime/Orc/Wolf) dans le jeu.

## Pourquoi maintenant

- Le hook `useEnemyAI` a été conçu **découplé du catalogue** : il prend des
  **nombres bruts** (`EnemyAIStats`). C'est précisément le point d'injection d'un
  scaling — il suffit de lui passer des stats **calculées pour un niveau** au lieu
  de stats fixes. Aucune refonte du moteur de combat n'est nécessaire.
- Les 4 composants catalogue sont prêts mais **non câblés** (seul le gobelin
  spawn). Le niveau de donjon fournit la logique manquante : *quel type, en quelle
  quantité, à quel niveau*.
- `expValue` et `lootTier` du catalogue sont aujourd'hui du **code mort** — le
  niveau leur donne enfin un sens.

## ⚠️ Le décalage d'échelle à régler en premier

Le catalogue `enemyTypes.ts` et le jeu live ne sont **pas sur la même échelle de balance** :

| | Gobelin live (`config.ts`) | Catalogue (`enemyTypes.ts`) |
|---|---|---|
| PV | **3** | 40 (gob.) → 120 (troll) |
| Dégâts d'attaque | 8 | 8 → 25 |

Or les dégâts d'épée du joueur valent **~1-6/coup** (def 1-3 × bonus compétence ≤2× × bonus FOR ~1.35).
Conclusion :
- **Les dégâts ennemis sont déjà bons** (8-25 contre ~55 PV joueur → 3-7 coups encaissables). Pas de rebase nécessaire.
- **Les PV ennemis du catalogue sont absurdes** sur l'échelle proto (120 PV ÷ 4 dégâts = 30 coups). Il faut **rebaser les PV au niveau 1 sur l'échelle proto**, puis les faire croître avec le niveau.

C'est **la décision centrale** de cette roadmap (cf. modèle ci-dessous).

---

## Modèle de données

### Niveau de donjon

Le niveau naît dans la **génération d'overworld** (l'entrée le porte, donc il est
visible *avant* d'entrer), puis le donjon en hérite. Déterministe par seed, biaisé
par la distance au spawn → gradient de difficulté géographique (pilier
« overworld à l'abandon »).

```ts
// overworldGen.ts — sur le type Entrance
interface Entrance {
  // … champs existants (id, seed, kind, approach)
  level: number;   // ≥ 1 ; ~ 1 près du spawn, croît avec l'éloignement
}

// dungeonGen.ts — sur DungeonData
interface DungeonData {
  // … champs existants
  level: number;   // hérité de l'entrée
}
```

Formule proposée (déterministe) :

```ts
// dist = distance overworld entre l'entrée et le spawn ; rng dérivé du seed
level = clamp(1 + floor(dist / LEVEL_DIST_STEP) + randInt(rng, -1, 1), 1, LEVEL_MAX)
```

### Niveau d'ennemi

Chaque ennemi tire un niveau **autour** de celui du donjon, déterministe par spawn
(même technique de hash que le `lootSeed` actuel). **Distribution choisie** (pondérée,
pas un uniforme plat) :

```ts
// ~60% au niveau du donjon, ~30% à ±1, ~10% « élite » à +2
const r = spawnRng();
const offset = r < 0.60 ? 0
             : r < 0.90 ? (spawnRng() < 0.5 ? -1 : +1)
             : +2;                       // élite : +2, plus gros / teinté / loot ↑
const isElite = offset === 2;
const enemyLevel = clamp(dungeonLevel + offset, 1, LEVEL_MAX);
```

Le spawn d'ennemi n'est donc plus un simple `[number, number]` mais un objet :

```ts
// dungeonGen.ts
interface EnemySpawn {
  x: number;
  z: number;
  typeId: string;   // "goblin" | "skeleton" | "slime" | "orc" | "wolf" | …
  level: number;
}
interface DungeonData {
  enemies: EnemySpawn[];   // était [number, number][]
}
```

---

## Le scaling de stats (cœur technique)

Une fonction **pure**, calculée à la volée (discipline « jamais de mutation des
defs », comme `skillBonus`/`effectiveDmg`) :

```ts
// enemies/scaling.ts (nouveau)
export function scaledStats(type: EnemyType, level: number): EnemyAIStats {
  const g = level - 1;  // 0 au niveau 1
  return {
    // PV : catalogue déjà sur l'échelle proto, croissance linéaire par niveau
    hp:        Math.round(type.stats.hp * (1 + HP_GROWTH * g)),
    // Dégâts : échelle catalogue déjà bonne, légère montée par niveau
    attackDmg: Math.round(type.stats.attackDamage * (1 + DMG_GROWTH * g)),
    // Le reste suit le type, quasi plat en niveau
    speed:     type.stats.speed,
    stopDist:  type.stats.stopDistance,
    attackDist: type.stats.attackRange,
    attackCd:  type.stats.attackCooldown,
    armor:     Math.min(0.9, type.stats.armor + ARMOR_GROWTH * g),
    walkSpeed: type.animations.walkSpeed,
    attackAnimSpeed: type.animations.attackAnimSpeed,
    deathSpeed: type.animations.deathSpeed,
  };
}
```

Constantes (`config.ts`, à équilibrer) :

```ts
export const HP_GROWTH   = 0.35;  // +35% PV par niveau au-dessus de 1 (croissance LINÉAIRE)
export const DMG_GROWTH  = 0.15;  // +15% dégâts par niveau
export const ARMOR_GROWTH = 0.0;  // 0 au départ (l'armure ennemie est déjà punitive)
export const LEVEL_MAX   = 20;
export const LEVEL_DIST_STEP = 40; // unités monde par palier de difficulté
```

> **Décision : catalogue réécrit à l'échelle proto** (pas de `HP_SCALE`). On change
> les `stats.hp` dans `enemyTypes.ts` pour qu'ils soient directement sur l'échelle du
> jeu (gobelin 3, squelette ~4, orc ~6, troll ~10…), dérivés des valeurs actuelles ×
> ~0,08 arrondi. Ce qu'on lit dans le catalogue = ce qu'on a en jeu, **source de
> vérité unique** et sans multiplicateur caché. La croissance par niveau reste le
> seul facteur multiplicatif (`HP_GROWTH`).

### Branchement dans les composants

Les composants reçoivent un `level` et nourrissent le hook avec les stats scalées —
le hook ne change pas :

```tsx
// ex. Skeleton.tsx
export function Skeleton({ spawn, index, level }: EnemyProps) {
  const stats = useMemo(() => scaledStats(skeletonType, level), [level]);
  const { looted } = useEnemyAI({ spawn, index, body, corpseGroup, stats, /* … */ });
  // …
}
```

Signature commune `EnemyProps = { spawn: [number, number]; index: number; level: number }`.

**Le gobelin passe par le même chemin.** Aujourd'hui `Enemy.tsx` lit les constantes
`ENEMY_*` de `config.ts`. On **migre ces valeurs dans l'entrée `goblin`** du catalogue
(réécrite à l'échelle proto : `hp 3`, `attackDamage 8`, `speed 1.8`, etc.) et le
gobelin utilise `scaledStats(goblinType, level)` comme les autres. Les `ENEMY_*` de
`config.ts` deviennent alors **obsolètes** (supprimées une fois la migration vérifiée).
→ une seule source de vérité pour les 5 ennemis.

### Instanciation par type (le câblage enfin actif)

```tsx
// Enemies.tsx
import { getEnemyComponent } from "../enemies";
export function Enemies({ spawns }: { spawns: EnemySpawn[] }) {
  return <>{spawns.map((s, i) => {
    const C = getEnemyComponent(s.typeId);
    return <C key={i} spawn={[s.x, s.z]} index={i} level={s.level} />;
  })}</>;
}
```

`getEnemyComponent` existe déjà et retombe sur le gobelin si le type est inconnu.

---

## Composition : quels types, en quelle quantité

Le niveau pilote **le mix de types** et **le nombre** :

- **Types par palier** (croisé avec le biome via `getEnemyForBiome`) : bas niveau →
  gobelin/loup/slime ; haut niveau → squelette/orc (puis troll/nécro quand
  implémentés). Réutiliser/étendre les listes `biomeEnemies` d'`enemyTypes.ts`.
- **Nombre** : `DUNGEON_MAX_ENEMIES` devient fonction du niveau
  (`min(MAX, base + floor(level/2))`).
- Sélection **déterministe** via le `rng` du donjon (même seed ⇒ même peuplement).

---

## Lisibilité & feedback

- **Avant d'entrer** : le label d'interaction et le nom du donjon affichent le
  niveau (« Crypte des Murmures — niv. 4 »). `generateDungeonName` + `entrance.level`.
- **Carte / Grimoire** : niveau du donjon courant dans le bandeau.
- **Label flottant au-dessus de l'ennemi** *(décidé)* : un texte **nom + niveau**
  (ex. « Loup Sauvage — niv. 4 »), orienté caméra (billboard), suivant la tête.
  - `name` vient du catalogue (`type.name`), `level` du spawn.
  - Implémentation : `<Billboard>` + `<Text>` de **drei** (rendu net, suit la caméra),
    rendu **enfant du `corpseGroup`** pour suivre la position — mais **hors** du
    pivot d'orientation pour rester face caméra (à placer comme frère, positionné en
    Y au-dessus de la tête). S'**efface à la mort** (lu via le retour `looted`/état mort).
  - Les **élites** (+2) : préfixe ou teinte distincte du label (« ⚔ Loup Sauvage Alpha — niv. 6 »).
  - Garder petit et discret (ton rétro/FPS) ; pas de barre de vie flottante.
  - ⚠️ Au `dpr` très bas du jeu, valider la lisibilité de `<Text>` (taille/outline) ;
    repli possible : `<Html>` (drei) en overlay DOM si le texte 3D bave trop.
- **Loot** : `lootTier` (mort aujourd'hui) modulé par `enemyLevel` → meilleures
  tables sur les ennemis de haut niveau. Branche `rollLoot` sur le tier.

---

## Boucle de progression (équilibrage)

Si les ennemis montent en niveau, **la puissance joueur doit suivre** — elle existe
déjà : compétences d'arme (`skills.ts`), attributs (`character.ts` : FOR→dégâts,
END→PV), armures (AC). L'enjeu est de **caler les courbes** pour que :

- un donjon de niveau ≈ niveau joueur soit « tendu mais jouable » ;
- un donjon nettement au-dessus soit punitif (incitation à revenir plus fort).

Repère de « niveau joueur » : somme des niveaux de compétence/attributs (déjà
calculée par `characterLevel()`), à confronter au niveau de donjon.

---

## Phasage

### Phase 1 — Niveau de donjon (donnée pure, testable seul) ✅
- [x] `level` sur `Entrance` (`overworldGen`) — déterministe, biaisé par distance au spawn (± écart seedé).
- [x] `level` sur `DungeonData` (`dungeonGen`), hérité de l'entrée (param `generateDungeon(seed, level)`).
- [x] Affichage : label d'entrée (« … — niv. N ») + nom du donjon dans le Grimoire (« Nom — niv. N »).

  → *Le monde a un gradient lisible, même si les ennemis ne scalent pas encore.*
  → *Constantes `LEVEL_MAX` / `LEVEL_DIST_STEP` dans `config.ts`.*

### Phase 2 — Scaling de stats + câblage des types (le gros morceau) ✅
- [x] `enemies/scaling.ts` : `scaledStats(type, level)` + constantes `config.ts` (HP_GROWTH/DMG_GROWTH/ARMOR_GROWTH).
- [x] `EnemySpawn { x, z, typeId, level, elite }` ; `dungeonGen` choisit type (pool débloqué par niveau) + niveau (distribution 60/30/10), seedé.
- [x] `EnemyProps` (`level`, `elite`) ; les 5 composants calculent `scaledStats` et nourrissent `useEnemyAI`.
- [x] `Enemies.tsx` instancie via `getEnemyComponent(typeId)`.
- [x] **PV rebasés** : catalogue réécrit à l'échelle proto (pas de `HP_SCALE`) ; le gobelin a rejoint le catalogue (ex-`ENEMY_*` supprimées de `config.ts`).
- [x] Bonus : **label flottant nom + niveau** au-dessus de la tête (`EnemyLabel`, billboard `<Text>` drei ; cf. Phase 4).

  → *Les 4 ennemis du catalogue apparaissent enfin, scalés au niveau du donjon.*
  → ⚠️ **À vérifier en jeu** : équilibrage ressenti (PV vs dégâts d'épée) et lisibilité du label au `dpr` bas.

### Phase 3 — Composition par niveau ✅ (biome différé)
- [x] **Nombre** d'ennemis croissant : `clamp(round(BASE + PER_LEVEL·(niv−1)), BASE, MAX)`
      (`DUNGEON_ENEMY_BASE`/`PER_LEVEL`/`MAX` dans `config.ts`).
- [x] **Mix de types par palier** : tirage pondéré `1/(1 + niv − débloqué)` → le type le
      plus récemment débloqué domine, les anciens s'estompent (donjons profonds = ennemis durs).
- [ ] **× biome** : différé — nécessite d'abord d'assigner un biome au donjon
      (aujourd'hui `dungeonGen` choisit wall/floor/ceiling indépendamment, sans biome
      unifié). Quand ce sera fait, croiser le pool de types avec `getEnemyForBiome`.

  → *Les donjons de haut niveau sont plus peuplés ET penchent vers les types costauds.*

### Phase 4 — Feedback & loot ✅ (cue élite optionnel restant)
- [x] Niveau affiché dans le Grimoire / la carte (fait en Phase 1).
- [x] Label flottant nom + niveau au-dessus de l'ennemi (`EnemyLabel`), élite distinguée (or + préfixe « Élite »).
- [x] `rollLoot(rng, level)` : drops plus probables ET de plus grande valeur avec le niveau
      (tirage biaisé `pickByValue`). Le niveau de loot = niveau ennemi + (`lootTier` du type − 1),
      passé au hook via `lootLevel` → **`lootTier` n'est plus du code mort**.
- [ ] Indice visuel d'élite plus marqué (taille / aura) — *optionnel, non fait*.

### Phase 5 — Équilibrage de la boucle
- [ ] Caler `HP_GROWTH` / `DMG_GROWTH` / `LEVEL_DIST_STEP` contre la courbe de puissance joueur.
- [ ] Confronter `characterLevel()` au niveau de donjon (suggestion de difficulté).

---

## Décisions prises

1. **Échelle des PV** : **réécriture du catalogue** sur l'échelle proto (pas de
   `HP_SCALE`). `enemyTypes.ts` devient la source de vérité directe ; la croissance
   par niveau est le seul facteur multiplicatif.
2. **Croissance** : **linéaire** (`1 + GROWTH × (level-1)`).
3. **Distribution de niveau d'ennemi** : pondérée — **~60 %** au niveau du donjon,
   **~30 %** à ±1, **~10 %** élites à **+2**.
4. **Gobelin** : **passe par le catalogue** (`scaledStats(goblinType, level)`) comme
   les autres ; `ENEMY_*` de `config.ts` migrées dans l'entrée `goblin` puis supprimées.
5. **Affichage du niveau d'ennemi** : **label flottant nom + niveau** au-dessus de la
   tête (billboard `<Text>` drei), distinct pour les élites, effacé à la mort.

## Fichiers touchés (estimation)

- `src/gen/overworldGen.ts` — `level` sur `Entrance` (distance au spawn).
- `src/gen/dungeonGen.ts` — `level` sur `DungeonData`, `EnemySpawn`, choix type+niveau seedé.
- `src/enemies/scaling.ts` *(nouveau)* — `scaledStats(type, level)`.
- `src/enemies/enemyTypes.ts` — **réécriture des `stats.hp` à l'échelle proto** + entrée `goblin` complétée (dmg/speed/… depuis l'ex-`config.ts`).
- `src/config.ts` — section « Niveaux » (`HP_GROWTH`, `DMG_GROWTH`, `LEVEL_*`) ; **suppression** des `ENEMY_*` après migration.
- `src/enemies/{Skeleton,Slime,Orc,Wolf}.tsx` + `src/components/Enemy.tsx` — prop `level`, `scaledStats`.
- `src/components/Enemies.tsx` — instanciation par `typeId` + `level`.
- `src/enemies/EnemyLabel.tsx` *(nouveau)* — billboard `<Text>` nom + niveau au-dessus de la tête.
- `src/gen/dungeonNames.ts` / `src/App.tsx` / `src/components/Interaction.tsx` — affichage « niv. N » (donjon).
- `src/items/itemDefs.ts` — `rollLoot` modulé par tier/niveau (Phase 4).

## Références
- Moteur de combat partagé : [`../src/enemies/useEnemyAI.ts`](../src/enemies/useEnemyAI.ts) (point d'injection des stats scalées).
- Catalogue : [`../src/enemies/enemyTypes.ts`](../src/enemies/enemyTypes.ts) (ratios relatifs, `expValue`, `lootTier`).
- Progression joueur : [`roadmap-attributs.md`](roadmap-attributs.md), `skills.ts`, `character.ts` (`characterLevel`).
- Autres priorités : [`roadmap-priorites.md`](roadmap-priorites.md).

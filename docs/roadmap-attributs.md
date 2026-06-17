# Roadmap — Attributs & systèmes RPG

> **✅ IMPLÉMENTÉ** — Fonde la profondeur RPG : 8 attributs qui gouvernent
> les aptitudes et alimentent les stats dérivées (PV, magie, vigueur, charge).
> Rend **réels** les écrans *Personnage* et *Aptitudes* du Grimoire (cf. [`todo-ui-rpg.md`](todo-ui-rpg.md)).

## Pourquoi maintenant

- **Cohérence GDD §6** : « on devient ce qu'on pratique ». Le jeu a déjà des
  compétences à l'usage ([`combat/skills.ts`](../src/combat/skills.ts)) ; les
  attributs sont la couche qui leur donne un *sens chiffré* (un escrimeur devient
  fort, un mage devient intelligent).
- **Effet de levier UI** : tout est déjà dessiné. L'écran Personnage affiche ses 8
  plaques d'attributs + 4 barres dérivées ; l'écran Aptitudes affiche le vrai
  attribut gouverneur (FOR/AGI) depuis le mapping partagé.
- **Fondation** : la magie (Intelligence → mana), l'encombrement (Force → charge),
  le combat (Force → dégâts), le mouvement (Vitesse) en dépendent tous.

## Principe de design (la décision centrale)

**Croissance continue par la pratique**, pas de cérémonie de level-up à la
Morrowind. Raison : on garde **une seule métaphore de progression** déjà en place
(les skills montent en frappant) au lieu d'en ajouter une seconde (dormir → choisir
3 attributs). Concrètement : le coup confirmé qui donne déjà de l'XP de compétence
donne **aussi** de la « pratique » à l'attribut gouverneur de l'arme. L'attribut
monte de +1 à chaque palier de pratique franchi (courbe à coût croissant, comme
les skills). C'est lisible, sans AFK-grind (XP au but uniquement), et ça « se sent ».

> Alternative écartée pour le proto : level-up discret + multiplicateurs x1–x5
> (Morrowind). Plus riche mais lourd, et redondant avec le modèle continu existant.
> À reconsidérer si on veut un *vrai* nombre de niveau de perso plus tard.

## Les 8 attributs et ce qu'ils gouvernent

| Attribut | Abrév. | Aptitudes gouvernées | Stat dérivée principale |
|---|---|---|---|
| Force | FOR | Lame, Hache | Dégâts mêlée, charge max |
| Intelligence | INT | (Magie, à venir) | Magie max (mana) |
| Volonté | VOL | (Guérison/résistance, à venir) | Régén. magie, vigueur |
| Agilité | AGI | Mains nues, (Esquive/Tir, à venir) | Vitesse de swing, esquive |
| Endurance | END | (Parade, à venir) | **PV max**, vigueur |
| Charisme | CHA | (Marchandage, à venir) | Prix marchands (économie, à venir) |
| Vitesse | VIT | — | Vitesse de déplacement |
| Chance | CHN | — | Chance de critique |

> Le mapping aptitude→attribut vit dans **un seul endroit partagé** (étendre
> `skills.ts` ou nouveau `character.ts`), consommé par le combat ET l'UI — pas de
> duplication du `SKILL_GOV` actuellement codé en dur dans `GrimoireUI.tsx`.

## Stats dérivées (formules de départ — à tuner)

Toutes calculées **à la volée** depuis les attributs, jamais stockées en dur
(même discipline que `skillBonus` qui ne mute pas les defs) :

```
maxHP        = HP_BASE + END * HP_PER_END            (ex. 40 + END * 0.8)
maxMagicka   = INT * MANA_PER_INT                    (ex. INT * 1.0)
maxFatigue   = (FOR + END + AGI + VOL) * FAT_K        (vigueur)
carryMax     = CARRY_BASE + FOR * CARRY_PER_STR      (remplace INV_MAX_WEIGHT)
moveMult     = 1 + (VIT - ATTR_BASE) * MOVE_PER_SPD   (module PLAYER_WALK/RUN)
meleeMult    = 1 + (FOR - ATTR_BASE) * DMG_PER_STR     (se combine au skillBonus)
critChance   = CHN * CRIT_PER_LUCK                    (0..1)
```

Base attribut `ATTR_BASE = 30`, plafond `ATTR_CAP = 100`. Toutes les constantes
vont dans [`config.ts`](../src/config.ts), section « Attributs ».

## Architecture (suit les patterns maison)

- **`src/combat/character.ts`** — nouveau registre de module (jumeau de
  `skills.ts` / `inventory.ts`) : `getCharacter()`, `subscribeCharacter()`,
  `gainAttrPractice(attr, amount)`, `attrLevel(attr)`, et les dérivés
  `maxHp()`, `maxMagicka()`, `carryMax()`, `moveMult()`, `meleeMult()`,
  `critChance()`. Le mapping `SKILL_GOV: Record<WeaponCategory, Attr>` y vit
  (ou dans `skills.ts`), exporté pour l'UI.
- **Communication** : registre de module + `subscribe` (jamais de prop-drilling /
  store global), conforme à `CLAUDE.md`.
- **Persistance** : `localStorage` (comme le thème du Grimoire) — les attributs
  survivent au reload, pas seulement à la mort.

## Phasage

### Phase 1 — Fondation (MVP, livrable seul) ✅
- [x] `character.ts` : 8 attributs avec un **profil de départ configurable** (4 profils :
      neutre/guerrier/voleur/mage), dérivés `maxHp` / `maxMagicka` / `carryMax`.
- [x] **Brancher le PV sur l'attribut** : `App.tsx` lit `maxHp()` au lieu de la
      constante `PLAYER_MAX_HP` (la constante devient `HP_BASE`).
- [x] **Écran Personnage** : 8 plaques d'attributs réelles + barres PV/Magie réelles
      (magie = max mais 0 courant tant que pas de sorts) ; retirer les « — ».
- [x] **Écran Aptitudes** : attribut gouverneur réel (lire le mapping partagé).
- [x] **Encart CHARGE** : `carryMax()` remplace `INV_MAX_WEIGHT`.

  → *À ce stade, 4 zones de placeholder du Grimoire deviennent vraies, zéro
  nouvelle mécanique de combat. Bon point d'arrêt.*

### Phase 2 — Progression par la pratique ✅
- [x] Le coup confirmé (`Sword.tsx`, déjà brancheur d'XP skill) appelle aussi
      `gainAttrPractice(SKILL_GOV[cat], …)`.
- [x] Courbe de palier + montée +1 ; plafond `ATTR_CAP`.
- [x] **Feedback** : flash/son de montée d'attribut (réutiliser le pattern
      `skillbar--up`), et reflow du `maxHp` (le cap PV monte avec END).
- [x] Persistance `localStorage`.

### Phase 3 — Intégration combat & mouvement ✅
- [x] `meleeMult()` (Force) se combine à `effectiveDmg` (multiplicatif, à la volée).
- [x] `moveMult()` (Vitesse) module `PLAYER_WALK` / `PLAYER_RUN` dans `Player.tsx`.
- [x] `critChance()` (Chance) → coups critiques (dégâts x1.5 + hitmarker renforcé).
- [x] `encumbranceMult()` — malus de vitesse si poids > carryMax.
- [ ] Affichage HUD : intégrer le bonus d'attribut à la ligne de bonus existante.

### Phase 4 — Profondeur (optionnel / plus tard)
- [x] **Vigueur (fatigue)** comme ressource : se vide en courant/attaquant via
      `useStamina()`/`regenStamina()`. Donne du poids à END/VOL.
- [x] **Malus d'encombrement** : `encumbranceMult()` réduit la vitesse si poids > `carryMax()`.
- [x] **Profils de départ** (race/background léger) : 4 profils (neutre/guerrier/voleur/mage)
      avec répartition d'attributs initiale. Sauvegardé en `localStorage`.
- [x] **Niveau de perso cosmétique** : `characterLevel()` = somme des paliers d'attributs,
      mais pas encore affiché dans l'UI.

## Décisions prises

- **Croissance** : continue par la pratique (pas de cérémonie de level-up).
- **Calcul** : dérivés à la volée, jamais mutés (cohérent `skillBonus`).
- **Mapping gouverneur** : source unique partagée combat + UI.
- **Persistance** : `localStorage`, comme le thème.

## Décisions prises (implémentées)

1. **Profil de départ** : 4 profils configurables (neutre/guerrier/voleur/mage) avec
   répartition thématique. Sauvegardé en `localStorage`.
2. **PV courant quand le max monte** : on monte le plafond, le PV courant n'est pas
   rétroactivement soigné (le joueur doit utiliser des potions pour profiter du nouveau max).
3. **Magicka sans magie** : la barre de mana max est affichée (basée sur INT),
   mais la mana courante reste à 0 tant que pas de sorts.
4. **Vitesse de swing** : reste purement liée à la compétence d'arme (skillBonus).
   La Vitesse (VIT) module uniquement la vitesse de déplacement via `moveMult()`.

## Fichiers touchés (estimation)

- `src/combat/character.ts` *(nouveau)* — registre + dérivés + mapping gouverneur.
- `src/config.ts` — section « Attributs » (base, cap, constantes de dérivation).
- `src/App.tsx` — PV depuis `maxHp()` ; HUD bonus d'attribut (Phase 3).
- `src/components/GrimoireUI.tsx` — écrans Personnage & Aptitudes branchés.
- `src/components/Sword.tsx` — pratique d'attribut au coup (Phase 2).
- `src/components/Player.tsx` — `moveMult` sur la vitesse (Phase 3).
- `src/combat/skills.ts` — éventuel point d'ancrage du mapping gouverneur.

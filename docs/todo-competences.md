# Compétences (à l'usage) — IMPLÉMENTÉ (proto)

Système de compétences à la Morrowind (cf. [GDD §6](../GDD.md)) : on gagne de l'XP
dans une **catégorie d'arme** en l'utilisant — pas de classe fixe.

## Ce qui est en place

- **Catégorie d'arme** : champ `category: "blade" | "axe" | "unarmed"` sur
  `WeaponDef` (`src/items/itemDefs.ts`), distinct de `render` (viewmodel).
- **État** : `src/combat/skills.ts` (registre de module, comme `inventory.ts`) —
  `{ blade: {xp}, axe, unarmed }`, `gainXp(category, amount)`, `subscribeSkills()`,
  `levelInfo(xp)`, `skillBonus(category)`, `effectiveDmg` / `effectiveSwingDur`.
- **Hook d'usage** : `Sword.tsx` appelle `gainXp` **au coup confirmé, par ennemi
  touché** (et non au swing à vide → pas d'AFK-grind).
- **Bonus par palier** (mix, cf. `config.ts`) : **+6% dégâts** ET **−4% swingDur**
  par niveau (vitesse plafonnée à 50% du swingDur de base). Appliqués à la volée,
  **sans jamais muter** les defs d'`itemDefs` (partagées avec la loot table).
- **HUD** (`App.tsx` + `style.css`) : sous la barre de vie, niveau de la catégorie
  équipée + barre d'XP + **bonus actifs affichés** (`+X% dég · +Y% vit`) + **flash
  de level-up**.

## Décisions prises (questions ouvertes du proto, tranchées)

- **Courbe d'XP** : coût croissant simple — palier `n` coûte `SKILL_XP_BASE * n`.
- **XP** : seulement au coup au but, **par ennemi touché**.
- **Bonus** : mix dégâts + vitesse, avec affichage explicite de ce qui progresse.

## Reste à faire (plus tard)

- **Persistance reload** : les skills survivent déjà à la mort (singleton de module).
  Reste à brancher la sauvegarde `localStorage` (cf. GDD §6) pour survivre au reload.
- **Équilibrage** : tuner les constantes `SKILL_*` de `config.ts` au feeling.
- **Feel** : son de level-up, peut-être un axe portée/critique en plus.
- ~~Afficher le niveau de compétence dans l'inventaire~~ → fait : onglet
  **APTITUDES** du menu Grimoire (`GrimoireUI`, cf. [`todo-ui-rpg.md`](todo-ui-rpg.md)).

# TODO — Système de compétences (prochaine session)

Sujet de la prochaine session de travail. Vision : **compétences à l'usage, à la
Morrowind** (cf. [GDD §6](../GDD.md)) — on gagne de l'XP dans un type d'arme en
l'utilisant, pas de classe fixe, « on devient ce qu'on pratique ».

## Objectif minimal (proto)

- XP gagnée à chaque **coup porté** (voire chaque coup *touchant* un ennemi),
  réparti par **catégorie d'arme** : lame / hache / mains nues.
- Montée de niveau par catégorie → bonus simple et lisible (ex. +dégâts ou
  +vitesse de swing au palier).
- HUD : afficher le niveau de la compétence de l'arme équipée + une barre d'XP.

## Pistes d'implémentation (à valider)

- **Catégorie d'arme** : ajouter un champ `category: "blade" | "axe" | "unarmed"`
  sur `WeaponDef` (`src/items/itemDefs.ts`). Le champ `render` existe déjà mais
  sert au viewmodel — garder les deux distincts (une « lame d'os » pourrait être
  catégorie `blade` mais rendu spécifique un jour).
- **État compétences** : nouveau module `src/combat/skills.ts` suivant le pattern
  des registres de module (cf. `inventory.ts`) : `{ blade: {xp, level}, ... }`,
  `gainXp(category, amount)`, `subscribeSkills()`.
- **Hook d'usage** : émettre le gain depuis `Sword.tsx` au moment du coup
  (l'event `onHit` / la boucle de hit y est déjà). Décider : XP au swing ou au
  hit confirmé.
- **Application des bonus** : au calcul de dégâts (`weapon.dmg`) et/ou
  `swingDur`, moduler par le niveau de la catégorie.
- **Persistance** : les compétences survivent à la mort (cf. GDD §6, « on garde
  XP et compétences »). À brancher plus tard sur la sauvegarde locale.

## Questions ouvertes

- Courbe d'XP : linéaire simple par palier, ou coût croissant ?
- XP au swing dans le vide ou seulement sur coup au but ?
- Bonus par palier : dégâts, vitesse, portée, ou un mix ?

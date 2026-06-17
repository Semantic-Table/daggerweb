# UI RPG « Grimoire » — IMPLÉMENTÉ (proto) + placeholders

Menu plein écran inspiré de Daggerfall (handoff *UI Daggerfall-inspired*), ouvert
par **I** (ou en fouillant un cadavre). 6 écrans en onglets, 4 palettes commutables
persistées. Remplace l'ancien `InventoryUI` (supprimé).

## Ce qui est en place (branché sur le jeu réel)

- **Cadre & chrome** : cabinet biseauté, barre de titre, onglets, zone 632px —
  relief par `box-shadow` inset, zéro `border-radius` (cf. GDD §7, mémoire UI).
- **Thèmes** : `src/ui/themes.ts` + tokens scopés `.grim-overlay[data-theme=…]`
  dans `style.css`. Choix **persisté en `localStorage`** (`daggerweb.theme`).
- **Sacoche** : grille/liste sur les slots réels (`combat/inventory.ts`), fiche
  d'objet (poids/valeur/dégâts ou soin/description — champs ajoutés à `itemDefs`),
  filtres (Tout/Armes/Armures/Magie tous actifs), boutons **ÉQUIPER/RETIRER** (armes et armures)
  et **UTILISER** (potions → soin réel).
- **Fouille de cadavre** : encart en tête de sacoche, clic = ramasser (`pickupItem`).
- **Équipement (paper-doll)** : **toutes les cases branchées** — drag d'une arme ou armure du
  sac → `equipWeapon`/`equipArmor`, clic sur une case = `unequipWeapon`/`unequipArmor`.
  Classe d'armure (AC) calculée dynamiquement (`10 + Σ armures équipées`).
- **Aptitudes** : les 3 catégories réelles (lame/hache/mains nues) avec niveau,
  barre d'XP et bonus, depuis `combat/skills.ts`. L'attribut gouverneur (FOR/AGI) est réel.
- **Personnage** : barres **Points de vie** (hp/maxHp, max basé sur END) et **Magie max** (mana, basée sur INT) réelles.
  8 plaques d'attributs avec valeurs numériques (FOR, INT, VOL, AGI, END, CHA, VIT, CHN).

## Placeholders (concepts du design pas encore dans le jeu)

Affichés avec un libellé honnête (« — vide », « à venir ») plutôt que de fausses
valeurs, pour ne pas mentir sur l'état du jeu.

- **Or / économie** : pastille OR = « — ». Pas de monnaie ni de marchand.
- **Encombrement** : barre CHARGE calculée (somme des poids / `carryMax` basé sur FORCE),
  mais **sans malus de gameplay** encore. La charge max est réelle, le malus de vitesse reste à implémenter.
- **Bijoux** (anneaux, amulette) : cases du paper-doll vides. Pas encore d'objets de ce type.
- **Magie / grimoire** : liste de sorts d'exemple, bouton INCANTER désactivé. **Mana max** affichée
  (basée sur INT), mais pas encore de sorts en jeu, pas de consommation, pas d'écoles.
- **Niveau de personnage / Vigueur** : « à venir ». Le **niveau de personnage** (somme des niveaux
  d'attributs) est calculé, mais pas encore affiché. La **vigueur** (fatigue) n'est pas implémentée.
- **Carte** : marqueurs et lieux d'exemple, pas branchés sur l'overworld réel ni
  sur un voyage rapide.
- **Jeter l'objet** : lien présent, sans action (pas de suppression d'item).

## Pistes (par ordre de valeur probable)

1. **Or & encombrement réels** : monnaie dans `inventory.ts`, malus de vitesse
   au-delà de `carryMax` (basé sur FORCE).
2. **Carte branchée** : dériver marqueurs/lieux de `overworldGen`, position joueur
   réelle, voyage rapide.
3. **Magie** : système de sorts + mana (gros morceau, cf. roadmap GDD §5).
4. **Vigueur** : ressource de fatigue liée à END/VOL, malus si vide.
5. **Bijoux** : anneaux/amulette avec effets sur attributs ou magie.

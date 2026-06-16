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
  filtres (Tout/Armes/Magie actifs ; Armures/Divers vides → placeholders), boutons
  **ÉQUIPER/RETIRER** (armes) et **UTILISER** (potions → soin réel).
- **Fouille de cadavre** : encart en tête de sacoche, clic = ramasser (`pickupItem`).
- **Équipement (paper-doll)** : la case **Arme** est branchée — drag d'une arme du
  sac → `equipWeapon`, clic sur la case = `unequipWeapon`. Les 9 autres cases sont
  des placeholders (voir ci-dessous).
- **Aptitudes** : les 3 catégories réelles (lame/hache/mains nues) avec niveau,
  barre d'XP et bonus, depuis `combat/skills.ts`.
- **Personnage** : barre **Points de vie** réelle (hp/maxHp passés par `App`).

## Placeholders (concepts du design pas encore dans le jeu)

Affichés avec un libellé honnête (« — vide », « à venir ») plutôt que de fausses
valeurs, pour ne pas mentir sur l'état du jeu.

- **Or / économie** : pastille OR = « — ». Pas de monnaie ni de marchand.
- **Encombrement** : barre CHARGE calculée (somme des poids / `INV_MAX_WEIGHT`)
  mais **sans malus de gameplay**. À transformer en mécanique.
- **Armures, casques, boucliers, cape, anneaux, amulette** : 9 cases du paper-doll,
  Classe d'armure fixée à 10, liste « PROTECTION PAR PIÈCE » toute vide. Aucun de
  ces types d'objets n'existe encore (`itemDefs` ne connaît qu'armes + potions).
- **Attributs** (Force/Intel/…) : 8 plaques à « — ». Pas de système d'attributs ;
  l'attribut gouverneur des aptitudes (FOR/AGI) est décoratif.
- **Magie / grimoire** : liste de sorts d'exemple, bouton INCANTER désactivé. Pas
  de mana, d'écoles ni de sorts en jeu.
- **Niveau de personnage / Vigueur / Expérience globale** : « à venir » (la progression
  actuelle est par compétence d'arme, pas par niveau de perso).
- **Carte** : marqueurs et lieux d'exemple, pas branchés sur l'overworld réel ni
  sur un voyage rapide.
- **Jeter l'objet** : lien présent, sans action (pas de suppression d'item).

## Pistes (par ordre de valeur probable)

1. **Armures + Classe d'armure** : ajouter un `kind: "armor"` à `itemDefs` (slot,
   valeur d'armure), brancher les cases du paper-doll et le calcul `10 + Σ armures`.
2. **Or & encombrement réels** : monnaie dans `inventory.ts`, malus de vitesse
   au-delà de `INV_MAX_WEIGHT`.
3. **Attributs de personnage** : registre `combat/character.ts`, alimente les
   aptitudes (attribut gouverneur) et les stats dérivées.
4. **Carte branchée** : dériver marqueurs/lieux de `overworldGen`, position joueur
   réelle, voyage rapide.
5. **Magie** : système de sorts + mana (gros morceau, cf. roadmap GDD §5).

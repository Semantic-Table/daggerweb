# Roadmap — Équipement défensif (armures, boucliers, Classe d'armure)

> Active le paper-doll, le panneau de défense et la Classe d'armure du Grimoire
> (aujourd'hui figés : 10 cases vides, AC bloquée à 10, cf.
> [`todo-ui-rpg.md`](todo-ui-rpg.md)). Donne au combat l'axe **défensif** qui lui
> manque et une vraie raison de looter autre chose que des armes.

## Pourquoi c'est rentable

- **Tout est déjà construit** : le paper-doll (10 cases positionnées), le drag &
  drop (la case *Arme* fonctionne déjà), le panneau CLASSE D'ARMURE + PROTECTION
  PAR PIÈCE, la fiche d'objet. Il manque juste **les données et le câblage**.
- **Combat** : aujourd'hui le joueur n'a que PV + i-frames. L'armure ajoute la
  mitigation → des choix (lourd/protecteur vs léger/rapide).
- **Loot** : `rollLoot` ne sort qu'armes + potions ; l'armure triple l'intérêt des
  cadavres.

## Modèle de données

Nouveau `kind: "armor"` dans [`itemDefs.ts`](../src/items/itemDefs.ts), à côté de
`weapon` / `potion` :

```ts
interface ArmorDef extends ItemMeta {   // ItemMeta = weight/value/desc déjà en place
  kind: "armor";
  id: string;
  name: string;
  slot: ArmorSlot;        // head|chest|legs|gloves|feet|shield|cloak
  armor: number;          // points d'AC apportés (le « ar » du handoff)
  armorClass: "light" | "heavy";  // pour une future compétence d'armure
}
```

**Emplacements** (sous-ensemble protecteur du mapping `ACCEPT` du handoff) :
`head, chest, legs, gloves, feet, shield, cloak`. Les bijoux (`amulet`, `ring1`,
`ring2`) restent des placeholders — ils relèvent plutôt de la magie/des attributs.

## État d'équipement (inventory.ts)

Aujourd'hui `inventory.state.equipped` = une seule `WeaponDef`. On **garde** ce
champ pour l'arme (référencé partout : `App`, `Sword`, `GrimoireUI`) et on ajoute
la carte d'armure :

```ts
state.equipped: WeaponDef;                       // arme (inchangé)
state.armor: Partial<Record<ArmorSlot, ArmorDef>>;  // nouveau
```

Nouvelles fonctions, jumelles de `equipWeapon` : `equipArmor(slotIdx)` (range la
pièce sur SON emplacement, renvoie l'ancienne en sac), `unequipArmor(slot)`.
Toujours via le registre + `notify()` (pattern maison, pas de store global).

## Classe d'armure & mitigation

```
AC = 10 + Σ (armor.armor des pièces équipées)        // = formule totalAC du handoff
```

**Mitigation des dégâts** (à trancher — proposition de départ) : réduction plate
avec plancher, lisible et « rétro » :

```
dégâts_subis = max(1, dégâts_entrants - (AC - 10))
```

> Alternative : mitigation en % avec rendements décroissants
> `dégâts * 100 / (100 + (AC-10)*k)`. La plate est plus lisible pour un proto ; on
> bascule si l'équilibrage devient trop binaire. Le point d'application est unique :
> le handler de dégâts joueur ([`playerCombat`](../src/combat/playerCombat.ts) /
> `App.tsx`), là où `ENEMY_ATTACK_DMG` arrive.

## Intégration UI (Grimoire)

- **Paper-doll** : câbler les 7 cases d'armure comme la case *Arme* (drag depuis le
  sac → `equipArmor` si le `slot` de la pièce correspond ; clic = `unequipArmor`).
  Le mapping accept = le `slot` de l'`ArmorDef`.
- **Sac équipable** (`Equip`) : inclure les `armor` non portées, pas seulement les
  armes. Le `slotHint` affiche l'emplacement cible.
- **Panneau défense** : `CLASSE D'ARMURE` = `AC` réel ; liste PROTECTION PAR PIÈCE
  = `+N` / « — vide » par emplacement (déjà la structure du handoff).
- **Fiche d'objet** : ajouter la branche `ARMURE +N` (à côté de DÉGÂTS / SOIN), et
  le bouton ÉQUIPER/RETIRER marche pour les armures.
- **Filtre « Armures »** de la sacoche : passer `kinds: ["armor"]` (vide aujourd'hui).

## Loot

Étendre [`rollLoot`](../src/items/itemDefs.ts) : ajouter une table d'armures
(p. ex. 30 % de chance de lâcher une pièce). Définir un petit catalogue de départ —
au moins une pièce par emplacement et par classe (cuir = light, mailles/plates =
heavy) pour que le paper-doll soit testable de bout en bout.

## Phasage

### Phase 1 — Données + équipement + UI (livrable seul, testable)
- [ ] `ArmorDef` + `ArmorSlot` dans `itemDefs`, petit catalogue de pièces.
- [ ] `armor` map + `equipArmor`/`unequipArmor` dans `inventory.ts`.
- [ ] Paper-doll : 7 cases câblées (drag & drop + clic pour retirer).
- [ ] Panneau défense réel (AC + protection par pièce) + fiche ARMURE + filtre.
- [ ] Quelques pièces dans `rollLoot` pour tester sans triche.

  → *AC affichée et calculée, équipement fonctionnel, mais encore sans effet de
  combat. Bon point d'arrêt : la moitié visible de la feature.*

### Phase 2 — Mitigation (l'AC sert enfin)
- [ ] Appliquer la réduction de dégâts au handler joueur.
- [ ] Feedback : son/flash d'armure qui encaisse distinct du flash `hurt`.
- [ ] Équilibrer `ENEMY_ATTACK_DMG` vs AC typique (constantes `config.ts`).

### Phase 3 — Compétence & poids d'armure
- [ ] Compétence d'armure (light/heavy) à l'usage : encaisser un coup donne de l'XP
      à la classe portée (réutilise `skills.ts`). Bonus = +AC effective par palier.
- [ ] **Poids** : les armures lourdes pèsent → relie la barre CHARGE au gameplay
      (malus de vitesse au-delà de la charge max). ⟶ synergie directe avec
      [`roadmap-attributs.md`](roadmap-attributs.md) (Force → charge max).

### Phase 4 — Profondeur (plus tard)
- [ ] Bijoux (anneaux/amulette) à effets (relie magie/attributs).
- [ ] Bonus de set (panoplie complète d'une même famille).
- [ ] Condition/usure & réparation (économie, cf. or du Grimoire).

## Décisions prises

- **Garder `equipped` pour l'arme**, ajouter une map `armor` séparée (zéro
  régression sur le code arme existant).
- **AC = 10 + Σ armures** (formule du handoff) ; mitigation **plate** au départ.
- **Calcul à la volée**, jamais de mutation des defs (discipline `skillBonus`).
- **Armures lootables** dès la Phase 1 pour pouvoir tester.

## Questions ouvertes

1. **Bouclier** : pièce d'armure passive (AC), ou geste actif de parade plus tard ?
   *Suggestion : passif (AC) en Phase 1, parade = feature à part.*
2. **Mitigation plate vs %** : voir ci-dessus. *Suggestion : plate, on rebascule
   au tuning.*
3. **Compétence d'armure** : un seul skill « Armure », ou light/heavy séparés
   (gouvernés par AGI / END) ? *Suggestion : light/heavy, ça crée un vrai choix
   d'archétype et s'arrime aux attributs.*
4. **Mains nues + bouclier** : autorisé ? (le slot arme et le slot bouclier sont
   indépendants). *Suggestion : oui, aucun blocage.*

## Croisement avec les attributs

Si la [roadmap attributs](roadmap-attributs.md) passe d'abord : Endurance peut
majorer l'AC effective des armures lourdes, Agilité celle des légères, et Force
porte la charge des plates sans malus. Les deux features se renforcent ; l'ordre
n'est pas bloquant (chacune est livrable seule), mais **attributs d'abord** rend
la compétence d'armure (Phase 3) plus naturelle.

## Fichiers touchés (estimation)

- `src/items/itemDefs.ts` — `ArmorDef`, catalogue, `rollLoot`.
- `src/combat/inventory.ts` — map `armor`, `equipArmor`/`unequipArmor`, AC dérivée.
- `src/components/GrimoireUI.tsx` — paper-doll (7 cases), sac, panneau défense, fiche.
- `src/App.tsx` / `src/combat/playerCombat.ts` — mitigation au handler de dégâts.
- `src/config.ts` — section « Armures » (mitigation, paliers de compétence).

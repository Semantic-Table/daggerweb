import type { WeaponCategory } from "../combat/skills";

export type ItemKind = "weapon" | "potion";

/**
 * Champs « fiche d'objet » communs (cf. UI Grimoire) : poids, valeur marchande et
 * description. Données de contenu pures — affichées par la fiche d'inventaire.
 * L'encombrement et l'or ne sont pas encore simulés en jeu (cf. docs/todo-ui-rpg.md).
 */
interface ItemMeta {
  /** Poids en kg (affichage CHARGE / fiche). */
  weight: number;
  /** Valeur marchande en pièces (affichage fiche). */
  value: number;
  /** Description courte pour la fiche d'objet. */
  desc: string;
}

export interface WeaponDef extends ItemMeta {
  kind: "weapon";
  id: string;
  name: string;
  dmg: number;
  /** Durée du swing en secondes (plus court = plus rapide). */
  swingDur: number;
  color: string;
  /** Longueur de la lame (scale Y du mesh). */
  bladeLen: number;
  /**
   * Catégorie de compétence (cf. GDD §6) : détermine quelle compétence monte en
   * l'utilisant. Distinct de `render` (le viewmodel) — une « lame d'os » peut être
   * catégorie `blade` avec un rendu spécifique.
   */
  category: WeaponCategory;
  /** Viewmodel : lame d'épée (défaut), hache, ou poings (mains nues). */
  render?: "blade" | "axe" | "fists";
}

export interface PotionDef extends ItemMeta {
  kind: "potion";
  id: string;
  name: string;
  heal: number;
}

export type ItemDef = WeaponDef | PotionDef;

export const ITEMS: Record<string, ItemDef> = {
  fists: {
    kind: "weapon", id: "fists", name: "Mains nues", category: "unarmed",
    dmg: 1, swingDur: 0.24, color: "#caa07a", bladeLen: 0, render: "fists",
    weight: 0, value: 0, desc: "Toujours à portée. Rapides, mais sans tranchant.",
  },
  sword_rusty: {
    kind: "weapon", id: "sword_rusty", name: "Épée rouillée", category: "blade",
    dmg: 1, swingDur: 0.32, color: "#8a6a50", bladeLen: 1,
    weight: 3, value: 12, desc: "Lame piquée par l'humidité des caves. Elle coupe encore, à peine.",
  },
  sword_iron: {
    kind: "weapon", id: "sword_iron", name: "Épée de fer", category: "blade",
    dmg: 2, swingDur: 0.28, color: "#cdd2da", bladeLen: 1.1,
    weight: 4, value: 120, desc: "Acier honnête, bien équilibré. La valeur sûre de l'aventurier.",
  },
  sword_bone: {
    kind: "weapon", id: "sword_bone", name: "Lame d'os", category: "blade",
    dmg: 1, swingDur: 0.22, color: "#d4c9a8", bladeLen: 0.85,
    weight: 2, value: 60, desc: "Taillée dans un fémur durci. Légère, sifflante, malsaine.",
  },
  axe_crude: {
    kind: "weapon", id: "axe_crude", name: "Hache grossière", category: "axe",
    dmg: 3, swingDur: 0.45, color: "#8a8a8a", bladeLen: 0.7, render: "axe",
    weight: 7, value: 90, desc: "Lourde et lente, mais chaque coup compte. Brise les gardes.",
  },
  potion_small: {
    kind: "potion", id: "potion_small", name: "Potion (petite)",
    heal: 25, weight: 1, value: 30, desc: "Fiole tiède aux reflets carmin. Restaure 25 points de vie.",
  },
  potion_large: {
    kind: "potion", id: "potion_large", name: "Potion (grande)",
    heal: 60, weight: 1, value: 70, desc: "Élixir épais et sucré. Restaure 60 points de vie.",
  },
};

/** Loot table d'un ennemi : retourne 0-2 items selon un seed. */
export function rollLoot(rng: () => number): ItemDef[] {
  const weapons: ItemDef[] = [ITEMS.sword_iron, ITEMS.sword_bone, ITEMS.axe_crude];
  const potions: ItemDef[] = [ITEMS.potion_small, ITEMS.potion_large];
  const result: ItemDef[] = [];
  // 55% de chance d'avoir une arme
  if (rng() < 0.55) result.push(weapons[Math.floor(rng() * weapons.length)]);
  // 40% de chance d'avoir une potion
  if (rng() < 0.40) result.push(potions[Math.floor(rng() * potions.length)]);
  return result;
}

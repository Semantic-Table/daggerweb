export type ItemKind = "weapon" | "potion";

export interface WeaponDef {
  kind: "weapon";
  id: string;
  name: string;
  dmg: number;
  /** Durée du swing en secondes (plus court = plus rapide). */
  swingDur: number;
  color: string;
  /** Longueur de la lame (scale Y du mesh). */
  bladeLen: number;
  /** Viewmodel : lame d'épée (défaut), hache, ou poings (mains nues). */
  render?: "blade" | "axe" | "fists";
}

export interface PotionDef {
  kind: "potion";
  id: string;
  name: string;
  heal: number;
}

export type ItemDef = WeaponDef | PotionDef;

export const ITEMS: Record<string, ItemDef> = {
  fists: {
    kind: "weapon", id: "fists", name: "Mains nues",
    dmg: 1, swingDur: 0.24, color: "#caa07a", bladeLen: 0, render: "fists",
  },
  sword_rusty: {
    kind: "weapon", id: "sword_rusty", name: "Épée rouillée",
    dmg: 1, swingDur: 0.32, color: "#8a6a50", bladeLen: 1,
  },
  sword_iron: {
    kind: "weapon", id: "sword_iron", name: "Épée de fer",
    dmg: 2, swingDur: 0.28, color: "#cdd2da", bladeLen: 1.1,
  },
  sword_bone: {
    kind: "weapon", id: "sword_bone", name: "Lame d'os",
    dmg: 1, swingDur: 0.22, color: "#d4c9a8", bladeLen: 0.85,
  },
  axe_crude: {
    kind: "weapon", id: "axe_crude", name: "Hache grossière",
    dmg: 3, swingDur: 0.45, color: "#8a8a8a", bladeLen: 0.7, render: "axe",
  },
  potion_small: {
    kind: "potion", id: "potion_small", name: "Potion (petite)",
    heal: 25,
  },
  potion_large: {
    kind: "potion", id: "potion_large", name: "Potion (grande)",
    heal: 60,
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

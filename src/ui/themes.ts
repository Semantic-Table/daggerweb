// Palettes commutables du Grimoire (cf. docs/todo-ui-rpg.md / handoff UI). Les
// VALEURS des tokens vivent dans style.css (`[data-theme="…"]`), idiomatique CSS ;
// ici on ne garde que ce dont le TS a besoin : l'ordre, les libellés et la couleur
// de pastille (l'or du thème) pour le sélecteur. La persistance passe par
// localStorage — le thème choisi survit au reload, comme un réglage joueur.

export type ThemeKey = "donjon" | "parchemin" | "sang" | "nuit";

/** Ordre d'affichage stable des pastilles de thème. */
export const THEME_ORDER: ThemeKey[] = ["donjon", "parchemin", "sang", "nuit"];

/** Libellés (title des pastilles). */
export const THEME_LABEL: Record<ThemeKey, string> = {
  donjon: "Donjon",
  parchemin: "Parchemin",
  sang: "Sang & Acier",
  nuit: "Nuit mystique",
};

/** Couleur de la pastille = l'or (`--gold`) du thème. */
export const THEME_GOLD: Record<ThemeKey, string> = {
  donjon: "#c9a227",
  parchemin: "#7a5413",
  sang: "#c23a3a",
  nuit: "#a8bfe2",
};

const STORAGE_KEY = "daggerweb.theme";

export function loadTheme(): ThemeKey {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && (THEME_ORDER as string[]).includes(v)) return v as ThemeKey;
  } catch {
    /* localStorage indisponible (mode privé) — on garde le défaut. */
  }
  return "donjon";
}

export function saveTheme(key: ThemeKey): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    /* sans persistance, tant pis : le thème reste valable pour la session. */
  }
}

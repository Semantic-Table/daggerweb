// Constantes de gameplay centralisées. Modifier ici pour tuner sans chercher dans les composants.

// Joueur
export const PLAYER_MAX_HP = 100;
// Encombrement max affiché par la fiche CHARGE (Grimoire). L'encombrement n'est pas
// encore une mécanique (pas de malus) — placeholder d'affichage, cf. docs/todo-ui-rpg.md.
export const INV_MAX_WEIGHT = 80;
export const PLAYER_WALK = 4.2;
export const PLAYER_RUN = 7.5;
export const PLAYER_EYE = 0.6;
export const PLAYER_IFRAMES_MS = 600; // invincibilité après un coup (ms)

// Ennemis
export const ENEMY_SPEED = 1.8;
export const ENEMY_STOP_DIST = 1.3;
export const ENEMY_HP = 3;
export const ENEMY_ATTACK_DIST = 1.7;
export const ENEMY_ATTACK_CD = 1;
export const ENEMY_ATTACK_DMG = 8;

// Épée
export const SWORD_REACH = 2.6;
export const SWORD_FIST_REACH = 1.9;
export const SWORD_CONE = 0.5; // cos de l'angle du cône (≈ 60°)

// Interaction
export const INTERACT_PORTAL_FAR = 7;
export const INTERACT_CORPSE_FAR = 3;

// Compétences (XP à l'usage, par catégorie d'arme — cf. GDD §6)
export const SKILL_XP_PER_HIT = 1; // XP gagnée par ennemi réellement touché
export const SKILL_XP_BASE = 5; // coût du palier n = BASE * n (coût croissant)
export const SKILL_DMG_PER_LEVEL = 0.06; // +6% dégâts par palier (multiplicatif)
export const SKILL_SPEED_PER_LEVEL = 0.04; // -4% swingDur par palier (plus rapide)
export const SKILL_SPEED_FLOOR = 0.5; // swingDur ne descend pas sous 50% du base

// Génération de donjon
export const DUNGEON_SIZE = 24;
export const DUNGEON_CELL_RATIO = 0.12; // proportion de cellules creusées
export const DUNGEON_ENEMY_MIN_DIST = 12; // distance min au spawn pour les ennemis
export const DUNGEON_MAX_ENEMIES = 4;

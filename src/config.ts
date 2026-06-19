// Constantes de gameplay centralisées. Modifier ici pour tuner sans chercher dans les composants.

// Joueur
// (Les PV max ne sont plus une constante : ils dérivent de l'END via maxHp() — cf. character.ts)
export const PLAYER_WALK = 4.2;
export const PLAYER_RUN = 7.5;
export const PLAYER_EYE = 0.6;
export const PLAYER_IFRAMES_MS = 600; // invincibilité après un coup (ms)

// ============================================================================
// Attributs (cf. docs/roadmap-attributs.md)
// ============================================================================

// Base et plafond
export const ATTR_BASE = 30;          // Valeur de départ de chaque attribut
export const ATTR_CAP = 100;          // Plafond maximum par attribut

// PV
export const HP_BASE = 40;            // PV de base (sans END)
export const HP_PER_END = 0.5;        // PV supplémentaires par point d'END

// Magie
export const MANA_PER_INT = 1.0;      // Magie par point d'INT

// Encombrement (remplace INV_MAX_WEIGHT)
export const CARRY_BASE = 30;          // Charge de base (kg) sans FOR
export const CARRY_PER_STR = 0.5;     // Charge supplémentaire par point de FOR (kg)

// Dégâts
export const DMG_PER_STR = 0.005;     // Bonus de dégâts par point de FOR (multiplicatif)

// Vitesse
export const MOVE_PER_SPD = 0.005;     // Bonus de vitesse par point de VIT (multiplicatif)

// Chance
export const CRIT_PER_LUCK = 0.002;   // Chance de critique par point de CHN (0-1)

// ============================================================================
// Vigueur (Fatigue) - Phase 4
// ============================================================================

// Vigueur = jauge 0..1. Les coûts/régen sont des FRACTIONS de la jauge, pas des
// valeurs absolues — `maxStamina()` ne sert qu'au pool AFFICHÉ (cosmétique), pas
// au calcul. Le poids des attributs passe par la régen (cf. STAMINA_REGEN_PER_END).
export const FAT_K = 0.8;                  // Coefficient du pool affiché (cosmétique)
export const STAMINA_REGEN = 0.20;         // Régén/s — recharge complète ~5 s
export const STAMINA_REGEN_PER_END = 0.01; // +1 % de régén par point d'END au-dessus de 30
export const RUN_STAMINA_COST = 0.32;      // Coût/s en courant — sprint ~8 s depuis plein
export const ATTACK_STAMINA_COST = 0.12;   // Coût/attaque — cadence soutenable ~1,7 coup/s

// Ennemis : les stats de base vivent désormais dans le catalogue
// (`src/enemies/enemyTypes.ts`, entrée par type), à l'échelle proto. Le gobelin
// y a son entrée comme les autres ; le scaling par niveau passe par
// `scaledStats()` (cf. ci-dessous + docs/roadmap-niveaux.md).

// ==========================================================================
// Armures (cf. docs/roadmap-armures.md)
// ==========================================================================

// Base AC (sans armure)
export const BASE_AC = 10;

// Mitigation : réduction plate des dégâts
// dégâts_subis = max(1, dégâts_entrants - (AC - BASE_AC))
// Repères d'AC : cuir léger 10-13 (1-3 pts), mailles/plates 14-20 (4-10 pts).

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

// ============================================================================
// Compétences de mouvement (Saut, Athlétisme)
// ============================================================================

export const JUMP_FORCE = 9.5;                    // impulsion verticale de base
export const JUMP_BONUS_PER_LEVEL = 0.08;         // +8% hauteur de saut par palier
export const ATHLETICS_SPEED_PER_LEVEL = 0.025;   // +2.5% vitesse de sprint par palier
export const ATHLETICS_STAMINA_PER_LEVEL = 0.035; // -3.5% coût endurance/s par palier

// Génération de donjon
export const CELL = 4; // taille d'une cellule de donjon (unités monde)
export const DUNGEON_SIZE = 24; // dimension de la grille du donjon (cellules)
export const DUNGEON_ENEMY_MIN_DIST = 12; // distance min au spawn pour les ennemis
// Population : le nombre d'ennemis croît avec le niveau du donjon (Phase 3).
// count = clamp(round(BASE + PER_LEVEL·(niveau−1)), BASE, MAX), borné par les
// cases disponibles. Cf. dungeonGen.
export const DUNGEON_ENEMY_BASE = 3;        // ennemis au niveau 1
export const DUNGEON_ENEMY_PER_LEVEL = 0.5; // ennemis supplémentaires par niveau
export const DUNGEON_MAX_ENEMIES = 8;       // plafond absolu

// ==========================================================================
// Niveaux (cf. docs/roadmap-niveaux.md)
// ==========================================================================
// Niveau de donjon : dérivé de la distance au spawn dans l'overworld.
export const LEVEL_MAX = 20;          // niveau maximum (donjon & ennemi)
export const LEVEL_DIST_STEP = 40;    // unités monde par palier de difficulté

// Scaling des stats d'ennemi par niveau (croissance LINÉAIRE, cf. scaledStats).
// Au niveau 1 (g = 0) : stats du catalogue inchangées. Puis +x% par niveau.
export const HP_GROWTH = 0.35;        // +35% PV par niveau au-dessus de 1
export const DMG_GROWTH = 0.15;       // +15% dégâts par niveau
export const ARMOR_GROWTH = 0.0;      // +0 armure/niveau au départ (plafonné à 0.9)

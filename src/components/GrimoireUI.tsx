import { useEffect, useReducer, useRef, useState, type CSSProperties } from "react";
import {
  getInventory,
  subscribeInventory,
  equipWeapon,
  unequipWeapon,
  consumePotion,
  pickupItem,
  getTotalWeight,
  getItemCount,
  getArmorClass,
  getEquippedArmor,
  equipArmor,
  unequipArmor,
} from "../combat/inventory";
import {
  getSkills,
  subscribeSkills,
  levelInfo,
  skillBonus,
  CATEGORIES,
  CATEGORY_LABEL,
} from "../combat/skills";
import {
  carryMax,
  maxMagicka,
  maxStamina,
  currentStamina,
  staminaPercent,
  getAttr,
  getCharacter,
  attrLevel,
  attrLevelInfo,
  characterLevel,
  ATTR_LABEL,
  ATTR_ABBR,
  SKILL_GOV,
  PROFILES,
  saveProfile,
  type CharacterProfile,
} from "../combat/character";
import type { CorpseHandle } from "../combat/corpseRegistry";
import type { ItemDef, WeaponDef, ArmorDef, ArmorSlot } from "../items/itemDefs";
import type { OverworldData, Entrance } from "../gen/overworldGen";
import { type EntranceKind } from "../gen/overworldGen";
import { generateDungeonName, generateDungeonShortName } from "../gen/dungeonNames";
import {
  THEME_ORDER,
  THEME_LABEL,
  THEME_GOLD,
  loadTheme,
  saveTheme,
  type ThemeKey,
} from "../ui/themes";

/* ── Icônes d'objet : formes CSS (clip-path) colorées, à la maquette ──────────
   On garde l'esprit du handoff (icônes dessinées, pas d'images) tout en restant
   sur les types réels du jeu (arme/potion/armure). À remplacer par des sprites plus tard. */
type IconKind = "sword" | "axe" | "fist" | "bottle" | "helmet" | "chestplate" | "leggings" | "gloves" | "boots" | "shield" | "cloak";
function iconKind(item: ItemDef): IconKind {
  if (item.kind === "potion") return "bottle";
  if (item.kind === "armor") {
    const armor = item as ArmorDef;
    switch (armor.slot) {
      case "head": return "helmet";
      case "chest": return "chestplate";
      case "legs": return "leggings";
      case "gloves": return "gloves";
      case "feet": return "boots";
      case "shield": return "shield";
      case "cloak": return "cloak";
      default: return "chestplate";
    }
  }
  if (item.category === "axe") return "axe";
  if (item.category === "unarmed") return "fist";
  return "sword";
}
const ICON_POLY: Record<IconKind, string> = {
  sword:
    "polygon(45% 2%,55% 2%,55% 52%,68% 56%,68% 66%,55% 66%,55% 80%,62% 80%,62% 90%,38% 90%,38% 80%,45% 80%,45% 66%,32% 66%,32% 56%,45% 52%)",
  axe: "polygon(44% 6%,52% 6%,52% 52%,52% 94%,44% 94%,44% 58%,18% 58%,14% 34%,44% 26%)",
  fist: "polygon(18% 32%,82% 32%,82% 44%,92% 44%,92% 70%,18% 70%)",
  bottle: "polygon(40% 2%,60% 2%,60% 26%,80% 54%,80% 96%,20% 96%,20% 54%,40% 26%)",
  // Armures
  helmet: "polygon(20% 15%,80% 15%,80% 35%,50% 55%,20% 35%)",
  chestplate: "polygon(20% 10%,80% 10%,80% 50%,60% 90%,40% 90%,20% 50%)",
  leggings: "polygon(20% 10%,40% 10%,40% 90%,60% 90%,60% 10%,80% 10%,80% 40%,20% 40%)",
  gloves: "polygon(25% 20%,75% 20%,75% 40%,65% 60%,35% 60%,25% 40%)",
  boots: "polygon(20% 40%,40% 40%,40% 80%,60% 80%,60% 40%,80% 40%,80% 60%,20% 60%)",
  shield: "polygon(15% 10%,85% 10%,85% 90%,15% 90%)",
  cloak: "polygon(10% 0%,90% 0%,90% 30%,60% 50%,30% 50%,0% 30%)",
};
const ICON_COLOR: Record<IconKind, string> = {
  sword: "oklch(0.63 0.14 38)",
  axe: "oklch(0.63 0.14 38)",
  fist: "oklch(0.6 0.1 65)",
  bottle: "oklch(0.62 0.13 150)",
  // Armures - cuir = marron, métal = gris/bleu
  helmet: "oklch(0.55 0.08 210)",
  chestplate: "oklch(0.55 0.08 210)",
  leggings: "oklch(0.55 0.08 210)",
  gloves: "oklch(0.52 0.06 65)",
  boots: "oklch(0.52 0.06 65)",
  shield: "oklch(0.55 0.1 38)",
  cloak: "oklch(0.5 0.05 30)",
};
function itemIcon(item: ItemDef, size: number): CSSProperties {
  const k = iconKind(item);
  return {
    width: size,
    height: size,
    background: ICON_COLOR[k],
    clipPath: ICON_POLY[k],
    imageRendering: "pixelated",
    flex: "none",
  };
}

const TYPE_LABEL: Record<string, string> = { weapon: "Arme", potion: "Potion", armor: "Armure" };

/* Catégories de filtre (sacoche). */
const CATS: { key: string; label: string; kinds: ItemDef["kind"][] | null }[] = [
  { key: "tout", label: "Tout", kinds: null },
  { key: "armes", label: "Armes", kinds: ["weapon"] },
  { key: "armures", label: "Armures", kinds: ["armor"] },
  { key: "magie", label: "Magie", kinds: ["potion"] },
  { key: "divers", label: "Divers", kinds: [] },
];

type Tab = "inv" | "equip" | "skills" | "stats" | "magic" | "map";
const TABS: { key: Tab; label: string }[] = [
  { key: "inv", label: "SACOCHE" },
  { key: "equip", label: "ÉQUIPEMENT" },
  { key: "skills", label: "APTITUDES" },
  { key: "stats", label: "PERSONNAGE" },
  { key: "magic", label: "MAGIE" },
  { key: "map", label: "CARTE" },
];

// Attribut gouverneur par catégorie — maintenant géré par character.ts

interface Props {
  open: boolean;
  onClose: () => void;
  /** Cadavre en cours de fouille (null = menu seul). */
  corpse: CorpseHandle | null;
  onHeal: (amount: number) => void;
  hp: number;
  maxHp: number;
  overworldData: OverworldData;
  dungeonName: string | null;
  mode: "overworld" | "dungeon";
  returnId: number | null;
}

export function GrimoireUI({ open, onClose, corpse, onHeal, hp, maxHp, overworldData, dungeonName, mode, returnId }: Props) {
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeInventory(forceUpdate), []);
  useEffect(() => subscribeSkills(forceUpdate), []);
  
  // Vérifier si un profil a déjà été choisi (pour l'affichage du sélecteur)
  const [showProfileSelect, setShowProfileSelect] = useState(false);
  useEffect(() => {
    // Vérifier si c'est le premier lancement (pas de profil sauvegardé)
    const hasProfile = localStorage.getItem("dungeonFps_profile");
    if (!hasProfile && open) {
      setShowProfileSelect(true);
    }
  }, [open]);
  
  const chooseProfile = (profile: CharacterProfile) => {
    saveProfile(profile);
    setShowProfileSelect(false);
    // Recharger la page pour appliquer le nouveau profil
    window.location.reload();
  };

  const [tab, setTab] = useState<Tab>("inv");
  const [theme, setTheme] = useState<ThemeKey>(loadTheme);
  const [cat, setCat] = useState("tout");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selSlot, setSelSlot] = useState<number | null>(null);
  const [selSpell, setSelSpell] = useState("givre");
  const dragSlot = useRef<number | null>(null);

  // Fouiller un cadavre ramène toujours sur la sacoche.
  useEffect(() => {
    if (corpse) setTab("inv");
  }, [corpse]);

  // Ferme sur Échap ou I.
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.code === "Escape" || e.code === "KeyI") onClose();
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  }, [open, onClose]);

  const pickTheme = (k: ThemeKey) => {
    setTheme(k);
    saveTheme(k);
  };

  if (!open) return null;

  // ========================================================================
  // Sélecteur de profil (premier lancement)
  // ========================================================================
  if (showProfileSelect) {
    return (
      <div className="grim-overlay" data-theme="donjon" onClick={() => setShowProfileSelect(false)}>
        <div className="grim-cabinet" onClick={(e) => e.stopPropagation()}>
          <div className="grim-titlebar">
            <div className="grim-id">
              <div className="grim-crest" />
              <div className="grim-id-text">
                <div className="grim-title">Choisis ton destin</div>
                <div className="grim-sub">Sélectionne un profil de départ</div>
              </div>
            </div>
          </div>
          <div className="grim-content" style={{ height: "auto", padding: "2rem" }}>
            <div className="profile-select-grid">
              {Object.entries(PROFILES).map(([key, profile]) => (
                <button
                  key={key}
                  className="profile-card"
                  onClick={() => chooseProfile(key as CharacterProfile)}
                >
                  <div className="profile-name">{profile.label}</div>
                  <div className="profile-attrs">
                    {Object.entries(profile.attrs).map(([attr, value]) => (
                      <span key={attr} className="profile-attr">
                        {attr}: {value}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <div className="profile-note">
              Tu pourras toujours progresser dans tous les attributs en jouant.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const inv = getInventory();
  const equipped = inv.equipped;
  const equippedArmor = getEquippedArmor();
  const hasWeaponEquipped = equipped.id !== "fists";
  const ac = getArmorClass();

  // Items filtrés par catégorie (avec index réel).
  const catDef = CATS.find((c) => c.key === cat)!;
  const filled = inv.items
    .map((item, index) => ({ item, index }))
    .filter((e) => !catDef.kinds || catDef.kinds.includes(e.item.kind));

  const sel = selSlot != null ? inv.items[selSlot] : null;
  const selIsEquipped = sel != null && sel === equipped;
  
  // Vérifier si l'item sélectionné est une armure équipée
  const selIsArmorEquipped = sel != null && sel.kind === "armor" && 
    Object.values(equippedArmor).some((a: ArmorDef | undefined) => a === sel);
  const totalWt = getTotalWeight();
  const maxWt = carryMax();

  const equipSel = () => {
    if (selSlot == null || !sel) return;
    if (sel.kind === "weapon") {
      if (selIsEquipped) unequipWeapon();
      else equipWeapon(selSlot);
    } else if (sel.kind === "armor") {
      const armor = sel as ArmorDef;
      // Si déjà équipée, la déséquiper
      if (selIsArmorEquipped) {
        unequipArmor(armor.slot);
      } else {
        equipArmor(selSlot);
      }
    }
  };
  const useSel = () => {
    if (selSlot == null || !sel || sel.kind !== "potion") return;
    const healed = consumePotion(selSlot);
    if (healed > 0) onHeal(healed);
    setSelSlot(null);
  };

  const takeLoot = (item: ItemDef, lootIdx: number) => {
    if (pickupItem(item) && corpse) {
      corpse.loot.splice(lootIdx, 1);
      if (corpse.loot.length === 0) corpse.markLooted();
      forceUpdate();
    }
  };

  return (
    <div className="grim-overlay" data-theme={theme} onClick={onClose}>
      <div className="grim-cabinet" onClick={(e) => e.stopPropagation()}>
        {/* ── Barre de titre ───────────────────────────────────────────── */}
        <div className="grim-titlebar">
          <div className="grim-id">
            <div className="grim-crest" />
            <div className="grim-id-text">
              <div className="grim-title">Errant des Marches</div>
              <div className="grim-sub">Aventurier · sans classe fixe</div>
            </div>
          </div>
          <div className="grim-themes">
            <span className="grim-theme-label">THÈME</span>
            {THEME_ORDER.map((k) => (
              <button
                key={k}
                className={`grim-swatch${k === theme ? " grim-swatch--active" : ""}`}
                style={{ background: THEME_GOLD[k] }}
                title={THEME_LABEL[k]}
                onClick={() => pickTheme(k)}
              />
            ))}
          </div>
        </div>

        {/* ── Onglets ──────────────────────────────────────────────────── */}
        <div className="grim-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`grim-tab${tab === t.key ? " grim-tab--active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Contenu ──────────────────────────────────────────────────── */}
        <div className="grim-content">
          {/* ===== SACOCHE ===== */}
          {tab === "inv" && (
            <div className="grim-inv">
              {/* col. gauche : filtres + charge + or */}
              <div className="grim-col">
                <div className="grim-coltitle">CATÉGORIES</div>
                {CATS.map((c) => (
                  <button
                    key={c.key}
                    className={`grim-cat${cat === c.key ? " grim-cat--active" : ""}`}
                    onClick={() => setCat(c.key)}
                  >
                    {c.label}
                  </button>
                ))}
                <div className="grim-encarts">
                  <div className="grim-encart">
                    <div className="grim-encart-head">
                      <span className="grim-dim">CHARGE</span>
                      <span className="grim-ink">{totalWt} / {Math.floor(maxWt)}</span>
                    </div>
                    <div className="grim-gauge grim-gauge--sm">
                      <div
                        className="grim-gauge-fill"
                        style={{ width: `${Math.min(100, (totalWt / maxWt) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="grim-encart grim-encart--row" title="Économie à venir">
                    <span className="grim-dim">OR</span>
                    <span className="grim-gold-val">
                      <span className="grim-coin" />—
                    </span>
                  </div>
                </div>
              </div>

              {/* col. centrale : grille / liste */}
              <div className="grim-col grim-col--grow">
                {corpse && (
                  <div className="grim-corpse">
                    <div className="grim-corpse-head">
                      CADAVRE · {corpse.loot.length ? "cliquez pour prendre" : "fouillé"}
                    </div>
                    <div className="grim-corpse-row">
                      {corpse.loot.length === 0 ? (
                        <span className="grim-dim">Rien à prendre.</span>
                      ) : (
                        corpse.loot.map((item, i) => (
                          <button
                            key={i}
                            className="grim-corpse-item"
                            onClick={() => takeLoot(item, i)}
                            title={`Prendre — ${item.name}`}
                          >
                            <span style={itemIcon(item, 18)} />
                            <span className="grim-corpse-name">{item.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
                <div className="grim-invhead">
                  <span className="grim-invtitle">SACOCHE · {getItemCount()} objets</span>
                  <div className="grim-minis">
                    <button
                      className={`grim-mini${view === "grid" ? " grim-mini--active" : ""}`}
                      onClick={() => setView("grid")}
                    >
                      GRILLE
                    </button>
                    <button
                      className={`grim-mini${view === "list" ? " grim-mini--active" : ""}`}
                      onClick={() => setView("list")}
                    >
                      LISTE
                    </button>
                  </div>
                </div>
                <div className="grim-itemarea">
                  {filled.length === 0 ? (
                    <div className="grim-empty">Aucun objet dans cette catégorie.</div>
                  ) : view === "grid" ? (
                    <div className="grim-itemgrid">
                      {filled.map(({ item, index }) => {
                        const eq = item === equipped || 
                          (item.kind === "armor" && 
                           Object.values(equippedArmor).some((a: ArmorDef | undefined) => a === item));
                        return (
                          <div
                            key={index}
                            className={`grim-slot${selSlot === index ? " grim-slot--sel" : ""}${
                              eq ? " grim-slot--eq" : ""
                            }`}
                            draggable
                            onDragStart={(e) => {
                              dragSlot.current = index;
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onClick={() => setSelSlot(index)}
                            title={item.name}
                          >
                            <span style={itemIcon(item, 32)} />
                            <span className="grim-slot-wt">{item.weight}</span>
                            {eq && <span className="grim-slot-dot">●</span>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grim-itemlist">
                      {filled.map(({ item, index }) => {
                        const eq = item === equipped || 
                          (item.kind === "armor" && 
                           Object.values(equippedArmor).some((a: ArmorDef | undefined) => a === item));
                        return (
                          <div
                            key={index}
                            className={`grim-row${selSlot === index ? " grim-row--sel" : ""}`}
                            draggable
                            onDragStart={(e) => {
                              dragSlot.current = index;
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onClick={() => setSelSlot(index)}
                          >
                            <span style={itemIcon(item, 22)} />
                            <span className="grim-row-name">{item.name}</span>
                            {eq && <span className="grim-row-eq">ÉQUIPÉ</span>}
                            <span className="grim-row-wt">{item.weight}kg</span>
                            <span className="grim-row-val">{item.value}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* col. droite : fiche */}
              <div className="grim-detail">
                {sel ? (
                  <div className="grim-detail-in">
                    <div className="grim-iconbox-wrap">
                      <div className="grim-iconbox">
                        <span style={itemIcon(sel, 52)} />
                      </div>
                    </div>
                    <div className="grim-detail-name">{sel.name}</div>
                    <div className="grim-detail-type">{TYPE_LABEL[sel.kind] ?? "Objet"}</div>
                    <div className="grim-ministats">
                      <div className="grim-ministat">
                        <div className="grim-dim">POIDS</div>
                        <div className="grim-ink">{sel.weight} kg</div>
                      </div>
                      <div className="grim-ministat">
                        <div className="grim-dim">VALEUR</div>
                        <div className="grim-gold-val">{sel.value}</div>
                      </div>
                      {sel.kind === "weapon" && (
                        <div className="grim-ministat">
                          <div className="grim-dim">DÉGÂTS</div>
                          <div className="grim-ink">{sel.dmg}</div>
                        </div>
                      )}
                      {sel.kind === "potion" && (
                        <div className="grim-ministat">
                          <div className="grim-dim">SOIN</div>
                          <div className="grim-ink">+{sel.heal}</div>
                        </div>
                      )}
                      {sel.kind === "armor" && (
                        <div className="grim-ministat">
                          <div className="grim-dim">ARMURE</div>
                          <div className="grim-ink">+{(sel as ArmorDef).armor}</div>
                        </div>
                      )}
                    </div>
                    <div className="grim-desc">{sel.desc}</div>
                    <div className="grim-actions">
                      {sel.kind === "weapon" && (
                        <button className="grim-btn grim-btn--gold" onClick={equipSel}>
                          {selIsEquipped ? "RETIRER" : "ÉQUIPER"}
                        </button>
                      )}
                      {sel.kind === "armor" && (
                        <button className="grim-btn grim-btn--gold" onClick={equipSel}>
                          {selIsArmorEquipped ? "RETIRER" : "ÉQUIPER"}
                        </button>
                      )}
                      {sel.kind === "potion" && (
                        <button className="grim-btn" onClick={useSel}>
                          UTILISER
                        </button>
                      )}
                      <button className="grim-link" title="Suppression à venir">
                        jeter l'objet
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grim-nosel">
                    <div className="grim-rune" />
                    <div className="grim-dim">
                      Sélectionnez un objet
                      <br />
                      pour l'examiner
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== ÉQUIPEMENT (paper-doll) ===== */}
          {tab === "equip" && (
            <Equip
              inv={inv}
              equipped={equipped}
              equippedArmor={equippedArmor}
              hasWeapon={hasWeaponEquipped}
              ac={ac}
              dragSlot={dragSlot}
            />
          )}

          {/* ===== APTITUDES ===== */}
          {tab === "skills" && (
            <div className="grim-skills">
              <div className="grim-skills-head">
                <span className="grim-coltitle">COMPÉTENCES</span>
                <div className="grim-legend">
                  <span><span className="grim-tag grim-tag--pri" />Principale</span>
                  <span><span className="grim-tag grim-tag--maj" />Majeure</span>
                  <span><span className="grim-tag grim-tag--min" />Mineure</span>
                </div>
              </div>
              <div className="grim-skillgrid">
                {CATEGORIES.map((c) => {
                  const info = levelInfo(getSkills()[c].xp);
                  const bon = skillBonus(c);
                  const isEq = equipped.category === c;
                  const dmgPct = Math.round((bon.dmgMult - 1) * 100);
                  const spdPct = Math.round((1 - bon.speedMult) * 100);
                  return (
                    <div key={c} className="grim-skillrow">
                      <div className="grim-skillrow-top">
                        <span className={`grim-tag ${isEq ? "grim-tag--pri" : "grim-tag--min"}`} />
                        <span className="grim-skill-name">{CATEGORY_LABEL[c]}</span>
                        <span className="grim-gov" title="Attribut gouverneur">
                          {SKILL_GOV[c]}
                        </span>
                        <div className="grim-track grim-track--sk">
                          <div
                            className="grim-track-fill"
                            style={{
                              width: `${(info.into / info.need) * 100}%`,
                              background: isEq ? "var(--gold)" : "var(--bar)",
                            }}
                          />
                        </div>
                        <span className="grim-skill-lvl">{bon.level}</span>
                      </div>
                      <div className="grim-skillrow-bonus">
                        {info.into}/{info.need} XP · +{dmgPct}% dég · +{spdPct}% vit
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grim-note">
                Les aptitudes montent à l'usage, par catégorie d'arme. Arbre de
                compétences étendu (escrime, magie, furtivité…) à venir.
              </div>
            </div>
          )}

          {/* ===== PERSONNAGE ===== */}
          {tab === "stats" && <Stats hp={hp} maxHp={maxHp} />}

          {/* ===== MAGIE ===== */}
          {tab === "magic" && <Magic sel={selSpell} onSelect={setSelSpell} />}

          {/* ===== CARTE ===== */}
          {tab === "map" && (
            <MapScreen
              overworldData={overworldData}
              dungeonName={dungeonName}
              mode={mode}
              returnId={returnId}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Sous-écrans
   ════════════════════════════════════════════════════════════════════════ */

/* Positions des cases du paper-doll (cf. handoff). */
const DOLL_SLOTS: { key: string; label: string; top: number; left: number }[] = [
  { key: "head", label: "Tête", top: 6, left: 121 },
  { key: "cloak", label: "Cape", top: 74, left: 40 },
  { key: "amulet", label: "Cou", top: 74, left: 202 },
  { key: "chest", label: "Torse", top: 132, left: 121 },
  { key: "rightHand", label: "Arme", top: 200, left: 22 },
  { key: "leftHand", label: "Main g.", top: 200, left: 220 },
  { key: "legs", label: "Jambes", top: 244, left: 121 },
  { key: "gloves", label: "Gants", top: 312, left: 22 },
  { key: "ring1", label: "Anneau", top: 312, left: 220 },
  { key: "feet", label: "Pieds", top: 368, left: 121 },
];

const SILHOUETTE =
  "polygon(38% 0,62% 0,68% 12%,64% 22%,84% 30%,82% 56%,66% 54%,66% 100%,52% 100%,52% 60%,48% 60%,48% 100%,34% 100%,34% 54%,18% 56%,16% 30%,36% 22%,32% 12%)";

function Equip({
  inv,
  equipped,
  equippedArmor,
  hasWeapon,
  ac,
  dragSlot,
}: {
  inv: ReturnType<typeof getInventory>;
  equipped: WeaponDef;
  equippedArmor: Partial<Record<ArmorSlot, ArmorDef>>;
  hasWeapon: boolean;
  ac: number;
  dragSlot: React.MutableRefObject<number | null>;
}) {
  // Sac « équipable » = armes et armures en inventaire non équipées
  const bag = inv.items
    .map((item, index) => ({ item, index }))
    .filter(
      (e): e is { item: ItemDef; index: number } =>
        (e.item.kind === "weapon" && e.item !== equipped) ||
        (e.item.kind === "armor" && !Object.values(equippedArmor).some((a: ArmorDef | undefined) => a === e.item))
    );

  const dropWeapon = (e: React.DragEvent) => {
    e.preventDefault();
    const index = dragSlot.current;
    if (index == null) return;
    const it = inv.items[index];
    if (it && it.kind === "weapon") equipWeapon(index);
  };

  // Drop handler pour les armures
  const dropArmor = (slot: ArmorSlot) => (e: React.DragEvent) => {
    e.preventDefault();
    const index = dragSlot.current;
    if (index == null) return;
    const it = inv.items[index];
    if (it && it.kind === "armor" && it.slot === slot) {
      equipArmor(index);
    }
  };

  // Mapping entre les slots du paper-doll et les ArmorSlot
  const DOLL_TO_ARMOR_SLOT: Record<string, ArmorSlot | null> = {
    head: "head",
    chest: "chest",
    legs: "legs",
    gloves: "gloves",
    feet: "feet",
    leftHand: "shield",
    cloak: "cloak",
    rightHand: null,
    amulet: null,
    ring1: null,
  };

  return (
    <div className="grim-equip">
      {/* gauche : sac équipable */}
      <div className="grim-col">
        <div className="grim-coltitle">ÉQUIPABLE · glissez →</div>
        <div className="grim-bag">
          {bag.length === 0 ? (
            <div className="grim-empty">Aucun objet à équiper.</div>
          ) : (
            bag.map(({ item, index }) => (
              <div
                key={index}
                className="grim-bagitem"
                draggable
                onDragStart={(e) => {
                  dragSlot.current = index;
                  e.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => {
                  if (item.kind === "weapon") equipWeapon(index);
                  else if (item.kind === "armor") equipArmor(index);
                }}
                title={`Équiper — ${item.name}`}
              >
                <span style={itemIcon(item, 22)} />
                <span className="grim-bagitem-name">{item.name}</span>
                <span className="grim-dim">{TYPE_LABEL[item.kind]}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* centre : paper-doll */}
      <div className="grim-doll-wrap">
        <div className="grim-doll">
          <div className="grim-silhouette" style={{ clipPath: SILHOUETTE }} />
          <div className="grim-doll-cap">▣ figurine</div>
          {DOLL_SLOTS.map((s) => {
            const isWeapon = s.key === "rightHand";
            const armorSlot = DOLL_TO_ARMOR_SLOT[s.key];
            const slotArmor = armorSlot ? equippedArmor[armorSlot] || null : null;
            const filled = isWeapon ? hasWeapon : slotArmor !== null;
            const itemToShow = isWeapon ? equipped : slotArmor;
            
            return (
              <div
                key={s.key}
                className={`grim-eqslot${filled ? " grim-eqslot--filled" : ""}`}
                style={{ top: s.top, left: s.left }}
                onDragOver={(e) => {
                  e.preventDefault();
                  const dragIndex = dragSlot.current;
                  if (dragIndex != null) {
                    const draggedItem = inv.items[dragIndex];
                    if (isWeapon && draggedItem?.kind === "weapon") {
                      e.dataTransfer.effectAllowed = "move";
                      return;
                    }
                    if (armorSlot && draggedItem?.kind === "armor" && draggedItem.slot === armorSlot) {
                      e.dataTransfer.effectAllowed = "move";
                      return;
                    }
                  }
                  e.dataTransfer.effectAllowed = "none";
                }}
                onDrop={isWeapon ? dropWeapon : (armorSlot ? dropArmor(armorSlot) : undefined)}
                onClick={filled ? () => {
                  if (isWeapon) unequipWeapon();
                  else if (armorSlot && itemToShow) unequipArmor(armorSlot);
                } : undefined}
                title={filled ? `${itemToShow!.name} — clic pour retirer` : s.label}
              >
                {filled && itemToShow ? (
                  <span style={itemIcon(itemToShow, 34)} />
                ) : (
                  <span className="grim-eqslot-label">{s.label}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* droite : défense */}
      <div className="grim-defense">
        <div className="grim-ac">
          <div className="grim-dim">CLASSE D'ARMURE</div>
          <div className="grim-ac-val">{ac}</div>
        </div>
        <div className="grim-rule" />
        <div className="grim-def-row">
          <span className="grim-dim">ARME</span>
          <span className="grim-ink">{hasWeapon ? equipped.name : "À mains nues"}</span>
        </div>
        <div className="grim-def-row">
          <span className="grim-dim">DÉGÂTS</span>
          <span className="grim-gold-val">{equipped.dmg}</span>
        </div>
        <div className="grim-dim grim-def-label">PROTECTION PAR PIÈCE</div>
        <div className="grim-def-list">
          {[
            { label: "Tête", slot: "head" as ArmorSlot },
            { label: "Torse", slot: "chest" as ArmorSlot },
            { label: "Jambes", slot: "legs" as ArmorSlot },
            { label: "Mains", slot: "gloves" as ArmorSlot },
            { label: "Pieds", slot: "feet" as ArmorSlot },
            { label: "Bouclier", slot: "shield" as ArmorSlot },
            { label: "Cape", slot: "cloak" as ArmorSlot },
          ].map(({ label, slot }) => {
            const armor = equippedArmor[slot];
            return (
              <div key={slot} className="grim-def-row grim-def-row--sm">
                <span className="grim-dim">{label}</span>
                <span className={armor ? "grim-gold-val" : "grim-dim"}>
                  {armor ? `+${armor.armor}` : "— vide"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stats({ hp, maxHp }: { hp: number; maxHp: number }) {
  // Valeurs des attributs (réelles, plus de placeholders)
  const attrs = ATTR_ABBR.map((abbr) => {
    const value = getAttr(abbr);
    const level = attrLevel(abbr);
    const info = attrLevelInfo(getCharacter().practice[abbr]);
    return {
      abbr,
      name: ATTR_LABEL[abbr],
      value,
      level,
      xp: info.into,
      need: info.need,
    };
  });

  return (
    <div className="grim-stats">
      <div className="grim-col">
        <div className="grim-coltitle">ATTRIBUTS</div>
        <div className="grim-attrgrid">
          {attrs.map((a) => (
            <div key={a.abbr} className="grim-attr">
              <div className="grim-attr-abbr">{a.abbr}</div>
              <div className="grim-attr-body">
                <div className="grim-attr-line">
                  <span className="grim-ink">{a.name}</span>
                  <span className="grim-attr-val">{a.value}</span>
                </div>
                {/* Niveau de l'attribut (Phase 2) */}
                {a.level > 0 && (
                  <div className="grim-attr-level">
                    Nv {a.level} ({a.xp}/{a.need} XP)
                  </div>
                )}
                {/* Barre de progression vers le prochain palier */}
                <div className="grim-gauge grim-gauge--sm">
                  <div
                    className="grim-gauge-fill"
                    style={{ width: `${((a.value - 30) / 70) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grim-charpanel">
        <div className="grim-charhead">
          <div className="grim-portrait">portrait</div>
          <div className="grim-charinfo">
            <div className="grim-detail-name grim-detail-name--left">Errant des Marches</div>
            {/* Afficher le profil sélectionné */}
            {(() => {
              const profileKey = localStorage.getItem("dungeonFps_profile") as CharacterProfile | null;
              const profile = profileKey ? PROFILES[profileKey] : PROFILES.neutre;
              return (
                <>
                  <div className="grim-ink">Classe · {profile.label}</div>
                  <div className="grim-ink">Niveau · {characterLevel()}</div>
                </>
              );
            })()}
          </div>
        </div>
        <div className="grim-rule" />
        {/* Points de vie, Magie, Vigueur et Charge - TOUT RÉEL ! */}
        <Bar label="Points de vie" val={`${hp} / ${maxHp}`} pct={(hp / maxHp) * 100} />
        <Bar label="Magie" val={`${Math.floor(maxMagicka())} / ${Math.floor(maxMagicka())}`} pct={100} />
        <Bar label="Vigueur" val={`${Math.floor(currentStamina())} / ${Math.floor(maxStamina())}`} pct={staminaPercent()} />
        <Bar label="Charge" val={`${Math.floor(getTotalWeight())} / ${Math.floor(carryMax())}`} pct={(getTotalWeight() / carryMax()) * 100} />
        <div className="grim-note">Attributs, magie ET vigueur réels !</div>
      </div>
    </div>
  );
}

function Bar({ label, val, pct }: { label: string; val: string; pct: number }) {
  return (
    <div className="grim-bar">
      <div className="grim-bar-line">
        <span className="grim-dim">{label}</span>
        <span className="grim-bar-val">{val}</span>
      </div>
      <div className="grim-gauge">
        <div className="grim-gauge-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* Sorts — PLACEHOLDER (pas de système de magie). Contenu d'exemple du handoff. */
const SPELLS: {
  id: string;
  name: string;
  school: string;
  cost: number;
  range: string;
  effect: string;
}[] = [
  { id: "givre", name: "Trait de Givre", school: "Givre", cost: 12, range: "Distance", effect: "Inflige 8-14 dégâts de froid à une cible distante et la ralentit brièvement." },
  { id: "flamme", name: "Flamme Mineure", school: "Pyromancie", cost: 9, range: "Distance", effect: "Projette une gerbe de feu : 6-12 dégâts thermiques sur la première cible touchée." },
  { id: "soin", name: "Soin des Plaies", school: "Guérison", cost: 14, range: "Contact", effect: "Restaure 15-25 points de vie sur soi ou un allié au contact." },
  { id: "ombre", name: "Pas de l'Ombre", school: "Illusion", cost: 11, range: "Soi", effect: "Invisibilité partielle pendant 20 s ; rompue par une attaque." },
  { id: "lueur", name: "Lueur des Veilleurs", school: "Illusion", cost: 4, range: "Soi", effect: "Crée une lumière flottante qui éclaire les couloirs sombres." },
];

function Magic({ sel, onSelect }: { sel: string; onSelect: (id: string) => void }) {
  const spell = SPELLS.find((s) => s.id === sel) ?? SPELLS[0];
  const spellIcon: CSSProperties = {
    width: 40,
    height: 40,
    background: "oklch(0.58 0.12 300)",
    clipPath: "polygon(50% 4%,96% 50%,50% 96%,4% 50%)",
    imageRendering: "pixelated",
  };
  return (
    <div className="grim-magic">
      <div className="grim-col grim-col--grow">
        <div className="grim-magic-head">
          <span className="grim-coltitle">GRIMOIRE</span>
          <div className="grim-magic-mana">
            <span className="grim-dim">MAGIE</span>
            <div className="grim-gauge">
              <div className="grim-gauge-fill" style={{ width: "0%" }} />
            </div>
            <span className="grim-bar-val">—</span>
          </div>
        </div>
        <div className="grim-spelllist">
          {SPELLS.map((s) => (
            <div
              key={s.id}
              className={`grim-spell${sel === s.id ? " grim-spell--sel" : ""}`}
              onClick={() => onSelect(s.id)}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  background: "oklch(0.58 0.12 300)",
                  clipPath: "polygon(50% 4%,96% 50%,50% 96%,4% 50%)",
                  flex: "none",
                }}
              />
              <div className="grim-spell-body">
                <div className="grim-ink">{s.name}</div>
                <div className="grim-dim">{s.school}</div>
              </div>
              <div className="grim-spell-cost">
                <div className="grim-gold-val">{s.cost}</div>
                <div className="grim-dim">PM</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grim-spelldetail">
        <div className="grim-iconbox-wrap">
          <div className="grim-iconbox grim-iconbox--sm">
            <span style={spellIcon} />
          </div>
        </div>
        <div className="grim-detail-name">{spell.name}</div>
        <div className="grim-detail-type">ÉCOLE DE {spell.school.toUpperCase()}</div>
        <div className="grim-ministats">
          <div className="grim-ministat">
            <div className="grim-dim">COÛT</div>
            <div className="grim-gold-val">{spell.cost}</div>
          </div>
          <div className="grim-ministat">
            <div className="grim-dim">PORTÉE</div>
            <div className="grim-ink">{spell.range}</div>
          </div>
        </div>
        <div className="grim-desc">{spell.effect}</div>
        <button className="grim-btn grim-btn--gold grim-btn--disabled" title="Magie à venir" disabled>
          INCANTER
        </button>
      </div>
    </div>
  );
}

/* Carte — basée sur les données réelles de l'overworld */

// Position du joueur dans l'overworld (coordonnées centrales)
const PLAYER_OVERWORLD_POS = { x: 0, z: 0 };

// Échelle pour convertir les coordonnées monde en pourcentages de carte
const MAP_SCALE = 100 / 200; // 200 = GROUND size, 100% = carte width

// Convertit les coordonnées monde en position sur la carte (pourcentage)
function worldToMapCoord(x: number, z: number): { mapX: number; mapY: number } {
  // Inverser Z car dans le monde, +z = nord, mais sur la carte, +y = sud
  return {
    mapX: 50 + x * MAP_SCALE,
    mapY: 50 - z * MAP_SCALE,
  };
}

// Génère les marques pour les entrances de donjons
function generateDungeonMarks(
  entrances: Entrance[],
  returnId: number | null,
  mode: "overworld" | "dungeon"
): { name: string; x: number; y: number; here?: boolean; kind: EntranceKind; id: number }[] {
  return entrances.map((e) => {
    const { mapX, mapY } = worldToMapCoord(e.x, e.z);
    const isCurrent = mode === "dungeon" && returnId === e.id;
    return {
      name: generateDungeonShortName(e.kind, e.seed),
      x: mapX,
      y: mapY,
      here: isCurrent,
      kind: e.kind,
      id: e.id,
    };
  });
}

// Génère la liste des lieux connus (entrances de donjons)
function generateKnownPlaces(
  entrances: Entrance[]
): { name: string; kind: EntranceKind; visited: boolean; id: number }[] {
  return entrances.map((e) => ({
    name: generateDungeonShortName(e.kind, e.seed),
    kind: e.kind,
    visited: true, // Pour l'instant, tous sont "visités" une fois découverts
    id: e.id,
  }));
}

function MapScreen({
  overworldData,
  dungeonName,
  mode,
  returnId,
}: {
  overworldData: OverworldData;
  dungeonName: string | null;
  mode: "overworld" | "dungeon";
  returnId: number | null;
}) {
  const { entrances } = overworldData;
  
  // Générer les marques de la carte à partir des vraies entrances
  const mapMarks = generateDungeonMarks(entrances, returnId, mode);
  const knownPlaces = generateKnownPlaces(entrances);

  // Position du joueur sur la carte
  const playerMapPos = worldToMapCoord(PLAYER_OVERWORLD_POS.x, PLAYER_OVERWORLD_POS.z);

  return (
    <div className="grim-map">
      <div className="grim-mapview">
        <div className="grim-maptitle">LES MARCHES DE CENDREBOIS</div>
        <div className="grim-compass">
          <div className="grim-compass-needle" />
          <span className="grim-compass-n">N</span>
        </div>
        
        {/* Marqueurs des entrances de donjons */}
        {mapMarks.map((m) => (
          <div key={`entrance-${m.id}`}>
            <div
              className="grim-mark"
              style={{
                left: `${m.x}%`,
                top: `${m.y}%`,
                background: m.here ? "var(--gold)" : "var(--inkDim)",
              }}
              title={generateDungeonName(m.kind, entrances.find(e => e.id === m.id)?.seed || 0)}
            />
            <div className="grim-mark-label" style={{ left: `${m.x}%`, top: `calc(${m.y}% + 11px)` }}>
              {m.name}
            </div>
          </div>
        ))}
        
        {/* Position du joueur (seulement en overworld) */}
        {mode === "overworld" && (
          <>
            <div 
              className="grim-here" 
              style={{ left: `${playerMapPos.mapX}%`, top: `${playerMapPos.mapY}%` }}
            />
            <div 
              className="grim-here-label" 
              style={{ left: `${playerMapPos.mapX}%`, top: `calc(${playerMapPos.mapY}% + 14px)` }}
            >
              VOUS ÊTES ICI
            </div>
          </>
        )}
        
        {/* Indicateur si dans un donjon */}
        {mode === "dungeon" && dungeonName && (
          <div className="grim-mapnote" style={{ color: "var(--gold)" }}>
            ▤ {dungeonName}
          </div>
        )}
        
        {mode === "overworld" && (
          <div className="grim-mapnote">▤ Explorez pour découvrir des donjons</div>
        )}
      </div>
      <div className="grim-col">
        <div className="grim-coltitle">DONJONS DÉCOUVERTS</div>
        {knownPlaces.length > 0 ? (
          knownPlaces.map((p) => (
            <div key={`place-${p.id}`} className="grim-place">
              <span
                className="grim-place-dot"
                style={{
                  background: 
                    mode === "dungeon" && returnId === p.id 
                      ? "var(--gold)" 
                      : "var(--inkDim)",
                }}
              />
              <span className="grim-ink grim-place-name">{p.name}</span>
              <span className="grim-dim">{p.visited ? "exploré" : "?"}</span>
            </div>
          ))
        ) : (
          <div className="grim-dim">Aucun donjon découvert</div>
        )}
        <div className="grim-note">
          {knownPlaces.length > 0 ? "Voyage rapide à venir." : "Partez à l'aventure !"}
        </div>
      </div>
    </div>
  );
}

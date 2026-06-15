import { useEffect, useReducer } from "react";
import {
  getInventory,
  subscribeInventory,
  equipWeapon,
  consumePotion,
  pickupItem,
} from "../combat/inventory";
import type { CorpseHandle } from "../combat/corpseRegistry";
import type { ItemDef } from "../items/itemDefs";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Cadavre en cours de fouille (null = inventaire seul). */
  corpse: CorpseHandle | null;
  onHeal: (amount: number) => void;
}

export function InventoryUI({ open, onClose, corpse, onHeal }: Props) {
  // Force re-render quand l'inventaire change.
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeInventory(forceUpdate), []);

  // Ferme le panel sur Echap ou I.
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.code === "Escape" || e.code === "KeyI") onClose();
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const inv = getInventory();

  const handleSlotClick = (idx: number) => {
    const item = inv.slots[idx];
    if (!item) return;
    if (item.kind === "weapon") equipWeapon(idx);
    else if (item.kind === "potion") {
      const healed = consumePotion(idx);
      if (healed > 0) onHeal(healed);
    }
  };

  const handleLootClick = (item: ItemDef, _allLoot: ItemDef[], lootIdx: number) => {
    const ok = pickupItem(item);
    if (ok && corpse) {
      corpse.loot.splice(lootIdx, 1);
      if (corpse.loot.length === 0) corpse.markLooted();
      forceUpdate();
    }
  };

  return (
    <div className="inv-overlay" onClick={onClose}>
      <div className="inv-panels" onClick={(e) => e.stopPropagation()}>

        {/* Panel inventaire joueur */}
        <div className="inv-panel">
          <div className="inv-panel-title">Inventaire</div>
          <div className="inv-panel-sub">
            Équipé : <span className="inv-equipped">{inv.equipped.name}</span>
          </div>
          <div className="inv-grid">
            {inv.slots.map((item, i) => (
              <div
                key={i}
                className={`inv-slot ${item ? "inv-slot--filled" : ""}`}
                onClick={() => handleSlotClick(i)}
                title={item ? (item.kind === "weapon" ? `Équiper — ${item.name}\nDégâts : ${item.dmg}` : `Utiliser — ${item.name}\nSoin : +${item.heal} PV`) : ""}
              >
                {item ? (
                  <>
                    <span className="inv-slot-icon">{item.kind === "weapon" ? "⚔" : "⚗"}</span>
                    <span className="inv-slot-name">{item.name}</span>
                    {item.kind === "weapon" && (
                      <span className="inv-slot-stat">{item.dmg} dmg</span>
                    )}
                    {item.kind === "potion" && (
                      <span className="inv-slot-stat">+{item.heal} PV</span>
                    )}
                  </>
                ) : (
                  <span className="inv-slot-empty">—</span>
                )}
              </div>
            ))}
          </div>
          <div className="inv-hint">Clic : équiper / utiliser · I ou Échap : fermer</div>
        </div>

        {/* Panel loot cadavre */}
        {corpse && (
          <div className="inv-panel inv-panel--loot">
            <div className="inv-panel-title">Cadavre</div>
            {corpse.loot.length === 0 ? (
              <div className="inv-loot-empty">Rien à prendre.</div>
            ) : (
              <div className="inv-loot-list">
                {corpse.loot.map((item, i) => (
                  <div
                    key={i}
                    className="inv-loot-item"
                    onClick={() => handleLootClick(item, corpse.loot, i)}
                  >
                    <span className="inv-slot-icon">{item.kind === "weapon" ? "⚔" : "⚗"}</span>
                    <span className="inv-slot-name">{item.name}</span>
                    {item.kind === "weapon" && <span className="inv-slot-stat">{item.dmg} dmg</span>}
                    {item.kind === "potion" && <span className="inv-slot-stat">+{item.heal} PV</span>}
                    <span className="inv-loot-take">Prendre</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

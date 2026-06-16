import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls, PointerLockControls, Stats } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { generateOverworld, type Entrance, type EntranceKind } from "./gen/overworldGen";
import { generateDungeon } from "./gen/dungeonGen";
import { Overworld } from "./components/Overworld";
import { Dungeon } from "./components/Dungeon";
import { ExitPortal } from "./components/ExitPortal";
import { Player } from "./components/Player";
import { Torch } from "./components/Torch";
import { Interaction } from "./components/Interaction";
import { Sword } from "./components/Sword";
import { Enemies } from "./components/Enemies";
import { GrimoireUI } from "./components/GrimoireUI";
import { setDamageHandler } from "./combat/playerCombat";
import { getInventory, subscribeInventory } from "./combat/inventory";
import { getSkills, subscribeSkills, levelInfo, skillBonus, CATEGORY_LABEL } from "./combat/skills";
import { gameState } from "./combat/gameState";
import type { CorpseHandle } from "./combat/corpseRegistry";
import { PLAYER_MAX_HP, PLAYER_IFRAMES_MS } from "./config";

const OVERWORLD_SEED = 1337;


const KEYMAP = [
  { name: "forward", keys: ["KeyW", "KeyZ", "ArrowUp"] },
  { name: "back", keys: ["KeyS", "ArrowDown"] },
  { name: "left", keys: ["KeyA", "KeyQ", "ArrowLeft"] },
  { name: "right", keys: ["KeyD", "ArrowRight"] },
  { name: "run", keys: ["ShiftLeft", "ShiftRight"] },
];

export function App() {
  const [mode, setMode] = useState<"overworld" | "dungeon">("overworld");
  const [dungeonSeed, setDungeonSeed] = useState<number | null>(null);
  const [entranceKind, setEntranceKind] = useState<EntranceKind>("keep");
  const [returnId, setReturnId] = useState<number | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [everLocked, setEverLocked] = useState(false);
  const [hitmark, setHitmark] = useState(false);
  const [hp, setHp] = useState(PLAYER_MAX_HP);
  const [hurt, setHurt] = useState(false);
  const [invOpen, setInvOpen] = useState(false);
  const [lootCorpse, setLootCorpse] = useState<CorpseHandle | null>(null);
  const controls = useRef<{ lock: () => void } | null>(null);
  const hitTimer = useRef<ReturnType<typeof setTimeout>>();
  const hurtTimer = useRef<ReturnType<typeof setTimeout>>();
  const invincibleUntil = useRef(0);
  // HUD compétences : on relit les registres (inventaire + skills) à la volée et
  // on force un re-render à chaque changement (même pattern qu'ailleurs).
  const [, force] = useState(0);
  const [levelup, setLevelup] = useState(false);
  const lastLevel = useRef(0);
  const levelupTimer = useRef<ReturnType<typeof setTimeout>>();

  const onHit = useCallback(() => {
    setHitmark(true);
    clearTimeout(hitTimer.current);
    hitTimer.current = setTimeout(() => setHitmark(false), 110);
  }, []);

  // Les ennemis appellent ce handler pour blesser le joueur.
  // I-frames : ignore les coups pendant PLAYER_IFRAMES_MS après le dernier hit.
  useEffect(() => {
    setDamageHandler((dmg) => {
      if (Date.now() < invincibleUntil.current) return;
      invincibleUntil.current = Date.now() + PLAYER_IFRAMES_MS;
      setHp((prev) => Math.max(0, prev - dmg));
      setHurt(true);
      clearTimeout(hurtTimer.current);
      hurtTimer.current = setTimeout(() => setHurt(false), 140);
    });
    return () => setDamageHandler(null);
  }, []);

  // Mort : retour en surface, PV remis (la mort n'est pas un reset, cf. GDD §2).
  useEffect(() => {
    if (hp <= 0) {
      setMode("overworld");
      setHp(PLAYER_MAX_HP);
    }
  }, [hp]);

  // Compétences : re-render du HUD sur gain d'XP / changement d'arme, et flash de
  // level-up quand la catégorie ÉQUIPÉE passe un palier (pilier « on sent chaque
  // niveau gagné », GDD §1). Changer d'arme resynchronise sans flasher.
  useEffect(() => {
    lastLevel.current = skillBonus(getInventory().equipped.category).level;
    const unsubInv = subscribeInventory(() => {
      lastLevel.current = skillBonus(getInventory().equipped.category).level;
      force((n) => n + 1);
    });
    const unsubSkill = subscribeSkills(() => {
      const lvl = skillBonus(getInventory().equipped.category).level;
      if (lvl > lastLevel.current) {
        setLevelup(true);
        clearTimeout(levelupTimer.current);
        levelupTimer.current = setTimeout(() => setLevelup(false), 700);
      }
      lastLevel.current = lvl;
      force((n) => n + 1);
    });
    return () => {
      unsubInv();
      unsubSkill();
    };
  }, []);

  const overworld = useMemo(() => generateOverworld(OVERWORLD_SEED), []);
  const dungeon = useMemo(
    () => (dungeonSeed != null ? generateDungeon(dungeonSeed) : null),
    [dungeonSeed]
  );

  // Position d'apparition selon le monde courant.
  const spawn = useMemo<[number, number, number]>(() => {
    if (mode === "dungeon" && dungeon) return dungeon.spawn;
    const back = returnId != null ? overworld.entrances.find((e) => e.id === returnId) : undefined;
    return back ? back.approach : overworld.spawn;
  }, [mode, dungeon, returnId, overworld]);

  const onEnter = useCallback((e: Entrance) => {
    setDungeonSeed(e.seed);
    setReturnId(e.id);
    setEntranceKind(e.kind);
    setMode("dungeon");
    setLabel(null);
  }, []);
  const onExit = useCallback(() => {
    setMode("overworld");
    setLabel(null);
  }, []);
  const onCorpse = useCallback((handle: CorpseHandle) => {
    setLootCorpse(handle);
    setInvOpen(true);
    document.exitPointerLock();
  }, []);
  const closeInv = useCallback(() => {
    setInvOpen(false);
    setLootCorpse(null);
    // Petit délai pour laisser le temps à PointerLockControls de repasser enabled
    // avant de demander le lock — sinon le navigateur ignore la requête.
    setTimeout(() => controls.current?.lock(), 50);
  }, []);
  // Pause partagée : l'IA ennemie (useFrame) la lit pour se figer menu ouvert.
  useEffect(() => {
    gameState.paused = invOpen;
  }, [invOpen]);
  // Touche I : ouvrir/fermer l'inventaire (sans cadavre).
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code !== "KeyI") return;
      setInvOpen((prev) => {
        if (prev) { setLootCorpse(null); return false; }
        document.exitPointerLock();
        return true;
      });
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  }, []);
  const onHeal = useCallback((amount: number) => {
    setHp((prev) => Math.min(PLAYER_MAX_HP, prev + amount));
  }, []);

  // Compétence de l'arme équipée (relue à la volée — `force` déclenche le render).
  const skillCat = getInventory().equipped.category;
  const skillInfo = levelInfo(getSkills()[skillCat].xp);
  const skillBon = skillBonus(skillCat);
  const skillDmgPct = Math.round((skillBon.dmgMult - 1) * 100);
  const skillSpdPct = Math.round((1 - skillBon.speedMult) * 100);

  return (
    <KeyboardControls map={KEYMAP}>
      <Canvas
        // Rendu en basse résolution upscalé en nearest (cf. GDD §7) : look pixel
        // authentique ET gros gain de perf (on rend ~10x moins de pixels).
        // CSS `image-rendering: pixelated` (style.css) assure l'agrandissement net.
        dpr={0.2}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{ fov: 72, near: 0.1, far: 300 }}
        onCreated={({ camera }) => camera.position.set(...spawn)}
      >
        <color attach="background" args={[mode === "dungeon" ? "#07070a" : "#141118"]} />
        <fog attach="fog" args={mode === "dungeon" ? ["#07070a", 4, 30] : ["#141118", 20, 120]} />

        {mode === "dungeon" ? (
          <>
            <ambientLight color="#5a586c" intensity={1.1} />
            <Torch />
          </>
        ) : (
          <>
            <ambientLight color="#8a86a0" intensity={1.3} />
            <directionalLight color="#ffd9a0" intensity={1.1} position={[-40, 25, 20]} />
          </>
        )}

        <Physics gravity={[0, -22, 0]} paused={invOpen}>
          {mode === "dungeon" && dungeon ? (
            <>
              <Dungeon data={dungeon} theme={entranceKind} />
              <ExitPortal pos={dungeon.exit} rot={dungeon.exitRot} />
              <Enemies key={`enemies-${dungeonSeed}`} spawns={dungeon.enemies} />
            </>
          ) : (
            <Overworld data={overworld} />
          )}
          <Player key={`${mode}-${dungeonSeed}-${returnId}`} spawn={spawn} />
        </Physics>

        <Sword onHit={onHit} />
        <Interaction onLabel={setLabel} onEnter={onEnter} onExit={onExit} onCorpse={onCorpse} />

        <PointerLockControls
          ref={controls as never}
          enabled={!invOpen}
          onLock={() => {
            setLocked(true);
            setEverLocked(true);
          }}
          onUnlock={() => setLocked(false)}
        />

        <Stats />
      </Canvas>

      <GrimoireUI
        open={invOpen}
        onClose={closeInv}
        corpse={lootCorpse}
        onHeal={onHeal}
        hp={hp}
        maxHp={PLAYER_MAX_HP}
      />

      <div className="crosshair" />
      {hitmark && <div className="hitmarker" />}
      {hurt && <div className="hurt" />}
      {label && <div className="prompt">{label}</div>}

      <div className="healthbar">
        <div className="healthbar-fill" style={{ width: `${(hp / PLAYER_MAX_HP) * 100}%` }} />
      </div>

      <div className={`skillbar${levelup ? " skillbar--up" : ""}`}>
        <div className="skillbar-head">
          <span className="skill-name">{CATEGORY_LABEL[skillCat]}</span>
          <span className="skill-level">Nv {skillBon.level}</span>
        </div>
        <div className="skillbar-track">
          <div
            className="skillbar-fill"
            style={{ width: `${(skillInfo.into / skillInfo.need) * 100}%` }}
          />
        </div>
        <div className="skill-bonus">+{skillDmgPct}% dég · +{skillSpdPct}% vit</div>
      </div>
      {!locked && !everLocked && (
        <div className="overlay" onClick={() => controls.current?.lock()}>
          <h1>DUNGEON FPS</h1>
          <p>
            Clique pour entrer.
            <br />
            ZQSD / WASD : se déplacer • Souris : regarder
            <br />
            Maj : courir • Échap : libérer la souris • E : interagir • Clic : épée
          </p>
        </div>
      )}
      {!locked && everLocked && !invOpen && (
        <div className="hint" onClick={() => controls.current?.lock()}>
          souris libérée — clique pour reprendre
        </div>
      )}
    </KeyboardControls>
  );
}

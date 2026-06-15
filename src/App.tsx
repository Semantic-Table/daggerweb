import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls, PointerLockControls, Stats } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { generateOverworld, type Entrance } from "./gen/overworldGen";
import { generateDungeon } from "./gen/dungeonGen";
import { Overworld } from "./components/Overworld";
import { Dungeon } from "./components/Dungeon";
import { Player } from "./components/Player";
import { Torch } from "./components/Torch";
import { Interaction } from "./components/Interaction";
import { Sword } from "./components/Sword";
import { Enemies } from "./components/Enemies";
import { setDamageHandler } from "./combat/playerCombat";

const OVERWORLD_SEED = 1337;
const MAX_HP = 100;
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
  const [returnId, setReturnId] = useState<number | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [everLocked, setEverLocked] = useState(false);
  const [hitmark, setHitmark] = useState(false);
  const [hp, setHp] = useState(MAX_HP);
  const [hurt, setHurt] = useState(false);
  const controls = useRef<{ lock: () => void } | null>(null);
  const hitTimer = useRef<ReturnType<typeof setTimeout>>();
  const hurtTimer = useRef<ReturnType<typeof setTimeout>>();

  const onHit = useCallback(() => {
    setHitmark(true);
    clearTimeout(hitTimer.current);
    hitTimer.current = setTimeout(() => setHitmark(false), 110);
  }, []);

  // Les ennemis appellent ce handler pour blesser le joueur.
  useEffect(() => {
    setDamageHandler((dmg) => {
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
      setHp(MAX_HP);
    }
  }, [hp]);

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
    setMode("dungeon");
    setLabel(null);
  }, []);
  const onExit = useCallback(() => {
    setMode("overworld");
    setLabel(null);
  }, []);

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

        <Physics gravity={[0, -22, 0]}>
          {mode === "dungeon" && dungeon ? (
            <>
              <Dungeon data={dungeon} />
              <Enemies key={`enemies-${dungeonSeed}`} spawns={dungeon.enemies} />
            </>
          ) : (
            <Overworld data={overworld} />
          )}
          <Player key={`${mode}-${dungeonSeed}-${returnId}`} spawn={spawn} />
        </Physics>

        <Sword onHit={onHit} />

        <Interaction
          mode={mode}
          exitPoint={mode === "dungeon" && dungeon ? dungeon.spawn : null}
          onLabel={setLabel}
          onEnter={onEnter}
          onExit={onExit}
        />

        <PointerLockControls
          ref={controls as never}
          onLock={() => {
            setLocked(true);
            setEverLocked(true);
          }}
          onUnlock={() => setLocked(false)}
        />

        <Stats />
      </Canvas>

      <div className="crosshair" />
      {hitmark && <div className="hitmarker" />}
      {hurt && <div className="hurt" />}
      {label && <div className="prompt">{label}</div>}

      <div className="healthbar">
        <div className="healthbar-fill" style={{ width: `${(hp / MAX_HP) * 100}%` }} />
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
      {!locked && everLocked && (
        <div className="hint" onClick={() => controls.current?.lock()}>
          souris libérée — clique pour reprendre · règle l'épée dans le panneau ↗
        </div>
      )}
    </KeyboardControls>
  );
}

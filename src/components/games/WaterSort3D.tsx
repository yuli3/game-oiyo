import React, { useState, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  initWaterSort,
  selectTube,
  undoMove,
  TUBE_CAPACITY,
  type WaterSortState,
  type LiquidColor,
} from "@/lib/games/water-sort-3d";
import {
  useCardTiltPro,
  MobileHapticsPro,
  useGameJuicePro,
  RetroChiptuneSynth,
} from "@/lib/games/engine-suite-unified";
import { WATER_SORT_3D_SPRITES } from "@/lib/games/sprites";
import { celebrate } from "@/lib/games/celebration";
import { RotateCcw, Undo2, Volume2, VolumeX, Sparkles } from "lucide-react";

const COLOR_CLASS_MAP: Record<LiquidColor, string> = {
  crimson: "bg-destructive",
  azure: "bg-primary",
  emerald: "bg-success",
  amber: "bg-warning",
  amethyst: "bg-chart-4",
  coral: "bg-chart-1",
  teal: "bg-chart-2",
  indigo: "bg-chart-5",
};

interface WaterSort3DProps {
  locale?: string;
}

const I18N: Record<string, Record<string, string>> = {
  ko: {
    title: "워터 소트 3D 피지크 (Water Sort 3D)",
    desc: "3D 비커를 기울여 같은 색의 액체를 한 비커에 모아 정렬하는 힐링 유체 퍼즐.",
    level: "레벨",
    moves: "이동 횟수",
    undo: "되돌리기",
    restart: "다시하기",
    levelClear: "레벨 클리어!",
    levelClearDesc: "모든 액체를 완벽하게 분리하여 정렬했습니다.",
    nextLevel: "다음 레벨",
    hint: "💡 비커를 탭하여 들어올린 후, 부을 비커를 탭하세요.",
  },
  en: {
    title: "Water Sort 3D Physics",
    desc: "Tilt 3D beakers to pour matching colored liquids into uniform tubes.",
    level: "Level",
    moves: "Moves",
    undo: "Undo",
    restart: "Restart",
    levelClear: "Level Cleared!",
    levelClearDesc: "All liquid layers successfully sorted.",
    nextLevel: "Next Level",
    hint: "💡 Tap a beaker to lift it, then tap destination beaker to pour.",
  },
  ja: {
    title: "ウォーターソート 3D フィジクス",
    desc: "3Dビーカーを傾けて同じ色の液体を揃える癒やしの流体パズル。",
    level: "レベル",
    moves: "手数",
    undo: "戻す",
    restart: "やり直し",
    levelClear: "レベルクリア！",
    levelClearDesc: "すべての液体が美しく分別されました。",
    nextLevel: "次のレベル",
    hint: "💡 ビーカーをタップして持ち上げ、注ぎ先をタップしてください。",
  },
  zh: {
    title: "水排序 3D 物理 (Water Sort 3D)",
    desc: "倾倒3D试管，将相同颜色的液体分层汇聚于同一容器的治愈系流体益智游戏。",
    level: "关卡",
    moves: "步数",
    undo: "撤销",
    restart: "重试",
    levelClear: "通关成功！",
    levelClearDesc: "所有色彩液体已完美归类排序。",
    nextLevel: "下一关",
    hint: "💡 点击试管升起，然后点击目标试管即可倾倒注水。",
  },
  fr: {
    title: "Water Sort 3D Physics",
    desc: "Inclinez les éprouvettes 3D pour trier les liquides de même couleur.",
    level: "Niveau",
    moves: "Coups",
    undo: "Annuler",
    restart: "Recommencer",
    levelClear: "Niveau Réussi !",
    levelClearDesc: "Toutes les couleurs ont été triées avec succès.",
    nextLevel: "Niveau Suivant",
    hint: "💡 Touchez une éprouvette pour la soulever, puis touchez la cible pour verser.",
  },
  es: {
    title: "Water Sort 3D Physics",
    desc: "Inclina los tubos de ensayo 3D para clasificar líquidos del mismo color.",
    level: "Nivel",
    moves: "Movimientos",
    undo: "Deshacer",
    restart: "Reiniciar",
    levelClear: "¡Nivel Superado!",
    levelClearDesc: "Todos los colores se han separado con éxito.",
    nextLevel: "Siguiente Nivel",
    hint: "💡 Toca un tubo para levantarlo y luego toca el tubo de destino para verter.",
  },
};

function TiltTubeButton({
  tube,
  isSelected,
  onClick,
}: {
  tube: { id: string; layers: LiquidColor[] };
  isSelected: boolean;
  onClick: () => void;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();

  return (
    <button
      type="button"
      style={
        {
          "--card-tilt": transformCss,
        } as React.CSSProperties
      }
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={() => {
        triggerPop(0.2);
        onClick();
      }}
      className={`group relative flex flex-col items-center justify-end rounded-b-full rounded-t-lg border-2 border-border/70 bg-card/60 p-1 w-14 h-48 transition-all cursor-pointer backdrop-blur-xs shadow-md will-change-transform transform-(--card-tilt) ${
        isSelected
          ? "border-primary ring-2 ring-primary -translate-y-4 scale-105 shadow-xl"
          : "hover:border-primary/60 hover:-translate-y-1"
      }`}
    >
      {/* Glass Rim highlight */}
      <div className="absolute top-0 inset-x-0 h-2.5 rounded-t-md border-b border-border/40 bg-card/80" />

      {/* Vertical Glass Glare Reflection */}
      <div className="pointer-events-none absolute left-1.5 top-3 bottom-6 w-1 rounded-full bg-foreground/15" />

      {/* Test Tube Interior (Empty slots at top, liquid layers settling to the bottom) */}
      <div className="flex w-full flex-col justify-end overflow-hidden rounded-b-full pb-0.5">
        {/* Empty slots on top */}
        {Array.from({ length: TUBE_CAPACITY - tube.layers.length }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="h-10 w-full border-b border-border/10"
          />
        ))}

        {/* Liquid Segments (From top surface down to the bottom base) */}
        {tube.layers
          .slice()
          .reverse()
          .map((color, revIdx) => {
            const originalIdx = tube.layers.length - 1 - revIdx;
            const isTopSurface = revIdx === 0;
            const isBottomBase = originalIdx === 0;
            const colorClass = COLOR_CLASS_MAP[color as LiquidColor] ?? "bg-primary";
            return (
              <div
                key={`${tube.id}-layer-${originalIdx}`}
                className={`relative h-10 w-full transition-all ${colorClass} ${
                  isBottomBase ? "rounded-b-full" : ""
                }`}
              >
                {/* Meniscus / Surface curve on top layer */}
                {isTopSurface && (
                  <div className="absolute top-0 inset-x-0 h-1.5 rounded-b-full bg-foreground/25" />
                )}
                {/* Vertical reflective sheen inside liquid */}
                <div className="pointer-events-none absolute left-1 inset-y-0.5 w-1 rounded-full bg-foreground/20" />
              </div>
            );
          })}
      </div>
    </button>
  );
}

export const WaterSort3D: React.FC<WaterSort3DProps> = ({ locale = "ko" }) => {
  const t = useMemo(() => I18N[locale] ?? I18N.ko, [locale]);

  const [game, setGame] = useState<WaterSortState>(() => initWaterSort(1));
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { addTrauma, shakeCssVars } = useGameJuicePro();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const getAudioCtx = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    return audioCtxRef.current;
  }, []);

  const handleTubeClick = useCallback(
    (index: number) => {
      const res = selectTube(game, index);
      setGame(res.state);

      if (res.action === "selected") {
        MobileHapticsPro.light();
        if (soundEnabled) {
          RetroChiptuneSynth.playBlip(getAudioCtx());
        }
      } else if (res.action === "poured") {
        MobileHapticsPro.impact();
        addTrauma(0.08);
        if (soundEnabled) {
          RetroChiptuneSynth.playPowerup(getAudioCtx());
        }

        if (res.state.status === "level_cleared") {
          addTrauma(0.5);
          MobileHapticsPro.success();
          if (containerRef.current) {
            celebrate(containerRef.current, { preset: "stardust" });
          }
          if (soundEnabled) {
            RetroChiptuneSynth.playCoin(getAudioCtx());
          }
        }
      }
    },
    [game, soundEnabled, getAudioCtx, addTrauma]
  );

  const handleUndo = useCallback(() => {
    setGame((prev) => undoMove(prev));
    MobileHapticsPro.click();
  }, []);

  const handleRestart = useCallback(() => {
    MobileHapticsPro.light();
    setGame(initWaterSort(game.level));
  }, [game.level]);

  const handleNextLevel = useCallback(() => {
    MobileHapticsPro.success();
    setGame(initWaterSort(game.level + 1));
  }, [game.level]);

  return (
    <div
      ref={containerRef}
      className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 p-4 font-sans text-foreground transform translate-x-(--shake-x) translate-y-(--shake-y) rotate-(--shake-rot)"
      style={
        {
          "--shake-x": shakeCssVars["--shake-x"],
          "--shake-y": shakeCssVars["--shake-y"],
          "--shake-rot": shakeCssVars["--shake-rot"],
        } as React.CSSProperties
      }
    >
      {/* Top Header & Stats */}
      <div className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <img
            src={WATER_SORT_3D_SPRITES.dropBlue}
            alt="Water Sort 3D"
            className="size-8 object-contain drop-shadow-xs"
          />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground">{t.level}</span>
            <span className="text-2xl font-black text-primary">{game.level}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {t.moves}: {game.moves}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={game.history.length === 0 || game.status !== "playing"}
          >
            <Undo2 className="mr-1 h-4 w-4" />
            {t.undo}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled((v) => !v)}
            aria-label="Toggle sound"
          >
            {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleRestart} aria-label="Restart">
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* 3D Test Tubes Showcase Container */}
      <div className="flex w-full flex-wrap items-end justify-center gap-6 rounded-2xl border border-border bg-muted/30 p-6 min-h-80 shadow-inner">
        {game.tubes.map((tube, idx) => {
          const isSelected = game.selectedTubeIndex === idx;

          return (
            <TiltTubeButton
              key={tube.id}
              tube={tube}
              isSelected={isSelected}
              onClick={() => handleTubeClick(idx)}
            />
          );
        })}
      </div>

      {/* Gameplay Hint */}
      <div className="text-xs text-muted-foreground">{t.hint}</div>

      {/* Level Cleared Modal */}
      {game.status === "level_cleared" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-primary/30 bg-card p-6 shadow-2xl text-center">
            <img
              src={WATER_SORT_3D_SPRITES.trophy}
              alt="Victory Trophy"
              className="h-16 w-16 object-contain drop-shadow-md select-none pointer-events-none animate-bounce"
            />
            <h3 className="text-2xl font-bold text-primary">{t.levelClear}</h3>
            <p className="text-sm text-muted-foreground">{t.levelClearDesc}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t.moves}: {game.moves}
            </div>
            <Button variant="default" className="w-full" onClick={handleNextLevel}>
              {t.nextLevel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

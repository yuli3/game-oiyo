import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  initSpellTower,
  selectTile,
  submitWord,
  getSelectedWord,
  isValidWord,
  COLS,
  ROWS,
  type SpellTowerState,
} from "@/lib/games/spell-tower";
import {
  addTrauma,
  createShakeState,
  triggerHaptic,
  updateShake,
  type ScreenShakeState,
} from "@/lib/games/juice-engine";
import { playSyntheticTone } from "@/lib/games/audio-mixer";
import { RotateCcw, Volume2, VolumeX, CheckCircle, Sparkles, AlertTriangle } from "lucide-react";

interface SpellTowerProps {
  locale?: string;
}

const PENTATONIC_SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];

const I18N: Record<string, Record<string, string>> = {
  ko: {
    title: "스펠 타워 (SpellTower Web)",
    desc: "인접한 글자들을 연결하여 단어를 만들고, 중력 붕괴로 타워가 천장에 닿기 전에 무너뜨리세요.",
    score: "점수",
    words: "완성 단어",
    submit: "단어 완성",
    clearPath: "선택 취소",
    gameOver: "타워 붕괴 (게임 오버)",
    gameOverDesc: "글자 블록이 최상단 한계선에 도달했습니다.",
    restart: "다시 도전",
    tooShort: "최소 3글자 이상 연결하세요",
    invalidWord: "사전에 없는 단어입니다",
    pointsPlus: "점 획득!",
    deadCleared: "개 해골 블록 소멸!",
  },
  en: {
    title: "SpellTower Web",
    desc: "Link adjacent letter tiles into words and trigger gravity cascades before the tower overflows.",
    score: "Score",
    words: "Words",
    submit: "Submit Word",
    clearPath: "Clear",
    gameOver: "Tower Overflow (Game Over)",
    gameOverDesc: "Letter tiles reached the ceiling boundary.",
    restart: "Try Again",
    tooShort: "Connect at least 3 letters",
    invalidWord: "Not in dictionary",
    pointsPlus: "pts gained!",
    deadCleared: "skull blocks cleared!",
  },
  ja: {
    title: "スペルタワー (SpellTower Web)",
    desc: "隣接する文字を繋げて単語を作り、塔が天井に届く前に重力崩壊させよう。",
    score: "スコア",
    words: "完成単語",
    submit: "単語決定",
    clearPath: "選択解除",
    gameOver: "タワー崩壊 (ゲームオーバー)",
    gameOverDesc: "文字ブロックが最上段の限界線に到達しました。",
    restart: "もう一度挑戦",
    tooShort: "3文字以上繋げてください",
    invalidWord: "辞書にない単語です",
    pointsPlus: "点獲得！",
    deadCleared: "個のドクロブロック消滅！",
  },
  zh: {
    title: "拼字高塔 (SpellTower Web)",
    desc: "连接相邻字母拼出单词，在字母方块触顶淹没前引发重力坍塌消除高塔。",
    score: "得分",
    words: "消除单词",
    submit: "提交单词",
    clearPath: "取消选择",
    gameOver: "高塔溢出 (游戏结束)",
    gameOverDesc: "方块堆叠触碰到了顶部警戒红线。",
    restart: "重新挑战",
    tooShort: "至少连接3个及以上字母",
    invalidWord: "未在词典中收录",
    pointsPlus: "分到手！",
    deadCleared: "个骷髅障碍方块被清除！",
  },
  fr: {
    title: "SpellTower Web",
    desc: "Reliez les lettres adjacentes et déclenchez des cascades de gravité avant que la tour ne déborde.",
    score: "Score",
    words: "Mots",
    submit: "Valider",
    clearPath: "Effacer",
    gameOver: "Tour débordée (Fin de partie)",
    gameOverDesc: "Les lettres ont atteint la limite supérieure.",
    restart: "Rejouer",
    tooShort: "Reliez au moins 3 lettres",
    invalidWord: "Mot introuvable dans le dictionnaire",
    pointsPlus: "pts gagnés !",
    deadCleared: "blocs crâne éliminés !",
  },
  es: {
    title: "SpellTower Web",
    desc: "Une fichas de letras adyacentes y desata cascadas de gravedad antes de que la torre se desborde.",
    score: "Puntuación",
    words: "Palabras",
    submit: "Enviar",
    clearPath: "Borrar",
    gameOver: "Torre desbordada (Fin de partida)",
    gameOverDesc: "Las fichas alcanzaron la línea superior.",
    restart: "Reintentar",
    tooShort: "Conecta al menos 3 letras",
    invalidWord: "Palabra no encontrada en el diccionario",
    pointsPlus: "pts sumados!",
    deadCleared: "bloques calavera despejados!",
  },
};

export const SpellTower: React.FC<SpellTowerProps> = ({ locale = "ko" }) => {
  const t = useMemo(() => I18N[locale] ?? I18N.ko, [locale]);

  const [game, setGame] = useState<SpellTowerState>(() => initSpellTower());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [, setShakeState] = useState<ScreenShakeState>(() => createShakeState());
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });
  const [message, setMessage] = useState<string | null>(null);

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

  // Screen shake loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      setShakeState((prev) => {
        const { state, offset } = updateShake(prev, dt);
        setShakeOffset({ x: offset.x, y: offset.y });
        return state;
      });
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const currentWord = useMemo(() => getSelectedWord(game), [game]);
  const isCurrentValid = useMemo(() => isValidWord(currentWord), [currentWord]);

  const handleTileClick = useCallback(
    (r: number, c: number) => {
      if (game.status !== "playing") return;

      const next = selectTile(game, { r, c });
      if (next !== game) {
        setGame(next);
        const len = next.selectedPath.length;
        if (len > 0) {
          triggerHaptic("light");
          if (soundEnabled) {
            const freq = PENTATONIC_SCALE[(len - 1) % PENTATONIC_SCALE.length] ?? 440;
            playSyntheticTone(getAudioCtx(), { freq, duration: 0.1, type: "sine" });
          }
        }
      }
    },
    [game, soundEnabled, getAudioCtx]
  );

  const handleSubmit = useCallback(() => {
    if (game.selectedPath.length < 3) {
      setMessage(t.tooShort);
      setTimeout(() => setMessage(null), 1500);
      return;
    }

    if (!isCurrentValid) {
      setMessage(t.invalidWord);
      setTimeout(() => setMessage(null), 1500);
      triggerHaptic("warning");
      if (soundEnabled) {
        playSyntheticTone(getAudioCtx(), { freq: 160, duration: 0.2, type: "sawtooth" });
      }
      return;
    }

    const result = submitWord(game);
    setGame(result.state);

    if (result.clearedWord) {
      const mult = result.clearedWord.length >= 5 ? 0.6 : 0.3;
      setShakeState((s) => addTrauma(s, mult));
      triggerHaptic("heavy");

      if (soundEnabled) {
        const ctx = getAudioCtx();
        playSyntheticTone(ctx, { freq: 523.25, duration: 0.15, type: "sine" });
        setTimeout(() => playSyntheticTone(ctx, { freq: 659.25, duration: 0.25, type: "triangle" }), 80);
      }

      setMessage(`"${result.clearedWord}" +${result.pointsEarned}${t.pointsPlus}`);
      setTimeout(() => setMessage(null), 2000);
    }
  }, [game, isCurrentValid, t, soundEnabled, getAudioCtx]);

  const handleClearPath = useCallback(() => {
    setGame((prev) => ({ ...prev, selectedPath: [] }));
  }, []);

  const handleRestart = useCallback(() => {
    setGame(initSpellTower());
    setMessage(null);
  }, []);

  return (
    <div
      className="mx-auto flex max-w-xl flex-col items-center gap-4 p-4 font-sans text-foreground translate-x-(--shake-x) translate-y-(--shake-y)"
      style={
        {
          "--shake-x": `${shakeOffset.x}px`,
          "--shake-y": `${shakeOffset.y}px`,
        } as React.CSSProperties
      }
    >
      {/* Top Header & Stats */}
      <div className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground">{t.score}</span>
            <span className="text-2xl font-black text-primary">{game.score}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {t.words}: {game.wordsFound.length}
          </div>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Word Bar & Action Controls */}
      <div className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm min-h-16">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black tracking-wider text-foreground">
            {currentWord || "..."}
          </span>
          {isCurrentValid && (
            <span className="rounded bg-primary/20 px-1.5 py-0.5 text-xs font-bold text-primary">
              ✓
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {game.selectedPath.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearPath}>
              {t.clearPath}
            </Button>
          )}
          <Button
            variant={isCurrentValid ? "default" : "outline"}
            size="sm"
            onClick={handleSubmit}
            disabled={game.selectedPath.length < 3}
          >
            <CheckCircle className="mr-1 h-4 w-4" />
            {t.submit}
          </Button>
        </div>
      </div>

      {/* Notice Message Banner */}
      {message && (
        <div className="w-full rounded-lg bg-primary/10 px-3 py-1.5 text-center text-sm font-semibold text-primary transition-opacity">
          {message}
        </div>
      )}

      {/* 7x9 SpellTower Grid */}
      <div className="relative w-full max-w-100 select-none rounded-2xl border-2 border-border bg-muted/40 p-2 shadow-xl">
        {/* Top Danger Line indicator */}
        <div className="flex items-center justify-between border-b-2 border-destructive/50 pb-1 px-1 text-xs font-bold text-destructive">
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> CEILING DANGER
          </span>
          <span>ROW 0</span>
        </div>

        <div className="grid h-full w-full grid-cols-7 grid-rows-9 gap-1.5 pt-2">
          {Array.from({ length: ROWS }).map((_, r) =>
            Array.from({ length: COLS }).map((__, c) => {
              const tile = game.grid[r]?.[c];
              const pathIndex = game.selectedPath.findIndex((p) => p.r === r && p.c === c);
              const isSelected = pathIndex >= 0;

              if (!tile) {
                return (
                  <div
                    key={`${r}-${c}`}
                    className="flex h-12 items-center justify-center rounded-lg border border-dashed border-border/40 bg-background/20"
                  />
                );
              }

              const isDead = tile.type === "dead";
              const isBonus = tile.type === "bonus";

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleTileClick(r, c)}
                  disabled={isDead}
                  className={`relative flex h-12 flex-col items-center justify-center rounded-xl font-bold transition-transform cursor-pointer active:scale-95 ${
                    isDead
                      ? "border border-border bg-muted text-muted-foreground cursor-not-allowed"
                      : isSelected
                      ? "border-2 border-primary bg-primary text-primary-foreground shadow-md scale-105"
                      : isBonus
                      ? "border border-warning/40 bg-card text-foreground ring-1 ring-warning/50"
                      : "border border-border bg-card text-foreground shadow-sm hover:border-primary/50"
                  }`}
                >
                  <span className="text-lg font-black">{tile.letter}</span>
                  {!isDead && (
                    <span className="absolute bottom-0.5 right-1 text-xs font-semibold opacity-70">
                      {tile.points}
                    </span>
                  )}
                  {isBonus && !isSelected && (
                    <Sparkles className="absolute top-0.5 right-0.5 h-2.5 w-2.5 text-warning" />
                  )}
                  {isSelected && (
                    <span className="absolute -top-1.5 -left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-background text-xs font-bold text-foreground shadow">
                      {pathIndex + 1}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Game Over Modal */}
      {game.status === "game_over" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-destructive/40 bg-card p-6 shadow-2xl text-center">
            <span className="text-5xl">💥</span>
            <h3 className="text-2xl font-bold text-destructive">{t.gameOver}</h3>
            <p className="text-sm text-muted-foreground">{t.gameOverDesc}</p>
            <div className="rounded-lg bg-muted px-4 py-2 text-sm font-semibold text-foreground">
              {t.score}: {game.score} · {t.words}: {game.wordsFound.length}
            </div>
            <Button variant="default" className="w-full" onClick={handleRestart}>
              {t.restart}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

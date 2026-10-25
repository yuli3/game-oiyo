import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  initShotgunChess,
  getValidKingMoves,
  movePlayerKing,
  shootShotgun,
  applyUpgrade,
  SHOOT_DIRECTIONS,
  UPGRADE_POOL,
  type ShotgunChessGame,
  type UpgradeCard,
} from "@/lib/games/shotgun-chess";
import {
  addTrauma,
  createShakeState,
  triggerHaptic,
  updateShake,
  type ScreenShakeState,
} from "@/lib/games/juice-engine";
import { playSyntheticTone } from "@/lib/games/audio-mixer";
import { RotateCcw, Volume2, VolumeX, Shield, Crosshair, Award } from "lucide-react";

interface ShotgunChessProps {
  locale?: string;
}

const PIECE_SYMBOLS: Record<string, string> = {
  king: "♔",
  queen: "♕",
  rook: "♖",
  bishop: "♗",
  knight: "♘",
  pawn: "♙",
};

const I18N: Record<string, Record<string, string>> = {
  ko: {
    title: "샷건 체스 (Shotgun Chess)",
    desc: "고독한 흑색 킹이 되어 산탄총으로 백색 기물들을 격파하고 왕위를 찬탈하세요.",
    floor: "층",
    turn: "턴",
    ammo: "탄약",
    hp: "체력",
    souls: "영혼",
    shootMode: "발사 모드",
    moveMode: "이동 모드",
    reloadHint: "💡 이동하면 탄약이 1발 재장전됩니다.",
    waveClear: "웨이브 클리어!",
    chooseUpgrade: "업그레이드 카드를 선택하세요",
    victory: "찬탈 성공! 모든 체스판을 정복했습니다!",
    gameOver: "체크메이트 (사망)",
    restart: "다시 도전",
    continue: "다음 층으로",
    aimDirection: "조준 방향 선택",
  },
  en: {
    title: "Shotgun Chess",
    desc: "Play as the lone black king wielding a shotgun against the white army.",
    floor: "Floor",
    turn: "Turn",
    ammo: "Ammo",
    hp: "HP",
    souls: "Souls",
    shootMode: "Shoot Mode",
    moveMode: "Move Mode",
    reloadHint: "💡 Moving reloads 1 shell.",
    waveClear: "Wave Cleared!",
    chooseUpgrade: "Select an Upgrade Card",
    victory: "Checkmate Victor! All boards conquered!",
    gameOver: "Checkmate (Game Over)",
    restart: "Try Again",
    continue: "Next Floor",
    aimDirection: "Select Aim Direction",
  },
  ja: {
    title: "ショットガン チェス",
    desc: "孤独な黒のキングとなり、散弾銃で白の軍勢を制圧しよう。",
    floor: "フロア",
    turn: "ターン",
    ammo: "弾薬",
    hp: "HP",
    souls: "ソウル",
    shootMode: "射撃モード",
    moveMode: "移動モード",
    reloadHint: "💡 移動すると弾薬が1発リロードされます。",
    waveClear: "ウェーブクリア！",
    chooseUpgrade: "アップグレードカードを選択",
    victory: "完全制覇！全フロアを征服しました！",
    gameOver: "チェックメイト (ゲームオーバー)",
    restart: "もう一度挑戦",
    continue: "次の階へ",
    aimDirection: "照準方向を選択",
  },
  zh: {
    title: "散弹枪象棋 (Shotgun Chess)",
    desc: "化身手持霰弹枪的孤王，轰碎白棋大军夺取王位。",
    floor: "层数",
    turn: "回合",
    ammo: "弹药",
    hp: "生命值",
    souls: "灵魂",
    shootMode: "射击模式",
    moveMode: "移动模式",
    reloadHint: "💡 移动一格可装填1枚弹药。",
    waveClear: "关卡肃清！",
    chooseUpgrade: "挑选增益卡牌",
    victory: "王位篡夺成功！征服了全部棋盘！",
    gameOver: "将死 (游戏结束)",
    restart: "重新挑战",
    continue: "前往下一层",
    aimDirection: "选择瞄准方向",
  },
  fr: {
    title: "Shotgun Chess",
    desc: "Incarnez le roi solitaire armé d'un fusil à pompe contre l'armée blanche.",
    floor: "Étage",
    turn: "Tour",
    ammo: "Munitions",
    hp: "PV",
    souls: "Âmes",
    shootMode: "Mode Tir",
    moveMode: "Mode Déplacement",
    reloadHint: "💡 Se déplacer recharge 1 cartouche.",
    waveClear: "Vague neutralisée !",
    chooseUpgrade: "Choisissez une amélioration",
    victory: "Victoire royale ! Vous avez conquis tous les échiquiers !",
    gameOver: "Échec et mat (Défaite)",
    restart: "Recommencer",
    continue: "Étage suivant",
    aimDirection: "Choisir la direction du tir",
  },
  es: {
    title: "Shotgun Chess",
    desc: "Sé el rey solitario armado con una escopeta contra el ejército blanco.",
    floor: "Piso",
    turn: "Turno",
    ammo: "Munición",
    hp: "PV",
    souls: "Almas",
    shootMode: "Modo Disparo",
    moveMode: "Modo Movimiento",
    reloadHint: "💡 Moverte recarga 1 cartucho.",
    waveClear: "¡Oleada superada!",
    chooseUpgrade: "Elige una mejora",
    victory: "¡Jaque mate victorioso! Conquistaste todos los tableros.",
    gameOver: "Jaque mate (Fin de partida)",
    restart: "Reintentar",
    continue: "Siguiente piso",
    aimDirection: "Elegir dirección de disparo",
  },
};

export const ShotgunChess: React.FC<ShotgunChessProps> = ({ locale = "ko" }) => {
  const t = useMemo(() => I18N[locale] ?? I18N.ko, [locale]);

  const [game, setGame] = useState<ShotgunChessGame>(() => initShotgunChess(1));
  const [actionMode, setActionMode] = useState<"move" | "shoot">("move");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [, setShakeState] = useState<ScreenShakeState>(() => createShakeState());
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });

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

  // Sync screen shake with juice engine
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

  const validMoves = useMemo(() => {
    if (actionMode !== "move") return [];
    return getValidKingMoves(game);
  }, [game, actionMode]);

  const handleTileClick = useCallback(
    (r: number, c: number) => {
      if (game.status !== "playing") return;

      if (actionMode === "move") {
        const isValid = validMoves.some((m) => m.r === r && m.c === c);
        if (!isValid) return;

        if (soundEnabled) {
          playSyntheticTone(getAudioCtx(), { freq: 260, duration: 0.08, type: "triangle" });
        }
        triggerHaptic("light");

        setGame((prev) => movePlayerKing(prev, { r, c }));
      }
    },
    [game.status, actionMode, validMoves, soundEnabled, getAudioCtx]
  );

  const handleShoot = useCallback(
    (dr: number, dc: number) => {
      if (game.status !== "playing" || game.shotgun.ammo <= 0) return;

      if (soundEnabled) {
        // Shotgun blast: Low bass punch followed by metallic noise
        const ctx = getAudioCtx();
        playSyntheticTone(ctx, { freq: 110, duration: 0.25, type: "sawtooth" });
        setTimeout(() => playSyntheticTone(ctx, { freq: 520, duration: 0.06, type: "square" }), 100);
      }
      setShakeState((prev) => addTrauma(prev, 0.5));
      triggerHaptic("heavy");

      setGame((prev) => {
        const next = shootShotgun(prev, dr, dc);
        if (next.status === "wave_clear" || next.status === "victory") {
          setShakeState((s) => addTrauma(s, 0.7));
          triggerHaptic("heavy");
          if (soundEnabled) {
            playSyntheticTone(getAudioCtx(), { freq: 660, duration: 0.35, type: "sine" });
          }
        }
        return next;
      });
    },
    [game.status, game.shotgun.ammo, soundEnabled, getAudioCtx]
  );

  const handleSelectUpgrade = useCallback(
    (card: UpgradeCard) => {
      if (soundEnabled) {
        playSyntheticTone(getAudioCtx(), { freq: 440, duration: 0.15, type: "sine" });
      }
      triggerHaptic("medium");
      setGame((prev) => applyUpgrade(prev, card.id));
      setActionMode("move");
    },
    [soundEnabled, getAudioCtx]
  );

  const handleRestart = useCallback(() => {
    setGame(initShotgunChess(1));
    setActionMode("move");
  }, []);

  return (
    <div
      className="mx-auto flex max-w-2xl flex-col items-center gap-4 p-4 font-sans text-foreground translate-x-(--shake-x) translate-y-(--shake-y)"
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
          <div className="rounded-lg bg-primary/10 p-2 text-primary font-bold">
            {t.floor} {game.floor}
          </div>
          <div className="text-sm text-muted-foreground">
            {t.turn} {game.turn} · {t.souls} {game.souls}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <span className="text-destructive">❤️</span> {game.player.hp}/{game.player.maxHp}
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <span>💥</span> {game.shotgun.ammo}/{game.shotgun.maxAmmo}
          </div>
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

      {/* Action Mode Toggle */}
      <div className="flex w-full gap-2">
        <Button
          variant={actionMode === "move" ? "default" : "outline"}
          className="flex-1"
          onClick={() => setActionMode("move")}
        >
          <Shield className="mr-1.5 h-4 w-4" />
          {t.moveMode}
        </Button>
        <Button
          variant={actionMode === "shoot" ? "destructive" : "outline"}
          className="flex-1"
          onClick={() => setActionMode("shoot")}
          disabled={game.shotgun.ammo <= 0}
        >
          <Crosshair className="mr-1.5 h-4 w-4" />
          {t.shootMode} ({game.shotgun.ammo})
        </Button>
      </div>

      {/* 8x8 Chessboard */}
      <div className="relative aspect-square w-full max-w-120 select-none rounded-xl border-2 border-border bg-card p-2 shadow-lg">
        <div className="grid h-full w-full grid-cols-8 grid-rows-8 gap-0.5 overflow-hidden rounded-lg bg-border">
          {Array.from({ length: 8 }).map((_, r) =>
            Array.from({ length: 8 }).map((__, c) => {
              const isDark = (r + c) % 2 === 1;
              const isPlayer = game.player.r === r && game.player.c === c;
              const piece = game.pieces.find((p) => p.r === r && p.c === c);
              const isValidMove = validMoves.some((m) => m.r === r && m.c === c);

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleTileClick(r, c)}
                  disabled={actionMode !== "move" || (!isValidMove && !isPlayer)}
                  className={`relative flex items-center justify-center transition-colors ${
                    isDark ? "bg-muted/70" : "bg-card"
                  } ${isValidMove ? "ring-2 ring-primary ring-inset cursor-pointer bg-primary/20" : ""}`}
                >
                  {/* Player King */}
                  {isPlayer && (
                    <div className="relative flex items-center justify-center text-3xl font-extrabold text-foreground drop-shadow-md">
                      ♚
                      <span className="absolute -bottom-1 text-xs font-bold text-primary">
                        KING
                      </span>
                    </div>
                  )}

                  {/* Enemy White Pieces */}
                  {piece && (
                    <div className="relative flex flex-col items-center justify-center text-3xl font-bold text-primary">
                      {PIECE_SYMBOLS[piece.type] ?? "♟"}
                      {piece.maxHp > 1 && (
                        <span className="absolute -top-1 right-0.5 text-xs font-semibold text-destructive">
                          {piece.hp}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Valid move dot indicator */}
                  {isValidMove && !piece && (
                    <div className="h-2.5 w-2.5 rounded-full bg-primary/60" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Shotgun Firing Controls (When Shoot Mode is active) */}
      {actionMode === "shoot" && game.status === "playing" && (
        <div className="flex w-full flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="text-sm font-semibold text-muted-foreground">{t.aimDirection}</div>
          <div className="grid grid-cols-3 gap-2">
            {SHOOT_DIRECTIONS.map((dir) => (
              <Button
                key={dir.label}
                variant="outline"
                size="sm"
                onClick={() => handleShoot(dir.dr, dir.dc)}
                disabled={game.shotgun.ammo <= 0}
              >
                {dir.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Reload Hint */}
      <div className="text-xs text-muted-foreground">{t.reloadHint}</div>

      {/* Wave Clear / Upgrade Selection Overlay Modal */}
      {game.status === "wave_clear" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-2xl text-center">
            <Award className="h-12 w-12 text-primary" />
            <h3 className="text-2xl font-bold text-foreground">{t.waveClear}</h3>
            <p className="text-sm text-muted-foreground">{t.chooseUpgrade}</p>

            <div className="grid w-full grid-cols-1 gap-2.5">
              {UPGRADE_POOL.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className="flex flex-col items-start gap-1 rounded-xl border border-border bg-card p-3 text-left transition hover:bg-muted cursor-pointer"
                  onClick={() => handleSelectUpgrade(card)}
                >
                  <span className="font-bold text-foreground">
                    {card.name[locale as "ko" | "en"] ?? card.name.en}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {card.desc[locale as "ko" | "en"] ?? card.desc.en}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {game.status === "game_over" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-destructive/30 bg-card p-6 shadow-2xl text-center">
            <span className="text-5xl">💀</span>
            <h3 className="text-2xl font-bold text-destructive">{t.gameOver}</h3>
            <p className="text-sm text-muted-foreground">
              {t.floor} {game.floor} · {t.souls} {game.souls}
            </p>
            <Button variant="default" className="w-full" onClick={handleRestart}>
              {t.restart}
            </Button>
          </div>
        </div>
      )}

      {/* Victory Modal */}
      {game.status === "victory" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-primary/30 bg-card p-6 shadow-2xl text-center">
            <span className="text-5xl">👑</span>
            <h3 className="text-2xl font-bold text-primary">{t.victory}</h3>
            <p className="text-sm text-muted-foreground">{t.souls} {game.souls}</p>
            <Button variant="default" className="w-full" onClick={handleRestart}>
              {t.restart}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

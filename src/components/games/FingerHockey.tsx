import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Maximize2, Minimize2, RotateCcw, Users, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { RETRO_8BIT_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useOutcomeRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import {
  GATE_HALF, GATE_THICK, HOCKEY_SLUG, MALLET_R, PUCK_R, TABLES, TABLE_COUNT, TABLE_H, TABLE_W, gateX, inOvertime, matchWinner, newMatch, setTarget, stepMatch, timeLeft,
  type Match,
} from "../../lib/games/finger-hockey";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  table: string; vsCpu: string; twoP: string; time: string; overtime: string; youWin: string; cpuWin: string; redWin: string; blueWin: string; draw: string;
  again: string; next: string; help: string; help2: string; stages: string; full: string; exitFull: string; mute: string; unmute: string; names: Record<string, string>;
}> = {
  ko: {
    table: "{0}번 테이블", vsCpu: "컴퓨터와", twoP: "둘이서", time: "{0}초", overtime: "연장 {0}초", youWin: "이겼어요!", cpuWin: "컴퓨터 승리", redWin: "빨강 승리!", blueWin: "파랑 승리!", draw: "무승부",
    again: "다시 하기", next: "다음 테이블", help: "손가락으로 말렛을 끌어 퍽을 쳐서 상대 골대에 넣으세요. 5골을 먼저 넣거나 90초 뒤 더 많이 넣은 쪽이 이깁니다. 동점이면 30초 연장, 먼저 넣으면 승리!",
    help2: "둘이서: 휴대폰을 탁자에 눕혀 두고 아래쪽 절반은 빨강, 위쪽 절반은 파랑이 손가락으로 칩니다.", stages: "테이블 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
    names: { basic: "기본", wide: "넓은 골대", posts: "기둥 두 개", ice: "미끌 얼음", narrow: "좁은 골대", gate: "움직이는 문", pinball: "핀볼", double: "퍽 두 개", windy: "바람", icegate: "얼음 문", chaos: "대혼란", final: "결승" },
  },
  en: {
    table: "Table {0}", vsCpu: "Vs computer", twoP: "Two players", time: "{0}s", overtime: "Overtime {0}s", youWin: "You win!", cpuWin: "Computer wins", redWin: "Red wins!", blueWin: "Blue wins!", draw: "Draw",
    again: "Play again", next: "Next table", help: "Drag your mallet and hit the puck into the other goal. First to 5, or the most goals after 90 seconds, wins. A tie goes to 30 seconds of golden-goal overtime.",
    help2: "Two players: lay the phone flat between you. The bottom half is Red, the top half is Blue.", stages: "Pick a table", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
    names: { basic: "Classic", wide: "Wide goals", posts: "Two posts", ice: "Slick ice", narrow: "Narrow goals", gate: "Sliding gate", pinball: "Pinball", double: "Two pucks", windy: "Windy", icegate: "Ice gate", chaos: "Chaos", final: "Final" },
  },
  ja: {
    table: "{0}番テーブル", vsCpu: "CPUと", twoP: "2人で", time: "{0}秒", overtime: "延長 {0}秒", youWin: "勝ちました！", cpuWin: "CPUの勝ち", redWin: "赤の勝ち！", blueWin: "青の勝ち！", draw: "引き分け",
    again: "もう一度", next: "次のテーブル", help: "指でマレットを動かしてパックを打ち、相手のゴールへ。先に5点、または90秒後に点が多いほうの勝ち。同点なら30秒の延長で先に入れたら勝ち！",
    help2: "2人で：スマホを机に置き、画面の下半分が赤、上半分が青です。", stages: "テーブルを選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
    names: { basic: "基本", wide: "広いゴール", posts: "柱ふたつ", ice: "つるつる氷", narrow: "狭いゴール", gate: "動く門", pinball: "ピンボール", double: "パック2個", windy: "風", icegate: "氷の門", chaos: "大混乱", final: "決勝" },
  },
  zh: {
    table: "第{0}张球桌", vsCpu: "对战电脑", twoP: "双人", time: "{0}秒", overtime: "加时 {0}秒", youWin: "你赢了！", cpuWin: "电脑获胜", redWin: "红方获胜！", blueWin: "蓝方获胜！", draw: "平局",
    again: "再来一局", next: "下一张球桌", help: "用手指拖动球拍，把冰球打进对方球门。先进5球，或90秒后进球多的一方获胜。平局则进入30秒加时，先进球者胜！",
    help2: "双人：把手机平放在桌上，屏幕下半部分是红方，上半部分是蓝方。", stages: "选择球桌", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
    names: { basic: "基础", wide: "宽球门", posts: "两根柱子", ice: "滑冰面", narrow: "窄球门", gate: "移动挡板", pinball: "弹球", double: "两个冰球", windy: "大风", icegate: "冰面挡板", chaos: "大混战", final: "决赛" },
  },
  fr: {
    table: "Table {0}", vsCpu: "Contre l'ordi", twoP: "À deux", time: "{0} s", overtime: "Prolongation {0} s", youWin: "Gagné !", cpuWin: "L'ordinateur gagne", redWin: "Rouge gagne !", blueWin: "Bleu gagne !", draw: "Match nul",
    again: "Rejouer", next: "Table suivante", help: "Faites glisser votre maillet et envoyez le palet dans le but adverse. Le premier à 5, ou celui qui mène après 90 secondes, gagne. En cas d'égalité, 30 secondes de but en or.",
    help2: "À deux : posez le téléphone à plat entre vous. La moitié basse est Rouge, la moitié haute Bleue.", stages: "Choisir une table", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
    names: { basic: "Classique", wide: "Grands buts", posts: "Deux poteaux", ice: "Glace", narrow: "Petits buts", gate: "Porte mobile", pinball: "Flipper", double: "Deux palets", windy: "Vent", icegate: "Porte glacée", chaos: "Chaos", final: "Finale" },
  },
  es: {
    table: "Mesa {0}", vsCpu: "Contra la máquina", twoP: "Dos jugadores", time: "{0} s", overtime: "Prórroga {0} s", youWin: "¡Ganaste!", cpuWin: "Gana la máquina", redWin: "¡Gana Rojo!", blueWin: "¡Gana Azul!", draw: "Empate",
    again: "Otra vez", next: "Siguiente mesa", help: "Arrastra tu mazo y mete el disco en la portería rival. Gana quien llegue a 5 o lleve más goles a los 90 segundos. Si hay empate, 30 segundos de gol de oro.",
    help2: "Dos jugadores: pon el móvil plano entre los dos. La mitad inferior es Rojo y la superior Azul.", stages: "Elegir mesa", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
    names: { basic: "Clásica", wide: "Porterías anchas", posts: "Dos postes", ice: "Hielo", narrow: "Porterías estrechas", gate: "Puerta móvil", pinball: "Pinball", double: "Dos discos", windy: "Viento", icegate: "Puerta helada", chaos: "Caos", final: "Final" },
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:finger-hockey:muted";

export default function FingerHockey({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [table, setTable] = useState(0);
  const [mode, setMode] = useState<"cpu" | "2p">("cpu");
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ score: [0, 0] as [number, number], left: 90, ot: false });
  const [winner, setWinner] = useState<0 | 1 | 2 | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const matchRef = useRef<Match>(newMatch(0, 1));
  const modeRef = useRef<"cpu" | "2p">("cpu");
  const pointers = useRef(new Map<number, 0 | 1>());
  const trail = useRef<Array<Array<[number, number]>>>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);

  useOutcomeRecord(HOCKEY_SLUG, mode === "cpu" && winner !== null ? (winner === 0 ? "w" : "l") : null);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((t: number, m: "cpu" | "2p") => {
    setTable(t);
    setMode(m);
    modeRef.current = m;
    matchRef.current = newMatch(t, Math.floor(Math.random() * 1e6));
    trail.current = [];
    pointers.current.clear();
    setWinner(null);
    setHud({ score: [0, 0], left: 90, ot: false });
  }, []);

  useEffect(() => {
    const done = loadClearedStages(HOCKEY_SLUG, TABLE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, TABLE_COUNT), "cpu");
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let hudTimer = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const m = matchRef.current;
      const t = TABLES[m.table];
      if (matchWinner(m) === null) {
        const sub = 3;
        for (let k = 0; k < sub; k++) {
          const ev = stepMatch(m, dt / sub, modeRef.current === "cpu" ? [1] : []);
          if (ev.goal !== null) {
            sfx(ev.goal === 0 || modeRef.current === "2p" ? "success" : "fail");
            trail.current = [];
          } else if (ev.hit) cues.current?.play("tap");
          else if (ev.wall) cues.current?.play("place");
        }
        const w = matchWinner(m);
        if (w !== null) {
          setWinner(w);
          if (modeRef.current === "cpu" && w === 0) setCleared(markStageCleared(HOCKEY_SLUG, m.table, TABLE_COUNT));
          sfx(w === 0 || (modeRef.current === "2p" && w === 1) ? "win" : "lose");
        }
      }
      hudTimer -= dt;
      if (hudTimer <= 0) {
        hudTimer = 0.2;
        setHud({ score: [m.score[0], m.score[1]], left: Math.ceil(timeLeft(m)), ot: inOvertime(m) });
      }
      m.pucks.forEach((p, k) => {
        const tr = (trail.current[k] ??= []);
        tr.push([p.x, p.y]);
        if (tr.length > 10) tr.shift();
      });
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.fillStyle = t.friction > 0.9 ? "#0b2a3a" : "#0d1b2a";
        ctx.fillRect(0, 0, TABLE_W, TABLE_H);
        // air holes
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        for (let y = 16; y < TABLE_H; y += 24) for (let x = 16; x < TABLE_W; x += 24) ctx.fillRect(x, y, 2, 2);
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, TABLE_H / 2);
        ctx.lineTo(TABLE_W, TABLE_H / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(TABLE_W / 2, TABLE_H / 2, 46, 0, Math.PI * 2);
        ctx.stroke();
        // goals
        const gw = t.goal;
        ctx.shadowBlur = 14;
        ctx.shadowColor = "#4dabf7";
        ctx.fillStyle = "#4dabf7";
        ctx.fillRect(TABLE_W / 2 - gw / 2, 0, gw, 5);
        ctx.shadowColor = "#ff6b6b";
        ctx.fillStyle = "#ff6b6b";
        ctx.fillRect(TABLE_W / 2 - gw / 2, TABLE_H - 5, gw, 5);
        ctx.shadowBlur = 0;
        // rails
        ctx.strokeStyle = "#adb5bd";
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, TABLE_W - 4, TABLE_H - 4);
        ctx.clearRect(TABLE_W / 2 - gw / 2, 0, gw, 4);
        ctx.clearRect(TABLE_W / 2 - gw / 2, TABLE_H - 4, gw, 4);
        // bumpers and gate
        for (const b of t.bumpers) {
          ctx.fillStyle = "#ffd43b";
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
        }
        if (t.gate) {
          const gx = gateX(m.time);
          ctx.fillStyle = "#e599f7";
          ctx.fillRect(gx - GATE_HALF, TABLE_H / 2 - GATE_THICK / 2, GATE_HALF * 2, GATE_THICK);
        }
        if (t.wind) {
          const dir = Math.sin(m.time * 0.5);
          ctx.strokeStyle = "rgba(255,255,255,0.15)";
          for (let k = 0; k < 5; k++) {
            const y = 60 + k * 100;
            const x = ((m.time * 80 * Math.sign(dir) + k * 70) % TABLE_W + TABLE_W) % TABLE_W;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 30 * Math.sign(dir), y);
            ctx.stroke();
          }
        }
        // puck trails and pucks
        trail.current.forEach((tr) => tr.forEach(([x, y], k) => {
          ctx.fillStyle = `rgba(255,255,255,${(k / tr.length) * 0.25})`;
          ctx.beginPath();
          ctx.arc(x, y, PUCK_R * (k / tr.length), 0, Math.PI * 2);
          ctx.fill();
        }));
        for (const p of m.pucks) {
          ctx.fillStyle = "#f8f9fa";
          ctx.beginPath();
          ctx.arc(p.x, p.y, PUCK_R, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ced4da";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, PUCK_R - 4, 0, Math.PI * 2);
          ctx.stroke();
        }
        // mallets
        m.mallets.forEach((mal, s) => {
          const col = s === 0 ? "#fa5252" : "#339af0";
          ctx.shadowBlur = 16;
          ctx.shadowColor = col;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(mal.x, mal.y, MALLET_R, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.beginPath();
          ctx.arc(mal.x, mal.y, MALLET_R * 0.45, 0, Math.PI * 2);
          ctx.fill();
        });
        // scores on the table edges
        ctx.font = "bold 40px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255,107,107,0.35)";
        ctx.fillText(String(m.score[0]), TABLE_W - 30, TABLE_H / 2 + 40);
        ctx.save();
        ctx.translate(30, TABLE_H / 2 - 40);
        ctx.rotate(Math.PI);
        ctx.fillStyle = "rgba(77,171,247,0.35)";
        ctx.fillText(String(m.score[1]), 0, 0);
        ctx.restore();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toTable = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * TABLE_W, y: ((e.clientY - rect.top) / rect.height) * TABLE_H };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = toTable(e);
    const side: 0 | 1 = modeRef.current === "cpu" ? 0 : p.y > TABLE_H / 2 ? 0 : 1;
    pointers.current.set(e.pointerId, side);
    e.currentTarget.setPointerCapture(e.pointerId);
    setTarget(matchRef.current, side, p.x, p.y);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const side = pointers.current.get(e.pointerId);
    if (side === undefined && e.pointerType !== "mouse") return;
    const p = toTable(e);
    setTarget(matchRef.current, side ?? 0, p.x, p.y);
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const resultText = winner === null ? "" : winner === 2 ? c.draw : mode === "cpu" ? (winner === 0 ? c.youWin : c.cpuWin) : winner === 0 ? c.redWin : c.blueWin;
  const tableId = TABLES[table].id;

  return (
    <div
      ref={containerRef}
      data-game="finger-hockey"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.table, table + 1)} · {c.names[tableId]}</Badge>
        <Badge variant="outline">{hud.ot ? fill(c.overtime, hud.left) : fill(c.time, hud.left)}</Badge>
        <Badge variant="outline"><span className="text-destructive">{hud.score[0]}</span> : <span className="text-primary">{hud.score[1]}</span></Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant={mode === "cpu" ? "default" : "outline"} className="min-h-11" onClick={() => start(table, "cpu")}>
          <Bot className="size-4" />
          <span>{c.vsCpu}</span>
        </Button>
        <Button variant={mode === "2p" ? "default" : "outline"} className="min-h-11" onClick={() => start(table, "2p")}>
          <Users className="size-4" />
          <span>{c.twoP}</span>
        </Button>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={TABLE_W}
          height={TABLE_H}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="mx-auto block h-auto w-full max-w-xs touch-none select-none rounded-2xl border border-border"
          aria-label={c.help}
        />
        {winner !== null ? (
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{resultText}</p>
            <p className="text-sm">{hud.score[0]} : {hud.score[1]}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(table, mode)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              <Button className="min-h-12" onClick={() => start(table >= TABLE_COUNT - 1 ? 0 : table + 1, mode)}>
                {table >= TABLE_COUNT - 1 ? finaleLabel(locale) : c.next}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{c.help}</p>
      <p className="text-xs text-muted-foreground">{c.help2}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={TABLE_COUNT} current={table} cleared={cleared} locale={locale} onSelect={(i) => start(i, mode)} />
        </div>
      </details>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, Maximize2, Minimize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { RETRO_8BIT_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import {
  FIELD_H, FIELD_W, GROUND, TYPING_SLUG, WALL_HP, WAVE_COUNT, cpm, createWave, isBossWave, normalise, starsFor, step, submit, wordWidth,
  type Lang, type TypingState,
} from "../../lib/games/typing-defense";
import type { Locale } from "../../lib/i18n";

const COPY: Record<Lang, {
  wave: string; boss: string; score: string; combo: string; start: string; pause: string; resume: string; placeholder: string; retry: string; next: string;
  won: string; lost: string; speed: string; help: string; waves: string; full: string; exitFull: string; mute: string; unmute: string; ready: string;
}> = {
  ko: {
    wave: "{0}번째 웨이브", boss: "속담 보스!", score: "점수 {0}", combo: "연속 {0}", start: "시작", pause: "잠깐 멈춤", resume: "계속하기", placeholder: "여기에 단어를 치고 Enter", retry: "다시 하기", next: "다음 웨이브",
    won: "마을을 지켜 냈어요!", lost: "성벽이 무너졌어요", speed: "분당 {0}타", help: "떨어지는 단어를 그대로 치고 Enter를 누르면 터집니다. 금색 단어는 잠시 시간을 늦추고, 빨간 단어는 화면의 단어를 한꺼번에 없앱니다. 10웨이브마다 속담 보스가 내려옵니다.",
    waves: "웨이브 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기", ready: "준비되면 시작을 누르세요",
  },
  en: {
    wave: "Wave {0}", boss: "Proverb boss!", score: "Score {0}", combo: "Combo {0}", start: "Start", pause: "Pause", resume: "Resume", placeholder: "Type a word here, then Enter", retry: "Try again", next: "Next wave",
    won: "The village is safe!", lost: "The wall fell", speed: "{0} chars/min", help: "Type a falling word exactly and press Enter to pop it. Gold words slow time for a moment; red words clear every word on screen. A proverb boss comes down every tenth wave.",
    waves: "Pick a wave", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on", ready: "Press Start when you're ready",
  },
  ja: {
    wave: "ウェーブ {0}", boss: "ことわざボス！", score: "スコア {0}", combo: "コンボ {0}", start: "スタート", pause: "一時停止", resume: "再開", placeholder: "ことばを入力してEnter", retry: "もう一度", next: "次のウェーブ",
    won: "村を守りきりました！", lost: "城壁が崩れました", speed: "毎分 {0} 字", help: "落ちてくることばをそのまま入力してEnterで消せます。金色のことばは少しのあいだ時間をゆっくりに、赤いことばは画面のことばをまとめて消します。10ウェーブごとにことわざボスが降りてきます。",
    waves: "ウェーブを選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン", ready: "準備ができたらスタート",
  },
  zh: {
    wave: "第{0}波", boss: "谚语首领！", score: "得分 {0}", combo: "连击 {0}", start: "开始", pause: "暂停", resume: "继续", placeholder: "在这里输入词语后按回车", retry: "再来一次", next: "下一波",
    won: "村庄守住了！", lost: "城墙倒塌了", speed: "每分钟 {0} 字", help: "照着落下的词语输入并按回车即可消除。金色词语会让时间暂时变慢，红色词语会一次清掉屏幕上所有词语。每10波会有谚语首领降临。",
    waves: "选择波次", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音", ready: "准备好了就按开始",
  },
  fr: {
    wave: "Vague {0}", boss: "Proverbe géant !", score: "Score {0}", combo: "Combo {0}", start: "Commencer", pause: "Pause", resume: "Reprendre", placeholder: "Tapez un mot puis Entrée", retry: "Réessayer", next: "Vague suivante",
    won: "Le village est sauvé !", lost: "Le rempart est tombé", speed: "{0} car./min", help: "Tapez un mot qui tombe puis appuyez sur Entrée pour le faire éclater (les accents sont facultatifs). Les mots dorés ralentissent le temps, les rouges effacent tout l'écran. Un proverbe géant descend toutes les dix vagues.",
    waves: "Choisir une vague", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son", ready: "Appuyez sur Commencer quand vous êtes prêt",
  },
  es: {
    wave: "Oleada {0}", boss: "¡Refrán jefe!", score: "Puntos {0}", combo: "Combo {0}", start: "Empezar", pause: "Pausa", resume: "Seguir", placeholder: "Escribe una palabra y pulsa Intro", retry: "Reintentar", next: "Siguiente oleada",
    won: "¡El pueblo está a salvo!", lost: "La muralla cayó", speed: "{0} pulsaciones/min", help: "Escribe una palabra que cae y pulsa Intro para explotarla (las tildes son opcionales). Las doradas ralentizan el tiempo y las rojas limpian la pantalla. Cada diez oleadas baja un refrán jefe.",
    waves: "Elegir oleada", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido", ready: "Pulsa Empezar cuando estés listo",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:typing-defense:muted";

interface Pop { x: number; y: number; text: string; life: number; color: string }

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.includes(" ") ? text.split(" ") : [...text];
  const sep = text.includes(" ") ? " " : "";
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? cur + sep + w : w;
    if (ctx.measureText(next).width > max && cur) { lines.push(cur); cur = w; }
    else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

export default function TypingDefense({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as Lang;
  const lang: Lang = (["ko", "en", "ja", "zh", "fr", "es"] as const).includes(locale) ? locale : "en";
  const c = COPY[lang];
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [state, setState] = useState<TypingState>(() => createWave(0, lang));
  const [running, setRunning] = useState(false);
  const [typed, setTyped] = useState("");
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const typedRef = useRef(typed);
  typedRef.current = typed;
  const pops = useRef<Pop[]>([]);
  const shake = useRef(0);

  useRunRecord(TYPING_SLUG, state.status === "won", state.score);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const load = useCallback((w: number) => {
    setState(createWave(w, lang));
    setRunning(false);
    setTyped("");
    pops.current = [];
  }, [lang]);

  useEffect(() => {
    const done = loadClearedStages(TYPING_SLUG, WAVE_COUNT);
    setCleared(done);
    load(nextOpenStage(done, WAVE_COUNT));
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [load]);

  // game loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let s = stateRef.current;
      if (running && s.status === "play") {
        const before = s.hp;
        s = step(s, dt);
        if (s.hp < before) { shake.current = 0.35; sfx(s.status === "lost" ? "lose" : "fail"); }
        if (s.status === "won") { sfx("win"); setCleared(markStageCleared(TYPING_SLUG, s.wave, WAVE_COUNT)); }
        stateRef.current = s;
        setState(s);
      }
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        const slow = s.time < s.slowUntil;
        ctx.save();
        if (shake.current > 0) {
          shake.current -= dt;
          ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6);
        }
        const sky = ctx.createLinearGradient(0, 0, 0, FIELD_H);
        sky.addColorStop(0, slow ? "#3b2f63" : "#1c2541");
        sky.addColorStop(1, slow ? "#6c5ba7" : "#3a506b");
        ctx.fillStyle = sky;
        ctx.fillRect(-10, -10, FIELD_W + 20, FIELD_H + 20);
        // distant hills
        ctx.fillStyle = "#2f3e5c";
        ctx.beginPath();
        ctx.moveTo(0, GROUND - 30);
        for (let x = 0; x <= FIELD_W; x += 40) ctx.lineTo(x, GROUND - 30 - Math.sin(x / 50) * 14);
        ctx.lineTo(FIELD_W, GROUND);
        ctx.lineTo(0, GROUND);
        ctx.fill();
        // village wall
        ctx.fillStyle = "#8d6e63";
        ctx.fillRect(0, GROUND, FIELD_W, FIELD_H - GROUND);
        ctx.fillStyle = "#6d4c41";
        for (let x = 0; x < FIELD_W; x += 30) for (let y = GROUND; y < FIELD_H; y += 14) ctx.fillRect(x + ((y - GROUND) / 14) % 2 * 15, y, 28, 12);
        for (let x = 4; x < FIELD_W; x += 36) { ctx.fillStyle = "#8d6e63"; ctx.fillRect(x, GROUND - 10, 20, 12); }
        // hp hearts on the wall
        for (let i = 0; i < WALL_HP; i++) {
          ctx.fillStyle = i < s.hp ? "#ff6b6b" : "rgba(0,0,0,0.3)";
          ctx.beginPath();
          const hx = FIELD_W - 18 - i * 20;
          const hy = FIELD_H - 18;
          ctx.moveTo(hx, hy + 6);
          ctx.bezierCurveTo(hx - 9, hy - 1, hx - 5, hy - 8, hx, hy - 3);
          ctx.bezierCurveTo(hx + 5, hy - 8, hx + 9, hy - 1, hx, hy + 6);
          ctx.fill();
        }
        // words
        const want = normalise(typedRef.current, s.lang);
        for (const f of s.words) {
          if (!f.spawned) continue;
          const wide = s.lang === "ko" || s.lang === "ja" || s.lang === "zh";
          ctx.font = `bold ${f.kind === "boss" ? 17 : wide ? 15 : 15}px system-ui, sans-serif`;
          const w = wordWidth(f, s.lang);
          const lines = f.kind === "boss" ? wrap(ctx, f.text, w - 16) : [f.text];
          const h = 26 + (lines.length - 1) * 20;
          const bg = f.kind === "gold" ? "#ffd43b" : f.kind === "bomb" ? "#ff6b6b" : f.kind === "boss" ? "#845ef7" : "#f8f9fa";
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.beginPath();
          ctx.roundRect(f.x + 2, f.y + 3, w, h, 10);
          ctx.fill();
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.roundRect(f.x, f.y, w, h, 10);
          ctx.fill();
          if (f.kind === "boss") {
            // little horns
            ctx.beginPath();
            ctx.moveTo(f.x + 14, f.y); ctx.lineTo(f.x + 20, f.y - 10); ctx.lineTo(f.x + 26, f.y);
            ctx.moveTo(f.x + w - 26, f.y); ctx.lineTo(f.x + w - 20, f.y - 10); ctx.lineTo(f.x + w - 14, f.y);
            ctx.fill();
          }
          // highlight the typed prefix
          const norm = normalise(f.text, s.lang);
          const match = want && norm.startsWith(want);
          ctx.textBaseline = "middle";
          ctx.textAlign = f.kind === "boss" ? "center" : "left";
          lines.forEach((line, i) => {
            ctx.fillStyle = f.kind === "boss" ? "#fff" : "#212529";
            const tx = f.kind === "boss" ? f.x + w / 2 : f.x + 8;
            ctx.fillText(line, tx, f.y + 13 + i * 20);
          });
          if (match) {
            ctx.strokeStyle = "#51cf66";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(f.x - 2, f.y - 2, w + 4, h + 4, 12);
            ctx.stroke();
          }
        }
        // pops
        pops.current = pops.current.filter((p) => p.life > 0);
        for (const p of pops.current) {
          p.life -= dt;
          p.y -= 40 * dt;
          ctx.globalAlpha = Math.max(0, p.life / 0.8);
          ctx.fillStyle = p.color;
          ctx.font = "bold 16px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(p.text, p.x, p.y);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, sfx]);

  const start = () => {
    if (state.status !== "play") load(state.wave);
    setRunning(true);
    window.setTimeout(() => inputRef.current?.focus(), 30);
  };

  const onSubmit = () => {
    const s = stateRef.current;
    if (!running || s.status !== "play") return;
    const r = submit(s, typed);
    setTyped("");
    if (r.hit) {
      const w = wordWidth(r.hit, s.lang);
      pops.current.push({ x: r.hit.x + w / 2, y: r.hit.y, text: `+${[...r.hit.text].length * 10}`, life: 0.8, color: "#69db7c" });
      for (const f of r.cleared) pops.current.push({ x: f.x + wordWidth(f, s.lang) / 2, y: f.y, text: "💥", life: 0.8, color: "#ff6b6b" });
      if (r.state.status === "won") { sfx("win"); setCleared(markStageCleared(TYPING_SLUG, r.state.wave, WAVE_COUNT)); }
      else sfx(r.hit.kind === "boss" || r.cleared.length ? "combo" : r.state.combo >= 5 ? "success" : "place");
    } else sfx("fail");
    stateRef.current = r.state;
    setState(r.state);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const st = starsFor(state);
  const over = state.status !== "play";

  return (
    <div
      ref={containerRef}
      data-game="typing-defense"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.wave, state.wave + 1)} / {WAVE_COUNT}</Badge>
        {isBossWave(state.wave) ? <Badge variant="destructive">{c.boss}</Badge> : null}
        <Badge variant="outline">{fill(c.score, state.score)}</Badge>
        <Badge variant="outline">{fill(c.combo, state.combo)}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={FIELD_W}
          height={FIELD_H}
          onPointerDown={() => inputRef.current?.focus()}
          className="mx-auto block w-full max-w-md touch-none select-none rounded-xl border border-border"
          aria-label={c.help}
        />
        {!running && !over ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/60">
            <p className="text-sm font-semibold">{c.ready}</p>
            <Button className="min-h-12 min-w-32" onClick={start}>
              <Play className="size-4" />
              {state.time > 0 ? c.resume : c.start}
            </Button>
          </div>
        ) : null}
      </div>

      {over ? (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-center">
          <p className="text-lg font-bold">{state.status === "won" ? c.won : c.lost}</p>
          {state.status === "won" ? <p className="text-xl text-warning" aria-label={`${st}/3`}>{"★".repeat(st)}{"☆".repeat(3 - st)}</p> : null}
          <p className="text-sm">{fill(c.score, state.score)} · {fill(c.speed, cpm(state))} · {fill(c.combo, state.bestCombo)}</p>
          {state.status === "won" ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => load(state.wave)}>{c.retry}</Button>
              <Button className="min-h-12" onClick={() => load(state.wave >= WAVE_COUNT - 1 ? 0 : state.wave + 1)}>
                {state.wave >= WAVE_COUNT - 1 ? finaleLabel(locale) : c.next}
              </Button>
            </div>
          ) : (
            <Button className="min-h-12 w-full" onClick={() => load(state.wave)}>{c.retry}</Button>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); onSubmit(); }
            }}
            placeholder={c.placeholder}
            aria-label={c.placeholder}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="send"
            disabled={!running}
            className="min-h-12 w-full min-w-0 rounded-md border border-border bg-card px-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          />
          <Button variant="outline" size="icon" className="size-12 shrink-0" onClick={() => setRunning((r) => !r)} aria-label={running ? c.pause : c.resume}>
            {running ? <Pause className="size-5" /> : <Play className="size-5" />}
          </Button>
        </div>
      )}
      <p className="flex items-center gap-1 text-xs text-muted-foreground"><Heart className="size-3" aria-hidden="true" />{c.help}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.waves}</summary>
        <div className="pt-2">
          <StageBar count={WAVE_COUNT} current={state.wave} cleared={cleared} locale={locale} onSelect={load} />
        </div>
      </details>
    </div>
  );
}

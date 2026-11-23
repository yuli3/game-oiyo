// Omission Detective v2 (2026-11-23): a corkboard city map. Witnesses tell the
// truth but leave places out; drag a red string from pin to pin to rebuild the
// suspect's one possible route. Hook (design lens): high concept ("everyone
// told the truth, nobody told all of it") + a screenshot-worthy red-string board.
// Logic: lib/games/omission-detective.

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Eraser, Maximize2, Minimize2, Undo2, Volume2, VolumeX, X } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { readMutedPref, writeMutedPref } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { recordBest, recordResult } from "../../lib/games/records";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import {
  GAME_ID, PLACE_XY, STAGE_COUNT, TRIES, clearPicks, createBoard, lineOk, makeCase, pick, stars, submitOrder,
  type Board, type PlaceId,
} from "../../lib/games/omission-detective";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";
const MUTE_KEY = "oiyo:omission-detective:muted";
const fill = (s: string, ...v: (string | number)[]) => v.reduce<string>((acc, x, i) => acc.replace(`{${i}}`, String(x)), s);

const ICON: Record<PlaceId, string> = { market: "🛒", school: "🏫", park: "🌳", station: "🚉", library: "📚", hospital: "🏥", bridge: "🌉", harbor: "⚓" };
const FACES = ["👵", "🧑‍🍳", "👮", "🧒"];

const COPY: Record<L, {
  case: string; tries: string; witness: string; hint: string; submit: string; undo: string; clear: string; next: string; retry: string;
  won: string; lost: string; broken: string; route: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
  decoy: string; places: Record<PlaceId, string>;
}> = {
  ko: {
    case: "사건 {0}", tries: "남은 확인 {0}", witness: "목격자 {0}", submit: "이 순서로 확인", undo: "한 칸 되돌리기", clear: "실 걷기",
    next: "다음 사건", retry: "다시 하기", won: "그 길뿐이에요. 사건 해결!", lost: "확인을 다 썼어요. 진짜 길은 이랬어요.",
    broken: "목격자 {0}의 말과 어긋나요.", route: "진짜 길", stages: "사건 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
    hint: "목격자들은 거짓말을 하지 않지만, 장소를 몇 군데씩 빠뜨렸어요. 지도에서 핀을 손가락으로 이어 빨간 실로 용의자의 길을 만드세요. 모든 말과 맞는 길은 하나뿐이에요. 말에 없는 핀은 미끼예요.",
    decoy: "아무도 말하지 않은 곳",
    places: { market: "시장", school: "학교", park: "공원", station: "역", library: "도서관", hospital: "병원", bridge: "다리", harbor: "항구" },
  },
  en: {
    case: "Case {0}", tries: "{0} checks left", witness: "Witness {0}", submit: "Check this route", undo: "Undo one pin", clear: "Pull the string",
    next: "Next case", retry: "Try again", won: "Only that route fits. Case closed!", lost: "Out of checks. Here is the real route.",
    broken: "That breaks witness {0}'s statement.", route: "Real route", stages: "Pick a case", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
    hint: "The witnesses never lie, but each leaves places out. Drag across the pins on the map to run a red string along the suspect's route. Only one route fits every statement. Pins nobody mentions are decoys.",
    decoy: "Nobody mentioned it",
    places: { market: "Market", school: "School", park: "Park", station: "Station", library: "Library", hospital: "Hospital", bridge: "Bridge", harbor: "Harbor" },
  },
  ja: {
    case: "事件 {0}", tries: "残り確認 {0}", witness: "目撃者 {0}", submit: "この順で確認", undo: "一つ戻す", clear: "糸を外す",
    next: "次の事件", retry: "もう一度", won: "その道だけです。事件解決！", lost: "確認を使い切りました。本当の道はこうでした。",
    broken: "目撃者{0}の証言と合いません。", route: "本当の道", stages: "事件を選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
    hint: "目撃者はうそをつきませんが、それぞれ場所をいくつか言い忘れています。地図のピンを指でなぞって赤い糸で容疑者の道を作りましょう。全部の証言に合う道は一つだけ。誰も言わないピンはおとりです。",
    decoy: "誰も言っていない場所",
    places: { market: "市場", school: "学校", park: "公園", station: "駅", library: "図書館", hospital: "病院", bridge: "橋", harbor: "港" },
  },
  zh: {
    case: "案件 {0}", tries: "剩余核对 {0}", witness: "目击者 {0}", submit: "按此顺序核对", undo: "撤回一个", clear: "收起红线",
    next: "下一案", retry: "再来一次", won: "只有这条路成立。结案！", lost: "核对次数用完了。真正的路线是这样。",
    broken: "这与目击者{0}的话不符。", route: "真实路线", stages: "选择案件", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
    hint: "目击者从不说谎，但每人都漏说了几个地点。用手指在地图上划过图钉，用红线连出嫌疑人的路线。符合所有证词的路线只有一条。没人提到的图钉是诱饵。",
    decoy: "没人提到的地方",
    places: { market: "市场", school: "学校", park: "公园", station: "车站", library: "图书馆", hospital: "医院", bridge: "桥", harbor: "港口" },
  },
  fr: {
    case: "Affaire {0}", tries: "{0} vérifications", witness: "Témoin {0}", submit: "Vérifier ce trajet", undo: "Retirer une punaise", clear: "Retirer le fil",
    next: "Affaire suivante", retry: "Réessayer", won: "Seul ce trajet colle. Affaire classée !", lost: "Plus de vérifications. Voici le vrai trajet.",
    broken: "Cela contredit le témoin {0}.", route: "Vrai trajet", stages: "Choisir une affaire", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
    hint: "Les témoins ne mentent jamais, mais chacun oublie des lieux. Glissez le doigt sur les punaises pour tendre un fil rouge le long du trajet du suspect. Un seul trajet colle à toutes les déclarations. Les punaises que personne ne cite sont des leurres.",
    decoy: "Personne n'en parle",
    places: { market: "Marché", school: "École", park: "Parc", station: "Gare", library: "Bibliothèque", hospital: "Hôpital", bridge: "Pont", harbor: "Port" },
  },
  es: {
    case: "Caso {0}", tries: "Quedan {0} intentos", witness: "Testigo {0}", submit: "Comprobar ruta", undo: "Quitar una chincheta", clear: "Quitar el hilo",
    next: "Siguiente caso", retry: "Reintentar", won: "Solo esa ruta encaja. ¡Caso cerrado!", lost: "Sin intentos. Esta era la ruta real.",
    broken: "Eso contradice al testigo {0}.", route: "Ruta real", stages: "Elegir caso", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
    hint: "Los testigos nunca mienten, pero cada uno omite lugares. Desliza el dedo por las chinchetas del mapa para tender un hilo rojo por la ruta del sospechoso. Solo una ruta encaja con todas las declaraciones. Las chinchetas que nadie menciona son señuelos.",
    decoy: "Nadie lo mencionó",
    places: { market: "Mercado", school: "Escuela", park: "Parque", station: "Estación", library: "Biblioteca", hospital: "Hospital", bridge: "Puente", harbor: "Puerto" },
  },
};

const W = 360;
const H = 360;
const DPR = 2;
const HIT = 34;

function boop(ctx: AudioContext | null, freq: number, vol = 0.14, type: OscillatorType = "triangle", len = 0.12) {
  if (!ctx) return;
  const when = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, when);
  o.frequency.exponentialRampToValueAtTime(freq * 0.75, when + len);
  g.gain.setValueAtTime(vol, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + len + 0.02);
  o.connect(g).connect(ctx.destination);
  o.start(when);
  o.stop(when + len + 0.04);
}

function pinAt(pins: readonly PlaceId[], x: number, y: number): PlaceId | null {
  let best: PlaceId | null = null;
  let bestD = HIT;
  for (const p of pins) {
    const [px, py] = PLACE_XY[p];
    const d = Math.hypot(px - x, py - y);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

export default function OmissionDetective({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });
  const [board, setBoard] = useState<Board>(() => createBoard(makeCase(0)));
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const boardRef = useRef(board);
  boardRef.current = board;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const drag = useRef<{ on: boolean; x: number; y: number; removed: PlaceId | null }>({ on: false, x: 0, y: 0, removed: null });
  const shake = useRef(0);
  const winT = useRef(-1);
  const prevPhase = useRef(board.phase);

  const load = useCallback((i: number) => {
    const b = createBoard(makeCase(i));
    boardRef.current = b;
    winT.current = -1;
    setBoard(b);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(GAME_ID, STAGE_COUNT);
    setCleared(done);
    load(nextOpenStage(done, STAGE_COUNT));
    setMuted(readMutedPref(MUTE_KEY));
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => { void audio.current?.close().catch(() => undefined); };
  }, [load]);

  useEffect(() => {
    const prev = prevPhase.current;
    prevPhase.current = board.phase;
    if (prev === board.phase) return;
    if (board.phase === "won") {
      setCleared(markStageCleared(GAME_ID, board.case.index, STAGE_COUNT));
      try { recordResult(GAME_ID, "w"); recordBest(GAME_ID, board.case.index + 1, "score"); } catch { /* storage blocked */ }
      haptics.current?.fire("win");
      winT.current = 0;
    } else if (board.phase === "lost") {
      try { recordResult(GAME_ID, "l"); } catch { /* storage blocked */ }
      haptics.current?.fire("fail");
      winT.current = 0;
    }
  }, [board.phase, board.case.index]);

  const ensureAudio = () => {
    if (audio.current) return audio.current;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audio.current = Ctx ? new Ctx() : null;
    } catch { audio.current = null; }
    void audio.current?.resume().catch(() => undefined);
    return audio.current;
  };
  const sound = (f: number, v?: number, t?: OscillatorType, l?: number) => { if (!mutedRef.current) boop(audio.current, f, v, t, l); };

  const apply = (next: Board) => {
    if (next === boardRef.current) return;
    const grew = next.picks.length > boardRef.current.picks.length;
    boardRef.current = next;
    setBoard(next);
    sound(grew ? 330 + next.picks.length * 70 : 220, 0.12, "triangle", 0.09);
    haptics.current?.fire("tap");
  };

  const toLocal = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H] as const;
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    ensureAudio();
    const b = boardRef.current;
    if (b.phase !== "ask") return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const [x, y] = toLocal(e);
    drag.current = { on: true, x, y, removed: null };
    const p = pinAt(b.case.pins, x, y);
    if (!p) return;
    const last = b.picks[b.picks.length - 1];
    if (last === p) drag.current.removed = p;
    apply(pick(b, p));
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current.on) return;
    const [x, y] = toLocal(e);
    drag.current.x = x;
    drag.current.y = y;
    const b = boardRef.current;
    const p = pinAt(b.case.pins, x, y);
    if (p && p !== drag.current.removed && !b.picks.includes(p)) apply(pick(b, p));
  };
  const onUp = () => { drag.current.on = false; };

  const submit = () => {
    const b = boardRef.current;
    const next = submitOrder(b);
    if (next === b) return;
    boardRef.current = next;
    setBoard(next);
    if (next.phase === "won") { sound(523, 0.14); setTimeout(() => sound(784, 0.14), 110); }
    else { sound(130, 0.18, "sawtooth", 0.3); shake.current = 1; haptics.current?.fire("fail"); }
  };

  // render loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let time = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      shake.current = Math.max(0, shake.current - dt * 2.5);
      if (winT.current >= 0) winT.current += dt;
      const b = boardRef.current;
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        const sx = Math.sin(time * 60) * shake.current * 6;
        ctx.setTransform(DPR, 0, 0, DPR, sx * DPR, 0);
        // cork
        ctx.fillStyle = "#b98a57";
        ctx.fillRect(-10, 0, W + 20, H);
        for (let k = 0; k < 220; k++) {
          ctx.fillStyle = k % 2 ? "rgba(90,55,25,0.18)" : "rgba(240,200,150,0.16)";
          ctx.fillRect((k * 89) % W, (k * 47) % H, 2, 2);
        }
        // paper map
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.rotate(-0.015);
        ctx.fillStyle = "#f4ecd8";
        ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
        ctx.fillRect(-166, -166, 332, 332);
        ctx.restore();
        ctx.shadowColor = "transparent";
        // river + streets
        ctx.strokeStyle = "#9cc9e3"; ctx.lineWidth = 14; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(20, 250); ctx.bezierCurveTo(120, 225, 200, 270, 340, 250); ctx.stroke();
        ctx.strokeStyle = "#ddd2b8"; ctx.lineWidth = 8;
        for (const [a, bb] of [[[30, 120], [330, 130]], [[140, 20], [150, 340]], [[260, 20], [270, 340]], [[30, 220], [330, 200]]] as const) {
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(bb[0], bb[1]); ctx.stroke();
        }
        // pins
        const mentioned = new Set(b.case.lines.flat());
        for (const p of b.case.pins) {
          const [x, y] = PLACE_XY[p];
          const used = b.picks.indexOf(p);
          ctx.fillStyle = used >= 0 ? "#fff3c4" : "#ffffff";
          ctx.strokeStyle = mentioned.has(p) ? "#5b4636" : "#b0a08a";
          ctx.lineWidth = 2;
          ctx.setLineDash(mentioned.has(p) ? [] : [4, 3]);
          ctx.beginPath(); ctx.roundRect(x - 28, y - 22, 56, 44, 8); ctx.fill(); ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = "22px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.globalAlpha = mentioned.has(p) ? 1 : 0.55;
          ctx.fillText(ICON[p], x, y - 4);
          ctx.globalAlpha = 1;
          ctx.fillStyle = "#3b2f25"; ctx.font = "700 10px system-ui";
          ctx.fillText(c.places[p], x, y + 15);
        }
        // red string
        const route = b.phase === "lost" && winT.current >= 0 ? b.case.order : b.picks;
        const color = b.phase === "won" ? "#2f9e44" : b.phase === "lost" ? "#1971c2" : "#d62828";
        if (route.length) {
          ctx.strokeStyle = color; ctx.lineWidth = 3.5; ctx.lineJoin = "round";
          ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowOffsetY = 2; ctx.shadowBlur = 2;
          ctx.beginPath();
          route.forEach((p, k) => {
            const [x, y] = PLACE_XY[p];
            const yy = y - 22;
            if (k === 0) ctx.moveTo(x, yy);
            else {
              const [px, py] = PLACE_XY[route[k - 1]!];
              ctx.quadraticCurveTo((px + x) / 2, (py + y) / 2 - 22 + 14, x, yy);
            }
          });
          if (drag.current.on && b.phase === "ask" && b.picks.length) ctx.lineTo(drag.current.x, drag.current.y);
          ctx.stroke();
          ctx.shadowColor = "transparent";
          route.forEach((p, k) => {
            const [x, y] = PLACE_XY[p];
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(x, y - 22, 9, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#ffffff"; ctx.font = "800 11px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(String(k + 1), x, y - 22);
          });
          // footsteps walking the solved route
          if (b.phase !== "ask" && winT.current >= 0 && route.length > 1) {
            const seg = (winT.current * 1.6) % (route.length - 1);
            const k = Math.floor(seg);
            const f = seg - k;
            const [ax, ay] = PLACE_XY[route[k]!];
            const [bx, by] = PLACE_XY[route[k + 1]!];
            ctx.font = "18px system-ui";
            ctx.fillText("🕵️", ax + (bx - ax) * f, ay + (by - ay) * f - 22);
          }
        } else if (b.phase === "ask") {
          // pins wobble to invite the first drag
          ctx.fillStyle = `rgba(214,40,40,${0.5 + 0.4 * Math.sin(time * 4)})`;
          for (const p of b.case.pins) { const [x, y] = PLACE_XY[p]; ctx.beginPath(); ctx.arc(x, y - 22, 5, 0, Math.PI * 2); ctx.fill(); }
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [c]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const n = board.case.order.length;
  const st = stars(board);
  const done = board.phase !== "ask";
  const decoys = board.case.pins.filter((p) => !board.case.lines.flat().includes(p));

  return (
    <div
      ref={containerRef}
      data-game="omission-detective"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.case, board.case.index + 1)} / {STAGE_COUNT}</Badge>
        <Badge variant="outline">{board.picks.length} / {n}</Badge>
        <Badge variant="outline">{fill(c.tries, TRIES - board.tries)}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={W * DPR}
        height={H * DPR}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="mx-auto block w-full max-w-md touch-none select-none rounded-xl border border-border"
        aria-label={c.hint}
      />

      <ul className="space-y-1.5" aria-live="polite">
        {board.case.lines.map((line, k) => {
          const ok = lineOk(line, board.picks);
          const isBroken = board.broken === k;
          return (
            <li
              key={k}
              className={`flex items-start gap-2 rounded-lg border p-2 text-sm ${isBroken || !ok ? "border-destructive bg-destructive/10" : board.picks.length ? "border-primary/40 bg-primary/5" : "border-border"}`}
            >
              <span className="text-xl" aria-hidden>{FACES[k % FACES.length]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{fill(c.witness, k + 1)}</p>
                <p className="font-medium">
                  {line.map((p, j) => (
                    <span key={p} className={board.picks.includes(p) ? "font-bold text-primary" : ""}>
                      {j > 0 ? " … " : ""}{ICON[p]} {c.places[p]}
                    </span>
                  ))}
                </p>
                {isBroken ? <p className="text-xs text-destructive">{fill(c.broken, k + 1)}</p> : null}
              </div>
              {board.picks.length ? (ok ? <Check className="size-4 text-primary" aria-hidden /> : <X className="size-4 text-destructive" aria-hidden />) : null}
            </li>
          );
        })}
        {decoys.length ? (
          <li className="rounded-lg border border-dashed border-border p-2 text-xs text-muted-foreground">
            {c.decoy}: {decoys.map((p) => `${ICON[p]} ${c.places[p]}`).join(" · ")}
          </li>
        ) : null}
      </ul>

      {!done ? (
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="size-12" onClick={() => { const b = boardRef.current; const lastPin = b.picks[b.picks.length - 1]; if (lastPin) apply(pick(b, lastPin)); }} aria-label={c.undo} disabled={!board.picks.length}>
            <Undo2 className="size-5" />
          </Button>
          <Button variant="outline" size="icon" className="size-12" onClick={() => apply(clearPicks(boardRef.current))} aria-label={c.clear} disabled={!board.picks.length}>
            <Eraser className="size-5" />
          </Button>
          <Button className="min-h-12 flex-1" onClick={submit} disabled={board.picks.length !== n}>{c.submit}</Button>
        </div>
      ) : (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-center" aria-live="polite">
          <p className="text-lg font-bold">{board.phase === "won" ? c.won : c.lost}</p>
          {board.phase === "won" ? <p className="text-xl text-warning" aria-label={`${st}/3`}>{"★".repeat(st)}{"☆".repeat(3 - st)}</p> : null}
          <p className="text-sm">{c.route}: {board.case.order.map((p) => c.places[p]).join(" → ")}</p>
          {board.phase === "won" ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => load(board.case.index)}>{c.retry}</Button>
              <Button className="min-h-12" onClick={() => load(board.case.index >= STAGE_COUNT - 1 ? 0 : board.case.index + 1)}>
                {board.case.index >= STAGE_COUNT - 1 ? finaleLabel(locale) : c.next}
              </Button>
            </div>
          ) : (
            <Button className="min-h-12 w-full" onClick={() => load(board.case.index)}>{c.retry}</Button>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{c.hint}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={STAGE_COUNT} current={board.case.index} cleared={cleared} locale={locale} onSelect={load} />
        </div>
      </details>
    </div>
  );
}

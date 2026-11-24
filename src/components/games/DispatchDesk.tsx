import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { RETRO_8BIT_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawParticles, drawSprite, spawnBurst, stepParticles, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { DISPATCH_SLUG, DISPATCH_STAGES, HQ, SKILL, STAGE_COUNT, deadline, driveTime, newDesk, open, send, starsFor, stepDesk, type Desk, type Kind } from "../../lib/games/dispatch-desk";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; goal: string; time: string; start: string; pickCall: string; win: string; lose: string; result: string; again: string; next: string;
  handled: string; missed: string; busy: string; home: string; out: string; back: string; skills: [string, string, string]; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", goal: "처리 {0}/{1}", time: "{0}초", start: "신고를 누르고, 보낼 대원을 눌러요!", pickCall: "먼저 신고를 골라요", win: "근무 끝! 도시가 무사해요", lose: "놓친 신고가 너무 많아요", result: "{0}건 처리 · {1}건 놓침",
    again: "다시 하기", next: "다음 단계", handled: "해결!", missed: "놓쳤어요", busy: "출동 중이에요", home: "대기", out: "출동", back: "복귀",
    skills: ["힘", "돌봄", "속도"],
    help: "작은 도시 긴급 센터의 야간 상황실이에요. 근무 내내 화재·구조·추격 신고가 지도에 뜨고, 숫자는 필요한 능력, 둘레의 원은 남은 시간이에요. 대원은 저마다 힘(화재), 돌봄(구조), 속도(추격) 능력이 다르고, 속도가 높을수록 빨리 달려요. 신고를 누른 뒤 아래 대원 카드를 눌러 보내요. 한 명으로 모자라면 두 명을 보내 능력을 합칠 수 있어요. 원이 다 줄기 전에 도착해야 해요. 다녀온 대원은 돌아와서 잠깐 쉬어야 하니, 제일 센 대원만 계속 보내면 다음 신고에 보낼 사람이 없어요. 근무가 끝날 때 목표만큼 처리하면 통과예요. (키보드: 왼쪽·오른쪽 방향키로 신고 고르기, 숫자 1~6으로 대원 보내기)",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", goal: "Handled {0}/{1}", time: "{0}s", start: "Tap a call, then tap the crew to send!", pickCall: "Pick a call first", win: "Shift over! The city is safe", lose: "Too many calls missed", result: "{0} handled · {1} missed",
    again: "Try again", next: "Next stage", handled: "Handled!", missed: "Missed", busy: "Already out", home: "Ready", out: "Out", back: "Back",
    skills: ["Power", "Care", "Speed"],
    help: "You run the night desk of a small city's emergency centre. All shift long, fires, rescues and chases pop up on the map: the number is the skill it needs, the ring round it the time left. Each crew is good at different things — power for fires, care for rescues, speed for chases — and the faster they are, the faster they drive. Tap a call, then a crew card below to send them. If one is not enough, send two and their skills add up. They must get there before the ring runs out. Crews drive back and rest a moment before they can go again, so sending your strongest to everything leaves no one for the next call. Handle the target number of calls by the end of the shift. (Keyboard: left/right arrows to pick a call, 1–6 to send a crew.)",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", goal: "対応 {0}/{1}", time: "{0}秒", start: "通報を押して、出す隊員を押そう！", pickCall: "先に通報を選んで", win: "勤務終了！街は無事です", lose: "取りこぼした通報が多すぎます", result: "{0}件対応・{1}件逃した",
    again: "もう一度", next: "次の面", handled: "解決！", missed: "逃した", busy: "出動中です", home: "待機", out: "出動", back: "帰還",
    skills: ["力", "救護", "速さ"],
    help: "小さな街の緊急センターの夜勤指令室です。勤務中ずっと火事・救助・追跡の通報が地図に出ます。数字は必要な能力、周りの輪は残り時間です。隊員はそれぞれ力（火事）・救護（救助）・速さ（追跡）の能力が違い、速さが高いほど速く走ります。通報を押してから下の隊員カードを押して出動させます。1人で足りなければ2人で能力を合わせられます。輪が消える前に着かなければなりません。戻った隊員は少し休むので、いちばん強い隊員ばかり出すと次の通報に出す人がいなくなります。勤務終了までに目標数を対応すればクリア。（キーボード：左右キーで通報選択、1〜6で隊員を出動）",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", goal: "处理 {0}/{1}", time: "{0}秒", start: "点一个报警，再点要派的队员！", pickCall: "先选一个报警", win: "下班了！城市平安", lose: "漏掉的报警太多了", result: "处理 {0} 件 · 漏掉 {1} 件",
    again: "再来一次", next: "下一关", handled: "解决！", missed: "漏掉了", busy: "正在出勤", home: "待命", out: "出勤", back: "返回",
    skills: ["力量", "救护", "速度"],
    help: "你在小城应急中心值夜班。整个班次里，火灾、救援、追捕的报警不断出现在地图上：数字是需要的能力，外圈是剩余时间。每个队员擅长的不同——力量对火灾、救护对救援、速度对追捕——速度越高开车越快。先点报警，再点下方的队员卡派出。一人不够就派两人，能力相加。必须在圈消失前赶到。出过勤的队员回来要休息一会儿，所以总派最强的人，下一个报警就没人可派了。班次结束时处理够目标数即过关。（键盘：左右方向键选报警，数字1~6派队员）",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", goal: "Traités {0}/{1}", time: "{0} s", start: "Touchez un appel, puis l'équipe à envoyer !", pickCall: "Choisissez d'abord un appel", win: "Fin de service ! La ville est sauve", lose: "Trop d'appels manqués", result: "{0} traités · {1} manqués",
    again: "Réessayer", next: "Niveau suivant", handled: "Traité !", missed: "Manqué", busy: "Déjà en route", home: "Prêt", out: "Sortie", back: "Retour",
    skills: ["Force", "Soin", "Vitesse"],
    help: "Vous tenez le standard de nuit du centre d'urgence d'une petite ville. Toute la nuit, incendies, secours et poursuites apparaissent sur la carte : le nombre est la compétence requise, l'anneau le temps restant. Chaque équipier a ses points forts — force pour le feu, soin pour les secours, vitesse pour les poursuites — et plus il est rapide, plus il roule vite. Touchez un appel, puis une carte d'équipier en bas pour l'envoyer. Si un seul ne suffit pas, envoyez-en deux : leurs compétences s'additionnent. Il faut arriver avant que l'anneau se vide. Les équipes rentrent et se reposent un moment : envoyer toujours le plus fort ne laisse personne pour l'appel suivant. Traitez le nombre d'appels demandé avant la fin du service. (Clavier : flèches gauche/droite pour choisir un appel, 1–6 pour envoyer.)",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", goal: "Atendidas {0}/{1}", time: "{0} s", start: "¡Toca una llamada y luego al equipo que envías!", pickCall: "Elige antes una llamada", win: "¡Fin del turno! La ciudad está a salvo", lose: "Demasiadas llamadas perdidas", result: "{0} atendidas · {1} perdidas",
    again: "Reintentar", next: "Siguiente nivel", handled: "¡Resuelta!", missed: "Perdida", busy: "Ya está fuera", home: "Listo", out: "Fuera", back: "Vuelve",
    skills: ["Fuerza", "Cuidado", "Rapidez"],
    help: "Llevas el turno de noche de la central de emergencias de una pequeña ciudad. Todo el turno aparecen en el mapa incendios, rescates y persecuciones: el número es la habilidad que pide, el anillo el tiempo que queda. Cada miembro del equipo destaca en algo —fuerza para incendios, cuidado para rescates, rapidez para persecuciones— y cuanto más rápido, antes llega. Toca una llamada y luego una tarjeta del equipo para enviarlo. Si uno no basta, manda a dos y sus habilidades se suman. Deben llegar antes de que se acabe el anillo. Al volver descansan un momento, así que mandar siempre al más fuerte deja a nadie para la siguiente llamada. Atiende las llamadas que pide el nivel antes del fin del turno. (Teclado: flechas izquierda/derecha para elegir llamada, 1–6 para enviar.)",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:dispatch-desk:muted";
const W = 360;
const H = 560;
const CARD_Y = 484;
const CARD_H = 68;
const KIND_COLOR: Record<Kind, string> = { fire: "#fa5252", rescue: "#40c057", chase: "#4dabf7" };
const SKILL_COLOR = ["#fa5252", "#40c057", "#4dabf7"];
const ICON: Record<Kind, PixelArt> = {
  fire: { palette: { r: "#fa5252", y: "#ffd43b" }, rows: ["..r..", ".rr..", ".ryr.", "rryrr", ".rrr."] },
  rescue: { palette: { g: "#2f9e44", w: "#ffffff" }, rows: [".www.", ".wgw.", "wgggw", ".wgw.", ".www."] },
  chase: { palette: { b: "#1971c2", w: "#ffffff" }, rows: ["bbbb.", "bwwbb", "bbbbb", ".b.b."] },
};
const STATION: PixelArt = { palette: { r: "#c92a2a", w: "#f8f9fa", k: "#343a40" }, rows: ["..rr..", ".rrrr.", "rrrrrr", "wwkkww", "wwkkww"] };
const VAN: PixelArt = { palette: { w: "#f8f9fa", r: "#e03131", k: "#212529" }, rows: [".rr..", "wwwww", "wwwww", ".k.k."] };

const cardBox = (n: number, k: number) => {
  const w = (W - 16 - (n - 1) * 6) / n;
  return { x: 8 + k * (w + 6), y: CARD_Y, w, h: CARD_H };
};

interface Pop { text: string; t: number; color: string; x: number; y: number }
type Input = { kind: "call"; i: number } | { kind: "crew"; k: number } | { kind: "cycle"; by: number };

export default function DispatchDesk({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; handled: number; missed: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dRef = useRef<Desk>(newDesk(DISPATCH_STAGES[0]));
  const input = useRef<Input[]>([]);
  const selected = useRef(-1);
  const started = useRef(false);
  const parts = useRef<PixelParticle[]>([]);
  const pops = useRef<Pop[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = DISPATCH_STAGES[stage];

  useRunRecord(DISPATCH_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    dRef.current = newDesk(DISPATCH_STAGES[s]);
    input.current = [];
    selected.current = -1;
    started.current = false;
    parts.current = [];
    pops.current = [];
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(DISPATCH_SLUG, STAGE_COUNT);
    setCleared(doneStages);
    start(nextOpenStage(doneStages, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
        ev.preventDefault();
        input.current.push({ kind: "cycle", by: ev.key === "ArrowLeft" ? -1 : 1 });
        setTouched(true);
      } else if (/^[1-6]$/.test(ev.key)) input.current.push({ kind: "crew", k: Number(ev.key) - 1 });
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const d = dRef.current;
      const s = d.stage;
      const cp = copyRef.current;
      // input is read once per frame
      for (const e of input.current.splice(0)) {
        if (d.over) break;
        started.current = true;
        if (e.kind === "call") selected.current = e.i;
        else if (e.kind === "cycle") {
          const live = s.calls.map((_, i) => i).filter((i) => open(d, i));
          if (live.length) {
            const at = live.indexOf(selected.current);
            selected.current = live[(at + e.by + live.length) % live.length];
          }
        } else {
          if (selected.current < 0 || !open(d, selected.current)) {
            pops.current.push({ text: cp.pickCall, t: 0.9, color: "#e8590c", x: W / 2, y: 70 });
            continue;
          }
          const r = send(d, e.k, selected.current);
          if (r === "sent") sfx("place");
          else if (r === "busy") pops.current.push({ text: cp.busy, t: 0.9, color: "#e8590c", x: W / 2, y: 70 });
        }
      }
      if (started.current && !d.over) {
        const ev = stepDesk(d, dt);
        for (const i of ev.handled) {
          const call = s.calls[i];
          pops.current.push({ text: cp.handled, t: 1, color: "#2f9e44", x: call.x, y: call.y - 22 });
          spawnBurst(parts.current, call.x, call.y, ["#69db7c", "#ffd43b"], 12, 90, 2);
          sfx("success");
          if (selected.current === i) selected.current = -1;
        }
        for (const i of ev.missed) {
          const call = s.calls[i];
          pops.current.push({ text: cp.missed, t: 1, color: "#e03131", x: call.x, y: call.y - 22 });
          sfx("fail");
          if (selected.current === i) selected.current = -1;
        }
        if (selected.current < 0) {
          // keep the most urgent open call picked, so a tap on a crew always has somewhere to go
          const live = s.calls.map((_, i) => i).filter((i) => d.status[i] === "waiting").sort((a, b) => deadline(s.calls[a]) - deadline(s.calls[b]));
          if (live.length) selected.current = live[0];
        }
        if (ev.end) {
          setOver({ won: d.won, stars: starsFor(d), handled: d.handled, missed: d.missed });
          if (d.won) {
            setCleared(markStageCleared(DISPATCH_SLUG, s.stage, STAGE_COUNT));
            sfx("win");
          } else sfx("lose");
        }
      }
      stepParticles(parts.current, dt, 40);
      pops.current = pops.current.filter((pp) => (pp.t -= dt) > 0);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // the city at night: blocks and streets
        ctx.fillStyle = "#1c2433";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#2a3447";
        for (let gx = 0; gx < 6; gx++) for (let gy = 0; gy < 7; gy++) ctx.fillRect(14 + gx * 58, 96 + gy * 54, 46, 42);
        drawSprite(ctx, STATION, HQ.x, HQ.y, { scale: 5 });
        // calls: icon, the skill they need, a ring of time left
        s.calls.forEach((call, i) => {
          if (!open(d, i)) return;
          const left = Math.max(0, (deadline(call) - d.t) / call.wait);
          ctx.strokeStyle = "rgba(255,255,255,0.18)";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(call.x, call.y, 17, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = left < 0.3 ? "#ff6b6b" : KIND_COLOR[call.kind];
          ctx.beginPath();
          ctx.arc(call.x, call.y, 17, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2);
          ctx.stroke();
          if (i === selected.current) {
            ctx.strokeStyle = "#ffd43b";
            ctx.lineWidth = 2;
            ctx.strokeRect(call.x - 23, call.y - 23, 46, 46);
          }
          drawSprite(ctx, ICON[call.kind], call.x, call.y - 3, { scale: 3 });
          const need = call.level - d.arrived[i];
          ctx.fillStyle = "#fff";
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(String(need), call.x + 14, call.y + 16);
        });
        // vans on the road
        d.crew.forEach((cs, k) => {
          if (cs.phase !== "out") return;
          const call = s.calls[cs.call];
          const tt = driveTime(s.crew[k], call);
          const p = Math.max(0, Math.min(1, 1 - (cs.arrive - d.t) / tt));
          drawSprite(ctx, VAN, HQ.x + (call.x - HQ.x) * p, HQ.y + (call.y - HQ.y) * p, { scale: 3, flipX: call.x < HQ.x });
        });
        drawParticles(ctx, parts.current);
        // crew cards
        s.crew.forEach((crew, k) => {
          const b = cardBox(s.crew.length, k);
          const cs = d.crew[k];
          const sel = selected.current >= 0 && open(d, selected.current) ? s.calls[selected.current] : null;
          const fits = sel ? crew.skills[SKILL[sel.kind]] : 0;
          ctx.fillStyle = cs.phase === "home" ? "#f1f3f5" : "#495057";
          ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.fillStyle = "#212529";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(`${k + 1} ${cs.phase === "home" ? copyRef.current.home : cs.phase === "out" ? copyRef.current.out : copyRef.current.back}`, b.x + 4, b.y + 13);
          crew.skills.forEach((v, j) => {
            ctx.fillStyle = "rgba(0,0,0,0.15)";
            ctx.fillRect(b.x + 4, b.y + 20 + j * 15, b.w - 8, 10);
            ctx.fillStyle = SKILL_COLOR[j];
            ctx.fillRect(b.x + 4, b.y + 20 + j * 15, ((b.w - 8) * v) / 5, 10);
          });
          if (sel && cs.phase === "home") {
            ctx.fillStyle = fits >= sel.level - d.arrived[selected.current] ? "#2f9e44" : "#e8590c";
            ctx.fillRect(b.x, b.y - 4, b.w, 3);
          }
        });
        ctx.textAlign = "left";
        ctx.font = "bold 15px sans-serif";
        ctx.fillStyle = "#f1f3f5";
        ctx.fillText(fill(cp.goal, d.handled, s.need), 12, 26);
        ctx.textAlign = "right";
        ctx.fillText(fill(cp.time, Math.max(0, Math.ceil(s.shift - d.t))), W - 12, 26);
        ctx.textAlign = "left";
        ctx.font = "11px sans-serif";
        cp.skills.forEach((name, j) => {
          ctx.fillStyle = SKILL_COLOR[j];
          ctx.fillRect(12 + j * 80, 40, 10, 10);
          ctx.fillStyle = "#ced4da";
          ctx.fillText(name, 26 + j * 80, 49);
        });
        ctx.textAlign = "center";
        for (const pp of pops.current) {
          ctx.font = "bold 14px sans-serif";
          const tw = ctx.measureText(pp.text).width + 12;
          const x = Math.max(tw / 2 + 4, Math.min(W - tw / 2 - 4, pp.x));
          ctx.fillStyle = "rgba(255,255,255,0.94)";
          ctx.fillRect(x - tw / 2, pp.y - 16, tw, 22);
          ctx.fillStyle = pp.color;
          ctx.fillText(pp.text, x, pp.y);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dRef.current;
    if (d.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    setTouched(true);
    for (let k = 0; k < d.stage.crew.length; k++) {
      const b = cardBox(d.stage.crew.length, k);
      if (x >= b.x && x <= b.x + b.w && y >= b.y - 6 && y <= b.y + b.h) {
        input.current.push({ kind: "crew", k });
        return;
      }
    }
    let best = -1;
    let bestD = 30;
    d.stage.calls.forEach((call, i) => {
      const dist = Math.hypot(call.x - x, call.y - y);
      if (open(d, i) && dist < bestD) {
        best = i;
        bestD = dist;
      }
    });
    if (best >= 0) input.current.push({ kind: "call", i: best });
    else started.current = true;
  };

  const toggleMute = () => {
    const nx = !muted;
    setMuted(nx);
    cues.current?.setMuted(nx);
    writeMutedPref(MUTE_KEY, nx);
  };

  return (
    <div
      ref={containerRef}
      data-game="dispatch-desk"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.goal, st.need, st.calls.length)}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={() => start(stage)} aria-label={c.again}>
            <RotateCcw className="size-5" />
          </Button>
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
          width={W}
          height={H}
          onPointerDown={onDown}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 top-20 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{over.won ? c.win : c.lose}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.handled, over.missed)}</p>
            {over.won ? <p className="text-2xl tracking-widest text-warning" aria-label={`${over.stars}/3`}>{"★".repeat(over.stars)}{"☆".repeat(3 - over.stars)}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(stage)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              <Button className="min-h-12" disabled={!over.won} onClick={() => start(stage >= STAGE_COUNT - 1 ? 0 : stage + 1)}>
                <span>{stage >= STAGE_COUNT - 1 ? finaleLabel(locale) : c.next}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{c.help}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={STAGE_COUNT} current={stage} cleared={cleared} locale={locale} onSelect={(i) => start(i)} />
        </div>
      </details>
    </div>
  );
}

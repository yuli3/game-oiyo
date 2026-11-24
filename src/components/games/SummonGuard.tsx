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
import { COLS, GUARD_SLUG, GUARD_STAGES, OVERRUN, POSTS, STAGE_COUNT, TRACK, canMerge, merge, newCamp, partner, starsFor, step, summon, summonCost, type Camp } from "../../lib/games/summon-guard";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; wave: string; coins: string; monsters: string; summon: string; start: string; win: string; lose: string; result: string; again: string; next: string; boss: string;
  help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", wave: "{0}/{1}웨이브", coins: "동전 {0}", monsters: "몬스터 {0}/{1}", summon: "소환 ●{0}", start: "소환을 눌러 수비대를 불러요!", win: "캠프를 지켰어요!", lose: "캠프가 뚫렸어요", result: "트랙 위 몬스터가 가장 많았던 때 {0}마리",
    again: "다시 하기", next: "다음 단계", boss: "보스!",
    help: "몬스터가 캠프를 둘러싼 트랙을 빙빙 돌아요. '소환'을 누르면 동전을 내고 빈 자리에 수비대가 하나 와요. 누가 올지는 몰라요. 궁수, 마법사(셋을 한꺼번에), 얼음술사(느리게), 대포 중 하나가 무작위로 나와요. 같은 종류, 같은 등급 수비대 둘을 차례로 누르면 하나로 합쳐 다음 등급이 되는데, 종류는 다시 무작위예요. 소환할 때마다 값이 조금씩 오르고, 몬스터를 쓰러뜨리면 동전이 떨어져요. 트랙 위 몬스터가 25마리가 되면 캠프가 뚫려요. 마지막 웨이브의 보스까지 막으면 통과, 몬스터를 적게 쌓을수록 별이 늘어요. 키보드: Space 소환, M 합치기, 화살표로 고르고 Enter로 합치기.",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", wave: "Wave {0}/{1}", coins: "{0} coins", monsters: "Monsters {0}/{1}", summon: "Summon ●{0}", start: "Tap Summon to call a guard!", win: "The camp held!", lose: "The camp was overrun", result: "Most monsters on the track at once: {0}",
    again: "Try again", next: "Next stage", boss: "Boss!",
    help: "Monsters march round the track that rings your camp. Tap Summon to pay coins and call a guard to an empty post — you never know who: an archer, a mage (three at once), a frost caster (slows) or a cannon turns up at random. Tap two guards of the same kind and rank one after the other to merge them into the next rank, of a random kind again. Every summon costs a little more, and fallen monsters drop coins. When 25 monsters are on the track, the camp is overrun. Hold until the last wave's boss falls; the fewer monsters you let pile up, the more stars. Keyboard: Space summon, M merge, arrows pick and Enter merge.",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", wave: "ウェーブ {0}/{1}", coins: "コイン {0}", monsters: "モンスター {0}/{1}", summon: "召喚 ●{0}", start: "召喚を押して守備隊を呼ぼう！", win: "キャンプを守った！", lose: "キャンプが突破された", result: "トラック上のモンスター最多 {0}体",
    again: "もう一度", next: "次の面", boss: "ボス！",
    help: "モンスターがキャンプを囲むトラックをぐるぐる回ります。「召喚」を押すとコインを払って空いた場所に守備隊が1人来ます。誰が来るかはわかりません。弓兵、魔法使い（3体同時）、氷術師（遅くする）、大砲のどれかがランダムに出ます。同じ種類・同じランクの守備隊2人を続けて押すと合体して次のランクになりますが、種類はまたランダム。召喚のたびに値段が少し上がり、倒したモンスターはコインを落とします。トラック上のモンスターが25体になると突破されます。最後のウェーブのボスまで守ればクリア、モンスターをためないほど星が増えます。キーボード：Spaceで召喚、Mで合体、矢印で選んでEnterで合体。",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", wave: "第{0}/{1}波", coins: "金币 {0}", monsters: "怪物 {0}/{1}", summon: "召唤 ●{0}", start: "点“召唤”叫来守卫！", win: "守住了营地！", lose: "营地被攻破了", result: "跑道上怪物最多时 {0} 只",
    again: "再来一次", next: "下一关", boss: "首领！",
    help: "怪物沿着环绕营地的跑道一圈圈地走。点“召唤”付金币，空位上就会来一名守卫——来的是谁全凭运气：弓箭手、法师（一次打三只）、冰法师（减速）或大炮随机出现。依次点两个同类同级的守卫，就会合成下一级，但种类又会重新随机。每次召唤都会稍微涨价，击倒的怪物会掉金币。跑道上的怪物达到25只营地就会被攻破。挡住最后一波的首领即过关，怪物堆得越少星越多。键盘：Space召唤，M合成，方向键选择后按Enter合成。",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", wave: "Vague {0}/{1}", coins: "{0} pièces", monsters: "Monstres {0}/{1}", summon: "Invoquer ●{0}", start: "Touchez Invoquer pour appeler un garde !", win: "Le camp a tenu !", lose: "Le camp est envahi", result: "Au plus {0} monstres sur la piste",
    again: "Réessayer", next: "Niveau suivant", boss: "Boss !",
    help: "Des monstres tournent sur la piste qui entoure votre camp. Touchez Invoquer pour payer et appeler un garde sur un poste libre — on ne sait jamais qui : archer, mage (trois à la fois), givreur (ralentit) ou canon, au hasard. Touchez l'un après l'autre deux gardes de même type et même rang pour les fusionner au rang suivant, d'un type de nouveau au hasard. Chaque invocation coûte un peu plus, et les monstres vaincus lâchent des pièces. À 25 monstres sur la piste, le camp est envahi. Tenez jusqu'au boss de la dernière vague ; moins vous laissez de monstres s'accumuler, plus d'étoiles. Clavier : Espace invoquer, M fusionner, flèches choisir et Entrée fusionner.",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", wave: "Oleada {0}/{1}", coins: "{0} monedas", monsters: "Monstruos {0}/{1}", summon: "Invocar ●{0}", start: "¡Toca Invocar para llamar a un guardia!", win: "¡El campamento resistió!", lose: "El campamento cayó", result: "Como mucho {0} monstruos en la pista",
    again: "Reintentar", next: "Siguiente nivel", boss: "¡Jefe!",
    help: "Los monstruos dan vueltas por la pista que rodea tu campamento. Toca Invocar para pagar y llamar a un guardia a un puesto libre; nunca sabes quién: arquero, mago (tres a la vez), mago de hielo (ralentiza) o cañón, al azar. Toca uno tras otro dos guardias del mismo tipo y rango para fusionarlos en el rango siguiente, de un tipo otra vez al azar. Cada invocación cuesta un poco más y los monstruos caídos sueltan monedas. Con 25 monstruos en la pista, el campamento cae. Resiste hasta el jefe de la última oleada; cuantos menos monstruos se acumulen, más estrellas. Teclado: Espacio invocar, M fusionar, flechas elegir e Intro fusionar.",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const GUARDS: PixelArt[] = [
  { palette: { g: "#2f9e44", s: "#ffd8a8", w: "#a87545", k: "#212529" }, rows: ["..gggg..", ".gggggg.", "..ssss.w", "..sksk.w", "..ssss.w", ".gggggww", ".gggggw.", "..k..k.."] },
  { palette: { p: "#7048e8", s: "#ffd8a8", y: "#fab005", k: "#212529" }, rows: ["...pp...", "..pppp..", ".pppppp.", "..ssss.y", "..sksk.y", ".pppppp.", ".pppppp.", "..k..k.."] },
  { palette: { c: "#4dabf7", w: "#e7f5ff", s: "#ffd8a8", k: "#212529" }, rows: ["..cccc..", ".cwwwwc.", "..ssss..", "..sksk.w", "..ssss.c", ".cccccw.", ".cccccc.", "..k..k.."] },
  { palette: { d: "#495057", g: "#868e96", w: "#a87545", k: "#212529" }, rows: ["........", "....dddd", "..ddddgg", ".dddddd.", "wwddddww", "w.w..w.w", ".www.ww.", "........"] },
];
const RANK_COLOURS = ["#ced4da", "#69db7c", "#4dabf7", "#da77f2"];
const MUTE_KEY = "oiyo:summon-guard:muted";
const W = 360;
const H = 560;
const CELL = 64;
const BX = (W - CELL * COLS) / 2;
const BY = 214;
const postXY = (p: number) => ({ x: BX + (p % COLS) * CELL + CELL / 2, y: BY + Math.floor(p / COLS) * CELL + CELL / 2 });
const TL = { x: 22, y: 140 };
const TR = { w: 316, h: 330 };
/** A point on the track for a track position, clockwise from the top-left corner. */
function trackXY(pos: number): { x: number; y: number } {
  const per = 2 * (TR.w + TR.h);
  let d = (pos / TRACK) * per;
  if (d < TR.w) return { x: TL.x + d, y: TL.y };
  d -= TR.w;
  if (d < TR.h) return { x: TL.x + TR.w, y: TL.y + d };
  d -= TR.h;
  if (d < TR.w) return { x: TL.x + TR.w - d, y: TL.y + TR.h };
  d -= TR.w;
  return { x: TL.x, y: TL.y + TR.h - d };
}
const SUMMON_BOX = { x: 70, y: 490, w: 220, h: 56 };

export default function SummonGuard({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { won: boolean; stars: number; peak: number }>(null);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const campRef = useRef<Camp>(newCamp(GUARD_STAGES[0]));
  const input = useRef<Array<{ kind: "summon" } | { kind: "post"; p: number } | { kind: "auto" }>>([]);
  const started = useRef(false);
  const selected = useRef(-1);
  const shots = useRef<Array<{ x1: number; y1: number; x2: number; y2: number; t: number; colour: string }>>([]);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const overShown = useRef(false);

  useRunRecord(GUARD_SLUG, Boolean(over?.won), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    campRef.current = newCamp(GUARD_STAGES[s]);
    input.current = [];
    started.current = false;
    selected.current = -1;
    shots.current = [];
    parts.current = [];
    overShown.current = false;
    setOver(null);
    setTouched(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(GUARD_SLUG, STAGE_COUNT);
    setCleared(doneStages);
    start(nextOpenStage(doneStages, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const cm = campRef.current;
      const st = cm.stage;
      const cp = copyRef.current;
      // taps are read once per frame
      for (const a of input.current.splice(0)) {
        if (cm.over) break;
        started.current = true;
        if (a.kind === "summon") {
          const p = summon(cm);
          if (p >= 0) {
            const q = postXY(p);
            spawnBurst(parts.current, q.x, q.y, ["#fff", "#ffd43b"], 8, 80, 2);
            sfx("place");
          } else sfx("fail");
        } else if (a.kind === "auto") {
          const order = cm.posts.map((_, i) => i).filter((i) => cm.posts[i]).sort((x, y) => cm.posts[y]!.rank - cm.posts[x]!.rank);
          for (const p of order) {
            const b = partner(cm, p);
            if (b >= 0) {
              input.current.unshift({ kind: "post", p }, { kind: "post", p: b });
              selected.current = -1;
              break;
            }
          }
        } else {
          const p = a.p;
          const sel = selected.current;
          if (!cm.posts[p]) selected.current = -1;
          else if (sel === p) selected.current = -1;
          else if (sel >= 0 && canMerge(cm, sel, p)) {
            merge(cm, sel, p);
            const q = postXY(sel);
            spawnBurst(parts.current, q.x, q.y, [RANK_COLOURS[cm.posts[sel]!.rank - 1], "#fff"], 16, 120, 3);
            selected.current = -1;
            sfx("combo");
          } else {
            selected.current = p;
            sfx("tap");
          }
        }
      }
      if (started.current && !cm.over) {
        const ev = step(cm, dt);
        for (const h of ev.hits.slice(0, 12)) {
          const m = cm.monsters[h.monster];
          const g = cm.posts[h.post];
          if (!m || !g) continue;
          const a = postXY(h.post);
          const b = trackXY(m.pos);
          shots.current.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, t: 0.08, colour: ["#ffe066", "#b197fc", "#a5d8ff", "#ff922b"][g.kind] });
        }
        if (ev.kills) sfx("tap");
      }
      if (cm.over && !overShown.current) {
        overShown.current = true;
        setOver({ won: cm.won, stars: starsFor(cm), peak: cm.peak });
        if (cm.won) {
          setCleared(markStageCleared(GUARD_SLUG, st.stage, STAGE_COUNT));
          spawnBurst(parts.current, W / 2, 300, ["#ffd43b", "#fff", "#69db7c", "#4dabf7"], 30, 150, 3);
          sfx("win");
        } else sfx("lose");
      }
      shots.current = shots.current.filter((s) => (s.t -= dt) > 0);
      stepParticles(parts.current, dt, 120);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#1f2d1f";
        ctx.fillRect(0, 0, W, H);
        // the track
        ctx.strokeStyle = "#8a6a45";
        ctx.lineWidth = 22;
        ctx.strokeRect(TL.x, TL.y, TR.w, TR.h);
        ctx.lineWidth = 1;
        // the camp's posts
        for (let p = 0; p < POSTS; p++) {
          const q = postXY(p);
          ctx.fillStyle = selected.current === p ? "#ffd43b" : "#2b4a2b";
          ctx.fillRect(q.x - CELL / 2 + 3, q.y - CELL / 2 + 3, CELL - 6, CELL - 6);
          const g = cm.posts[p];
          if (!g) continue;
          // a guard with a partner glows a little, so pairs are easy to spot
          if (partner(cm, p) >= 0) {
            ctx.fillStyle = "rgba(255,255,255,0.12)";
            ctx.fillRect(q.x - CELL / 2 + 3, q.y - CELL / 2 + 3, CELL - 6, CELL - 6);
          }
          drawSprite(ctx, GUARDS[g.kind], q.x, q.y - 4, { scale: 5 });
          ctx.fillStyle = RANK_COLOURS[g.rank - 1];
          for (let r = 0; r < g.rank; r++) ctx.fillRect(q.x - g.rank * 5 + r * 10 + 1, q.y + 20, 8, 6);
        }
        for (const s of shots.current) {
          ctx.strokeStyle = s.colour;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(s.x1, s.y1);
          ctx.lineTo(s.x2, s.y2);
          ctx.stroke();
        }
        ctx.lineWidth = 1;
        for (const m of cm.monsters) {
          const p = trackXY(m.pos);
          const r = m.boss ? 13 : 7;
          ctx.fillStyle = m.boss ? "#c92a2a" : m.slowed > 0 ? "#74c0fc" : "#e8590c";
          ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
          ctx.fillStyle = "#212529";
          ctx.fillRect(p.x - r / 2 - 1, p.y - 2, 2, 2);
          ctx.fillRect(p.x + r / 2 - 1, p.y - 2, 2, 2);
          ctx.fillStyle = "#51cf66";
          ctx.fillRect(p.x - r, p.y - r - 4, ((r * 2) * Math.max(0, m.hp)) / m.max, 2);
        }
        // the summon plate
        const cost = summonCost(cm.summons);
        const can = cm.coins >= cost && cm.posts.includes(null);
        ctx.fillStyle = can ? "#f08c00" : "#495057";
        ctx.fillRect(SUMMON_BOX.x, SUMMON_BOX.y, SUMMON_BOX.w, SUMMON_BOX.h);
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.fillText(fill(cp.summon, cost), W / 2, SUMMON_BOX.y + 35);
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffd43b";
        ctx.fillText(fill(cp.coins, cm.coins), 14, 26);
        ctx.fillStyle = cm.monsters.length >= OVERRUN - 5 ? "#ff6b6b" : "#e9ecef";
        ctx.fillText(fill(cp.monsters, cm.monsters.length, OVERRUN), 14, 48);
        ctx.textAlign = "right";
        ctx.fillStyle = "#e9ecef";
        ctx.fillText(fill(cp.wave, Math.max(1, cm.wave), st.waves), W - 14, 26);
        if (cm.monsters.some((m) => m.boss)) {
          ctx.fillStyle = "#ff6b6b";
          ctx.fillText(cp.boss, W - 14, 48);
        }
        drawParticles(ctx, parts.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (campRef.current.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    setTouched(true);
    if (x >= SUMMON_BOX.x && x <= SUMMON_BOX.x + SUMMON_BOX.w && y >= SUMMON_BOX.y && y <= SUMMON_BOX.y + SUMMON_BOX.h) return void input.current.push({ kind: "summon" });
    const col = Math.floor((x - BX) / CELL);
    const row = Math.floor((y - BY) / CELL);
    if (col >= 0 && col < COLS && row >= 0 && row * COLS + col < POSTS) input.current.push({ kind: "post", p: row * COLS + col });
  };

  const onKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (campRef.current.over) return;
    if (e.key === " " || e.key === "s" || e.key === "S") {
      e.preventDefault();
      setTouched(true);
      input.current.push({ kind: "summon" });
    } else if (e.key === "m" || e.key === "M") {
      setTouched(true);
      input.current.push({ kind: "auto" });
    } else if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : e.key === "ArrowDown" ? COLS : -COLS;
      selected.current = (Math.max(0, selected.current) + d + POSTS) % POSTS;
    } else if (e.key === "Enter" && selected.current >= 0) {
      e.preventDefault();
      const b = partner(campRef.current, selected.current);
      if (b >= 0) input.current.push({ kind: "post", p: b });
    }
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
      data-game="summon-guard"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.wave, GUARD_STAGES[stage].waves, GUARD_STAGES[stage].waves)}</Badge>
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
          tabIndex={0}
          onPointerDown={onDown}
          onKeyDown={onKey}
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
            <p className="text-sm text-muted-foreground">{fill(c.result, over.peak)}</p>
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

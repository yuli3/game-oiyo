import { useCallback, useEffect, useRef, useState } from "react";
import { Hammer, Maximize2, Minimize2, Flame, Users, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { CORE_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { loadClearedStages, markStageCleared } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import {
  TERMS,
  TERM_COUNT,
  WORKSHOP_SLUG,
  applyOffline,
  autoRate,
  buyUpgrade,
  itemPrice,
  loadWorkshop,
  nextTerm,
  saveWorkshop,
  tap,
  tapPower,
  termDone,
  termForDate,
  termGoal,
  tick,
  upgradeCost,
  type UpgradeId,
  type Workshop,
} from "../../lib/games/season-workshop";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  term: string; make: string; goal: string; coins: string; perTap: string; perSec: string; price: string;
  tool: string; helper: string; stove: string; toolDesc: string; helperDesc: string; stoveDesc: string;
  done: string; next: string; finale: string; today: string; goToday: string; away: string; terms: string;
  full: string; exitFull: string; mute: string; unmute: string; intro: string; locked: string;
}> = {
  ko: {
    term: "{0}번째 절기", make: "{0} 만들기", goal: "{0} / {1}", coins: "엽전 {0}", perTap: "한 번에 {0}", perSec: "초당 {0}", price: "개당 {0}",
    tool: "연장 손질", helper: "일꾼 들이기", stove: "아궁이 넓히기", toolDesc: "누를 때 더 많이", helperDesc: "저절로 만들기", stoveDesc: "모두 1.5배",
    done: "{0} 준비 끝! 다음 절기로 넘어가요", next: "다음 절기: {0}", finale: "24절기를 한 바퀴 돌았어요! 대한에서 계속 만들 수 있어요",
    today: "오늘은 {0}", goToday: "{0}(으)로 가기", away: "자리를 비운 사이 {0}개를 만들었어요", terms: "절기 고르기",
    full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
    intro: "절기마다 그때 만들던 것을 만드는 공방이에요. 화면을 눌러 만들고, 판 돈으로 연장·일꾼·아궁이를 늘리세요. 창을 닫아도 일꾼은 쉬엄쉬엄 일해요.",
    locked: "아직 닿지 않은 절기예요",
  },
  en: {
    term: "Term {0}", make: "Make {0}", goal: "{0} / {1}", coins: "Coins {0}", perTap: "{0} per tap", perSec: "{0}/s", price: "{0} each",
    tool: "Sharpen tools", helper: "Hire a helper", stove: "Widen the hearth", toolDesc: "More per tap", helperDesc: "Makes things on its own", stoveDesc: "Everything ×1.5",
    done: "{0} all done! On to the next solar term", next: "Next term: {0}", finale: "You went round all 24 solar terms! Keep making in Major Cold",
    today: "Today is {0}", goToday: "Go to {0}", away: "While you were away: {0} made", terms: "Pick a term",
    full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
    intro: "A workshop that makes what Korean homes made in each of the 24 solar terms. Tap to make, spend coins on tools, helpers and the hearth. Helpers keep working slowly while the tab is closed.",
    locked: "You have not reached this term yet",
  },
  ja: {
    term: "{0}番目の節気", make: "{0}を作る", goal: "{0} / {1}", coins: "銭 {0}", perTap: "1回 {0}", perSec: "毎秒 {0}", price: "1個 {0}",
    tool: "道具の手入れ", helper: "職人を雇う", stove: "かまどを広げる", toolDesc: "1回でもっと多く", helperDesc: "自動で作る", stoveDesc: "すべて1.5倍",
    done: "{0}の支度完了！次の節気へ", next: "次の節気：{0}", finale: "二十四節気を一巡しました！大寒で作り続けられます",
    today: "今日は{0}", goToday: "{0}へ", away: "留守の間に{0}個作りました", terms: "節気を選ぶ",
    full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
    intro: "二十四節気ごとに、韓国の家でその頃作っていたものを作る工房です。タップで作り、稼いだ銭で道具・職人・かまどを増やしましょう。閉じている間も職人はのんびり働きます。",
    locked: "まだ届いていない節気です",
  },
  zh: {
    term: "第{0}个节气", make: "制作{0}", goal: "{0} / {1}", coins: "铜钱 {0}", perTap: "每次 {0}", perSec: "每秒 {0}", price: "每个 {0}",
    tool: "磨利工具", helper: "雇个帮手", stove: "扩大灶台", toolDesc: "每次点更多", helperDesc: "自动制作", stoveDesc: "全部×1.5",
    done: "{0}全部备好！进入下一个节气", next: "下一个节气：{0}", finale: "二十四节气转了一圈！可以在大寒继续制作",
    today: "今天是{0}", goToday: "前往{0}", away: "你离开期间做了{0}个", terms: "选择节气",
    full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
    intro: "这是一间按二十四节气制作韩国家庭当季物品的工坊。点击制作，用赚来的钱添置工具、帮手和灶台。关掉页面时帮手也会慢慢干活。",
    locked: "还没到这个节气",
  },
  fr: {
    term: "Terme {0}", make: "Fabriquer : {0}", goal: "{0} / {1}", coins: "Pièces {0}", perTap: "{0} par appui", perSec: "{0}/s", price: "{0} l'unité",
    tool: "Affûter les outils", helper: "Embaucher un aide", stove: "Agrandir le foyer", toolDesc: "Plus par appui", helperDesc: "Fabrique tout seul", stoveDesc: "Tout ×1,5",
    done: "{0} : c'est prêt ! Place au terme suivant", next: "Terme suivant : {0}", finale: "Les 24 termes solaires bouclés ! Continuez au Grand froid",
    today: "Aujourd'hui : {0}", goToday: "Aller à {0}", away: "Pendant votre absence : {0} fabriqués", terms: "Choisir un terme",
    full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
    intro: "Un atelier qui fabrique, pour chacun des 24 termes solaires, ce que les foyers coréens préparaient à ce moment-là. Appuyez pour fabriquer, achetez outils, aides et foyer. Les aides continuent doucement onglet fermé.",
    locked: "Terme pas encore atteint",
  },
  es: {
    term: "Término {0}", make: "Hacer: {0}", goal: "{0} / {1}", coins: "Monedas {0}", perTap: "{0} por toque", perSec: "{0}/s", price: "{0} cada uno",
    tool: "Afilar herramientas", helper: "Contratar ayudante", stove: "Ampliar el fogón", toolDesc: "Más por toque", helperDesc: "Fabrica solo", stoveDesc: "Todo ×1,5",
    done: "¡{0} listo! Al siguiente término solar", next: "Siguiente término: {0}", finale: "¡Completaste los 24 términos solares! Sigue haciendo en el Frío mayor",
    today: "Hoy es {0}", goToday: "Ir a {0}", away: "Mientras no estabas: {0} hechos", terms: "Elegir término",
    full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
    intro: "Un taller que hace, en cada uno de los 24 términos solares, lo que preparaban los hogares coreanos en esa época. Toca para hacer y compra herramientas, ayudantes y fogón. Los ayudantes siguen poco a poco con la pestaña cerrada.",
    locked: "Aún no llegaste a este término",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}
function short(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e4) return `${(v / 1e3).toFixed(1)}k`;
  return String(Math.floor(v));
}

const MUTE_KEY = "oiyo:season-workshop:muted";
const W = 480;
const H = 300;
type Puff = { x: number; y: number; vy: number; born: number };
type Flake = { x: number; y: number; s: number };

function seasonOf(term: number): "spring" | "summer" | "autumn" | "winter" {
  if (term < 6) return "spring";
  if (term < 12) return "summer";
  if (term < 18) return "autumn";
  return "winter";
}

export default function SeasonWorkshop({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [w, setW] = useState<Workshop | null>(null);
  const [cleared, setCleared] = useState<number[]>([]);
  const [away, setAway] = useState(0);
  const [muted, setMuted] = useState(false);
  const wRef = useRef<Workshop | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const puffs = useRef<Puff[]>([]);
  const flakes = useRef<Flake[]>(Array.from({ length: 40 }, (_, i) => ({ x: (i * 53) % W, y: (i * 97) % H, s: 0.4 + ((i * 7) % 10) / 10 })));
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const today = termForDate(new Date());

  const done = w ? termDone(w) : false;
  useRunRecord(WORKSHOP_SLUG, done, w?.totalMade ?? 0);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const update = useCallback((next: Workshop) => {
    wRef.current = next;
    setW(next);
  }, []);

  useEffect(() => {
    const now = Date.now();
    const loaded = loadWorkshop(now);
    const off = applyOffline(loaded, now);
    if (off.earned >= 1) setAway(off.earned);
    update(off.workshop);
    setCleared(loadClearedStages(WORKSHOP_SLUG, TERM_COUNT));
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: CORE_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [update]);

  // Helpers work once a second; the game saves every few seconds and on leave.
  useEffect(() => {
    let n = 0;
    const id = window.setInterval(() => {
      const cur = wRef.current;
      if (!cur) return;
      const next = { ...tick(cur, 1), lastSeen: Date.now() };
      update(next);
      if (++n % 5 === 0) saveWorkshop(next);
    }, 1000);
    const onHide = () => wRef.current && saveWorkshop({ ...wRef.current, lastSeen: Date.now() });
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
      onHide();
    };
  }, [update]);

  // Mark the term cleared the moment its goal is reached.
  const termIndex = w?.term ?? 0;
  useEffect(() => {
    if (done) {
      setCleared(markStageCleared(WORKSHOP_SLUG, termIndex, TERM_COUNT));
      sfx("win");
    }
  }, [done, termIndex, sfx]);

  // Scene painter: sky by season, sun height by term, falling petals/rain/leaves/snow, steam puffs.
  useEffect(() => {
    let raf = 0;
    const paint = (now: number) => {
      const ctx = canvasRef.current?.getContext("2d");
      const cur = wRef.current;
      if (ctx && cur) {
        const term = TERMS[cur.term];
        const season = seasonOf(cur.term);
        const sky = { spring: ["#ffd6e0", "#fff5e1"], summer: ["#8ecae6", "#e0f7ff"], autumn: ["#f4a261", "#ffe8cc"], winter: ["#a9b8d0", "#eef2f7"] }[season];
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, sky[0]);
        g.addColorStop(1, sky[1]);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        // sun: high in summer, low in winter
        const sunY = 40 + Math.abs(cur.term - 9.5) * 6;
        ctx.fillStyle = "rgba(255,220,120,0.9)";
        ctx.beginPath();
        ctx.arc(400, sunY, 22, 0, Math.PI * 2);
        ctx.fill();
        // hanok roof and wall
        ctx.fillStyle = "#3d405b";
        ctx.beginPath();
        ctx.moveTo(30, 150);
        ctx.quadraticCurveTo(240, 95, 450, 150);
        ctx.lineTo(420, 170);
        ctx.lineTo(60, 170);
        ctx.fill();
        ctx.fillStyle = "#f2e9e4";
        ctx.fillRect(70, 170, 340, 90);
        ctx.fillStyle = "#9a8c98";
        for (let x = 90; x < 400; x += 60) ctx.fillRect(x, 175, 6, 85);
        ctx.fillStyle = "#c9ada7";
        ctx.fillRect(0, 260, W, 40);
        // work table with the term's colour
        ctx.fillStyle = term.color;
        ctx.fillRect(150, 215, 180, 14);
        ctx.fillStyle = "#6b4f3a";
        ctx.fillRect(160, 229, 10, 30);
        ctx.fillRect(310, 229, 10, 30);
        ctx.font = "56px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const pulse = 1 + Math.max(0, 1 - (now - (puffs.current[puffs.current.length - 1]?.born ?? 0)) / 160) * 0.15;
        ctx.save();
        ctx.translate(240, 190);
        ctx.scale(pulse, pulse);
        ctx.fillText(term.emoji, 0, 0);
        ctx.restore();
        // weather particles
        for (const f of flakes.current) {
          f.y += season === "summer" ? 4 * f.s : 0.6 * f.s;
          f.x += season === "autumn" ? Math.sin(now / 600 + f.s * 10) * 0.6 : 0;
          if (f.y > H) f.y = -5;
          ctx.fillStyle = season === "spring" ? "#ffafcc" : season === "summer" ? "rgba(80,140,200,0.5)" : season === "autumn" ? "#e76f51" : "#ffffff";
          if (season === "summer") ctx.fillRect(f.x, f.y, 1.5, 8);
          else {
            ctx.beginPath();
            ctx.arc(f.x, f.y, 2.5 * f.s + 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // +N puffs from taps
        puffs.current = puffs.current.filter((p) => now - p.born < 900);
        for (const p of puffs.current) {
          const t = (now - p.born) / 900;
          ctx.globalAlpha = 1 - t;
          ctx.font = "22px system-ui, sans-serif";
          ctx.fillText(term.emoji, p.x, p.y - t * 60);
          ctx.globalAlpha = 1;
        }
      }
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onTap = (e: React.PointerEvent<HTMLElement>) => {
    const cur = wRef.current;
    if (!cur || termDone(cur)) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    const x = rect ? ((e.clientX - rect.left) / rect.width) * W : W / 2;
    const y = rect ? ((e.clientY - rect.top) / rect.height) * H : H / 2;
    puffs.current.push({ x, y, vy: 1, born: performance.now() });
    update(tap(cur));
    sfx("tap");
  };
  const buy = (id: UpgradeId) => {
    const cur = wRef.current;
    if (!cur) return;
    const next = buyUpgrade(cur, id);
    if (next === cur) return sfx("fail");
    update(next);
    saveWorkshop(next);
    sfx("place");
  };
  const advance = () => {
    const cur = wRef.current;
    if (!cur) return;
    const next = nextTerm(cur);
    update(next);
    saveWorkshop(next);
    sfx("success");
  };
  const highest = Math.max(w?.term ?? 0, ...cleared.map((i) => Math.min(TERM_COUNT - 1, i + 1)));
  const goTerm = (i: number) => {
    const cur = wRef.current;
    if (!cur || i > highest) return sfx("fail");
    const next = { ...cur, term: i, made: 0 };
    update(next);
    saveWorkshop(next);
  };
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  if (!w) return <div className="mx-auto aspect-video w-full max-w-2xl rounded-xl bg-muted" />;
  const term = TERMS[w.term];
  const goal = termGoal(w.term);
  const ups: { id: UpgradeId; label: string; desc: string; Icon: typeof Hammer; level: number }[] = [
    { id: "tool", label: c.tool, desc: c.toolDesc, Icon: Hammer, level: w.tool },
    { id: "helper", label: c.helper, desc: c.helperDesc, Icon: Users, level: w.helpers },
    { id: "stove", label: c.stove, desc: c.stoveDesc, Icon: Flame, level: w.stove },
  ];

  return (
    <div
      ref={containerRef}
      data-game="season-workshop"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-3 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-2xl space-y-3"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{term.name[locale]} · {fill(c.term, w.term + 1)} / {TERM_COUNT}</Badge>
        <Badge variant="outline">{fill(c.coins, short(w.coins))}</Badge>
        <Badge variant="outline">{fill(c.perTap, short(tapPower(w)))}</Badge>
        <Badge variant="outline">{fill(c.perSec, short(autoRate(w)))}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">{fill(c.today, TERMS[today].name[locale])}</span>
        {today !== w.term && today <= highest && (
          <Button variant="outline" size="sm" className="min-h-11" onClick={() => goTerm(today)}>{fill(c.goToday, TERMS[today].name[locale])}</Button>
        )}
        {away > 0 && <span className="text-success">{fill(c.away, short(away))}</span>}
      </div>

      <button
        type="button"
        onPointerDown={onTap}
        className="block w-full touch-manipulation select-none overflow-hidden rounded-xl border border-border"
        aria-label={fill(c.make, term.item[locale])}
      >
        <canvas ref={canvasRef} width={W} height={H} className="block aspect-video w-full" />
      </button>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm font-bold">
          <span>{fill(c.make, term.item[locale])} <span className="font-normal text-muted-foreground">{fill(c.price, itemPrice(w.term))}</span></span>
          <span className="tabular-nums">{fill(c.goal, short(w.made), short(goal))}</span>
        </div>
        <progress className="h-3 w-full accent-primary" value={w.made} max={goal} aria-label={fill(c.goal, short(w.made), short(goal))} />
      </div>

      {w.term === 0 && w.totalMade < 20 && <p className="text-sm text-muted-foreground">{c.intro}</p>}

      {done && (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-3">
          <p className="font-bold">{fill(c.done, term.item[locale])}</p>
          {w.term < TERM_COUNT - 1 ? (
            <Button className="min-h-12 w-full" onClick={advance}>{fill(c.next, TERMS[w.term + 1].name[locale])}</Button>
          ) : (
            <p className="text-sm">{c.finale}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {ups.map(({ id, label, desc, Icon, level }) => {
          const cost = upgradeCost(w, id);
          return (
            <Button key={id} variant={w.coins >= cost ? "default" : "outline"} className="h-auto min-h-16 flex-col" onClick={() => buy(id)}>
              <span className="flex items-center gap-1 text-sm font-bold"><Icon className="size-4" />{label} {level > 0 && `·${level}`}</span>
              <span className="text-xs opacity-80">{desc}</span>
              <span className="text-xs tabular-nums">{short(cost)}</span>
            </Button>
          );
        })}
      </div>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.terms}</summary>
        <div className="pt-2">
          <StageBar count={TERM_COUNT} current={w.term} cleared={cleared} locale={locale} onSelect={goTerm} />
        </div>
      </details>
    </div>
  );
}

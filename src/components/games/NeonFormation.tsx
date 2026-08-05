import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Crosshair, Gamepad2, Orbit, Radio, ShieldCheck, Sparkles } from "lucide-react";
import type { Locale } from "../../lib/i18n";
import { getBest, recordBest } from "../../lib/games/records";
import type { NeonFormationCopy, NeonFormationResult } from "./NeonFormationScene";

const Scene = lazy(() => import("./NeonFormationScene"));
const GAME_KEY = "neon-formation";
type Phase = "briefing" | "playing" | "result";

interface Copy {
  eyebrow: string; title: string; subtitle: string; start: string; again: string; loading: string; unavailable: string;
  best: string; score: string; wave: string; accuracy: string; rescued: string; controls: string; desktop: string; mobile: string;
  local: string; localBody: string; features: Array<{ title: string; body: string }>; scene: NeonFormationCopy;
}

const EN: Copy = {
  eyebrow: "NEON DEFENSE GRID / ORIGINAL ARCADE",
  title: "Neon Formation",
  subtitle: "Break precision alien formations, intercept spiral dive-bombers and rescue your captured wing ship before the tractor core escapes.",
  start: "Launch interceptor", again: "Fly another sortie", loading: "Charging neon drives…",
  unavailable: "WebGL is unavailable in this browser, so the 3D sortie cannot start.",
  best: "High score", score: "Score", wave: "Wave", accuracy: "Accuracy", rescued: "Rescues",
  controls: "Controls", desktop: "A/D or ←/→ move · Space/F/Click fire · P pause", mobile: "Drag or MOVE buttons · FIRE",
  local: "Private arcade cabinet", localBody: "The battle, high score and synthesized sound run on this device. No account, online opponent or downloaded audio.",
  features: [
    { title: "Living formations", body: "Squadrons assemble in luminous ranks, peel into mirrored corkscrews and attack in escalating pairs." },
    { title: "Capture and rescue", body: "Wardens project widening tractor cones. Escape the lock—or destroy the carrier to recover a dual-fire wing ship." },
    { title: "AAA arcade spectacle", body: "Emissive procedural ships, volumetric-style nebulae, bloom-like glows, impact debris and cinematic wave-clear zooms." },
  ],
  scene: { score: "SCORE", high: "HIGH", wave: "WAVE", lives: "SHIPS", chain: "CHAIN", captured: "TRACTOR LOCK", rescue: "WING SHIP RESCUED", clear: "FORMATION CLEARED", pointer: "CLICK / FIRE TO ENGAGE", pause: "PAUSED", fire: "FIRE", left: "LEFT", right: "RIGHT" },
};

const COPY: Record<Locale, Copy> = {
  en: EN,
  ko: { ...EN, eyebrow: "네온 방어선 / 오리지널 아케이드", subtitle: "정밀한 외계 편대를 무너뜨리고 나선 급강하를 요격하며, 트랙터 코어가 이탈하기 전에 포획된 윙쉽을 구출하세요.", start: "요격기 출격", again: "다시 출격", loading: "네온 드라이브 충전 중…", unavailable: "이 브라우저에서는 WebGL을 사용할 수 없어 3D 출격을 시작할 수 없습니다.", best: "최고 점수", score: "점수", wave: "웨이브", accuracy: "명중률", rescued: "구출", controls: "조작", desktop: "A/D 또는 ←/→ 이동 · Space/F/클릭 발사 · P 일시정지", mobile: "드래그 또는 이동 버튼 · FIRE", local: "기기 안의 아케이드", localBody: "전투, 최고 점수, 합성 사운드는 이 기기에서만 실행됩니다. 계정·온라인 상대·다운로드 음원이 없습니다.", features: [{ title: "살아 있는 편대", body: "빛나는 대열로 집결한 적이 대칭 코르크스크루와 2기 급강하 패턴으로 공격합니다." }, { title: "포획과 구출", body: "워든의 트랙터 콘을 피하고, 모함을 격파해 포획된 윙쉽을 회수하면 듀얼 샷이 됩니다." }, { title: "AAA 아케이드 연출", body: "발광 절차형 함선, 성운 파티클, 글로우, 충돌 파편과 웨이브 클리어 카메라 줌." }], scene: { ...EN.scene, score: "점수", high: "최고", wave: "웨이브", lives: "함선", chain: "연쇄", captured: "트랙터 락", rescue: "윙쉽 구출", clear: "편대 섬멸", pause: "일시정지", fire: "발사", left: "왼쪽", right: "오른쪽" } },
  ja: { ...EN, eyebrow: "ネオン防衛線 / オリジナルアーケード", subtitle: "精密な異星編隊を崩し、螺旋急降下を迎撃。トラクターコアが離脱する前に捕獲された僚機を救出せよ。", start: "迎撃機発進", again: "再出撃", controls: "操作", desktop: "A/D・←/→ 移動 · Space/F/クリック 射撃 · P 一時停止", mobile: "ドラッグまたは移動ボタン · FIRE", local: "端末内アーケード", localBody: "戦闘、ハイスコア、合成音はこの端末内だけで動作します。", best: "ハイスコア", rescued: "救出" },
  zh: { ...EN, eyebrow: "霓虹防线 / 原创街机", subtitle: "击破精密外星编队，拦截螺旋俯冲，并在牵引核心撤离前救回被捕获的僚机。", start: "发射拦截机", again: "再次出击", controls: "操作", desktop: "A/D或←/→移动 · Space/F/点击射击 · P暂停", mobile: "拖动或移动按钮 · FIRE", local: "设备内街机", localBody: "战斗、最高分和合成声音仅在本设备运行。", best: "最高分", rescued: "救援" },
  fr: { ...EN, eyebrow: "GRILLE NÉON / ARCADE ORIGINAL", subtitle: "Brisez les formations extraterrestres, interceptez les piqués en spirale et libérez votre ailier capturé avant la fuite du noyau tracteur.", start: "Lancer l'intercepteur", again: "Nouvelle sortie", controls: "Commandes", desktop: "A/D ou ←/→ bouger · Espace/F/clic tirer · P pause", mobile: "Glisser ou boutons · FIRE", local: "Borne privée", localBody: "Combat, record et son synthétisé restent sur cet appareil.", best: "Meilleur score", rescued: "Sauvetages" },
  es: { ...EN, eyebrow: "DEFENSA NEÓN / ARCADE ORIGINAL", subtitle: "Rompe formaciones alienígenas, intercepta picados en espiral y rescata tu nave capturada antes de que escape el núcleo tractor.", start: "Lanzar interceptor", again: "Otra salida", controls: "Controles", desktop: "A/D o ←/→ mover · Espacio/F/clic disparar · P pausa", mobile: "Arrastrar o botones · FIRE", local: "Arcade privado", localBody: "Combate, récord y sonido sintetizado funcionan solo en este dispositivo.", best: "Récord", rescued: "Rescates" },
};

function supportsWebgl() {
  if (typeof document === "undefined") return true;
  try { const canvas = document.createElement("canvas"); return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")); } catch { return false; }
}

export default function NeonFormation({ locale }: { locale: Locale }) {
  const t = COPY[locale] ?? EN;
  const [phase, setPhase] = useState<Phase>("briefing");
  const [best, setBest] = useState(0);
  const [available, setAvailable] = useState(true);
  const [result, setResult] = useState<NeonFormationResult | null>(null);
  useEffect(() => { setAvailable(supportsWebgl()); setBest(getBest(GAME_KEY)?.value ?? 0); }, []);
  const finish = useCallback((next: NeonFormationResult) => {
    const saved = recordBest(GAME_KEY, next.score, "score", JSON.stringify(next));
    setBest(saved.value); setResult(next); setPhase("result");
  }, []);

  if (phase === "playing") return <div className="not-prose relative left-1/2 my-6 w-[min(100vw-1rem,1420px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-cyan-400/30 bg-[#02030a] shadow-[0_0_80px_rgba(0,220,255,.16)]"><div className="h-[72vh] min-h-[520px] max-h-[680px] sm:h-auto sm:min-h-[580px] sm:max-h-[86vh] sm:aspect-[16/10]"><Suspense fallback={<div className="grid h-full place-items-center bg-[#02030a] font-mono text-cyan-300">{t.loading}</div>}><Scene copy={t.scene} highScore={best} onFinish={finish} /></Suspense></div></div>;

  return <section className="not-prose relative left-1/2 my-8 w-[min(100vw-1rem,1180px)] -translate-x-1/2 overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-950 shadow-xl">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_8%,rgba(34,211,238,.16),transparent_28%),radial-gradient(circle_at_20%_95%,rgba(244,63,94,.10),transparent_30%)]" />
    <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.1fr_.9fr] lg:p-14">
      <div><p className="font-mono text-[11px] font-black tracking-[.25em] text-cyan-700">{t.eyebrow}</p><h2 className="mt-4 text-5xl font-black uppercase leading-[.86] tracking-[-.055em] sm:text-7xl">{t.title}</h2><p className="mt-6 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">{t.subtitle}</p>
        <div className="mt-8 flex flex-wrap gap-3"><button disabled={!available} onClick={() => { setResult(null); setPhase("playing"); }} className="min-h-12 rounded-full bg-slate-950 px-8 py-3 text-sm font-black uppercase tracking-widest text-white shadow-[0_0_28px_rgba(6,182,212,.25)] disabled:opacity-40">{phase === "result" ? t.again : t.start}</button><span className="rounded-full border border-slate-200 bg-white/70 px-5 py-3 font-mono text-xs">{t.best}: <strong>{best.toLocaleString()}</strong></span></div>
        {!available && <p role="alert" className="mt-4 text-sm font-bold text-rose-700">{t.unavailable}</p>}
        {result && <dl role="status" aria-live="polite" className="mt-7 grid grid-cols-4 gap-2 rounded-2xl border border-slate-200 bg-white/60 p-4 text-center">{[[t.score, result.score], [t.wave, result.wave], [t.accuracy, `${result.accuracy}%`], [t.rescued, result.rescues]].map(([label, value]) => <div key={label}><dt className="text-[9px] font-bold uppercase text-slate-400">{label}</dt><dd className="mt-1 font-mono text-lg font-black">{value}</dd></div>)}</dl>}
      </div>
      <div className="grid content-center gap-3">{t.features.map((feature, index) => { const Icon = [Orbit, ShieldCheck, Sparkles][index]; return <div key={feature.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white/70 p-4"><Icon className="size-5 shrink-0 text-cyan-600" /><div><h3 className="text-sm font-black uppercase">{feature.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{feature.body}</p></div></div>; })}
        <div className="mt-2 rounded-2xl bg-slate-950 p-4 text-white"><div className="flex items-center gap-2 text-xs font-black uppercase"><Radio className="size-4 text-cyan-300" />{t.local}</div><p className="mt-2 text-xs leading-5 text-slate-400">{t.localBody}</p></div>
      </div>
    </div>
    <div className="relative grid gap-3 border-t border-slate-200 bg-slate-50 p-5 text-xs text-slate-600 sm:grid-cols-2 sm:p-7"><div><strong className="mb-1 flex items-center gap-2 text-slate-950"><Crosshair className="size-4 text-cyan-600" />{t.controls}</strong>{t.desktop}</div><div><strong className="mb-1 flex items-center gap-2 text-slate-950"><Gamepad2 className="size-4 text-rose-500" />MOBILE</strong>{t.mobile}</div></div>
  </section>;
}

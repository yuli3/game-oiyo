import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Crosshair, Flame, Gauge, Headphones, Skull, Zap } from "lucide-react";
import type { Locale } from "../../lib/i18n";
import { getBest, recordBest } from "../../lib/games/records";
import type { InfernalResult, InfernalSceneCopy } from "./InfernalVelocityScene";

const Scene = lazy(() => import("./InfernalVelocityScene"));
const GAME_KEY = "infernal-velocity";
type Phase = "briefing" | "playing" | "result";
interface Copy {
  eyebrow: string; title: string; subtitle: string; start: string; again: string; loading: string; unavailable: string;
  controls: string; desktop: string; mobile: string; local: string; localBody: string; best: string;
  score: string; kills: string; wave: string; accuracy: string;
  features: Array<{ title: string; body: string }>; scene: InfernalSceneCopy;
}

const EN: Copy = {
  eyebrow: "HELL CIRCUIT / SINGLE-PLAYER ARENA",
  title: "Infernal Velocity",
  subtitle: "Rip through an endless iron sanctuary with double jumps, vector dashes and three brutal retro-future weapons. Momentum is armor. Standing still is surrender.",
  start: "Break the seal", again: "Descend again", loading: "Igniting the hell circuit…",
  unavailable: "WebGL is unavailable in this browser, so the 3D arena cannot start.",
  controls: "Controls", desktop: "WASD move · Space double jump · Shift dash · Left click/F fire · E swap weapon · mouse aim",
  mobile: "Directional pad · JUMP twice · DASH · FIRE · SWAP", local: "On-device demon hunt",
  localBody: "Monsters, score and synthesized music run only in this tab. No account, network opponent or downloaded audio.",
  best: "Best score", score: "Score", kills: "Kills", wave: "Wave", accuracy: "Accuracy",
  features: [
    { title: "Velocity combat", body: "Bunny-hop to preserve speed, air-strafe around threats, then chain a direction-aware dash." },
    { title: "Three heavy weapons", body: "Iron scattergun, splash-damage rocket launcher and rapid plasma caster." },
    { title: "Procedural hellscape", body: "Pixel-crushed masonry, murky fog, dynamic shadows and spatially reverberant synth metal." },
  ],
  scene: { score: "SCORE", wave: "WAVE", combo: "FURY", heat: "HEAT", health: "VITAL", ammo: "AMMO", dash: "DASH READY", incoming: "INCOMING", overdrive: "OVERDRIVE", pointer: "CLICK TO ENTER THE CIRCUIT", paused: "PAUSED", fire: "FIRE", jump: "JUMP", dashButton: "DASH", swap: "SWAP", scattergun: "IRON SCATTERGUN", rocket: "GRAVE ROCKET", plasma: "VOID PLASMA" },
};
const COPY: Record<Locale, Copy> = {
  en: EN,
  ko: { ...EN, eyebrow: "지옥 회로 / 싱글플레이 아레나", title: "Infernal Velocity", subtitle: "버니홉과 에어 스트레이프, 방향 대시, 세 가지 레트로 퓨처 중화기로 끝없이 몰려드는 괴물을 돌파하세요. 속도가 곧 방어력입니다.", start: "봉인 파괴", again: "다시 강하", loading: "지옥 회로 점화 중…", unavailable: "이 브라우저에서는 WebGL을 사용할 수 없어 3D 아레나를 시작할 수 없습니다.", controls: "조작", desktop: "WASD 이동/공중 스트레이프 · Space 버니홉 · Shift 대시 · 좌클릭/F 사격 · E 무기 교체 · 마우스 조준", mobile: "방향 패드 · JUMP · DASH · FIRE · SWAP", local: "기기 내 악마 사냥", localBody: "괴물, 점수, 합성 음악은 이 탭에서만 실행됩니다. 계정·네트워크 상대·다운로드 음원이 없습니다.", best: "최고 점수", score: "점수", kills: "처치", wave: "웨이브", accuracy: "명중률", features: [{ title: "속도 전투", body: "버니홉으로 속도를 보존하고 공중 스트레이프와 방향 대시를 연결합니다." }, { title: "세 가지 중화기", body: "아이언 스캐터건, 광역 로켓 런처, 고속 플라즈마 캐스터를 즉시 교체합니다." }, { title: "절차형 지옥도", body: "픽셀 석조, 탁한 안개, 동적 그림자와 공간 리버브 합성 메탈." }], scene: { ...EN.scene, score: "점수", wave: "웨이브", combo: "격노", heat: "열기", health: "생명", dash: "대시 준비", pointer: "클릭하여 지옥 회로 진입", scattergun: "아이언 스캐터건", rocket: "그레이브 로켓", plasma: "보이드 플라즈마" } },
  ja: { ...EN, eyebrow: "地獄回路 / シングルプレイアリーナ", subtitle: "二段ジャンプと方向ダッシュ、3種のレトロ未来兵器で押し寄せる怪物を突破。速度こそ装甲です。", start: "封印を破る", again: "再降下", controls: "操作", desktop: "WASD 移動 · Space 二段ジャンプ · Shift ダッシュ · 左クリック/F 射撃 · E 武器切替", mobile: "方向パッド · JUMP×2 · DASH · FIRE · SWAP", local: "端末内デーモンハント", localBody: "敵・スコア・合成音楽はこのタブ内だけで動作。アカウントやオンライン対戦はありません。", best: "最高スコア", kills: "撃破", wave: "ウェーブ" },
  zh: { ...EN, eyebrow: "地狱回路 / 单人竞技场", subtitle: "用二段跳、方向冲刺和三种复古未来重武器冲破无尽怪潮。速度就是护甲。", start: "打破封印", again: "再次下潜", controls: "操作", desktop: "WASD 移动 · Space 二段跳 · Shift 冲刺 · 左键/F 射击 · E 切换武器", mobile: "方向键 · JUMP×2 · DASH · FIRE · SWAP", local: "设备内猎魔", localBody: "怪物、分数与合成音乐仅在本标签运行，无账号、网络对手或下载音频。", best: "最高分", kills: "击杀", wave: "波次" },
  fr: { ...EN, eyebrow: "CIRCUIT INFERNAL / ARÈNE SOLO", subtitle: "Traversez un sanctuaire de fer sans fin avec double saut, dash directionnel et trois armes rétrofuturistes. La vitesse est votre armure.", start: "Briser le sceau", again: "Redescendre", controls: "Commandes", desktop: "WASD bouger · Espace double saut · Shift dash · Clic/F tirer · E changer d'arme", mobile: "Pavé directionnel · JUMP×2 · DASH · FIRE · SWAP", local: "Chasse locale", localBody: "Monstres, score et musique synthétisée restent dans cet onglet. Aucun compte ni adversaire réseau.", best: "Meilleur score", kills: "Éliminations", wave: "Vague", accuracy: "Précision" },
  es: { ...EN, eyebrow: "CIRCUITO INFERNAL / ARENA INDIVIDUAL", subtitle: "Atraviesa un santuario de hierro infinito con doble salto, dash direccional y tres armas retrofuturistas. La velocidad es tu armadura.", start: "Romper el sello", again: "Descender de nuevo", controls: "Controles", desktop: "WASD mover · Espacio doble salto · Shift dash · Clic/F disparar · E cambiar arma", mobile: "Cruceta · JUMP×2 · DASH · FIRE · SWAP", local: "Caza local", localBody: "Monstruos, puntuación y música sintetizada funcionan solo en esta pestaña. Sin cuenta ni rival en red.", best: "Mejor puntuación", kills: "Bajas", wave: "Oleada", accuracy: "Precisión" },
};

function supportsWebgl() {
  if (typeof document === "undefined") return true;
  try { const canvas = document.createElement("canvas"); return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")); } catch { return false; }
}

export default function InfernalVelocity({ locale }: { locale: Locale }) {
  const t = COPY[locale] ?? EN;
  const [phase, setPhase] = useState<Phase>("briefing");
  const [best, setBest] = useState(0);
  const [available, setAvailable] = useState(true);
  const [result, setResult] = useState<InfernalResult | null>(null);
  useEffect(() => { setAvailable(supportsWebgl()); setBest(getBest(GAME_KEY)?.value ?? 0); }, []);
  const finish = useCallback((next: InfernalResult) => {
    const saved = recordBest(GAME_KEY, next.score, "score", JSON.stringify(next));
    setBest(saved.value); setResult(next); setPhase("result");
  }, []);

  if (phase === "playing") return <div className="not-prose relative left-1/2 my-6 w-[min(100vw-1rem,1440px)] -translate-x-1/2 overflow-hidden rounded-xl border border-red-950 bg-black shadow-[0_0_80px_rgba(160,20,0,.22)]"><div className="aspect-[16/10] min-h-[560px] max-h-[84vh]"><Suspense fallback={<div className="grid h-full place-items-center bg-black font-mono text-orange-400">{t.loading}</div>}><Scene copy={t.scene} onFinish={finish} /></Suspense></div></div>;

  return <section className="not-prose relative left-1/2 my-8 w-[min(100vw-1rem,1180px)] -translate-x-1/2 overflow-hidden rounded-3xl border border-red-950 bg-[#080102] text-white shadow-2xl">
    <div className="absolute inset-0 opacity-80 [background:radial-gradient(circle_at_75%_18%,rgba(255,70,0,.2),transparent_28%),repeating-linear-gradient(125deg,transparent_0_36px,rgba(255,50,0,.025)_37px_38px)]" />
    <div className="relative grid gap-9 p-6 sm:p-10 lg:grid-cols-[1.12fr_.88fr] lg:p-14">
      <div><p className="font-mono text-[11px] font-black tracking-[.28em] text-orange-500">{t.eyebrow}</p><h2 className="mt-4 text-5xl font-black uppercase leading-[.86] tracking-[-.055em] sm:text-7xl">{t.title}</h2><p className="mt-6 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">{t.subtitle}</p>
        <div className="mt-7 flex flex-wrap gap-3"><button disabled={!available} onClick={() => { setResult(null); setPhase("playing"); }} className="min-h-12 skew-x-[-5deg] bg-orange-500 px-8 py-3 text-sm font-black uppercase tracking-widest text-black shadow-[0_0_30px_rgba(249,115,22,.25)] disabled:opacity-40">{phase === "result" ? t.again : t.start}</button><span className="border border-white/10 bg-white/5 px-4 py-3 font-mono text-xs">{t.best}: <strong>{best.toLocaleString()}</strong></span></div>
        {!available && <p role="alert" className="mt-4 text-sm font-bold text-orange-300">{t.unavailable}</p>}
        {result && <dl role="status" aria-live="polite" className="mt-7 grid grid-cols-4 gap-2 border border-white/10 bg-black/40 p-4 text-center">{[[t.score, result.score], [t.kills, result.kills], [t.wave, result.wave], [t.accuracy, `${result.accuracy}%`]].map(([label, value]) => <div key={label}><dt className="text-[9px] font-bold uppercase text-zinc-500">{label}</dt><dd className="mt-1 font-mono text-lg font-black">{value}</dd></div>)}</dl>}
      </div>
      <div className="grid content-center gap-3">{t.features.map((feature, index) => { const Icon = [Gauge, Crosshair, Flame][index]; return <div key={feature.title} className="flex gap-4 border-l-2 border-orange-600 bg-white/[.04] p-4"><Icon className="size-5 shrink-0 text-orange-500" /><div><h3 className="text-sm font-black uppercase">{feature.title}</h3><p className="mt-1 text-xs leading-5 text-zinc-400">{feature.body}</p></div></div>; })}
        <div className="mt-2 border border-white/10 bg-black/40 p-4"><div className="flex items-center gap-2 text-xs font-black uppercase"><Skull className="size-4 text-red-500" />{t.local}</div><p className="mt-2 text-xs leading-5 text-zinc-500">{t.localBody}</p></div>
      </div>
    </div>
    <div className="relative grid gap-3 border-t border-white/10 bg-black/35 p-5 text-xs text-zinc-400 sm:grid-cols-2 sm:p-7"><div><strong className="mb-1 flex items-center gap-2 text-white"><Headphones className="size-4 text-orange-500" />{t.controls}</strong>{t.desktop}</div><div><strong className="mb-1 flex items-center gap-2 text-white"><Zap className="size-4 text-orange-500" />MOBILE</strong>{t.mobile}</div></div>
  </section>;
}

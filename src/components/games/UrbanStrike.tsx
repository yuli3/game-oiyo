import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Crosshair, Headphones, Radio, Shield, Smartphone, Target } from "lucide-react";
import type { Locale } from "../../lib/i18n";
import { getBest, recordBest } from "../../lib/games/records";
import { reviewUrbanStrikeResult } from "../../lib/games/urban-strike";
import type { MatchResult, UrbanStrikeSceneCopy } from "./UrbanStrikeScene";

const Scene = lazy(() => import("./UrbanStrikeScene"));
const GAME_KEY = "urban-strike";

type Phase = "briefing" | "loading" | "playing" | "result";

interface Copy {
  eyebrow: string;
  title: string;
  subtitle: string;
  start: string;
  again: string;
  loading: string;
  unavailable: string;
  controls: string;
  desktopControls: string;
  mobileControls: string;
  privateMatch: string;
  privateDescription: string;
  best: string;
  score: string;
  kills: string;
  deaths: string;
  accuracy: string;
  victory: string;
  defeat: string;
  draw: string;
  features: Array<{ title: string; body: string }>;
  scene: UrbanStrikeSceneCopy;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    eyebrow: "URBAN COMBAT / 6V6 SIMULATION",
    title: "Urban Strike",
    subtitle: "전술 도심에서 펼쳐지는 120초 팀 데스매치. 정밀 히트스캔, 학습 가능한 반동, ADS와 빠른 이동을 하나의 브라우저 FPS로 구현했습니다.",
    start: "작전 투입",
    again: "재배치",
    loading: "전장을 배치하는 중…",
    unavailable: "이 브라우저에서는 WebGL을 사용할 수 없어 3D 작전을 시작할 수 없습니다.",
    controls: "조작",
    desktopControls: "WASD 이동 · Shift 전력질주 · 우클릭 ADS · 좌클릭/F 사격 · R 재장전 · 1/2/3 무기 · Space 점프 · C 앉기",
    mobileControls: "왼쪽 스틱 이동 · 화면 드래그 조준 · FIRE 사격 · ADS 조준 · ↥ 점프 · R 재장전",
    privateMatch: "프라이빗 봇 매치",
    privateDescription: "실제 온라인 플레이어나 계정 없이, 기기 안에서만 5명의 아군과 6명의 적군을 시뮬레이션합니다.",
    best: "최고 점수",
    score: "점수",
    kills: "처치",
    deaths: "사망",
    accuracy: "명중률",
    victory: "승리",
    defeat: "패배",
    draw: "무승부",
    features: [
      { title: "정밀 건플레이", body: "M4·AK·MP5의 탄도, 거리 감쇠, 탄창과 고유 반동 패턴" },
      { title: "전술적 움직임", body: "스프린트·점프·앉기·ADS와 이동 중 탄퍼짐 변화" },
      { title: "절차형 전장", body: "PBR 콘크리트·아스팔트·금속, 동적 조명과 공간 오디오" },
    ],
    scene: {
      blue: "BLUE", red: "RED", score: "점수", ammo: "탄약", reserve: "예비", health: "체력", armor: "방탄",
      objective: "B 거점", capture: "점령 중", contested: "경합", hold: "거점을 확보하세요",
      reload: "재장전", respawn: "재배치", headshot: "헤드샷", eliminated: "처치",
      assist: "지원", pointer: "전장을 클릭해 마우스를 고정하세요", paused: "클릭하여 작전 복귀",
      m4: "M4A1 카빈", ak: "AK-12 라이플", mp5: "MP5 전술형",
      fire: "FIRE", ads: "ADS", jump: "↥", crouch: "C", weapon: "무기", sound: "소리",
    },
  },
  en: {
    eyebrow: "URBAN COMBAT / 6V6 SIMULATION",
    title: "Urban Strike",
    subtitle: "A 120-second team deathmatch in a tactical city block, with exact hit-scan, learnable recoil, ADS and high-speed movement in one browser FPS.",
    start: "Deploy",
    again: "Redeploy",
    loading: "Deploying the combat zone…",
    unavailable: "WebGL is unavailable in this browser, so the 3D operation cannot start.",
    controls: "Controls",
    desktopControls: "WASD move · Shift sprint · Right click ADS · Left click/F fire · R reload · 1/2/3 weapons · Space jump · C crouch",
    mobileControls: "Left stick to move · drag to aim · FIRE to shoot · ADS to aim · ↥ jump · R reload",
    privateMatch: "Private bot match",
    privateDescription: "Five allies and six opponents are simulated on this device only. No real online players or account.",
    best: "Best score",
    score: "Score",
    kills: "Kills",
    deaths: "Deaths",
    accuracy: "Accuracy",
    victory: "Victory",
    defeat: "Defeat",
    draw: "Draw",
    features: [
      { title: "Precise gunplay", body: "M4, AK and MP5 ballistics, falloff, magazines and authored recoil patterns" },
      { title: "Tactical movement", body: "Sprint, jump, crouch and ADS with movement-dependent weapon spread" },
      { title: "Procedural battlefield", body: "PBR concrete, asphalt and metal with dynamic lights and spatial audio" },
    ],
    scene: {
      blue: "BLUE", red: "RED", score: "SCORE", ammo: "AMMO", reserve: "RESERVE", health: "HEALTH", armor: "ARMOR",
      objective: "SITE B", capture: "CAPTURING", contested: "CONTESTED", hold: "SECURE THE HARDPOINT",
      reload: "RELOADING", respawn: "RESPAWNING", headshot: "HEADSHOT", eliminated: "ELIMINATED",
      assist: "ASSIST", pointer: "Click the battlefield to lock your mouse", paused: "CLICK TO RETURN TO COMBAT",
      m4: "M4A1 CARBINE", ak: "AK-12 RIFLE", mp5: "MP5 TACTICAL",
      fire: "FIRE", ads: "ADS", jump: "↥", crouch: "C", weapon: "WEAPON", sound: "Sound",
    },
  },
  ja: {
    eyebrow: "URBAN COMBAT / 6V6 SIMULATION",
    title: "Urban Strike",
    subtitle: "戦術都市区画で戦う120秒のチームデスマッチ。精密ヒットスキャン、学習できる反動、ADS、高速移動を一つのブラウザFPSに。",
    start: "作戦投入",
    again: "再配置",
    loading: "戦闘区域を展開中…",
    unavailable: "このブラウザではWebGLが利用できないため、3D作戦を開始できません。",
    controls: "操作",
    desktopControls: "WASD 移動 · Shift ダッシュ · 右クリック ADS · 左クリック/F 射撃 · R リロード · 1/2/3 武器 · Space ジャンプ · C しゃがみ",
    mobileControls: "左スティック移動 · ドラッグ照準 · FIRE射撃 · ADS照準 · ↥ジャンプ · Rリロード",
    privateMatch: "プライベートBOTマッチ",
    privateDescription: "実際のオンラインプレイヤーやアカウントなしで、端末内だけで味方5人と敵6人をシミュレートします。",
    best: "最高スコア",
    score: "スコア",
    kills: "キル",
    deaths: "デス",
    accuracy: "命中率",
    victory: "勝利",
    defeat: "敗北",
    draw: "引き分け",
    features: [
      { title: "精密ガンプレイ", body: "M4・AK・MP5の弾道、距離減衰、弾倉、固有反動パターン" },
      { title: "戦術的移動", body: "ダッシュ・ジャンプ・しゃがみ・ADSと移動時の拡散変化" },
      { title: "プロシージャル戦場", body: "PBRコンクリート・アスファルト・金属、動的照明と空間音響" },
    ],
    scene: {
      blue: "BLUE", red: "RED", score: "スコア", ammo: "弾薬", reserve: "予備", health: "体力", armor: "アーマー",
      objective: "B拠点", capture: "確保中", contested: "交戦中", hold: "拠点を確保せよ",
      reload: "リロード", respawn: "再配置", headshot: "ヘッドショット", eliminated: "キル",
      assist: "アシスト", pointer: "戦場をクリックしてマウスを固定", paused: "クリックして戦闘に復帰",
      m4: "M4A1 カービン", ak: "AK-12 ライフル", mp5: "MP5 タクティカル",
      fire: "FIRE", ads: "ADS", jump: "↥", crouch: "C", weapon: "武器", sound: "音",
    },
  },
  zh: {
    eyebrow: "URBAN COMBAT / 6V6 SIMULATION",
    title: "Urban Strike",
    subtitle: "在战术街区展开120秒团队死斗，以精准命中扫描、可学习后坐力、ADS和高速移动打造浏览器FPS。",
    start: "投入作战",
    again: "重新部署",
    loading: "正在部署战区…",
    unavailable: "此浏览器无法使用 WebGL，不能启动 3D 作战。",
    controls: "操作",
    desktopControls: "WASD 移动 · Shift 冲刺 · 右键 ADS · 左键/F射击 · R 换弹 · 1/2/3 武器 · Space 跳跃 · C 蹲下",
    mobileControls: "左摇杆移动 · 拖动瞄准 · FIRE射击 · ADS瞄准 · ↥跳跃 · R换弹",
    privateMatch: "私人机器人对局",
    privateDescription: "仅在本设备模拟5名队友和6名敌人，无真实在线玩家或账号。",
    best: "最高分",
    score: "得分",
    kills: "击杀",
    deaths: "阵亡",
    accuracy: "命中率",
    victory: "胜利",
    defeat: "失败",
    draw: "平局",
    features: [
      { title: "精准枪感", body: "M4、AK、MP5的弹道、距离衰减、弹匣与专属后坐力" },
      { title: "战术移动", body: "冲刺、跳跃、蹲下、ADS与移动散布变化" },
      { title: "程序化战场", body: "PBR混凝土、沥青、金属，动态灯光与空间音频" },
    ],
    scene: {
      blue: "BLUE", red: "RED", score: "得分", ammo: "弹药", reserve: "备弹", health: "生命", armor: "护甲",
      objective: "B点", capture: "占领中", contested: "争夺中", hold: "控制据点",
      reload: "换弹中", respawn: "重新部署", headshot: "爆头", eliminated: "击杀",
      assist: "助攻", pointer: "点击战场锁定鼠标", paused: "点击返回战斗",
      m4: "M4A1 卡宾枪", ak: "AK-12 步枪", mp5: "MP5 战术型",
      fire: "FIRE", ads: "ADS", jump: "↥", crouch: "C", weapon: "武器", sound: "声音",
    },
  },
  fr: {
    eyebrow: "URBAN COMBAT / 6V6 SIMULATION",
    title: "Urban Strike",
    subtitle: "Un match à mort de 120 secondes dans un quartier tactique : hit-scan précis, recul maîtrisable, ADS et déplacements rapides dans un FPS navigateur.",
    start: "Déployer",
    again: "Redéployer",
    loading: "Déploiement de la zone de combat…",
    unavailable: "WebGL n'est pas disponible dans ce navigateur : l'opération 3D ne peut pas démarrer.",
    controls: "Commandes",
    desktopControls: "WASD déplacement · Shift sprint · Clic droit ADS · Clic gauche/F tirer · R recharger · 1/2/3 armes · Espace sauter · C s'accroupir",
    mobileControls: "Stick gauche pour bouger · glisser pour viser · FIRE tirer · ADS viser · ↥ sauter · R recharger",
    privateMatch: "Match privé contre bots",
    privateDescription: "Cinq alliés et six adversaires sont simulés uniquement sur cet appareil. Aucun joueur réel ni compte.",
    best: "Meilleur score",
    score: "Score",
    kills: "Éliminations",
    deaths: "Morts",
    accuracy: "Précision",
    victory: "Victoire",
    defeat: "Défaite",
    draw: "Égalité",
    features: [
      { title: "Gunplay précis", body: "Balistique M4, AK et MP5, portée, chargeurs et profils de recul dédiés" },
      { title: "Mouvement tactique", body: "Sprint, saut, accroupissement et ADS avec dispersion dynamique" },
      { title: "Champ de bataille procédural", body: "Béton, asphalte et métal PBR, éclairage dynamique et audio spatial" },
    ],
    scene: {
      blue: "BLUE", red: "RED", score: "SCORE", ammo: "MUNITIONS", reserve: "RÉSERVE", health: "SANTÉ", armor: "ARMURE",
      objective: "SITE B", capture: "CAPTURE", contested: "CONTESTÉ", hold: "SÉCURISEZ LE POINT",
      reload: "RECHARGEMENT", respawn: "RÉAPPARITION", headshot: "TIR À LA TÊTE", eliminated: "ÉLIMINÉ",
      assist: "ASSISTANCE", pointer: "Cliquez sur le champ de bataille pour verrouiller la souris", paused: "CLIQUEZ POUR REPRENDRE",
      m4: "CARABINE M4A1", ak: "FUSIL AK-12", mp5: "MP5 TACTIQUE",
      fire: "FIRE", ads: "ADS", jump: "↥", crouch: "C", weapon: "ARME", sound: "Son",
    },
  },
  es: {
    eyebrow: "URBAN COMBAT / 6V6 SIMULATION",
    title: "Urban Strike",
    subtitle: "Combate a muerte por equipos de 120 segundos en un distrito táctico, con hit-scan preciso, retroceso aprendible, ADS y movimiento veloz.",
    start: "Desplegar",
    again: "Redesplegar",
    loading: "Desplegando la zona de combate…",
    unavailable: "WebGL no está disponible en este navegador, por lo que no se puede iniciar la operación 3D.",
    controls: "Controles",
    desktopControls: "WASD mover · Shift esprintar · Clic derecho ADS · Clic izquierdo/F disparar · R recargar · 1/2/3 armas · Espacio saltar · C agacharse",
    mobileControls: "Stick izquierdo para mover · arrastra para apuntar · FIRE dispara · ADS apunta · ↥ salta · R recarga",
    privateMatch: "Partida privada con bots",
    privateDescription: "Cinco aliados y seis rivales se simulan solo en este dispositivo. Sin jugadores reales ni cuenta.",
    best: "Mejor puntuación",
    score: "Puntuación",
    kills: "Bajas",
    deaths: "Muertes",
    accuracy: "Precisión",
    victory: "Victoria",
    defeat: "Derrota",
    draw: "Empate",
    features: [
      { title: "Gunplay preciso", body: "Balística M4, AK y MP5, caída por distancia, cargadores y retroceso propio" },
      { title: "Movimiento táctico", body: "Sprint, salto, agacharse y ADS con dispersión según el movimiento" },
      { title: "Campo de batalla procedural", body: "Hormigón, asfalto y metal PBR, luces dinámicas y audio espacial" },
    ],
    scene: {
      blue: "BLUE", red: "RED", score: "PUNTOS", ammo: "MUNICIÓN", reserve: "RESERVA", health: "SALUD", armor: "BLINDAJE",
      objective: "SITIO B", capture: "CAPTURANDO", contested: "EN DISPUTA", hold: "ASEGURA EL PUNTO",
      reload: "RECARGANDO", respawn: "REAPARECIENDO", headshot: "TIRO A LA CABEZA", eliminated: "ELIMINADO",
      assist: "ASISTENCIA", pointer: "Haz clic en el campo para fijar el ratón", paused: "HAZ CLIC PARA VOLVER",
      m4: "CARABINA M4A1", ak: "RIFLE AK-12", mp5: "MP5 TÁCTICO",
      fire: "FIRE", ads: "ADS", jump: "↥", crouch: "C", weapon: "ARMA", sound: "Sonido",
    },
  },
};

function supportsWebgl(): boolean {
  if (typeof document === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function UrbanStrike({ locale }: { locale: Locale }) {
  const t = COPY[locale] ?? COPY.en;
  const [phase, setPhase] = useState<Phase>("briefing");
  const [best, setBest] = useState(0);
  const [available, setAvailable] = useState(true);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setAvailable(supportsWebgl());
    setBest(getBest(GAME_KEY)?.value ?? 0);
  }, []);

  const begin = useCallback(() => {
    if (!available) return;
    setPhase("loading");
    setResult(null);
    window.setTimeout(() => setPhase("playing"), 60);
  }, [available]);

  const finish = useCallback((next: MatchResult) => {
    const saved = recordBest(GAME_KEY, next.score, "score", JSON.stringify({
      kills: next.kills,
      deaths: next.deaths,
      accuracy: next.accuracy,
      won: next.blueScore > next.redScore,
    }));
    setBest(saved.value);
    setResult(next);
    setPhase("result");
  }, []);

  if (phase === "playing" || phase === "loading") {
    return (
      <div className="not-prose relative left-1/2 my-6 w-[min(100vw-1rem,1440px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-800 bg-[#07090c] shadow-2xl">
        <div className="aspect-[16/10] min-h-[560px] max-h-[82vh] w-full">
          <Suspense fallback={<Loading label={t.loading} />}>
            {phase === "playing" ? (
              <Scene copy={t.scene} onFinish={finish} muted={muted} onToggleMute={() => setMuted((value) => !value)} />
            ) : (
              <Loading label={t.loading} />
            )}
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <section className="not-prose relative left-1/2 my-8 w-[min(100vw-1rem,1180px)] -translate-x-1/2 overflow-hidden rounded-[2rem] border border-slate-800 bg-[#0a0d10] text-white shadow-2xl">
      <div className="absolute inset-0 opacity-70 [background:radial-gradient(circle_at_72%_20%,rgba(245,158,11,.16),transparent_28%),linear-gradient(135deg,transparent_45%,rgba(132,204,22,.08))]" />
      <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.15fr_.85fr] lg:p-14">
        <div>
          <p className="font-mono text-[11px] font-bold tracking-[.28em] text-lime-400">{t.eyebrow}</p>
          <h2 className="mt-4 text-4xl font-black uppercase tracking-[-.04em] sm:text-6xl">{t.title}</h2>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">{t.subtitle}</p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={begin}
              disabled={!available}
              className="min-h-12 rounded-xl bg-lime-400 px-8 py-3 text-sm font-black uppercase tracking-widest text-slate-950 shadow-[0_0_28px_rgba(163,230,53,.2)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {phase === "result" ? t.again : t.start}
            </button>
            <span className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-xs text-slate-300">
              {t.best}: <strong className="text-white">{best.toLocaleString()}</strong>
            </span>
          </div>

          {!available && <p role="alert" className="mt-4 text-sm font-bold text-amber-300">{t.unavailable}</p>}

          {result && (
            <div className="mt-7 rounded-2xl border border-white/10 bg-black/35 p-5">
              <div className={`text-xl font-black uppercase tracking-widest ${result.blueScore > result.redScore ? "text-lime-300" : result.blueScore < result.redScore ? "text-red-300" : "text-white"}`}>
                {result.blueScore > result.redScore ? t.victory : result.blueScore < result.redScore ? t.defeat : t.draw}
                <span className="ml-3 font-mono text-white">{result.blueScore} — {result.redScore}</span>
              </div>
              <dl className="mt-4 grid grid-cols-4 gap-3 text-center">
                {[
                  [t.score, result.score.toLocaleString()],
                  [t.kills, result.kills],
                  [t.deaths, result.deaths],
                  [t.accuracy, `${result.accuracy}%`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-white/5 p-3">
                    <dt className="text-[10px] font-bold uppercase text-slate-400">{label}</dt>
                    <dd className="mt-1 font-mono text-lg font-black">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-center text-xs font-black uppercase tracking-widest text-amber-300">
                → {reviewUrbanStrikeResult(result) === "aim" ? t.accuracy : reviewUrbanStrikeResult(result) === "survival" ? t.deaths : t.scene.objective}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-5">
          <div className="grid gap-3">
            {t.features.map((feature, index) => {
              const Icon = [Crosshair, Shield, Headphones][index];
              return (
                <div key={feature.title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[.045] p-4">
                  <Icon className="mt-0.5 size-5 shrink-0 text-lime-400" aria-hidden="true" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide">{feature.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{feature.body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[.06] p-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-300">
              <Radio className="size-4" aria-hidden="true" /> {t.privateMatch}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">{t.privateDescription}</p>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10 bg-black/25 px-6 py-5 sm:px-10">
        <h3 className="text-xs font-black uppercase tracking-[.2em] text-slate-400">{t.controls}</h3>
        <div className="mt-3 grid gap-3 text-xs text-slate-300 md:grid-cols-2">
          <p className="flex gap-2"><Target className="size-4 shrink-0 text-lime-400" aria-hidden="true" /> {t.desktopControls}</p>
          <p className="flex gap-2"><Smartphone className="size-4 shrink-0 text-lime-400" aria-hidden="true" /> {t.mobileControls}</p>
        </div>
      </div>
    </section>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[560px] flex-col items-center justify-center gap-4 bg-[#07090c] text-white">
      <div className="size-11 animate-spin rounded-full border-2 border-white/15 border-t-lime-400 motion-reduce:animate-none" />
      <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-slate-400">{label}</p>
    </div>
  );
}

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { CloudSun, Gauge, Headphones, Mountain, Plane, Wind } from "lucide-react";
import type { Locale } from "../../lib/i18n";
import { getBest, recordBest } from "../../lib/games/records";
import type { FlightResult, SkywardSceneCopy } from "./SkywardAtlasScene";

const Scene = lazy(() => import("./SkywardAtlasScene"));
const GAME_KEY = "skyward-atlas";
type Phase = "briefing" | "loading" | "playing" | "result";

interface Copy {
  title: string; subtitle: string; start: string; again: string; loading: string;
  unavailable: string; best: string; score: string; result: string; controls: string;
  keys: string; touch: string; disclaimer: string;
  features: Array<{ title: string; body: string }>;
  scene: SkywardSceneCopy;
}

const sceneEn: SkywardSceneCopy = {
  altitude: "ALT", speed: "IAS", verticalSpeed: "V/S", heading: "HDG", throttle: "THR",
  fuel: "FUEL", gate: "GATES", cockpit: "COCKPIT", chase: "CHASE", soundOn: "AUDIO ON",
  soundOff: "AUDIO OFF", stall: "STALL — LOWER NOSE", terrain: "TERRAIN", time: "TIME",
  end: "END FLIGHT", cameraHint: "C changes view · drag to look around",
};
const localScenes: Partial<Record<Locale, SkywardSceneCopy>> = {
  ko: { ...sceneEn, altitude: "고도", speed: "대기속도", verticalSpeed: "승강률", heading: "방위", throttle: "출력", fuel: "연료", gate: "게이트", cockpit: "조종석", chase: "추적", soundOn: "오디오 켜짐", soundOff: "오디오 꺼짐", stall: "실속 — 기수를 내리세요", terrain: "지형", time: "시간", end: "비행 종료", cameraHint: "C 시점 전환 · 드래그로 둘러보기" },
  ja: { ...sceneEn, altitude: "高度", speed: "対気速度", verticalSpeed: "昇降率", heading: "方位", throttle: "出力", fuel: "燃料", gate: "ゲート", cockpit: "操縦席", chase: "追跡", soundOn: "音声 ON", soundOff: "音声 OFF", stall: "失速 — 機首を下げて", terrain: "地形", time: "時間", end: "飛行終了", cameraHint: "C 視点切替 · ドラッグで見回す" },
  zh: { ...sceneEn, altitude: "高度", speed: "空速", verticalSpeed: "升降率", heading: "航向", throttle: "推力", fuel: "燃油", gate: "航门", cockpit: "驾驶舱", chase: "追随", soundOn: "音效开启", soundOff: "音效关闭", stall: "失速 — 压低机头", terrain: "地形", time: "时间", end: "结束飞行", cameraHint: "C 切换视角 · 拖动环顾" },
  fr: { ...sceneEn, altitude: "ALT", speed: "VITESSE", verticalSpeed: "V/S", heading: "CAP", throttle: "GAZ", fuel: "CARB", gate: "PORTES", cockpit: "COCKPIT", chase: "SUIVI", soundOn: "AUDIO ON", soundOff: "AUDIO OFF", stall: "DÉCROCHAGE — PIQUEZ", terrain: "RELIEF", time: "TEMPS", end: "FIN DU VOL", cameraHint: "C change la vue · glisser pour regarder" },
  es: { ...sceneEn, altitude: "ALT", speed: "VELOCIDAD", verticalSpeed: "V/S", heading: "RUMBO", throttle: "POT", fuel: "COMB", gate: "PUERTAS", cockpit: "CABINA", chase: "SEGUIMIENTO", soundOn: "AUDIO SÍ", soundOff: "AUDIO NO", stall: "PÉRDIDA — BAJA EL MORRO", terrain: "TERRENO", time: "TIEMPO", end: "FIN DEL VUELO", cameraHint: "C cambia vista · arrastra para mirar" },
};

const COPY: Record<Locale, Copy> = {
  en: {
    title: "Skyward Atlas", subtitle: "Fly a responsive twin-prop through a living alpine atmosphere. Read the wind, skim cloud banks and thread mountain gates as daylight turns to night.",
    start: "Start engine", again: "Fly again", loading: "Building atmosphere and terrain…", unavailable: "WebGL is unavailable in this browser.",
    best: "Best flight", score: "Flight score", result: "Flight log", controls: "Flight controls",
    keys: "W/S pitch · A/D roll · Q/E yaw · ↑/↓ throttle · C view · drag camera",
    touch: "Use the on-screen yoke, rudder and throttle controls.",
    disclaimer: "Original browser entertainment — not for real flight training or navigation.",
    features: [
      { title: "Aerodynamic flight", body: "Lift, drag, density, stalls, coordinated bank turns and wind drift" },
      { title: "Living atmosphere", body: "Layered volumetric cloud shader, distance fog and a complete day–night cycle" },
      { title: "Procedural world", body: "Heightmap mountains, lakes, forests, runway lights and changing sun shadows" },
    ], scene: sceneEn,
  },
  ko: {} as Copy, ja: {} as Copy, zh: {} as Copy, fr: {} as Copy, es: {} as Copy,
};

const translated: Record<Exclude<Locale, "en">, Pick<Copy, "subtitle"|"start"|"again"|"loading"|"unavailable"|"best"|"score"|"result"|"controls"|"keys"|"touch"|"disclaimer"|"features">> = {
  ko: { subtitle: "반응성 좋은 쌍발 프로펠러기로 살아 움직이는 알프스 대기를 비행하세요. 바람을 읽고 구름층을 스치며 낮이 밤으로 바뀌는 산악 게이트를 통과하세요.", start: "엔진 시동", again: "다시 비행", loading: "대기와 지형을 생성하는 중…", unavailable: "이 브라우저에서는 WebGL을 사용할 수 없습니다.", best: "최고 비행", score: "비행 점수", result: "비행 일지", controls: "비행 조작", keys: "W/S 피치 · A/D 롤 · Q/E 요 · ↑/↓ 출력 · C 시점 · 드래그 카메라", touch: "화면의 조종간·러더·스로틀을 사용하세요.", disclaimer: "오리지널 브라우저 엔터테인먼트이며 실제 비행 훈련·항법용이 아닙니다.", features: [{ title: "공기역학 비행", body: "양력·항력·대기 밀도·실속·선회·바람 편류" }, { title: "살아 있는 대기", body: "다층 볼류메트릭 구름 셰이더·거리 안개·낮밤 순환" }, { title: "절차형 세계", body: "높이맵 산맥·호수·숲·활주로 조명·태양 그림자" }] },
  ja: { subtitle: "反応性に優れた双発プロペラ機で、生きたアルプスの大気を飛行。風を読み、雲をかすめ、昼から夜へ変わる山岳ゲートを抜けよう。", start: "エンジン始動", again: "もう一度飛ぶ", loading: "大気と地形を生成中…", unavailable: "このブラウザではWebGLを利用できません。", best: "ベストフライト", score: "飛行スコア", result: "フライトログ", controls: "操縦方法", keys: "W/S ピッチ · A/D ロール · Q/E ヨー · ↑/↓ 出力 · C 視点", touch: "画面の操縦桿・ラダー・スロットルを使用。", disclaimer: "オリジナルのブラウザ娯楽作品。実際の飛行訓練・航法には使用できません。", features: [{ title: "空力飛行", body: "揚力・抗力・大気密度・失速・旋回・風偏流" }, { title: "生きた大気", body: "多層雲シェーダー、遠景霧、昼夜サイクル" }, { title: "生成世界", body: "山岳ハイトマップ、湖、森林、滑走路灯、太陽影" }] },
  zh: { subtitle: "驾驶灵敏的双发螺旋桨飞机穿越鲜活的高山大气。研判风向，掠过云层，在昼夜交替中穿越山间航门。", start: "启动引擎", again: "再次飞行", loading: "正在生成大气与地形…", unavailable: "此浏览器无法使用 WebGL。", best: "最佳飞行", score: "飞行得分", result: "飞行日志", controls: "飞行操作", keys: "W/S俯仰 · A/D横滚 · Q/E偏航 · ↑/↓推力 · C视角", touch: "使用屏幕操纵杆、方向舵和油门。", disclaimer: "原创浏览器娱乐作品，不可用于真实飞行训练或导航。", features: [{ title: "空气动力飞行", body: "升力、阻力、密度、失速、协调转弯与风偏" }, { title: "鲜活大气", body: "多层体积云着色器、远景雾与昼夜循环" }, { title: "程序世界", body: "高度图山脉、湖泊、森林、跑道灯与日照阴影" }] },
  fr: { subtitle: "Pilotez un bimoteur réactif dans une atmosphère alpine vivante. Lisez le vent, frôlez les nuages et traversez les portes tandis que le jour devient nuit.", start: "Démarrer", again: "Revoler", loading: "Création de l'atmosphère et du relief…", unavailable: "WebGL n'est pas disponible.", best: "Meilleur vol", score: "Score", result: "Journal de vol", controls: "Commandes", keys: "Z/S tangage · Q/D roulis · A/E lacet · ↑/↓ gaz · C vue", touch: "Utilisez le manche, le palonnier et les gaz à l'écran.", disclaimer: "Divertissement original — pas destiné à la formation ou navigation réelle.", features: [{ title: "Vol aérodynamique", body: "Portance, traînée, densité, décrochage, virages et dérive" }, { title: "Atmosphère vivante", body: "Nuages multicouches, brume et cycle jour-nuit" }, { title: "Monde procédural", body: "Montagnes, lacs, forêts, piste éclairée et ombres solaires" }] },
  es: { subtitle: "Pilota un bimotor de hélice por una atmósfera alpina viva. Lee el viento, roza las nubes y atraviesa puertas mientras el día se convierte en noche.", start: "Arrancar motor", again: "Volar de nuevo", loading: "Creando atmósfera y terreno…", unavailable: "WebGL no está disponible.", best: "Mejor vuelo", score: "Puntuación", result: "Registro de vuelo", controls: "Controles", keys: "W/S cabeceo · A/D alabeo · Q/E guiñada · ↑/↓ potencia · C vista", touch: "Usa la palanca, el timón y el acelerador en pantalla.", disclaimer: "Entretenimiento original; no sirve para entrenamiento ni navegación real.", features: [{ title: "Vuelo aerodinámico", body: "Sustentación, resistencia, densidad, pérdida, virajes y deriva" }, { title: "Atmósfera viva", body: "Nubes multicapa, niebla y ciclo día-noche" }, { title: "Mundo procedural", body: "Montañas, lagos, bosques, pista iluminada y sombras solares" }] },
};
for (const locale of ["ko", "ja", "zh", "fr", "es"] as const) {
  COPY[locale] = { ...COPY.en, ...translated[locale], title: "Skyward Atlas", scene: localScenes[locale] ?? sceneEn };
}

export default function SkywardAtlas({ locale }: { locale: Locale }) {
  const copy = COPY[locale] ?? COPY.en;
  const [phase, setPhase] = useState<Phase>("briefing");
  const [best, setBest] = useState(0);
  const [result, setResult] = useState<FlightResult | null>(null);
  const [audio, setAudio] = useState(true);
  const audioRef = useRef<AudioContext | null>(null);
  useEffect(() => { setBest(getBest(GAME_KEY)?.value ?? 0); }, []);
  const start = useCallback(() => {
    try {
      const canvas = document.createElement("canvas");
      if (!canvas.getContext("webgl2") && !canvas.getContext("webgl")) { setPhase("briefing"); alert(copy.unavailable); return; }
      setPhase("loading");
      window.setTimeout(() => setPhase("playing"), 80);
    } catch { setPhase("briefing"); }
  }, [copy.unavailable]);
  const finish = useCallback((next: FlightResult) => {
    setResult(next); recordBest(GAME_KEY, next.score, "score"); setBest(getBest(GAME_KEY)?.value ?? next.score); setPhase("result");
  }, []);
  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[#f4f0e7] shadow-xl">
      {phase === "playing" ? (
        <Suspense fallback={<div className="grid min-h-[70vh] place-items-center">{copy.loading}</div>}>
          <Scene copy={copy.scene} audioEnabled={audio} onToggleAudio={() => setAudio(v => !v)} onFinish={finish} audioRef={audioRef} />
        </Suspense>
      ) : (
        <div className="relative isolate min-h-[680px] overflow-hidden p-6 sm:p-12">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_12%,#fff_0,transparent_35%),linear-gradient(145deg,#d8e8e6,#f6f0e1_55%,#c8b68f)]" />
          <div className="mx-auto max-w-5xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-900/15 bg-white/70 px-4 py-2 text-xs font-bold tracking-[.18em]"><Plane size={16}/> ALPINE FLIGHT / ORIGINAL</div>
            <h2 className="max-w-3xl text-5xl font-black tracking-[-.05em] text-slate-900 sm:text-7xl">{copy.title}</h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">{copy.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={phase === "result" ? start : start} className="rounded-full bg-slate-900 px-7 py-4 font-bold text-white shadow-lg hover:bg-slate-700">{phase === "result" ? copy.again : copy.start}</button>
              <div className="rounded-full border border-slate-300 bg-white/70 px-6 py-4 font-semibold">{copy.best}: {best.toLocaleString()}</div>
            </div>
            {result && <div role="status" aria-live="polite" className="mt-6 max-w-md rounded-3xl bg-white/75 p-6 backdrop-blur"><div className="text-sm font-bold uppercase tracking-widest">{copy.result}</div><div className="mt-2 text-4xl font-black">{result.score.toLocaleString()}</div><div className="mt-2 text-sm text-slate-600">{result.gates} gates · {Math.round(result.distance / 1000)} km</div></div>}
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {[Gauge, CloudSun, Mountain].map((Icon, index) => <article key={copy.features[index].title} className="rounded-3xl border border-white bg-white/60 p-6 backdrop-blur"><Icon className="mb-5" /><h2 className="font-black">{copy.features[index].title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{copy.features[index].body}</p></article>)}
            </div>
            <div className="mt-8 grid gap-4 rounded-3xl bg-slate-900 p-6 text-white sm:grid-cols-[1fr_auto]">
              <div><h2 className="flex items-center gap-2 font-bold"><Wind size={18}/>{copy.controls}</h2><p className="mt-2 text-sm text-slate-300">{copy.keys}</p><p className="mt-1 text-sm text-slate-400">{copy.touch}</p></div>
              <Headphones className="self-center text-slate-400"/>
            </div>
            <p className="mt-5 text-xs text-slate-500">{copy.disclaimer}</p>
          </div>
        </div>
      )}
    </section>
  );
}

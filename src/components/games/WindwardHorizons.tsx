import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { Compass, Map, Music2, PackageOpen, Waves, Wind } from "lucide-react";
import { useThrottle } from "../../hooks/_oiyo-shared/useThrottle";
import type { Locale } from "../../lib/i18n";
import { getBest, recordBest } from "../../lib/games/records";
import { WindwardScore } from "../../lib/games/windward-score";
import type { VoyageResult, WindwardSceneCopy } from "./WindwardHorizonsScene";

const Scene = lazy(() => import("./WindwardHorizonsScene"));
const GAME_KEY = "windward-horizons";

type Phase = "briefing" | "loading" | "playing" | "result";

interface Copy {
  eyebrow: string;
  title: string;
  subtitle: string;
  start: string;
  again: string;
  loading: string;
  unavailable: string;
  best: string;
  score: string;
  resultTitle: string;
  gold: string;
  tradeProfit: string;
  ports: string;
  discoveries: string;
  controls: string;
  desktopControls: string;
  mobileControls: string;
  originalScore: string;
  localOnly: string;
  features: Array<{ title: string; body: string }>;
  scene: WindwardSceneCopy;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    eyebrow: "OPEN-OCEAN VOYAGE / ORIGINAL BROWSER GAME",
    title: "Windward Horizons",
    subtitle: "바람을 읽고 돛을 조절해 다섯 항구를 잇는 자유 항해. 변화하는 시세를 이용해 교역하고, 안개 너머 잊힌 해상 표식을 발견하세요.",
    start: "출항하기",
    again: "새 항해",
    loading: "바다와 무역로를 펼치는 중…",
    unavailable: "이 브라우저에서는 WebGL을 사용할 수 없어 3D 항해를 시작할 수 없습니다.",
    best: "최고 항해 점수",
    score: "항해 점수",
    resultTitle: "항해일지 완료",
    gold: "보유 금화",
    tradeProfit: "교역 손익",
    ports: "방문 항구",
    discoveries: "발견",
    controls: "조타법",
    desktopControls: "W/S 돛 조절 · A/D 또는 ←/→ 조타 · 드래그 시점 · 휠 줌 · F 입항",
    mobileControls: "왼쪽 키 조타 · SAIL ± 돛 조절 · 화면 드래그 시점 · 입항 버튼",
    originalScore: "클릭 후 기기에서 합성되는 오리지널 관현악",
    localOnly: "계정·서버 저장 없이 이 브라우저에서만 플레이",
    features: [
      { title: "살아 있는 바다", body: "다중 파도 변위, 물마루 포말, 선체 항적, 시간대별 반사색" },
      { title: "클래식 범선", body: "선체·갑판·포문·마스트·리깅과 바람에 부푸는 움직이는 돛" },
      { title: "항해와 교역", body: "풍향에 따른 속력, 다섯 항구의 일일 시세, 30칸 화물창" },
    ],
    scene: {
      voyage: "항해", time: "남은 시간", gold: "금화", cargo: "화물", speed: "속력", knots: "노트",
      sails: "돛", wind: "바람", dock: "입항", slowToDock: "돛을 줄여 속력을 낮추세요", near: "가까운 항구",
      endVoyage: "항해 종료", soundOn: "음악 켜짐", soundOff: "음악 꺼짐", cameraHint: "드래그하여 선박 주위를 둘러보세요",
      market: "항구 시장", buy: "구매", sell: "판매", hold: "화물창", close: "출항", profit: "교역 손익",
      discovery: "해상 표식 발견", dayPhases: { dawn: "새벽", day: "낮", dusk: "해질녘", night: "밤" },
      ports: { azurehaven: "푸른항", sunspire: "태양첨탑", jadegate: "비취관문", ironcape: "철갑곶", amberreach: "호박해안" },
      goods: { spices: "향신료", silk: "비단", tea: "차", timber: "목재" },
      tradeReasons: { quantity: "수량 오류", gold: "금화 부족", capacity: "화물창 부족", cargo: "보유 화물 없음" },
    },
  },
  en: {
    eyebrow: "OPEN-OCEAN VOYAGE / ORIGINAL BROWSER GAME",
    title: "Windward Horizons",
    subtitle: "Read the wind and trim sail across an open sea linking five ports. Trade shifting markets and discover forgotten sea marks beyond the fog.",
    start: "Set sail",
    again: "New voyage",
    loading: "Charting the sea and trade routes…",
    unavailable: "WebGL is unavailable in this browser, so the 3D voyage cannot start.",
    best: "Best voyage score",
    score: "Voyage score",
    resultTitle: "Captain's log complete",
    gold: "Gold",
    tradeProfit: "Trade balance",
    ports: "Ports visited",
    discoveries: "Discoveries",
    controls: "Helm",
    desktopControls: "W/S trim sail · A/D or ←/→ steer · drag camera · wheel zoom · F dock",
    mobileControls: "Left controls steer · SAIL ± trims · drag camera · use the dock button",
    originalScore: "Original orchestral score synthesized on-device after your click",
    localOnly: "No account or server save — played entirely in this browser",
    features: [
      { title: "Living ocean", body: "Layered wave displacement, crest foam, hull wake and time-shaped reflections" },
      { title: "Classic tall ship", body: "Hull, deck, gunports, masts, rigging and animated wind-filled sails" },
      { title: "Sail and trade", body: "Wind-based speed, five daily markets and a 30-slot cargo hold" },
    ],
    scene: {
      voyage: "VOYAGE", time: "TIME", gold: "GOLD", cargo: "CARGO", speed: "SPEED", knots: "KT",
      sails: "SAILS", wind: "WIND", dock: "DOCK", slowToDock: "Reduce sail and slow down", near: "NEAREST PORT",
      endVoyage: "END VOYAGE", soundOn: "SCORE ON", soundOff: "SCORE OFF", cameraHint: "Drag to orbit the ship",
      market: "PORT MARKET", buy: "BUY", sell: "SELL", hold: "HOLD", close: "SET SAIL", profit: "TRADE BALANCE",
      discovery: "SEA MARK DISCOVERED", dayPhases: { dawn: "DAWN", day: "DAY", dusk: "DUSK", night: "NIGHT" },
      ports: { azurehaven: "Azurehaven", sunspire: "Sunspire", jadegate: "Jade Gate", ironcape: "Iron Cape", amberreach: "Amber Reach" },
      goods: { spices: "Spices", silk: "Silk", tea: "Tea", timber: "Timber" },
      tradeReasons: { quantity: "Invalid quantity", gold: "Not enough gold", capacity: "Hold is full", cargo: "No cargo to sell" },
    },
  },
  ja: {
    eyebrow: "OPEN-OCEAN VOYAGE / ORIGINAL BROWSER GAME",
    title: "Windward Horizons",
    subtitle: "風を読み、帆を調整して五つの港を結ぶ自由航海。変動する相場で交易し、霧の向こうの忘れられた海標を発見しよう。",
    start: "出航する",
    again: "新しい航海",
    loading: "海と交易路を展開中…",
    unavailable: "このブラウザではWebGLを利用できないため、3D航海を開始できません。",
    best: "最高航海スコア",
    score: "航海スコア",
    resultTitle: "航海日誌 完了",
    gold: "所持金",
    tradeProfit: "交易収支",
    ports: "訪問港",
    discoveries: "発見",
    controls: "操船",
    desktopControls: "W/S 帆調整 · A/Dまたは←/→操舵 · ドラッグ視点 · ホイールズーム · F入港",
    mobileControls: "左の操作で操舵 · SAIL ±で帆調整 · ドラッグ視点 · 入港ボタン",
    originalScore: "クリック後に端末内で合成するオリジナル管弦楽",
    localOnly: "アカウント・サーバー保存なし、このブラウザ内だけでプレイ",
    features: [
      { title: "生きた海", body: "多重波浪変位、波頭の泡、船体航跡、時間帯による反射色" },
      { title: "クラシック帆船", body: "船体・甲板・砲門・マスト・索具と風を受けて動く帆" },
      { title: "航海と交易", body: "風向きで変わる速力、五港の日替わり相場、30枠の船倉" },
    ],
    scene: {
      voyage: "航海", time: "残り", gold: "金貨", cargo: "積荷", speed: "速力", knots: "ノット",
      sails: "帆", wind: "風", dock: "入港", slowToDock: "帆を縮めて減速してください", near: "最寄りの港",
      endVoyage: "航海終了", soundOn: "音楽 ON", soundOff: "音楽 OFF", cameraHint: "ドラッグで船の周囲を見る",
      market: "港の市場", buy: "購入", sell: "売却", hold: "船倉", close: "出航", profit: "交易収支",
      discovery: "海標を発見", dayPhases: { dawn: "夜明け", day: "昼", dusk: "夕暮れ", night: "夜" },
      ports: { azurehaven: "蒼港", sunspire: "陽光塔", jadegate: "翡翠門", ironcape: "鉄岬", amberreach: "琥珀海岸" },
      goods: { spices: "香辛料", silk: "絹", tea: "茶", timber: "木材" },
      tradeReasons: { quantity: "数量エラー", gold: "金貨不足", capacity: "船倉不足", cargo: "売る積荷なし" },
    },
  },
  zh: {
    eyebrow: "OPEN-OCEAN VOYAGE / ORIGINAL BROWSER GAME",
    title: "Windward Horizons",
    subtitle: "研判风向、调整风帆，在连接五座港口的开放海域自由航行。利用波动行情贸易，并发现雾后的古老海标。",
    start: "扬帆起航",
    again: "新的航程",
    loading: "正在展开海洋与贸易航线…",
    unavailable: "此浏览器无法使用 WebGL，不能开始3D航行。",
    best: "最高航行分数",
    score: "航行分数",
    resultTitle: "船长日志完成",
    gold: "持有金币",
    tradeProfit: "贸易盈亏",
    ports: "到访港口",
    discoveries: "发现",
    controls: "操船",
    desktopControls: "W/S 调帆 · A/D或←/→转舵 · 拖动视角 · 滚轮缩放 · F靠港",
    mobileControls: "左侧控制转舵 · SAIL ±调帆 · 拖动视角 · 靠港按钮",
    originalScore: "点击后在设备内合成的原创管弦配乐",
    localOnly: "无需账号或服务器保存，仅在本浏览器游玩",
    features: [
      { title: "鲜活海洋", body: "多层波浪位移、浪尖泡沫、船尾航迹与随时间变化的反射色" },
      { title: "古典帆船", body: "船体、甲板、炮门、桅杆、索具以及随风鼓动的动态船帆" },
      { title: "航行与贸易", body: "风向影响航速、五港每日行情与30格货舱" },
    ],
    scene: {
      voyage: "航程", time: "剩余", gold: "金币", cargo: "货物", speed: "航速", knots: "节",
      sails: "风帆", wind: "风", dock: "靠港", slowToDock: "收帆减速后靠港", near: "最近港口",
      endVoyage: "结束航程", soundOn: "配乐开启", soundOff: "配乐关闭", cameraHint: "拖动查看船只周围",
      market: "港口市场", buy: "购买", sell: "出售", hold: "货舱", close: "离港", profit: "贸易盈亏",
      discovery: "发现海上标记", dayPhases: { dawn: "黎明", day: "白昼", dusk: "黄昏", night: "夜晚" },
      ports: { azurehaven: "蔚蓝港", sunspire: "日耀塔", jadegate: "翡翠关", ironcape: "铁甲岬", amberreach: "琥珀岸" },
      goods: { spices: "香料", silk: "丝绸", tea: "茶叶", timber: "木材" },
      tradeReasons: { quantity: "数量错误", gold: "金币不足", capacity: "货舱已满", cargo: "没有可出售货物" },
    },
  },
  fr: {
    eyebrow: "OPEN-OCEAN VOYAGE / ORIGINAL BROWSER GAME",
    title: "Windward Horizons",
    subtitle: "Lisez le vent et réglez les voiles sur une mer ouverte reliant cinq ports. Négociez des marchés mouvants et découvrez des balises oubliées derrière la brume.",
    start: "Prendre la mer",
    again: "Nouveau voyage",
    loading: "Déploiement de la mer et des routes commerciales…",
    unavailable: "WebGL n'est pas disponible dans ce navigateur : le voyage 3D ne peut pas commencer.",
    best: "Meilleur score",
    score: "Score de voyage",
    resultTitle: "Journal de bord terminé",
    gold: "Or",
    tradeProfit: "Bilan commercial",
    ports: "Ports visités",
    discoveries: "Découvertes",
    controls: "Barre",
    desktopControls: "Z/S voiles · Q/D ou ←/→ gouvernail · glisser caméra · molette zoom · F accoster",
    mobileControls: "Commandes à gauche pour barrer · SAIL ± pour les voiles · glisser caméra · bouton d'accostage",
    originalScore: "Partition orchestrale originale synthétisée sur l'appareil après votre clic",
    localOnly: "Sans compte ni sauvegarde serveur — tout reste dans ce navigateur",
    features: [
      { title: "Océan vivant", body: "Vagues superposées, écume de crête, sillage et reflets selon l'heure" },
      { title: "Grand voilier classique", body: "Coque, pont, sabords, mâts, gréement et voiles animées par le vent" },
      { title: "Navigation et commerce", body: "Vitesse selon le vent, cinq marchés quotidiens et cale de 30 places" },
    ],
    scene: {
      voyage: "VOYAGE", time: "TEMPS", gold: "OR", cargo: "CALE", speed: "VITESSE", knots: "ND",
      sails: "VOILES", wind: "VENT", dock: "ACCOSTER", slowToDock: "Réduisez la voilure et ralentissez", near: "PORT PROCHE",
      endVoyage: "FIN DU VOYAGE", soundOn: "MUSIQUE ON", soundOff: "MUSIQUE OFF", cameraHint: "Glissez pour tourner autour du navire",
      market: "MARCHÉ DU PORT", buy: "ACHETER", sell: "VENDRE", hold: "CALE", close: "APPAREILLER", profit: "BILAN",
      discovery: "BALISE MARITIME DÉCOUVERTE", dayPhases: { dawn: "AUBE", day: "JOUR", dusk: "CRÉPUSCULE", night: "NUIT" },
      ports: { azurehaven: "Havre d'Azur", sunspire: "Flèche-Soleil", jadegate: "Porte de Jade", ironcape: "Cap de Fer", amberreach: "Rive d'Ambre" },
      goods: { spices: "Épices", silk: "Soie", tea: "Thé", timber: "Bois" },
      tradeReasons: { quantity: "Quantité invalide", gold: "Pas assez d'or", capacity: "Cale pleine", cargo: "Aucune marchandise" },
    },
  },
  es: {
    eyebrow: "OPEN-OCEAN VOYAGE / ORIGINAL BROWSER GAME",
    title: "Windward Horizons",
    subtitle: "Lee el viento y ajusta las velas en un mar abierto que conecta cinco puertos. Comercia en mercados cambiantes y descubre antiguas balizas tras la niebla.",
    start: "Zarpar",
    again: "Nuevo viaje",
    loading: "Trazando el mar y las rutas comerciales…",
    unavailable: "WebGL no está disponible en este navegador, así que el viaje 3D no puede comenzar.",
    best: "Mejor puntuación",
    score: "Puntuación del viaje",
    resultTitle: "Cuaderno de bitácora completo",
    gold: "Oro",
    tradeProfit: "Balance comercial",
    ports: "Puertos visitados",
    discoveries: "Descubrimientos",
    controls: "Timón",
    desktopControls: "W/S ajustar velas · A/D o ←/→ girar · arrastrar cámara · rueda zoom · F atracar",
    mobileControls: "Controles izquierdos para girar · SAIL ± ajusta · arrastra la cámara · botón de atraque",
    originalScore: "Banda sonora orquestal original sintetizada en el dispositivo tras tu clic",
    localOnly: "Sin cuenta ni guardado en servidor: todo ocurre en este navegador",
    features: [
      { title: "Océano vivo", body: "Olas superpuestas, espuma de cresta, estela y reflejos según la hora" },
      { title: "Velero clásico", body: "Casco, cubierta, portas, mástiles, jarcia y velas animadas por el viento" },
      { title: "Navega y comercia", body: "Velocidad según el viento, cinco mercados diarios y bodega de 30 espacios" },
    ],
    scene: {
      voyage: "VIAJE", time: "TIEMPO", gold: "ORO", cargo: "CARGA", speed: "VELOCIDAD", knots: "NUD",
      sails: "VELAS", wind: "VIENTO", dock: "ATRACAR", slowToDock: "Reduce vela y velocidad", near: "PUERTO CERCANO",
      endVoyage: "TERMINAR VIAJE", soundOn: "MÚSICA ON", soundOff: "MÚSICA OFF", cameraHint: "Arrastra para orbitar el barco",
      market: "MERCADO DEL PUERTO", buy: "COMPRAR", sell: "VENDER", hold: "BODEGA", close: "ZARPAR", profit: "BALANCE",
      discovery: "BALIZA MARÍTIMA DESCUBIERTA", dayPhases: { dawn: "AMANECER", day: "DÍA", dusk: "ATARDECER", night: "NOCHE" },
      ports: { azurehaven: "Puerto Azul", sunspire: "Aguja Solar", jadegate: "Puerta de Jade", ironcape: "Cabo de Hierro", amberreach: "Costa Ámbar" },
      goods: { spices: "Especias", silk: "Seda", tea: "Té", timber: "Madera" },
      tradeReasons: { quantity: "Cantidad inválida", gold: "Oro insuficiente", capacity: "Bodega llena", cargo: "No tienes mercancía" },
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

export default function WindwardHorizons({ locale }: { locale: Locale }) {
  const t = COPY[locale] ?? COPY.en;
  const [phase, setPhase] = useState<Phase>("briefing");
  const [available, setAvailable] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [best, setBest] = useState(0);
  const [result, setResult] = useState<VoyageResult | null>(null);
  const scoreRef = useRef<WindwardScore | null>(null);

  useEffect(() => {
    setAvailable(supportsWebgl());
    setBest(getBest(GAME_KEY)?.value ?? 0);
    return () => {
      void scoreRef.current?.stop();
    };
  }, []);

  const begin = useCallback(async () => {
    if (!available) return;
    setPhase("loading");
    setResult(null);
    scoreRef.current ??= new WindwardScore();
    const started = await scoreRef.current.start();
    setAudioEnabled(started);
    window.setTimeout(() => setPhase("playing"), 80);
  }, [available]);
  const [beginVoyage, isStarting] = useThrottle(begin, 600);

  const toggleAudio = useCallback(async () => {
    scoreRef.current ??= new WindwardScore();
    if (scoreRef.current.playing) {
      await scoreRef.current.stop();
      setAudioEnabled(false);
    } else {
      setAudioEnabled(await scoreRef.current.start());
    }
  }, []);

  const finish = useCallback((next: VoyageResult) => {
    void scoreRef.current?.stop();
    setAudioEnabled(false);
    const saved = recordBest(GAME_KEY, next.score, "score", JSON.stringify({
      gold: next.gold,
      tradeProfit: next.tradeProfit,
      ports: next.ports,
      discoveries: next.discoveries,
    }));
    setBest(saved.value);
    setResult(next);
    setPhase("result");
  }, []);

  if (phase === "playing" || phase === "loading") {
    return (
      <div className="not-prose relative left-1/2 my-5 w-[min(100vw-.5rem,1500px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-[#8ba6aa]/35 bg-[#061014] shadow-[0_28px_90px_rgba(5,24,31,.38)]">
        <div className="h-[min(84vh,880px)] min-h-[680px] w-full">
          <Suspense fallback={<Loading label={t.loading} />}>
            {phase === "playing" ? (
              <Scene copy={t.scene} audioEnabled={audioEnabled} onToggleAudio={toggleAudio} onFinish={finish} />
            ) : (
              <Loading label={t.loading} />
            )}
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <section className="not-prose relative left-1/2 my-8 w-[min(100vw-1rem,1220px)] -translate-x-1/2 overflow-hidden rounded-[2rem] border border-[#9db4ad]/35 bg-[#08191d] text-white shadow-[0_30px_90px_rgba(11,35,40,.3)]">
      <div className="absolute inset-0 opacity-90 [background:radial-gradient(circle_at_78%_12%,rgba(245,189,105,.2),transparent_28%),radial-gradient(circle_at_15%_82%,rgba(80,132,137,.28),transparent_34%),linear-gradient(145deg,#071a1e,#102a2c_52%,#081518)]" />
      <div className="absolute inset-x-0 bottom-0 h-32 opacity-40 [background:repeating-radial-gradient(ellipse_at_50%_130%,transparent_0_16px,rgba(182,221,215,.18)_17px_18px)]" />
      <div className="relative grid gap-9 p-6 sm:p-10 lg:grid-cols-[1.15fr_.85fr] lg:p-14">
        <div>
          <p className="font-mono text-[10px] font-bold tracking-[.3em] text-[#d6b778]">{t.eyebrow}</p>
          <h2 className="mt-4 font-serif text-4xl font-black tracking-[-.045em] text-[#f8f0dc] sm:text-6xl">{t.title}</h2>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#c9d6d3] sm:text-base">{t.subtitle}</p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void beginVoyage()}
              disabled={!available || isStarting}
              className="min-h-12 rounded-xl bg-[#e3bd72] px-8 py-3 text-sm font-black uppercase tracking-[.13em] text-[#102325] shadow-[0_0_32px_rgba(227,189,114,.2)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {phase === "result" ? t.again : t.start}
            </button>
            <span className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-xs text-[#c8d5d2]">
              {t.best}: <strong className="text-white">{best.toLocaleString()}</strong>
            </span>
          </div>

          {!available && <p role="alert" className="mt-4 text-sm font-bold text-amber-300">{t.unavailable}</p>}

          {result && (
            <div className="mt-7 rounded-2xl border border-[#d7bc82]/25 bg-black/25 p-5">
              <p className="text-xs font-black uppercase tracking-[.2em] text-[#d6b778]">{t.resultTitle}</p>
              <p className="mt-2 text-3xl font-black text-white">{t.score}: {result.score.toLocaleString()}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {[
                  [t.gold, result.gold.toLocaleString()],
                  [t.tradeProfit, `${result.tradeProfit >= 0 ? "+" : ""}${result.tradeProfit.toLocaleString()}`],
                  [t.ports, `${result.ports}/5`],
                  [t.discoveries, `${result.discoveries}/3`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-white/5 p-3">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-[#91aaa8]">{label}</dt>
                    <dd className="mt-1 font-mono font-black text-[#f5e7c8]">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {t.features.map((feature, index) => {
              const Icon = [Waves, Compass, Map][index];
              return (
                <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/[.045] p-4">
                  <Icon className="size-5 text-[#d6b778]" aria-hidden="true" />
                  <h3 className="mt-3 text-sm font-black text-white">{feature.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-[#9fb4b1]">{feature.body}</p>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="self-center rounded-[1.6rem] border border-white/10 bg-black/25 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-full border border-[#d6b778]/30 bg-[#d6b778]/10">
              <Wind className="size-5 text-[#e6c986]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[.18em] text-[#d6b778]">{t.controls}</p>
              <p className="mt-1 text-xs text-[#9fb4b1]">THIRD-PERSON SAILING</p>
            </div>
          </div>
          <div className="mt-5 space-y-4 text-xs leading-6 text-[#c8d5d2]">
            <p><strong className="text-white">Desktop</strong><br />{t.desktopControls}</p>
            <p><strong className="text-white">Mobile</strong><br />{t.mobileControls}</p>
          </div>
          <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-xs text-[#aebfbc]">
            <p className="flex gap-2"><Music2 className="mt-0.5 size-4 shrink-0 text-[#d6b778]" />{t.originalScore}</p>
            <p className="flex gap-2"><PackageOpen className="mt-0.5 size-4 shrink-0 text-[#d6b778]" />{t.localOnly}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className="grid h-full place-items-center bg-[#061014] text-center text-white">
      <div>
        <div className="mx-auto size-12 animate-spin rounded-full border-2 border-[#d6b778]/20 border-t-[#d6b778]" />
        <p className="mt-4 font-mono text-xs font-bold uppercase tracking-[.2em] text-[#c9d6d3]">{label}</p>
      </div>
    </div>
  );
}

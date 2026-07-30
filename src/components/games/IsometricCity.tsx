import { Suspense, lazy, useCallback, useState } from "react";
import { Building2, CloudSun, Route, Sparkles, Users } from "lucide-react";
import { useThrottle } from "../../hooks/_oiyo-shared/useThrottle";
import { hasWebGL } from "../../lib/games/webgl";
import type { Locale } from "../../lib/i18n";
import type { IsometricCitySceneCopy } from "./IsometricCityScene";

const Scene = lazy(() => import("./IsometricCityScene"));

interface Copy {
  eyebrow: string;
  title: string;
  subtitle: string;
  start: string;
  loading: string;
  unavailable: string;
  localOnly: string;
  features: Array<{ title: string; body: string }>;
  scene: IsometricCitySceneCopy;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    eyebrow: "CITY SYSTEMS / ORIGINAL 3D BROWSER GAME",
    title: "Isometric City",
    subtitle: "도로를 잇고 주거·상업·공원을 배치해 작은 도시를 살아 있는 대도시로 키우세요. 시민, 전력, 일자리와 교통 흐름이 실시간으로 맞물립니다.",
    start: "도시 계획 시작",
    loading: "도시 지형과 교통망을 준비하는 중…",
    unavailable: "이 브라우저에서는 WebGL을 사용할 수 없어 3D 도시를 시작할 수 없습니다.",
    localOnly: "계정 없이 플레이 · 도시는 이 브라우저에만 자동 저장",
    features: [
      { title: "정밀한 격자 건설", body: "실시간 배치 미리보기, 도로 인접 규칙, 업그레이드와 철거" },
      { title: "살아 있는 이동망", body: "A* 도로 경로를 따라 움직이는 고밀도 차량·보행자" },
      { title: "시간과 날씨", body: "낮과 밤, 비와 안개, 가로등과 창문 네온 조명" },
    ],
    scene: {
      cityName: "ISOMETRIC CITY", funds: "예산", population: "인구", jobs: "일자리", power: "전력", happiness: "행복도",
      day: "DAY", clear: "맑음", rain: "비", fog: "안개", saved: "자동 저장", reset: "새 도시", resetConfirm: "현재 도시를 지우고 다시 시작할까요?",
      tools: { road: "도로", residential: "주거", commercial: "상업", park: "공원", civic: "공공", power: "전력", bulldoze: "철거" },
      descriptions: {
        road: "구역을 연결하고 이동 흐름을 만듭니다.", residential: "시민이 살 집과 인구 수용력을 만듭니다.", commercial: "일자리와 세수를 만듭니다.",
        park: "행복도를 높이고 빗물을 흡수합니다.", civic: "공공 서비스와 일자리를 제공합니다.", power: "도시 전체에 전력을 공급합니다.", bulldoze: "건물 또는 도로를 철거하고 일부 비용을 돌려받습니다.",
      },
      place: "배치", rotate: "드래그 회전 · 휠 확대", needsRoad: "건물은 도로 옆에 배치하세요.", occupied: "이미 사용 중인 칸입니다.", empty: "철거할 대상이 없습니다.",
      insufficient: "예산이 부족합니다.", built: "건설 완료", demolished: "철거 완료", selected: "선택한 구역", level: "레벨", upgrade: "업그레이드",
      maxLevel: "최고 레벨", noSelection: "도시를 클릭해 구역을 살펴보세요.", connected: "연결 도로", congestion: "혼잡도", balance: "시간당 수지",
      citizens: "시민", capacity: "수용", pause: "일시정지", play: "재생", fast: "빠르게", night: "밤으로", dayTime: "낮으로", tiltShift: "틸트시프트",
    },
  },
  en: {
    eyebrow: "CITY SYSTEMS / ORIGINAL 3D BROWSER GAME",
    title: "Isometric City",
    subtitle: "Connect roads and place homes, commerce and parks to grow a pocket town into a living metropolis. Citizens, power, jobs and traffic respond in real time.",
    start: "Start city planning",
    loading: "Preparing terrain and transport networks…",
    unavailable: "WebGL is unavailable in this browser, so the 3D city cannot start.",
    localOnly: "No account · your city auto-saves only in this browser",
    features: [
      { title: "Precise grid building", body: "Live placement preview, road frontage, upgrades and demolition" },
      { title: "Living mobility", body: "Dense vehicle and pedestrian flows following A* road routes" },
      { title: "Time and weather", body: "Day, night, rain and fog with streetlights and neon windows" },
    ],
    scene: {
      cityName: "ISOMETRIC CITY", funds: "Funds", population: "Population", jobs: "Jobs", power: "Power", happiness: "Happiness",
      day: "DAY", clear: "Clear", rain: "Rain", fog: "Fog", saved: "Auto-saved", reset: "New city", resetConfirm: "Erase this city and begin again?",
      tools: { road: "Road", residential: "Homes", commercial: "Commerce", park: "Park", civic: "Civic", power: "Power", bulldoze: "Bulldoze" },
      descriptions: {
        road: "Connect districts and carry movement.", residential: "Create homes and population capacity.", commercial: "Create jobs and tax revenue.",
        park: "Lift happiness and absorb stormwater.", civic: "Provide public services and jobs.", power: "Supply electricity to the whole city.", bulldoze: "Remove a building or road and recover part of its cost.",
      },
      place: "Place", rotate: "Drag to rotate · wheel to zoom", needsRoad: "Buildings need road frontage.", occupied: "That tile is already occupied.", empty: "There is nothing to demolish.",
      insufficient: "Not enough funds.", built: "Construction complete", demolished: "Demolition complete", selected: "Selected district", level: "Level", upgrade: "Upgrade",
      maxLevel: "Max level", noSelection: "Select a city tile to inspect it.", connected: "Road network", congestion: "Congestion", balance: "Hourly balance",
      citizens: "citizens", capacity: "capacity", pause: "Pause", play: "Play", fast: "Fast", night: "Jump to night", dayTime: "Jump to day", tiltShift: "Tilt-shift",
    },
  },
  ja: {
    eyebrow: "CITY SYSTEMS / ORIGINAL 3D BROWSER GAME",
    title: "Isometric City",
    subtitle: "道路をつなぎ、住宅・商業・公園を配置して、小さな町を生きた大都市へ。市民、電力、雇用、交通がリアルタイムで連動します。",
    start: "都市計画を始める",
    loading: "地形と交通網を準備中…",
    unavailable: "このブラウザではWebGLを利用できないため、3D都市を開始できません。",
    localOnly: "アカウント不要 · 都市はこのブラウザだけに自動保存",
    features: [
      { title: "精密なグリッド建設", body: "リアルタイムプレビュー、道路隣接、アップグレードと撤去" },
      { title: "生きた移動網", body: "A*道路経路を進む高密度の車両と歩行者" },
      { title: "時間と天候", body: "昼夜、雨、霧、街灯とネオン窓の夜景" },
    ],
    scene: {
      cityName: "ISOMETRIC CITY", funds: "予算", population: "人口", jobs: "雇用", power: "電力", happiness: "幸福度",
      day: "DAY", clear: "晴れ", rain: "雨", fog: "霧", saved: "自動保存", reset: "新しい都市", resetConfirm: "現在の都市を消して最初から始めますか？",
      tools: { road: "道路", residential: "住宅", commercial: "商業", park: "公園", civic: "公共", power: "電力", bulldoze: "撤去" },
      descriptions: {
        road: "地区を接続し、移動の流れを作ります。", residential: "住まいと人口容量を作ります。", commercial: "雇用と税収を作ります。",
        park: "幸福度を高め、雨水を吸収します。", civic: "公共サービスと雇用を提供します。", power: "都市全体に電力を供給します。", bulldoze: "建物や道路を撤去し、費用の一部を回収します。",
      },
      place: "配置", rotate: "ドラッグ回転 · ホイールズーム", needsRoad: "建物は道路沿いに配置してください。", occupied: "すでに使用中のマスです。", empty: "撤去対象がありません。",
      insufficient: "予算が足りません。", built: "建設完了", demolished: "撤去完了", selected: "選択地区", level: "レベル", upgrade: "アップグレード",
      maxLevel: "最高レベル", noSelection: "都市のマスを選んで確認できます。", connected: "接続道路", congestion: "混雑度", balance: "時間収支",
      citizens: "市民", capacity: "収容", pause: "一時停止", play: "再生", fast: "高速", night: "夜へ", dayTime: "昼へ", tiltShift: "チルトシフト",
    },
  },
  zh: {
    eyebrow: "CITY SYSTEMS / ORIGINAL 3D BROWSER GAME",
    title: "Isometric City",
    subtitle: "连接道路，布置住宅、商业与公园，把袖珍小镇发展成鲜活都市。市民、电力、岗位和交通会实时联动。",
    start: "开始城市规划",
    loading: "正在准备地形与交通网络…",
    unavailable: "此浏览器无法使用 WebGL，不能启动3D城市。",
    localOnly: "无需账号 · 城市仅自动保存在本浏览器",
    features: [
      { title: "精准网格建造", body: "实时预览、临路规则、升级与拆除" },
      { title: "鲜活交通网络", body: "沿A*道路路径移动的高密度车辆与行人" },
      { title: "时间与天气", body: "昼夜、雨雾、路灯与霓虹窗夜景" },
    ],
    scene: {
      cityName: "ISOMETRIC CITY", funds: "资金", population: "人口", jobs: "岗位", power: "电力", happiness: "幸福度",
      day: "DAY", clear: "晴朗", rain: "雨", fog: "雾", saved: "自动保存", reset: "新城市", resetConfirm: "要清除当前城市并重新开始吗？",
      tools: { road: "道路", residential: "住宅", commercial: "商业", park: "公园", civic: "公共", power: "电力", bulldoze: "拆除" },
      descriptions: {
        road: "连接街区并承载出行。", residential: "提供住房和人口容量。", commercial: "创造岗位与税收。",
        park: "提升幸福度并吸收雨水。", civic: "提供公共服务与岗位。", power: "为整座城市供应电力。", bulldoze: "拆除建筑或道路并回收部分费用。",
      },
      place: "建造", rotate: "拖动旋转 · 滚轮缩放", needsRoad: "建筑必须临近道路。", occupied: "该地块已被占用。", empty: "没有可拆除的对象。",
      insufficient: "资金不足。", built: "建造完成", demolished: "拆除完成", selected: "选中街区", level: "等级", upgrade: "升级",
      maxLevel: "最高等级", noSelection: "选择城市地块查看详情。", connected: "道路网络", congestion: "拥堵度", balance: "每小时收支",
      citizens: "市民", capacity: "容量", pause: "暂停", play: "播放", fast: "加速", night: "跳到夜晚", dayTime: "跳到白天", tiltShift: "移轴",
    },
  },
  fr: {
    eyebrow: "CITY SYSTEMS / ORIGINAL 3D BROWSER GAME",
    title: "Isometric City",
    subtitle: "Reliez les routes et placez logements, commerces et parcs pour transformer une petite ville en métropole vivante. Habitants, énergie, emplois et trafic réagissent en temps réel.",
    start: "Commencer l'urbanisme",
    loading: "Préparation du terrain et des réseaux…",
    unavailable: "WebGL n'est pas disponible dans ce navigateur : la ville 3D ne peut pas démarrer.",
    localOnly: "Sans compte · votre ville est sauvegardée seulement dans ce navigateur",
    features: [
      { title: "Construction précise", body: "Aperçu direct, façade sur rue, améliorations et démolition" },
      { title: "Mobilité vivante", body: "Flux denses de véhicules et piétons sur des itinéraires A*" },
      { title: "Temps et météo", body: "Jour, nuit, pluie et brouillard avec lampadaires et fenêtres néon" },
    ],
    scene: {
      cityName: "ISOMETRIC CITY", funds: "Budget", population: "Population", jobs: "Emplois", power: "Énergie", happiness: "Bonheur",
      day: "JOUR", clear: "Clair", rain: "Pluie", fog: "Brouillard", saved: "Sauvegarde auto", reset: "Nouvelle ville", resetConfirm: "Effacer cette ville et recommencer ?",
      tools: { road: "Route", residential: "Logements", commercial: "Commerce", park: "Parc", civic: "Public", power: "Énergie", bulldoze: "Démolir" },
      descriptions: {
        road: "Relie les quartiers et porte les déplacements.", residential: "Crée des logements et de la capacité.", commercial: "Crée des emplois et des recettes.",
        park: "Améliore le bonheur et absorbe la pluie.", civic: "Fournit services publics et emplois.", power: "Alimente toute la ville en électricité.", bulldoze: "Retire un bâtiment ou une route et rembourse une partie du coût.",
      },
      place: "Placer", rotate: "Glisser pour tourner · molette pour zoomer", needsRoad: "Les bâtiments doivent border une route.", occupied: "Cette case est déjà occupée.", empty: "Rien à démolir.",
      insufficient: "Budget insuffisant.", built: "Construction terminée", demolished: "Démolition terminée", selected: "Quartier sélectionné", level: "Niveau", upgrade: "Améliorer",
      maxLevel: "Niveau maximal", noSelection: "Sélectionnez une case pour l'inspecter.", connected: "Réseau routier", congestion: "Congestion", balance: "Solde horaire",
      citizens: "habitants", capacity: "capacité", pause: "Pause", play: "Lecture", fast: "Rapide", night: "Passer à la nuit", dayTime: "Passer au jour", tiltShift: "Bascule-décentrement",
    },
  },
  es: {
    eyebrow: "CITY SYSTEMS / ORIGINAL 3D BROWSER GAME",
    title: "Isometric City",
    subtitle: "Conecta carreteras y coloca viviendas, comercios y parques para convertir una villa de bolsillo en una metrópolis viva. Ciudadanía, energía, empleo y tráfico reaccionan en tiempo real.",
    start: "Empezar a planificar",
    loading: "Preparando terreno y redes de transporte…",
    unavailable: "WebGL no está disponible en este navegador; la ciudad 3D no puede empezar.",
    localOnly: "Sin cuenta · tu ciudad se guarda solo en este navegador",
    features: [
      { title: "Construcción precisa", body: "Vista previa, acceso vial, mejoras y demolición" },
      { title: "Movilidad viva", body: "Flujos densos de vehículos y peatones por rutas A*" },
      { title: "Tiempo y clima", body: "Día, noche, lluvia y niebla con farolas y ventanas de neón" },
    ],
    scene: {
      cityName: "ISOMETRIC CITY", funds: "Fondos", population: "Población", jobs: "Empleos", power: "Energía", happiness: "Felicidad",
      day: "DÍA", clear: "Despejado", rain: "Lluvia", fog: "Niebla", saved: "Guardado auto", reset: "Nueva ciudad", resetConfirm: "¿Borrar esta ciudad y empezar de nuevo?",
      tools: { road: "Carretera", residential: "Viviendas", commercial: "Comercio", park: "Parque", civic: "Cívico", power: "Energía", bulldoze: "Demoler" },
      descriptions: {
        road: "Conecta barrios y soporta los desplazamientos.", residential: "Crea hogares y capacidad de población.", commercial: "Crea empleos e ingresos fiscales.",
        park: "Mejora la felicidad y absorbe la lluvia.", civic: "Ofrece servicios públicos y empleo.", power: "Suministra electricidad a toda la ciudad.", bulldoze: "Retira un edificio o carretera y recupera parte del coste.",
      },
      place: "Colocar", rotate: "Arrastra para girar · rueda para zoom", needsRoad: "Los edificios necesitan acceso a carretera.", occupied: "Esa casilla ya está ocupada.", empty: "No hay nada que demoler.",
      insufficient: "Fondos insuficientes.", built: "Construcción terminada", demolished: "Demolición terminada", selected: "Distrito seleccionado", level: "Nivel", upgrade: "Mejorar",
      maxLevel: "Nivel máximo", noSelection: "Selecciona una casilla para inspeccionarla.", connected: "Red vial", congestion: "Congestión", balance: "Balance horario",
      citizens: "habitantes", capacity: "capacidad", pause: "Pausa", play: "Jugar", fast: "Rápido", night: "Ir a la noche", dayTime: "Ir al día", tiltShift: "Desenfoque tilt-shift",
    },
  },
};

function PreviewCity() {
  return (
    <div className="relative h-72 overflow-hidden rounded-[2rem] border border-white/70 bg-[#d9e8cf] shadow-2xl shadow-olive-900/10 sm:h-80">
      <div className="absolute inset-[-22%] rotate-[30deg] scale-75 bg-[linear-gradient(rgba(255,255,255,.52)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.52)_1px,transparent_1px)] bg-[size:44px_44px] [transform:rotateX(58deg)_rotateZ(-45deg)]" />
      <div className="absolute left-[22%] top-[22%] h-28 w-24 rotate-[30deg] rounded-md bg-[#f6d79c] shadow-[-18px_20px_0_#c99e61]" />
      <div className="absolute left-[46%] top-[12%] h-40 w-28 rotate-[30deg] rounded-md bg-[#9db6ae] shadow-[-22px_24px_0_#5f7e75]" />
      <div className="absolute right-[15%] top-[38%] h-24 w-24 rotate-[30deg] rounded-md bg-[#d8ae86] shadow-[-16px_18px_0_#9f7251]" />
      <div className="absolute bottom-[12%] left-[12%] flex items-end gap-2 rotate-[30deg]">
        <span className="h-11 w-5 rounded-t-full bg-[#4f7143]" />
        <span className="h-16 w-6 rounded-t-full bg-[#6a8b52]" />
        <span className="h-9 w-5 rounded-t-full bg-[#3f6338]" />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#b4cfa5] to-transparent" />
      <span className="absolute right-5 top-5 rounded-full border border-white/70 bg-white/75 px-3 py-1 text-[10px] font-black tracking-[.2em] text-[#526347] backdrop-blur">LIVE CITY SYSTEMS</span>
    </div>
  );
}

export default function IsometricCity({ locale }: { locale: Locale }) {
  const copy = COPY[locale] ?? COPY.en;
  const [phase, setPhase] = useState<"briefing" | "loading" | "playing">("briefing");
  const [unsupported, setUnsupported] = useState(false);

  const begin = useCallback(() => {
    if (!hasWebGL()) {
      setUnsupported(true);
      return;
    }
    setUnsupported(false);
    setPhase("loading");
    window.setTimeout(() => setPhase("playing"), 160);
  }, []);
  const [beginCity, isStarting] = useThrottle(begin, 650);

  if (phase === "playing") {
    return (
      <Suspense fallback={<LoadingState label={copy.loading} />}>
        <Scene copy={copy.scene} />
      </Suspense>
    );
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#dbe5d3] bg-[#f7f7f1] shadow-[0_24px_80px_rgba(62,79,49,.12)]">
      <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:p-10">
        <div className="order-2 lg:order-1">
          <p className="text-[10px] font-black tracking-[.24em] text-[#718263]">{copy.eyebrow}</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-.04em] text-[#263127] sm:text-6xl">{copy.title}</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[#64705f] sm:text-base">{copy.subtitle}</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[Building2, Route, CloudSun].map((Icon, index) => (
              <div key={copy.features[index].title} className="rounded-2xl border border-[#e0e7da] bg-white/75 p-4">
                <Icon size={18} className="text-[#6b7f5d]" aria-hidden="true" />
                <h3 className="mt-3 text-xs font-black text-[#344033]">{copy.features[index].title}</h3>
                <p className="mt-1 text-[11px] leading-5 text-[#74806f]">{copy.features[index].body}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={phase === "loading" || isStarting}
            onClick={() => beginCity()}
            className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#33472e] px-6 text-sm font-black text-white shadow-lg shadow-[#33472e]/15 transition hover:-translate-y-0.5 hover:bg-[#263b25] disabled:cursor-wait disabled:opacity-60"
          >
            <Sparkles size={17} aria-hidden="true" />
            {phase === "loading" ? copy.loading : copy.start}
          </button>
          <p className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-[#7a8775]">
            <Users size={14} aria-hidden="true" /> {copy.localOnly}
          </p>
          {unsupported && <p role="alert" className="mt-3 text-sm font-bold text-red-700">{copy.unavailable}</p>}
        </div>
        <div className="order-1 lg:order-2"><PreviewCity /></div>
      </div>
    </section>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[680px] items-center justify-center rounded-[2rem] border border-[#dbe5d3] bg-[#eff3e9]">
      <div className="text-center">
        <span className="mx-auto block h-9 w-9 animate-spin rounded-full border-4 border-[#a8b99b] border-t-[#33472e]" />
        <p className="mt-4 text-sm font-bold text-[#5d6b58]">{label}</p>
      </div>
    </div>
  );
}

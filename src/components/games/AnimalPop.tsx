import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { GameContainer } from "../ui/game/GamePrimitives";
import {
  ANIMAL_TIME_LIMIT,
  addAnimalTime,
  animalMatchTimeBonus,
  createAnimalBoard,
  parseAnimal,
  scoreAnimalMatch,
  serializeAnimal,
  swapAnimals,
  tickAnimalFever,
  type AnimalBoard,
  type AnimalFall,
} from "../../lib/games/animal-pop";
import type { AugmentTier } from "../../lib/games/augment";
import {
  ANIMAL_AUGMENTS,
  ANIMAL_AUGMENT_SAVE,
  animalAugmentedTimeBonus,
  animalMods,
  animalTimeUp,
  createAnimalRun,
  offerAnimalAugments,
  parseAnimalRun,
  pickAnimalAugment,
  readAnimalAugmentBest,
  scoreAnimalAugmented,
  serializeAnimalRun,
  writeAnimalAugmentBest,
  type AnimalAugmentId,
  type AnimalRun,
} from "../../lib/games/animal-pop-augments";
import { ANIMAL_POP_SPRITES } from "../../lib/games/sprites";
import { createDebrisWorld, type DebrisMatterLike, type DebrisWorld } from "../../lib/games/debris-world";
// 매치된 타일에서 튀는 파편. 이 게임의 핵심 동사는 "터뜨린다"인데 지금까지
// 매치된 동물은 CSS 펄스 210ms 뒤에 그냥 사라졌다 — 터지는 장면이 없었다.
// debris-world 는 결정론적 게임 루프 바깥에서 도는 장식 레이어라 점수·저장에
// 영향을 주지 않는다. matter-js 84KB 는 첫 매치 때만 로드되고, reduced-motion
// 이면 아예 로드하지 않는다.
const SHARDS_PER_TILE = 7;
const animalHue = (animal: string): number => {
  let h = 0;
  for (const ch of animal) h = (h * 31 + ch.codePointAt(0)!) % 360;
  return h;
};

const SAVE = "oiyo:animal-pop:v1",
  BEST = "oiyo-animal-pop-best";
const TIER_OF = Object.fromEntries(ANIMAL_AUGMENTS.map((def) => [def.id, def.tier])) as Record<AnimalAugmentId, AugmentTier>;
const TIER_TONE: Record<AugmentTier, string> = {
  silver: "border-slate-300 bg-slate-50 text-slate-800",
  gold: "border-amber-400 bg-amber-50 text-amber-900",
  prismatic: "border-fuchsia-400 bg-[linear-gradient(135deg,#fdf2f8,#eef2ff_55%,#ecfeff)] text-indigo-900",
};
type Mode = "classic" | "augment";
const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const COPY = {
  ko: {
    title: "애니멀 팝",
    sub: "포레스트 피버",
    time: "남은 시간",
    score: "점수",
    best: "최고",
    combo: "연쇄",
    fever: "피버 ×2",
    pause: "일시정지",
    resume: "계속하기",
    sound: "소리",
    over: "숲의 축제가 끝났어요",
    again: "다시 하기",
    hint: "이웃한 동물을 바꿔 3마리 이상 연결하세요.",
    restored: "저장된 퍼즐을 이어서 불러왔어요",
    classic: "클래식 시작",
    augment: "증강 모드 시작",
    augmentSub: "시작할 때 한 장, 점수가 오를 때마다 한 장. 셋 중 하나를 골라 규칙을 바꿔요. 고르는 동안 시간은 멈추고, 기록은 클래식과 따로 남아요.",
    pick: "증강을 하나 고르세요",
    owned: "고른 증강",
    modeAugment: "증강 모드",
    secondChance: "한 번 더! +20초",
    tiers: { silver: "실버", gold: "골드", prismatic: "프리즘" },
    augments: {
      score: { name: "점수 상인", desc: "얻는 점수가 25% 늘어요. 세 번까지 겹쳐요." },
      clock: { name: "시간 충전", desc: "고르는 즉시 10초를 얻어요. 세 번까지 나와요." },
      long: { name: "길게 잇기", desc: "한 번에 4마리 이상 터뜨리면 점수가 50% 늘어요. 세 번까지 겹쳐요." },
      lineBlast: { name: "한 줄 쓸기", desc: "4마리 이상을 일렬로 맞추면 그 줄 전체가 터져요." },
      fewer: { name: "단출한 숲", desc: "새로 떨어지는 동물이 6종류로 줄어요. 연쇄가 잘 나요." },
      chainTime: { name: "연쇄 시계", desc: "연쇄가 이어질 때마다 2초를 더 얻어요." },
      freeSwap: { name: "자유 교환", desc: "맞지 않는 자리도 바꿀 수 있어요." },
      stampede: { name: "대이동", desc: "5마리 이상을 일렬로 맞추면 같은 동물이 전부 터져요." },
      double: { name: "올인", desc: "점수가 2배가 돼요. 대신 남은 시간이 절반으로 줄어요." },
      wild: { name: "들뜬 숲", desc: "피버가 연쇄 3부터 켜지고, 피버 점수가 3배예요." },
      second: { name: "한 번 더", desc: "시간이 다 되면 20초를 받아 이어 해요. 한 번만요." },
    },
  },
  en: {
    title: "Animal Pop",
    sub: "Forest Fever",
    time: "Time",
    score: "Score",
    best: "Best",
    combo: "Chain",
    fever: "FEVER ×2",
    pause: "Pause",
    resume: "Resume",
    sound: "Sound",
    over: "The forest festival is over",
    again: "Play again",
    hint: "Swap neighboring animals to connect three or more.",
    restored: "Your saved puzzle was restored",
    classic: "Start classic",
    augment: "Start augment mode",
    augmentSub: "One card at the start and one each time your score climbs. Pick one of three to bend the rules. The clock stops while you choose, and scores are kept apart from classic.",
    pick: "Pick one augment",
    owned: "Your augments",
    modeAugment: "Augment mode",
    secondChance: "One more! +20s",
    tiers: { silver: "Silver", gold: "Gold", prismatic: "Prismatic" },
    augments: {
      score: { name: "Score Broker", desc: "Earn 25% more points. Stacks three times." },
      clock: { name: "Top-up", desc: "Gain 10 seconds right away. Shows up to three times." },
      long: { name: "Long Lines", desc: "Clearing four or more at once pays 50% more. Stacks three times." },
      lineBlast: { name: "Line Sweep", desc: "A straight run of four or more clears its whole line." },
      fewer: { name: "Small Forest", desc: "New animals come in six kinds instead of seven. Chains come easier." },
      chainTime: { name: "Chain Clock", desc: "Every chain adds 2 extra seconds." },
      freeSwap: { name: "Free Swap", desc: "You can swap tiles even when nothing matches." },
      stampede: { name: "Stampede", desc: "A straight run of five or more clears every animal of that kind." },
      double: { name: "All In", desc: "Points are doubled, but your remaining time is cut in half." },
      wild: { name: "Wild Forest", desc: "Fever starts at a chain of 3 and pays triple." },
      second: { name: "One More", desc: "When time runs out you get 20 seconds and keep going. Once." },
    },
  },
  ja: {
    title: "アニマルポップ",
    sub: "フォレストフィーバー",
    time: "残り時間",
    score: "スコア",
    best: "ベスト",
    combo: "連鎖",
    fever: "フィーバー ×2",
    pause: "一時停止",
    resume: "続ける",
    sound: "サウンド",
    over: "森のお祭りが終わりました",
    again: "もう一度",
    hint: "隣り合う動物を入れ替えて3匹以上つなげます。",
    restored: "保存したパズルを復元しました",
    classic: "クラシックで始める",
    augment: "オーグメントモードで始める",
    augmentSub: "開始時に1枚、スコアが伸びるたびに1枚。3枚から1枚を選んでルールを変えます。選んでいる間は時間が止まり、記録はクラシックと別に残ります。",
    pick: "オーグメントを1枚選んでください",
    owned: "選んだオーグメント",
    modeAugment: "オーグメントモード",
    secondChance: "もう一回！+20秒",
    tiers: { silver: "シルバー", gold: "ゴールド", prismatic: "プリズム" },
    augments: {
      score: { name: "スコア商人", desc: "獲得スコアが25%増えます。3回まで重なります。" },
      clock: { name: "時間チャージ", desc: "選ぶとすぐに10秒増えます。3回まで出ます。" },
      long: { name: "長くつなぐ", desc: "一度に4匹以上消すとスコアが50%増えます。3回まで重なります。" },
      lineBlast: { name: "一列そうじ", desc: "4匹以上を一直線にそろえると、その列がすべて消えます。" },
      fewer: { name: "小さな森", desc: "新しく落ちてくる動物が6種類に減ります。連鎖が起きやすくなります。" },
      chainTime: { name: "連鎖時計", desc: "連鎖が続くたびに2秒多くもらえます。" },
      freeSwap: { name: "自由入れ替え", desc: "そろわない場所でも入れ替えられます。" },
      stampede: { name: "大移動", desc: "5匹以上を一直線にそろえると、同じ動物がすべて消えます。" },
      double: { name: "オールイン", desc: "スコアが2倍になります。その代わり残り時間が半分になります。" },
      wild: { name: "うかれた森", desc: "フィーバーが連鎖3から始まり、フィーバー中のスコアが3倍になります。" },
      second: { name: "もう一回", desc: "時間切れになると20秒もらって続けられます。1回だけです。" },
    },
  },
  zh: {
    title: "动物消消乐",
    sub: "森林狂热",
    time: "时间",
    score: "分数",
    best: "最高",
    combo: "连锁",
    fever: "狂热 ×2",
    pause: "暂停",
    resume: "继续",
    sound: "声音",
    over: "森林庆典结束了",
    again: "再玩一次",
    hint: "交换相邻动物，连接三个或更多。",
    restored: "已恢复保存的谜题",
    classic: "开始经典模式",
    augment: "开始强化模式",
    augmentSub: "开局选一张，分数每上一个台阶再选一张。三选一，改变规则。选择时计时暂停，成绩与经典模式分开记录。",
    pick: "请选择一张强化",
    owned: "已选强化",
    modeAugment: "强化模式",
    secondChance: "再来一次！+20秒",
    tiers: { silver: "白银", gold: "黄金", prismatic: "棱彩" },
    augments: {
      score: { name: "分数商人", desc: "获得的分数增加25%。最多叠加三次。" },
      clock: { name: "补充时间", desc: "选中后立刻获得10秒。最多出现三次。" },
      long: { name: "连成长串", desc: "一次消除4只以上时分数增加50%。最多叠加三次。" },
      lineBlast: { name: "横扫一排", desc: "把4只以上连成一条直线，整条行或列都会消除。" },
      fewer: { name: "小森林", desc: "新掉落的动物减少到6种，更容易连锁。" },
      chainTime: { name: "连锁时钟", desc: "每次出现连锁多得2秒。" },
      freeSwap: { name: "自由交换", desc: "即使无法消除也可以交换。" },
      stampede: { name: "大迁徙", desc: "把5只以上连成一条直线，同种动物全部消除。" },
      double: { name: "全押", desc: "分数翻倍，但剩余时间减半。" },
      wild: { name: "沸腾的森林", desc: "连锁到3就进入狂热，狂热期间分数为3倍。" },
      second: { name: "再来一次", desc: "时间用完时获得20秒并继续。只有一次。" },
    },
  },
  fr: {
    title: "Animal Pop",
    sub: "Fièvre forestière",
    time: "Temps",
    score: "Score",
    best: "Record",
    combo: "Chaîne",
    fever: "FIÈVRE ×2",
    pause: "Pause",
    resume: "Reprendre",
    sound: "Son",
    over: "La fête de la forêt est terminée",
    again: "Rejouer",
    hint: "Échangez deux voisins pour en relier au moins trois.",
    restored: "Votre puzzle a été restauré",
    classic: "Lancer le mode classique",
    augment: "Lancer le mode augments",
    augmentSub: "Une carte au départ, puis une à chaque palier de score. Choisissez-en une sur trois pour changer les règles. Le chrono s’arrête pendant le choix et les scores sont séparés du mode classique.",
    pick: "Choisissez un augment",
    owned: "Vos augments",
    modeAugment: "Mode augments",
    secondChance: "Encore une ! +20 s",
    tiers: { silver: "Argent", gold: "Or", prismatic: "Prismatique" },
    augments: {
      score: { name: "Courtier en points", desc: "Vous gagnez 25 % de points en plus. Cumulable trois fois." },
      clock: { name: "Recharge", desc: "Vous gagnez 10 secondes tout de suite. Proposé jusqu’à trois fois." },
      long: { name: "Longues lignes", desc: "Éliminer quatre animaux ou plus d’un coup rapporte 50 % de plus. Cumulable trois fois." },
      lineBlast: { name: "Coup de balai", desc: "Un alignement de quatre ou plus efface toute sa ligne." },
      fewer: { name: "Petite forêt", desc: "Les nouveaux animaux n’ont plus que six espèces. Les chaînes viennent plus facilement." },
      chainTime: { name: "Horloge de chaîne", desc: "Chaque chaîne ajoute 2 secondes de plus." },
      freeSwap: { name: "Échange libre", desc: "Vous pouvez échanger deux cases même sans alignement." },
      stampede: { name: "Grande migration", desc: "Un alignement de cinq ou plus efface tous les animaux de cette espèce." },
      double: { name: "Tapis", desc: "Les points sont doublés, mais le temps restant est divisé par deux." },
      wild: { name: "Forêt en fête", desc: "La fièvre démarre dès une chaîne de 3 et rapporte le triple." },
      second: { name: "Encore une", desc: "Quand le temps est écoulé, vous recevez 20 secondes et continuez. Une seule fois." },
    },
  },
  es: {
    title: "Animal Pop",
    sub: "Fiebre del bosque",
    time: "Tiempo",
    score: "Puntos",
    best: "Récord",
    combo: "Cadena",
    fever: "FIEBRE ×2",
    pause: "Pausa",
    resume: "Continuar",
    sound: "Sonido",
    over: "Terminó la fiesta del bosque",
    again: "Jugar otra vez",
    hint: "Intercambia animales vecinos para conectar tres o más.",
    restored: "Se restauró tu puzle",
    classic: "Empezar modo clásico",
    augment: "Empezar modo aumentos",
    augmentSub: "Una carta al empezar y otra cada vez que sube tu puntuación. Elige una de tres para cambiar las reglas. El reloj se detiene mientras eliges y los récords se guardan aparte del modo clásico.",
    pick: "Elige un aumento",
    owned: "Tus aumentos",
    modeAugment: "Modo aumentos",
    secondChance: "¡Otra más! +20 s",
    tiers: { silver: "Plata", gold: "Oro", prismatic: "Prismático" },
    augments: {
      score: { name: "Agente de puntos", desc: "Ganas un 25 % más de puntos. Se acumula tres veces." },
      clock: { name: "Recarga", desc: "Ganas 10 segundos al instante. Aparece hasta tres veces." },
      long: { name: "Líneas largas", desc: "Eliminar cuatro o más de una vez da un 50 % más. Se acumula tres veces." },
      lineBlast: { name: "Barrido", desc: "Una línea recta de cuatro o más limpia toda su fila o columna." },
      fewer: { name: "Bosque pequeño", desc: "Los animales nuevos son de seis tipos en vez de siete. Las cadenas salen más fácil." },
      chainTime: { name: "Reloj de cadena", desc: "Cada cadena suma 2 segundos más." },
      freeSwap: { name: "Cambio libre", desc: "Puedes intercambiar fichas aunque no formen nada." },
      stampede: { name: "Estampida", desc: "Una línea recta de cinco o más elimina todos los animales de ese tipo." },
      double: { name: "Todo o nada", desc: "Los puntos se duplican, pero tu tiempo restante se reduce a la mitad." },
      wild: { name: "Bosque desatado", desc: "La fiebre empieza con una cadena de 3 y paga el triple." },
      second: { name: "Otra más", desc: "Cuando se acaba el tiempo recibes 20 segundos y sigues. Solo una vez." },
    },
  },
} as const;
export default function AnimalPop({ locale = "ko" }: { locale?: string }) {
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const [board, setBoard] = useState<AnimalBoard>(
      () => createAnimalBoard(1).board,
    ),
    [seed, setSeed] = useState(1),
    [phase, setPhase] = useState<"briefing" | "playing" | "paused" | "picking" | "over">(
      "briefing",
    ),
    [mode, setMode] = useState<Mode>("classic"),
    [run, setRun] = useState<AnimalRun | null>(null),
    [augmentBest, setAugmentBest] = useState(0),
    [notice, setNotice] = useState(""),
    [selected, setSelected] = useState<number | null>(null),
    [score, setScore] = useState(0),
    [time, setTime] = useState(ANIMAL_TIME_LIMIT),
    [best, setBest] = useState(0),
    [combo, setCombo] = useState(0),
    [feverSeconds, setFeverSeconds] = useState(0),
    [sound, setSound] = useState(true),
    [restored, setRestored] = useState(false),
    [resolving, setResolving] = useState(false),
    [bursting, setBursting] = useState<number[]>([]),
    [falls, setFalls] = useState<AnimalFall[]>([]),
    [waveLabel, setWaveLabel] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const animationRun = useRef(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement>(null);
  const debrisRef = useRef<DebrisWorld | null>(null);
  const debrisLoadingRef = useRef(false);
  const rafRef = useRef(0);
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const feverRef = useRef(feverSeconds);
  feverRef.current = feverSeconds;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const runRef = useRef<AnimalRun | null>(run);
  runRef.current = run;
  const modeRef = useRef<Mode>(mode);
  modeRef.current = mode;
  useEffect(() => () => { animationRun.current += 1; }, []);
  useEffect(() => {
    if (phase === "playing") return;
    animationRun.current += 1;
    setResolving(false);
    setBursting([]);
    setFalls([]);
    setWaveLabel(0);
    cancelAnimationFrame(rafRef.current);
    debrisRef.current?.clear();
    fxCanvasRef.current?.getContext("2d")?.clearRect(0, 0, fxCanvasRef.current.width, fxCanvasRef.current.height);
  }, [phase]);
  // 파편 렌더 루프. 남은 파편이 없으면 스스로 멈춘다 — 상시 rAF 를 돌리지 않는다.
  const pumpDebris = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    let previous = performance.now();
    const frame = (now: number) => {
      const world = debrisRef.current;
      const canvas = fxCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!world || !canvas || !ctx) return;
      world.update(now - previous, now);
      previous = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const shard of world.shards()) {
        ctx.save();
        ctx.globalAlpha = shard.alpha * 0.9;
        ctx.translate(shard.x, shard.y);
        ctx.rotate(shard.angle);
        ctx.fillStyle = `hsl(${shard.hue} 70% 58%)`;
        ctx.fillRect(-shard.size / 2, -shard.size / 2, shard.size, shard.size);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (world.count() > 0) rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }, []);

  // 매치된 타일의 실제 위치에서 파편을 뿌린다. 그리드 간격·패딩을 계산으로
  // 추정하지 않고 DOM 이 배치한 좌표를 읽는다.
  const burstShards = useCallback((matched: number[], board: AnimalBoard) => {
    if (reducedMotionRef.current || !matched.length) return;
    const host = boardRef.current;
    const canvas = fxCanvasRef.current;
    if (!host || !canvas) return;

    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const place = () => {
      const world = debrisRef.current;
      if (!world) return;
      // spawn 은 파편의 생년을 world 의 마지막 update 시각으로 찍는데, 그 값은 첫
      // update 전까지 0 이다. BrickBreaker 처럼 상시 도는 루프 안에서는 문제가
      // 없지만 여기서는 매치 때만 루프를 돌리므로, 뿌리기 전에 시계를 맞춰야
      // 파편이 첫 프레임에 수명 초과로 즉시 사라지지 않는다.
      world.update(0, performance.now());
      const cells = host.querySelectorAll<HTMLElement>("[role='gridcell']");
      for (const index of matched) {
        const cell = cells[index];
        if (!cell) continue;
        const animal = board[Math.floor(index / 7)]?.[index % 7] ?? "";
        world.spawn(
          cell.offsetLeft + cell.offsetWidth / 2,
          cell.offsetTop + cell.offsetHeight / 2,
          animalHue(animal),
          SHARDS_PER_TILE,
        );
      }
      pumpDebris();
    };

    if (debrisRef.current) { place(); return; }
    if (debrisLoadingRef.current) return;
    debrisLoadingRef.current = true;
    void import("matter-js")
      .then((mod) => {
        if (reducedMotionRef.current || debrisRef.current) return;
        debrisRef.current = createDebrisWorld(mod.default as unknown as DebrisMatterLike, {
          width, height, cap: 90,
        });
        place();
      })
      .catch(() => { /* 장식이다. 못 불러오면 게임은 그대로 돈다. */ })
      .finally(() => { debrisLoadingRef.current = false; });
  }, [pumpDebris]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    debrisRef.current?.destroy();
    debrisRef.current = null;
  }, []);

  const tone = useCallback(
    (f: number) => {
      if (!sound) return;
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return;
      const a = new A(),
        o = a.createOscillator(),
        g = a.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.03, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.12);
      o.connect(g).connect(a.destination);
      o.start();
      o.stop(a.currentTime + 0.12);
    },
    [sound],
  );
  const scoreRef = useRef(score);
  const toneRef = useRef(tone);
  scoreRef.current = score;
  toneRef.current = tone;
  useEffect(() => {
    const b = Number(localStorage.getItem(BEST));
    if (Number.isFinite(b)) setBest(b);
    setAugmentBest(readAnimalAugmentBest());
    const s = parseAnimal(localStorage.getItem(SAVE));
    if (s) {
      setBoard(s.board);
      setSeed(s.seed);
      setScore(s.score);
      setTime(s.timeLeft);
      setFeverSeconds(s.feverSeconds);
      setRestored(true);
      setPhase("paused");
      return;
    }
    // The classic save keeps its place: an augment round is only resumed when no classic board is waiting.
    const augmented = parseAnimalRun(localStorage.getItem(ANIMAL_AUGMENT_SAVE));
    if (augmented) {
      setMode("augment");
      setRun(offerAnimalAugments(augmented.run, augmented.score));
      setBoard(augmented.board);
      setSeed(augmented.seed);
      setScore(augmented.score);
      setTime(augmented.timeLeft);
      setFeverSeconds(augmented.feverSeconds);
      setRestored(true);
      setPhase("paused");
    }
  }, []);
  // 2026-09-27: scoring and sound toggles must not restart the second ticker;
  // otherwise a ten-second Fever can be stretched by repeated matches.
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(
      () => {
        setFeverSeconds(tickAnimalFever);
        setTime((v) => {
          if (v <= 1) {
            if (modeRef.current === "augment" && runRef.current) {
              const saved = animalTimeUp(runRef.current);
              if (saved.timeLeft > 0) {
                runRef.current = saved.run;
                setRun(saved.run);
                setNotice("second");
                toneRef.current(760);
                return saved.timeLeft;
              }
              setPhase("over");
              localStorage.removeItem(ANIMAL_AUGMENT_SAVE);
              toneRef.current(140);
              // Augment scores never touch the classic best: the rules are not the same game.
              setAugmentBest(writeAnimalAugmentBest(scoreRef.current));
              return 0;
            }
            setPhase("over");
            localStorage.removeItem(SAVE);
            toneRef.current(140);
            setBest((b) => {
              const n = Math.max(b, scoreRef.current);
              localStorage.setItem(BEST, String(n));
              return n;
            });
            return 0;
          }
          return v - 1;
        });
      },
      1000,
    );
    return () => clearInterval(id);
  }, [phase]);
  useEffect(() => {
    if (mode === "augment") {
      if ((phase === "playing" || phase === "picking") && run && time > 0) {
        try { localStorage.setItem(ANIMAL_AUGMENT_SAVE, serializeAnimalRun(seed, board, score, time, feverSeconds, run)); } catch { /* storage is best-effort */ }
      }
      return;
    }
    if (phase === "playing")
      localStorage.setItem(SAVE, serializeAnimal(seed, board, score, time, feverSeconds));
  }, [phase, seed, board, score, time, feverSeconds, mode, run]);
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(""), 1800);
    return () => window.clearTimeout(id);
  }, [notice]);
  const start = (nextMode: Mode = modeRef.current) => {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    const x = createAnimalBoard(a[0]);
    const nextRun = nextMode === "augment" ? createAnimalRun(a[0]) : null;
    setMode(nextMode);
    setRun(nextRun);
    runRef.current = nextRun;
    setNotice("");
    setSeed(x.seed);
    setBoard(x.board);
    setScore(0);
    setTime(ANIMAL_TIME_LIMIT);
    setCombo(0);
    setFeverSeconds(0);
    setSelected(null);
    setResolving(false);
    setBursting([]);
    setFalls([]);
    setWaveLabel(0);
    setRestored(false);
    animationRun.current += 1;
    // An augment round opens on its first draft; the clock waits for the pick.
    setPhase(nextRun?.offer ? "picking" : "playing");
  };
  const take = (id: AnimalAugmentId) => {
    const current = runRef.current;
    if (phase !== "picking" || !current) return;
    const picked = pickAnimalAugment(current, id, time);
    const nextRun = offerAnimalAugments(picked.run, score);
    runRef.current = nextRun;
    setRun(nextRun);
    setTime(picked.timeLeft);
    tone(700);
    if (!nextRun.offer) setPhase("playing");
  };
  const pick = async (i: number) => {
    if (phase !== "playing" || resolving) return;
    if (selected === null) {
      setSelected(i);
      return;
    }
    const owned = mode === "augment" && runRef.current ? runRef.current.owned : null;
    const x = owned ? swapAnimals(board, selected, i, seed, animalMods(owned)) : swapAnimals(board, selected, i, seed);
    setSelected(null);
    if (!x.valid) {
      tone(150);
      return;
    }
    const run = ++animationRun.current;
    setResolving(true);
    const burstMs = reducedMotion ? 55 : 210;
    const fallMs = reducedMotion ? 65 : 300;
    for (let wave = 0; wave < x.steps.length; wave++) {
      const step = x.steps[wave];
      if (run !== animationRun.current) return;
      setBoard(step.before);
      setWaveLabel(wave + 1);
      setBursting(step.matched);
      burstShards(step.matched, step.before);
      tone(Math.min(920, 430 + wave * 85));
      await wait(burstMs);
      if (run !== animationRun.current) return;
      setBursting([]);
      setFalls(step.falls);
      setBoard(step.collapsed);
      await wait(fallMs);
      setFalls([]);
      if (!reducedMotion && wave < x.steps.length - 1) await wait(90);
    }
    if (run !== animationRun.current) return;
    setBoard(x.board);
    setSeed(x.seed);
    setCombo(x.waves);
    const award = owned
      ? scoreAnimalAugmented(x.cleared, x.waves, feverRef.current, owned)
      : scoreAnimalMatch(x.cleared, x.waves, feverRef.current);
    const bonus = owned ? animalAugmentedTimeBonus(x.cleared, x.waves, owned) : animalMatchTimeBonus(x.cleared, x.waves);
    feverRef.current = award.feverSeconds;
    setFeverSeconds(award.feverSeconds);
    setScore((v) => v + award.points);
    setTime((v) => addAnimalTime(v, bonus));
    setWaveLabel(0);
    setResolving(false);
    if (owned && runRef.current && phaseRef.current === "playing") {
      const offered = offerAnimalAugments(runRef.current, scoreRef.current + award.points);
      if (offered !== runRef.current) {
        runRef.current = offered;
        setRun(offered);
        if (offered.offer) setPhase("picking");
      }
    }
  };
  const fallAt = (row:number,column:number) => falls.find((fall) => fall.toRow === row && fall.column === column);
  if (phase === "briefing")
    return (
      <GameContainer title={t.title} subtitle={t.sub} onReset={() => start()}>
        <div className="overflow-hidden rounded-3xl border">
          <img
            src="/games/animal-pop-social-play.png"
            alt=""
            className="h-64 w-full object-cover sm:h-80"
          />
          <div className="p-5 text-center">
            <p className="text-sm text-muted-foreground">{t.hint}</p>
            <div className="mt-4 flex flex-col items-center gap-2">
              <button
                onClick={() => start("classic")}
                className="min-h-12 w-full max-w-xs rounded-full bg-primary px-8 font-black text-primary-foreground"
              >
                {t.classic}
              </button>
              <button
                onClick={() => start("augment")}
                className="min-h-12 w-full max-w-xs rounded-full border-2 border-fuchsia-300 bg-[linear-gradient(135deg,#fdf2f8,#eef2ff_55%,#ecfeff)] px-8 font-black text-indigo-900"
              >
                {t.augment}
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t.augmentSub}</p>
          </div>
        </div>
      </GameContainer>
    );
  return (
    <GameContainer title={t.title} subtitle={mode === "augment" ? t.modeAugment : t.sub} onReset={() => start()}>
      <div className="mx-auto max-w-md">
        <div className="grid grid-cols-3 gap-2">
          <Stat l={t.time} v={`${time}s`} />
          <Stat l={t.score} v={String(score)} />
          <Stat l={t.best} v={String(mode === "augment" ? Math.max(augmentBest, score) : best)} />
        </div>
        {restored && (
          <p
            role="status"
            className="mt-3 rounded-xl bg-primary/10 p-3 text-center text-xs font-bold text-primary"
          >
            {t.restored}
          </p>
        )}
        <div
          className="my-3 h-6 text-center text-sm font-black text-amber-600"
          aria-live="polite"
        >
          {notice === "second" ? t.secondChance : waveLabel > 0 ? `${t.combo} ×${waveLabel}` : feverSeconds > 0 ? `${t.fever} · ${feverSeconds}s` : combo > 1 ? `${t.combo} ×${combo}` : ""}
        </div>
        <div
          ref={boardRef}
          className={`relative grid grid-cols-7 gap-1 overflow-hidden rounded-3xl border bg-[#edf1df] p-2 ${bursting.length ? "animal-board-hit" : ""}`}
          role="grid"
          aria-label={t.title}
        >
          <canvas
            ref={fxCanvasRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 h-full w-full"
          />
          {board.flatMap((row, r) =>
            row.map((animal, c) => {
              const i = r * 7 + c;
              const isBursting = bursting.includes(i);
              const fall = fallAt(r,c);
              const fallRows = fall ? Math.max(1, fall.toRow - fall.fromRow) : 0;
              return (
                <button
                  key={i}
                  role="gridcell"
                  aria-label={`${animal} ${r + 1},${c + 1}`}
                  aria-pressed={selected === i}
                  onClick={() => pick(i)}
                  disabled={phase !== "playing" || resolving}
                  style={fall ? ({ "--animal-fall": `${fallRows * 108}%`, animationDuration: reducedMotion ? "65ms" : `${Math.min(430,180+fallRows*34)}ms` } as CSSProperties) : undefined}
                  className={`animal-tile relative flex aspect-square min-h-10 items-center justify-center rounded-xl bg-card shadow-sm focus-visible:ring-2 focus-visible:ring-primary ${selected === i ? "ring-2 ring-primary scale-105" : ""} ${isBursting ? "animal-burst z-10" : ""} ${fall ? "animal-fall" : ""}`}
                >
                  {ANIMAL_POP_SPRITES[animal] ? (
                    <img src={ANIMAL_POP_SPRITES[animal]} alt="" draggable={false} className="h-[78%] w-[78%] object-contain pointer-events-none select-none" />
                  ) : (
                    animal
                  )}
                  {isBursting && <><span className="animal-ring" aria-hidden="true"/><span className="animal-spark-sheet animal-spark-a" aria-hidden="true"/><span className="animal-spark-sheet animal-spark-b" aria-hidden="true"/><span className="animal-spark-sheet animal-spark-c" aria-hidden="true"/></>}
                </button>
              );
            }),
          )}
          {phase === "picking" && run?.offer && (
            <div className="absolute inset-0 z-30 flex overflow-y-auto bg-white/95 p-2" role="dialog" aria-label={t.pick}>
              {/* m-auto centres the cards when they fit and lets them scroll from the top when they do not. */}
              <div className="m-auto flex w-full flex-col gap-1.5">
              <p className="text-center text-sm font-black">{t.pick}</p>
              {run.offer.map((id) => {
                const tier = TIER_OF[id];
                const stack = run.owned[id] ?? 0;
                return (
                  <button
                    key={id}
                    onClick={() => take(id)}
                    className={`min-h-14 w-full rounded-2xl border-2 px-3 py-1.5 text-left shadow-sm active:translate-y-px focus-visible:ring-2 focus-visible:ring-primary ${TIER_TONE[tier]}`}
                  >
                    <span className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-widest opacity-70">
                      <span>{t.tiers[tier]}</span>
                      {stack > 0 ? <span>×{stack + 1}</span> : null}
                    </span>
                    <span className="block text-sm font-black">{t.augments[id].name}</span>
                    <span className="block text-[11px] font-semibold leading-tight opacity-85">{t.augments[id].desc}</span>
                  </button>
                );
              })}
              </div>
            </div>
          )}
          {phase === "paused" && (
            <button
              onClick={() => setPhase(run?.offer ? "picking" : "playing")}
              className="absolute inset-2 rounded-2xl bg-white/95 text-xl font-black"
            >
              {t.resume}
            </button>
          )}
          {phase === "over" && (
            <div
              className="absolute inset-2 flex flex-col items-center justify-center rounded-2xl bg-white/95"
              role="status"
            >
              <h3 className="text-xl font-black">{t.over}</h3>
              <p className="mt-2 text-3xl font-black text-primary">{score}</p>
              <button
                onClick={() => start()}
                className="mt-4 min-h-12 rounded-full bg-primary px-8 font-black text-primary-foreground"
              >
                {t.again}
              </button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() =>
              !resolving && setPhase((p) => (p === "playing" ? "paused" : p === "paused" ? (runRef.current?.offer ? "picking" : "playing") : p))
            }
            disabled={resolving || phase === "picking" || phase === "over"}
            className="min-h-11 rounded-xl border bg-card font-bold"
          >
            {phase === "paused" ? t.resume : t.pause}
          </button>
          <button
            onClick={() => setSound((v) => !v)}
            className="min-h-11 rounded-xl border bg-card font-bold"
          >
            {t.sound} {sound ? "ON" : "OFF"}
          </button>
        </div>
        {mode === "augment" && run && Object.keys(run.owned).length > 0 ? (
          <div className="mt-3">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t.owned}</div>
            <ul className="flex flex-wrap gap-1.5">
              {ANIMAL_AUGMENTS.filter((def) => run.owned[def.id]).map((def) => (
                <li key={def.id} title={t.augments[def.id].desc} className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${TIER_TONE[def.tier]}`}>
                  {t.augments[def.id].name}{(run.owned[def.id] ?? 0) > 1 ? ` ×${run.owned[def.id]}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <style>{`
          @keyframes animalBurst { 0%{transform:scale(1);filter:brightness(1)} 42%{transform:scale(1.34,.76);filter:brightness(1.4) saturate(1.5)} 72%{transform:scale(.72,1.3);opacity:1} 100%{transform:scale(1.6);opacity:0;filter:brightness(1.8)} }
          @keyframes animalRing { from{transform:scale(.35);opacity:.95} to{transform:scale(1.75);opacity:0} }
          @keyframes animalFall { from{transform:translateY(calc(-1 * var(--animal-fall))) scale(.92);opacity:.2} 72%{transform:translateY(5%) scale(1.03);opacity:1} to{transform:translateY(0) scale(1);opacity:1} }
          @keyframes animalBoardHit { 0%,100%{transform:translateX(0)} 30%{transform:translateX(-2px) rotate(-.25deg)} 65%{transform:translateX(2px) rotate(.25deg)} }
          @keyframes animalSparkA { to{transform:translate(-20px,-18px) rotate(80deg);opacity:0} }
          @keyframes animalSparkB { to{transform:translate(21px,-9px) scale(.2);opacity:0} }
          @keyframes animalSparkC { to{transform:translate(7px,22px) rotate(-70deg);opacity:0} }
          .animal-burst{animation:animalBurst 210ms cubic-bezier(.2,.8,.3,1) both;box-shadow:0 0 18px rgba(251,191,36,.8)}
          .animal-ring{position:absolute;inset:-3px;border:3px solid #fbbf24;border-radius:999px;animation:animalRing 220ms ease-out both;pointer-events:none}
          .animal-spark-sheet{position:absolute;width:22px;height:22px;pointer-events:none;z-index:2;background-image:url(/assets/sprites/fx/spark-sheet.png);background-repeat:no-repeat;background-size:400% 100%;animation:animalSparkSheet 240ms steps(3) both}
          .animal-spark-a{left:16%;top:18%;animation:animalSparkSheet 240ms steps(3) both,animalSparkA 240ms ease-out both}
          .animal-spark-b{left:58%;top:26%;animation:animalSparkSheet 230ms steps(3) both,animalSparkB 230ms ease-out both}
          .animal-spark-c{left:38%;top:56%;animation:animalSparkSheet 250ms steps(3) both,animalSparkC 250ms ease-out both}
          @keyframes animalSparkSheet { from { background-position: 0 0; } to { background-position: 100% 0; } }
          .animal-fall{animation-name:animalFall;animation-timing-function:cubic-bezier(.18,.72,.22,1.08);animation-fill-mode:both}
          .animal-board-hit{animation:animalBoardHit 150ms ease-out}
          @media(prefers-reduced-motion:reduce){.animal-burst{animation-duration:55ms;box-shadow:none}.animal-ring,.animal-spark-sheet{display:none}.animal-board-hit{animation:none}.animal-fall{animation-duration:65ms!important}}
        `}</style>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {t.hint}
        </p>
      </div>
    </GameContainer>
  );
}
function Stat({ l, v }: { l: string; v: string }) {
  return (
    <div className="rounded-2xl border bg-card p-2 text-center">
      <div className="text-lg font-black">{v}</div>
      <div className="text-[10px] text-muted-foreground">{l}</div>
    </div>
  );
}
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { hasWebGL } from "@/lib/games/webgl";
import { recordAchievementEvent, recordResult } from "@/lib/games/records";
import {
  BEST_KEY,
  HORIZON_DAYS,
  SAVE_KEY,
  STALLS,
  forecastShift,
  formatUsd,
  morning,
  parseShareQuery,
  playPeriod,
  repayCredit,
  shareQuery,
  startRun,
  takeCredit,
  type EventId,
  type HorizonId,
  type Prep,
  type Richness,
  type RunState,
  type StallId,
  type Weather,
} from "@/lib/games/run-a-business";

const COPY = {
  ko: {
    title: "하루 장사",
    cash: "현금",
    day: "일차",
    seed: "시드",
    open: "장사 열기",
    rematch: "이 아침 다시",
    share: "이 시드 공유",
    copied: "링크를 복사했습니다",
    reputation: "평판",
    credit: "오늘만 외상 $5",
    repay: "외상 갚기",
    debt: "빚",
    again: "다시 시작",
    price: "가격",
    plain: "담백",
    normal: "보통",
    rich: "진하게",
    sold: "판매",
    revenue: "매출",
    cogs: "원가",
    waste: "폐기",
    profit: "손익",
    bust: "파산. 현금과 재고가 없습니다.",
    weather: { clear: "맑음", hot: "더움", cold: "추움", rain: "비" },
    event: { none: "평범한 아침", overtime: "근처 야근이 많다", food_scare: "식중독 뉴스", cost_hike: "재료값이 올랐다" },
    hint: "회계 수업이 아닙니다. 이 기기에만 저장됩니다.",
    oiyo: "손익이 궁금하면 oiyo 손익 게임",
    stall: "업종",
    choose: "어떤 장사를 하시겠습니까?",
    start: "이 업종으로 시작",
    other: "다른 업종",
    skip: "장부 보기",
    loading: "가게를 차리는 중…",
    statement: "손익계산서",
    gross: "매출총이익",
    cogsTip: "매출원가 — 팔린 것에 들어간 재료값.",
    wasteTip: "폐기 — 못 팔고 버린 재료.",
    opexTip: "고정비 — 손님이 없어도 나가는 임대·전기·인건비.",
    profitTip: "순손익 — 매출 − 원가 − 폐기 − 고정비 − 감가.",
    profitCash: "흑자여도 사입·폐기가 크면 통장은 줄 수 있어요. 이익이랑 현금은 다른 줄입니다.",
    overhead: "고정비",
    horizon: "기간",
    sheet: "대차대조표",
    assets: "자산",
    inventory: "재고",
    equipment: "설비",
    equity: "자본",
    dep: "감가",
    depTip: "감가상각 — 설비 값이 기간마다 줄어듭니다. 현금은 안 나갑니다.",
    sheetTip: "자산 = 자본. 빚은 이 판에서 아직 없습니다.",
    horizons: { day: "하루", week: "한 주", month: "한 달", year: "일 년" },
    stalls: {
      ramen: { name: "라면", keys: { noodles: "면", soup: "스프", topping: "토핑" } },
      lemonade: { name: "레모네이드", keys: { lemons: "레몬", sugar: "설탕", ice: "얼음" } },
      pcbang: { name: "피씨방", keys: { snacks: "간식", drinks: "음료", seats: "자리" } },
      salon: { name: "미용실", keys: { dye: "염모", shampoo: "샴푸", chairs: "의자" } },
      retail: { name: "도소매", keys: { cases: "박스", shelf: "진열" } },
    },
  },
  en: {
    title: "Run a Business",
    cash: "Cash",
    day: "Day",
    seed: "Seed",
    open: "Open shop",
    rematch: "This morning again",
    share: "Share this seed",
    copied: "Link copied",
    reputation: "Reputation",
    credit: "Borrow $5 today",
    repay: "Repay credit",
    debt: "Debt",
    again: "Start over",
    price: "Price",
    plain: "Plain",
    normal: "Normal",
    rich: "Rich",
    sold: "Sold",
    revenue: "Sales",
    cogs: "COGS",
    waste: "Waste",
    profit: "P&L",
    bust: "Bust. No cash and no stock.",
    weather: { clear: "Clear", hot: "Hot", cold: "Cold", rain: "Rain" },
    event: { none: "A quiet morning", overtime: "Nearby overtime crowd", food_scare: "Food-safety news", cost_hike: "Ingredient prices rose" },
    hint: "Not an accounting class. Saved on this device only.",
    oiyo: "See the income-statement game on oiyo",
    stall: "Stall",
    choose: "Which stall will you open?",
    start: "Open this stall",
    other: "Another stall",
    skip: "See the books",
    loading: "Setting up the stall…",
    statement: "Income statement",
    gross: "Gross profit",
    cogsTip: "COGS — ingredients that went into what sold.",
    wasteTip: "Waste — leftover stock thrown out.",
    opexTip: "Overhead — rent, power, labor even if nobody comes.",
    profitTip: "Net — sales minus COGS, waste, overhead, depreciation.",
    profitCash: "Profit can be up while cash is down. Buying stock and waste leave the register even when the P&L looks fine.",
    overhead: "Overhead",
    horizon: "Horizon",
    sheet: "Balance sheet",
    assets: "Assets",
    inventory: "Inventory",
    equipment: "Equipment",
    equity: "Equity",
    dep: "Depreciation",
    depTip: "Depreciation — equipment loses value each period. Cash does not leave.",
    sheetTip: "Assets equal equity. This board has no debt yet.",
    horizons: { day: "1 day", week: "1 week", month: "1 month", year: "1 year" },
    stalls: {
      ramen: { name: "Ramen", keys: { noodles: "Noodles", soup: "Soup", topping: "Topping" } },
      lemonade: { name: "Lemonade", keys: { lemons: "Lemons", sugar: "Sugar", ice: "Ice" } },
      pcbang: { name: "PC bang", keys: { snacks: "Snacks", drinks: "Drinks", seats: "Seats" } },
      salon: { name: "Salon", keys: { dye: "Dye", shampoo: "Shampoo", chairs: "Chairs" } },
      retail: { name: "Wholesale", keys: { cases: "Cases", shelf: "Shelf" } },
    },
  },
  ja: {
    title: "一日商売",
    cash: "現金",
    day: "日目",
    seed: "シード",
    open: "開店",
    rematch: "この朝をもう一度",
    share: "このシードを共有",
    copied: "リンクをコピーしました",
    reputation: "評判",
    credit: "今日だけ$5の掛け",
    repay: "掛けを返す",
    debt: "借金",
    again: "やり直す",
    price: "価格",
    plain: "あっさり",
    normal: "普通",
    rich: "濃い",
    sold: "販売",
    revenue: "売上",
    cogs: "原価",
    waste: "廃棄",
    profit: "損益",
    bust: "倒産。現金も在庫もありません。",
    weather: { clear: "晴れ", hot: "暑い", cold: "寒い", rain: "雨" },
    event: { none: "普通の朝", overtime: "近くで残業が多い", food_scare: "食中毒ニュース", cost_hike: "材料費が上がった" },
    hint: "会計の授業ではありません。この端末にだけ保存します。",
    oiyo: "損益はoiyoの損益ゲームへ",
    stall: "業種",
    choose: "どの商売を始めますか？",
    start: "この業種で始める",
    other: "別の業種",
    skip: "帳簿を見る",
    loading: "店を出しています…",
    statement: "損益計算書",
    gross: "売上総利益",
    cogsTip: "売上原価。売れた分の材料代。",
    wasteTip: "廃棄。売れ残った材料。",
    opexTip: "固定費。客がいなくてもかかる電気・家賃・人件費。",
    profitTip: "純損益。売上−原価−廃棄−固定費−減価償却。",
    profitCash: "黒字でも仕入れや廃棄が大きければ手元現金は減ります。利益と現金は別の行です。",
    overhead: "固定費",
    horizon: "期間",
    sheet: "貸借対照表",
    assets: "資産",
    inventory: "在庫",
    equipment: "設備",
    equity: "資本",
    dep: "減価償却",
    depTip: "減価償却。設備の価値が期間ごとに減ります。現金は減りません。",
    sheetTip: "資産＝資本。この盤に負債はまだありません。",
    horizons: { day: "一日", week: "一週間", month: "一ヶ月", year: "一年" },
    stalls: {
      ramen: { name: "ラーメン", keys: { noodles: "麺", soup: "スープ", topping: "トッピング" } },
      lemonade: { name: "レモネード", keys: { lemons: "レモン", sugar: "砂糖", ice: "氷" } },
      pcbang: { name: "ネットカフェ", keys: { snacks: "軽食", drinks: "ドリンク", seats: "席" } },
      salon: { name: "美容室", keys: { dye: "カラー", shampoo: "シャンプー", chairs: "椅子" } },
      retail: { name: "卸小売", keys: { cases: "ケース", shelf: "棚" } },
    },
  },
  zh: {
    title: "一天生意",
    cash: "现金",
    day: "第几天",
    seed: "种子",
    open: "开张",
    rematch: "再打这个早晨",
    share: "分享这个种子",
    copied: "已复制链接",
    reputation: "口碑",
    credit: "今天先赊 $5",
    repay: "还赊账",
    debt: "负债",
    again: "重来",
    price: "价格",
    plain: "清淡",
    normal: "普通",
    rich: "浓郁",
    sold: "售出",
    revenue: "收入",
    cogs: "成本",
    waste: "报废",
    profit: "损益",
    bust: "破产。没有现金和库存。",
    weather: { clear: "晴", hot: "热", cold: "冷", rain: "雨" },
    event: { none: "平常的早晨", overtime: "附近加班的人多", food_scare: "食物中毒新闻", cost_hike: "原料涨价" },
    hint: "这不是会计课。只保存在这台设备。",
    oiyo: "想看损益结构请到 oiyo",
    stall: "业种",
    choose: "要开哪一门生意？",
    start: "用这个业种开始",
    other: "换业种",
    skip: "查看账本",
    loading: "正在摆摊…",
    statement: "利润表",
    gross: "毛利",
    cogsTip: "销货成本——卖掉的那部分材料。",
    wasteTip: "报废——没卖掉扔掉的材料。",
    opexTip: "固定费用——没客人也要付的电、租、人工。",
    profitTip: "净损益——收入减成本、报废、固定费用和折旧。",
    profitCash: "就算账面盈利，进货和报废多了，抽屉里的现金也会少。利润和现金不是同一行。",
    overhead: "固定费用",
    horizon: "期间",
    sheet: "资产负债表",
    assets: "资产",
    inventory: "存货",
    equipment: "设备",
    equity: "权益",
    dep: "折旧",
    depTip: "折旧——设备每期减值，现金不流出。",
    sheetTip: "资产=权益。此盘暂无负债。",
    horizons: { day: "一天", week: "一周", month: "一月", year: "一年" },
    stalls: {
      ramen: { name: "拉面", keys: { noodles: "面", soup: "汤底", topping: "浇头" } },
      lemonade: { name: "柠檬水", keys: { lemons: "柠檬", sugar: "糖", ice: "冰" } },
      pcbang: { name: "网吧", keys: { snacks: "零食", drinks: "饮料", seats: "座位" } },
      salon: { name: "美发", keys: { dye: "染膏", shampoo: "洗发", chairs: "座位" } },
      retail: { name: "批零", keys: { cases: "整箱", shelf: "货架" } },
    },
  },
  fr: {
    title: "Une journée de commerce",
    cash: "Caisse",
    day: "Jour",
    seed: "Graine",
    open: "Ouvrir",
    rematch: "Ce matin encore",
    share: "Partager cette graine",
    copied: "Lien copié",
    reputation: "Réputation",
    credit: "Emprunter 5 $ aujourd'hui",
    repay: "Rembourser",
    debt: "Dette",
    again: "Recommencer",
    price: "Prix",
    plain: "Léger",
    normal: "Normal",
    rich: "Corsé",
    sold: "Vendus",
    revenue: "Ventes",
    cogs: "Coût",
    waste: "Pertes",
    profit: "Résultat",
    bust: "Faillite. Plus d'argent ni de stock.",
    weather: { clear: "Beau", hot: "Chaud", cold: "Froid", rain: "Pluie" },
    event: { none: "Matin calme", overtime: "Heures sup autour", food_scare: "Alerte alimentaire", cost_hike: "Ingrédients plus chers" },
    hint: "Ce n'est pas un cours de comptabilité. Sauvé sur cet appareil seulement.",
    oiyo: "Voir le jeu de compte de résultat sur oiyo",
    stall: "Stand",
    choose: "Quel commerce ouvrez-vous ?",
    start: "Ouvrir ce stand",
    other: "Un autre stand",
    skip: "Voir les livres",
    loading: "On prépare le stand…",
    statement: "Compte de résultat",
    gross: "Marge brute",
    cogsTip: "Coût des ventes — ingrédients des ventes.",
    wasteTip: "Pertes — stock jeté.",
    opexTip: "Charges — loyer, électricité, main-d'œuvre même sans clients.",
    profitTip: "Net — ventes moins coûts, pertes, charges et amortissement.",
    profitCash: "Le résultat peut être vert et la caisse rouge. Achats et pertes sortent du tiroir.",
    overhead: "Charges",
    horizon: "Horizon",
    sheet: "Bilan",
    assets: "Actif",
    inventory: "Stock",
    equipment: "Matériel",
    equity: "Capitaux",
    dep: "Amortissement",
    depTip: "Amortissement — le matériel perd de la valeur. L'argent ne sort pas.",
    sheetTip: "Actif = capitaux. Pas de dette sur ce plateau.",
    horizons: { day: "1 jour", week: "1 semaine", month: "1 mois", year: "1 an" },
    stalls: {
      ramen: { name: "Ramen", keys: { noodles: "Nouilles", soup: "Bouillon", topping: "Garniture" } },
      lemonade: { name: "Limonade", keys: { lemons: "Citrons", sugar: "Sucre", ice: "Glace" } },
      pcbang: { name: "Cybercafé", keys: { snacks: "Snacks", drinks: "Boissons", seats: "Places" } },
      salon: { name: "Salon", keys: { dye: "Coloration", shampoo: "Shampoing", chairs: "Fauteuils" } },
      retail: { name: "Grossiste", keys: { cases: "Cartons", shelf: "Rayon" } },
    },
  },
  es: {
    title: "Un día de negocio",
    cash: "Caja",
    day: "Día",
    seed: "Semilla",
    open: "Abrir",
    rematch: "Esta mañana otra vez",
    share: "Compartir esta semilla",
    copied: "Enlace copiado",
    reputation: "Reputación",
    credit: "Pedir $5 hoy",
    repay: "Pagar la deuda",
    debt: "Deuda",
    again: "Empezar de nuevo",
    price: "Precio",
    plain: "Suave",
    normal: "Normal",
    rich: "Intenso",
    sold: "Vendidos",
    revenue: "Ventas",
    cogs: "Costo",
    waste: "Merma",
    profit: "Resultado",
    bust: "Quiebra. Sin efectivo ni stock.",
    weather: { clear: "Despejado", hot: "Calor", cold: "Frío", rain: "Lluvia" },
    event: { none: "Mañana quieta", overtime: "Horas extra cerca", food_scare: "Noticia de intoxicación", cost_hike: "Subieron los insumos" },
    hint: "No es una clase de contabilidad. Solo se guarda en este aparato.",
    oiyo: "Ver el juego de resultados en oiyo",
    stall: "Puesto",
    choose: "¿Qué negocio abres?",
    start: "Abrir este puesto",
    other: "Otro puesto",
    skip: "Ver el libro",
    loading: "Preparando el puesto…",
    statement: "Estado de resultados",
    gross: "Beneficio bruto",
    cogsTip: "Costo de ventas — ingredientes de lo vendido.",
    wasteTip: "Merma — stock tirado.",
    opexTip: "Fijos — luz, renta y labor aunque no venga nadie.",
    profitTip: "Neto — ventas menos costo, merma, fijos y depreciación.",
    profitCash: "Puedes ganar en el P&L y perder efectivo. Compras y merma salen de la caja.",
    overhead: "Fijos",
    horizon: "Horizonte",
    sheet: "Balance",
    assets: "Activo",
    inventory: "Inventario",
    equipment: "Equipo",
    equity: "Patrimonio",
    dep: "Depreciación",
    depTip: "Depreciación — el equipo pierde valor. El efectivo no sale.",
    sheetTip: "Activo = patrimonio. Esta mesa aún no tiene deuda.",
    horizons: { day: "1 día", week: "1 semana", month: "1 mes", year: "1 año" },
    stalls: {
      ramen: { name: "Ramyeon", keys: { noodles: "Fideos", soup: "Caldo", topping: "Topping" } },
      lemonade: { name: "Limonada", keys: { lemons: "Limones", sugar: "Azúcar", ice: "Hielo" } },
      pcbang: { name: "Cibercafé", keys: { snacks: "Snacks", drinks: "Bebidas", seats: "Asientos" } },
      salon: { name: "Salón", keys: { dye: "Tinte", shampoo: "Champú", chairs: "Sillas" } },
      retail: { name: "Mayorista", keys: { cases: "Cajas", shelf: "Estante" } },
    },
  },
} as const;

const Scene = lazy(() => import("./RunABusinessScene"));

function newSeed(): string {
  return `d${Math.floor(Math.random() * 1_000_000)}`;
}

function persist(run: RunState, books?: RunState["result"]) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(run));
    const bestRaw = localStorage.getItem(BEST_KEY);
    const best = bestRaw ? (JSON.parse(bestRaw) as { cashCents: number }) : { cashCents: 0 };
    if (run.cashCents > (best.cashCents ?? 0)) {
      localStorage.setItem(BEST_KEY, JSON.stringify({ cashCents: run.cashCents, stall: run.stall, horizon: run.horizon, currency: "USD" }));
    }
    if (books) {
      recordResult("run-a-business", books.profitCents > 0 ? "w" : run.bust ? "l" : "d");
    }
  } catch {
    /* private mode */
  }
}

function Stepper({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-3 py-2">
      <span className="text-sm font-bold">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" className="min-h-11 min-w-11 rounded-xl border bg-muted text-lg font-black" onClick={() => onChange(Math.max(0, value - step))}>
          −
        </button>
        <span className="w-14 text-center font-mono text-sm font-bold">{step >= 50 ? formatUsd(value) : value}</span>
        <button type="button" className="min-h-11 min-w-11 rounded-xl border bg-muted text-lg font-black" onClick={() => onChange(value + step)}>
          +
        </button>
      </div>
    </div>
  );
}

function defaultPrep(stall: StallId): Prep {
  const pack = STALLS[stall];
  const buy = pack.empty();
  for (const key of pack.keys) buy[key] = key === "seats" || key === "chairs" ? 6 : key === "shelf" ? 12 : 12;
  return { buy, priceCents: pack.refPrice, richness: 1 };
}

export default function RunABusiness({ locale }: { locale: Locale }) {
  const t = COPY[locale] ?? COPY.en;
  const [seed, setSeed] = useState("s10");
  const [horizon, setHorizon] = useState<HorizonId>("day");
  const [phase, setPhase] = useState<"pick" | "play">("pick");
  const [rush, setRush] = useState<{ demand: number; sold: number } | null>(null);
  const [run, setRun] = useState<RunState>(() => startRun({ seed: "s10" }));
  const [prep, setPrep] = useState<Prep>(() => defaultPrep("ramen"));
  const [copied, setCopied] = useState(false);
  const card = useMemo(() => morning(run.seed, run.day), [run.seed, run.day]);
  const pack = STALLS[run.stall];
  const stallCopy = t.stalls[run.stall];
  const books = run.period ?? run.result;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const shared = parseShareQuery(window.location.search);
    if (shared.seed) {
      setSeed(shared.seed);
      setHorizon(shared.horizon ?? "day");
      if (shared.stall) {
        setPrep(defaultPrep(shared.stall));
        setRun(startRun({ seed: shared.seed, stall: shared.stall, horizon: shared.horizon }));
        setPhase("play");
      }
    }
  }, []);

  const apply = (next: RunState) => {
    setRun(next);
    persist(next, next.period ?? next.result);
  };

  const rematch = () => {
    apply(startRun({ seed: run.seed, stall: run.stall, horizon: run.horizon }));
    setRush(null);
  };

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}${shareQuery(run)}`;
    try {
      if (navigator.share) await navigator.share({ url });
      else await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      } catch {
        /* ignore */
      }
    }
  };

  const closeShift = () => {
    recordAchievementEvent("run-a-business", "played");
    apply(playPeriod(run, prep));
    setRush(null);
  };

  const openShop = () => {
    if (horizon === "day" && hasWebGL()) {
      const forecast = forecastShift(run, prep);
      setRush({ demand: forecast.demand, sold: forecast.sold });
      return;
    }
    apply(playPeriod(run, prep));
  };

  const pickStall = (stall: StallId) => {
    setPrep(defaultPrep(stall));
    apply(startRun({ seed: seed || newSeed(), stall, horizon }));
    setPhase("play");
    setRush(null);
  };

  const weather = t.weather[card.weather as Weather];
  const event = t.event[card.eventId as EventId];

  if (phase === "pick") {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t.stall}</p>
          <h2 className="text-2xl font-black">{t.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.choose}</p>
        </div>
        <label className="block text-sm">
          <span className="font-bold">{t.seed}</span>
          <input value={seed} onChange={(e) => setSeed(e.target.value)} className="mt-1 h-11 w-full rounded-xl border px-3 font-mono" />
        </label>
        <div>
          <p className="mb-2 text-sm font-bold">{t.horizon}</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(HORIZON_DAYS) as HorizonId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setHorizon(id)}
                className={`min-h-11 rounded-xl px-3 text-sm font-black ${horizon === id ? "bg-slate-900 text-white" : "border bg-white"}`}
              >
                {t.horizons[id]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3">
          {(Object.keys(STALLS) as StallId[]).map((id) => (
            <button key={id} type="button" onClick={() => pickStall(id)} className="min-h-14 rounded-2xl border bg-white px-4 py-3 text-left">
              <p className="font-black">{t.stalls[id].name}</p>
              <p className="text-xs text-muted-foreground">{t.start} · {t.horizons[horizon]}</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t.hint}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {stallCopy.name} · {t.horizons[run.horizon]} · USD
        </p>
        <h2 className="text-2xl font-black">{t.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.day} {run.day} · {t.cash} {formatUsd(run.cashCents)} · {t.reputation} {run.reputation ?? 50}
          {(run.debtCents ?? 0) > 0 ? ` · ${t.debt} ${formatUsd(run.debtCents)}` : ""}
        </p>
      </div>

      {rush && (
        <Suspense fallback={<p className="rounded-2xl border p-6 text-sm font-bold">{t.loading}</p>}>
          <Scene
            stall={run.stall}
            weather={card.weather}
            sold={rush.sold}
            demand={rush.demand}
            prep={prep}
            onBuy={(key) => setPrep((cur) => ({ ...cur, buy: { ...cur.buy, [key]: (cur.buy[key] ?? 0) + 1 } }))}
            onDone={closeShift}
            skipLabel={t.skip}
          />
        </Suspense>
      )}

      <label className="block text-sm">
        <span className="font-bold">{t.seed}</span>
        <input
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          onBlur={() => apply(startRun({ seed: seed || newSeed(), stall: run.stall, horizon: run.horizon }))}
          className="mt-1 h-11 w-full rounded-xl border px-3 font-mono"
        />
      </label>

      <div className="rounded-2xl border bg-lime-50/60 p-4 text-sm leading-6">
        <p className="font-black">{weather}</p>
        <p className="text-muted-foreground">{event}</p>
      </div>

      {books && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border p-4 text-sm">
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">{t.statement}</p>
            <dl className="grid grid-cols-2 gap-2">
              <div>{t.sold}</div><div className="text-right font-mono">{books.sold}</div>
              <div>{t.revenue}</div><div className="text-right font-mono">{formatUsd(books.revenueCents)}</div>
              <div title={t.cogsTip}>{t.cogs}</div><div className="text-right font-mono">{formatUsd(books.cogsCents)}</div>
              <div className="text-stone-500">{t.gross}</div>
              <div className="text-right font-mono text-stone-500">{formatUsd(books.revenueCents - books.cogsCents)}</div>
              <div title={t.wasteTip}>{t.waste}</div><div className="text-right font-mono">{formatUsd(books.wasteCents)}</div>
              <div title={t.opexTip}>{t.overhead}</div><div className="text-right font-mono">{formatUsd(books.overheadCents)}</div>
              <div title={t.depTip}>{t.dep}</div><div className="text-right font-mono">{formatUsd(books.depreciationCents)}</div>
              <div className="font-black" title={t.profitTip}>{t.profit}</div>
              <div className={`text-right font-mono font-black ${books.profitCents < 0 ? "text-red-700" : "text-emerald-800"}`}>
                {formatUsd(books.profitCents)}
              </div>
            </dl>
            {(books.profitCents > 0 && (books.wasteCents > 0 || books.purchaseCents > books.revenueCents - books.cogsCents)) && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{t.profitCash}</p>
            )}
            <p className="mt-3 text-xs leading-5 text-muted-foreground">{t.cogsTip} {t.depTip}</p>
          </div>
          {run.sheet && (
            <div className="rounded-2xl border p-4 text-sm">
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">{t.sheet}</p>
              <dl className="grid grid-cols-2 gap-2">
                <div>{t.cash}</div><div className="text-right font-mono">{formatUsd(run.sheet.cashCents)}</div>
                <div>{t.inventory}</div><div className="text-right font-mono">{formatUsd(run.sheet.inventoryCents)}</div>
                <div>{t.equipment}</div><div className="text-right font-mono">{formatUsd(run.sheet.equipmentCents)}</div>
                <div className="font-black">{t.assets}</div>
                <div className="text-right font-mono font-black">{formatUsd(run.sheet.assetsCents)}</div>
                <div>{t.debt}</div><div className="text-right font-mono">{formatUsd(run.sheet.liabilitiesCents)}</div>
                <div>{t.equity}</div><div className="text-right font-mono">{formatUsd(run.sheet.equityCents)}</div>
              </dl>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{t.sheetTip}</p>
            </div>
          )}
        </div>
      )}

      {run.bust ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{t.bust}</p>
      ) : rush ? null : (
        <>
          {pack.keys.map((key) => (
            <Stepper
              key={key}
              label={stallCopy.keys[key as keyof typeof stallCopy.keys] ?? key}
              value={prep.buy[key] ?? 0}
              step={1}
              onChange={(n) => setPrep({ ...prep, buy: { ...prep.buy, [key]: n } })}
            />
          ))}
          <Stepper label={t.price} value={prep.priceCents} step={50} onChange={(n) => setPrep({ ...prep, priceCents: Math.max(50, n) })} />
          <div className="flex gap-2">
            {([0, 1, 2] as Richness[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setPrep({ ...prep, richness: r })}
                className={`min-h-11 flex-1 rounded-full px-3 text-sm font-black ${prep.richness === r ? "bg-slate-900 text-white" : "border bg-white"}`}
              >
                {r === 0 ? t.plain : r === 1 ? t.normal : t.rich}
              </button>
            ))}
          </div>
          <button type="button" onClick={openShop} className="min-h-11 w-full rounded-2xl bg-slate-900 text-sm font-black text-white">
            {t.open}
          </button>
        </>
      )}

      <div className="flex gap-2">
        {!run.creditUsed && (
          <button type="button" className="min-h-11 flex-1 rounded-xl border text-sm font-bold" onClick={() => apply(takeCredit(run))}>
            {t.credit}
          </button>
        )}
        {(run.debtCents ?? 0) > 0 && (
          <button type="button" className="min-h-11 flex-1 rounded-xl border text-sm font-bold" onClick={() => apply(repayCredit(run))}>
            {t.repay}
          </button>
        )}
        <button type="button" className="min-h-11 flex-1 rounded-xl border text-sm font-bold" onClick={rematch}>
          {t.rematch}
        </button>
        <button type="button" className="min-h-11 flex-1 rounded-xl border text-sm font-bold" onClick={() => void share()}>
          {copied ? t.copied : t.share}
        </button>
      </div>
      <div className="flex gap-2">
        <button type="button" className="min-h-11 flex-1 rounded-xl border text-sm font-bold" onClick={() => apply(startRun({ seed: seed || newSeed(), stall: run.stall, horizon: run.horizon }))}>
          {t.again}
        </button>
        <button type="button" className="min-h-11 flex-1 rounded-xl border text-sm font-bold" onClick={() => setPhase("pick")}>
          {t.other}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{t.hint}</p>
      <p className="text-sm">
        <a className="font-bold underline" href={`https://oiyo.net/${locale}/income-statement-game/`}>{t.oiyo}</a>
      </p>
    </div>
  );
}

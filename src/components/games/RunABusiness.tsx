import { lazy, Suspense, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { hasWebGL } from "@/lib/games/webgl";
import {
  BEST_KEY,
  SAVE_KEY,
  STALLS,
  forecastShift,
  formatUsd,
  morning,
  playDay,
  startRun,
  type EventId,
  type Prep,
  type Richness,
  type RunState,
  type StallId,
  type Weather,
} from "@/lib/games/run-a-business";

const COPY = {
  ko: {
    title: "하루 장사",
    sub: "라면 포장마차 · 하루 · USD",
    cash: "현금",
    day: "일차",
    seed: "시드",
    open: "장사 열기",
    next: "내일",
    quit: "그만",
    again: "다시 시작",
    buyNoodles: "면",
    buySoup: "스프",
    buyTopping: "토핑",
    price: "가격",
    recipe: "레시피",
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
    event: {
      none: "평범한 아침",
      overtime: "근처 야근이 많다",
      food_scare: "식중독 뉴스",
      cost_hike: "재료값이 올랐다",
    },
    hint: "회계 수업이 아닙니다. 이 기기에만 저장됩니다.",
    books: "오늘 장부",
    oiyo: "손익이 궁금하면 oiyo 손익 게임",
    stall: "업종",
    choose: "어떤 장사를 하시겠습니까?",
    start: "이 업종으로 시작",
    other: "다른 업종",
    skip: "장부 보기",
    loading: "가게를 차리는 중…",
    unavailable: "이 브라우저에서는 3D를 켤 수 없어 바로 장부로 갑니다.",
    statement: "손익계산서",
    gross: "매출총이익",
    cogsTip: "매출원가 — 팔린 그릇에 들어간 재료값.",
    wasteTip: "폐기 — 못 팔고 버린 재료. 이익에서 빠집니다.",
    opexTip: "고정비 — 손님이 없어도 나가는 임대·전기.",
    profitTip: "순손익 — 매출 − 원가 − 폐기 − 고정비.",
    overhead: "고정비",
    stalls: {
      ramen: { name: "라면", keys: { noodles: "면", soup: "스프", topping: "토핑" } },
      lemonade: { name: "레모네이드", keys: { lemons: "레몬", sugar: "설탕", ice: "얼음" } },
      pcbang: { name: "피씨방", keys: { snacks: "간식", drinks: "음료", seats: "자리" } },
    },
  },
  en: {
    title: "Run a Business",
    sub: "Ramen stall · one day · USD",
    cash: "Cash",
    day: "Day",
    seed: "Seed",
    open: "Open shop",
    next: "Next day",
    quit: "Stop",
    again: "Start over",
    buyNoodles: "Noodles",
    buySoup: "Soup",
    buyTopping: "Topping",
    price: "Price",
    recipe: "Recipe",
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
    event: {
      none: "A quiet morning",
      overtime: "Nearby overtime crowd",
      food_scare: "Food-safety news",
      cost_hike: "Ingredient prices rose",
    },
    hint: "Not an accounting class. Saved on this device only.",
    books: "Today's books",
    oiyo: "See the income-statement game on oiyo",
    stall: "Stall",
    choose: "Which stall will you open?",
    start: "Open this stall",
    other: "Another stall",
    skip: "See the books",
    loading: "Setting up the stall…",
    unavailable: "WebGL is off here, so we skip to the books.",
    statement: "Income statement",
    gross: "Gross profit",
    cogsTip: "COGS — ingredients that went into bowls sold.",
    wasteTip: "Waste — leftover stock thrown out.",
    opexTip: "Overhead — rent and power even if nobody comes.",
    profitTip: "Net — sales minus COGS, waste, and overhead.",
    overhead: "Overhead",
    stalls: {
      ramen: { name: "Ramen", keys: { noodles: "Noodles", soup: "Soup", topping: "Topping" } },
      lemonade: { name: "Lemonade", keys: { lemons: "Lemons", sugar: "Sugar", ice: "Ice" } },
      pcbang: { name: "PC bang", keys: { snacks: "Snacks", drinks: "Drinks", seats: "Seats" } },
    },
  },
  ja: {
    title: "一日商売",
    sub: "ラーメン屋台 · 一日 · USD",
    cash: "現金",
    day: "日目",
    seed: "シード",
    open: "開店",
    next: "翌日",
    quit: "やめる",
    again: "やり直す",
    buyNoodles: "麺",
    buySoup: "スープ",
    buyTopping: "トッピング",
    price: "価格",
    recipe: "レシピ",
    plain: "あっさり",
    normal: "普通",
    rich: "こってり",
    sold: "販売",
    revenue: "売上",
    cogs: "原価",
    waste: "廃棄",
    profit: "損益",
    bust: "破産。現金も在庫もありません。",
    weather: { clear: "晴れ", hot: "暑い", cold: "寒い", rain: "雨" },
    event: {
      none: "いつもの朝",
      overtime: "近くで残業が多い",
      food_scare: "食中毒のニュース",
      cost_hike: "仕入れ値が上がった",
    },
    hint: "会計の授業ではありません。この端末にだけ保存します。",
    books: "今日の帳簿",
    oiyo: "損益はoiyoの損益ゲームへ",
    stall: "業種",
    choose: "どの商売を始めますか？",
    start: "この業種で始める",
    other: "別の業種",
    skip: "帳簿を見る",
    loading: "店を出しています…",
    unavailable: "このブラウザでは3Dを使えないため帳簿へ進みます。",
    statement: "損益計算書",
    gross: "売上総利益",
    cogsTip: "売上原価。売れた一杯に使った材料代。",
    wasteTip: "廃棄。売れ残った材料。",
    opexTip: "固定費。客がいなくてもかかる電気・家賃。",
    profitTip: "純損益。売上−原価−廃棄−固定費。",
    overhead: "固定費",
    stalls: {
      ramen: { name: "ラーメン", keys: { noodles: "麺", soup: "スープ", topping: "トッピング" } },
      lemonade: { name: "レモネード", keys: { lemons: "レモン", sugar: "砂糖", ice: "氷" } },
      pcbang: { name: "ネットカフェ", keys: { snacks: "軽食", drinks: "ドリンク", seats: "席" } },
    },
  },
  zh: {
    title: "一天生意",
    sub: "拉面摊 · 一天 · USD",
    cash: "现金",
    day: "第几天",
    seed: "种子",
    open: "开张",
    next: "明天",
    quit: "收摊",
    again: "重来",
    buyNoodles: "面",
    buySoup: "汤底",
    buyTopping: "浇头",
    price: "价格",
    recipe: "配方",
    plain: "清淡",
    normal: "普通",
    rich: "浓郁",
    sold: "卖出",
    revenue: "销售额",
    cogs: "成本",
    waste: "报废",
    profit: "损益",
    bust: "破产。没有现金也没有库存。",
    weather: { clear: "晴", hot: "热", cold: "冷", rain: "雨" },
    event: {
      none: "平常的早晨",
      overtime: "附近加班的人多",
      food_scare: "食物中毒新闻",
      cost_hike: "进货涨价",
    },
    hint: "这不是会计课。只保存在这台设备。",
    books: "今日账本",
    oiyo: "想看损益结构请到 oiyo",
    stall: "业种",
    choose: "要开哪一门生意？",
    start: "用这个业种开始",
    other: "换业种",
    skip: "查看账本",
    loading: "正在摆摊…",
    unavailable: "此浏览器无法开3D，直接进入账本。",
    statement: "利润表",
    gross: "毛利",
    cogsTip: "销货成本——卖出那几碗用掉的材料。",
    wasteTip: "报废——没卖掉扔掉的材料。",
    opexTip: "固定费用——没客人也要付的电和租金。",
    profitTip: "净损益——收入减成本、报废和固定费用。",
    overhead: "固定费用",
    stalls: {
      ramen: { name: "拉面", keys: { noodles: "面", soup: "汤底", topping: "浇头" } },
      lemonade: { name: "柠檬水", keys: { lemons: "柠檬", sugar: "糖", ice: "冰" } },
      pcbang: { name: "网吧", keys: { snacks: "零食", drinks: "饮料", seats: "座位" } },
    },
  },
  fr: {
    title: "Une journée de commerce",
    sub: "Stand de ramen · un jour · USD",
    cash: "Caisse",
    day: "Jour",
    seed: "Graine",
    open: "Ouvrir",
    next: "Lendemain",
    quit: "Arrêter",
    again: "Recommencer",
    buyNoodles: "Nouilles",
    buySoup: "Bouillon",
    buyTopping: "Garniture",
    price: "Prix",
    recipe: "Recette",
    plain: "Léger",
    normal: "Normal",
    rich: "Corsé",
    sold: "Vendus",
    revenue: "Ventes",
    cogs: "Coût",
    waste: "Pertes",
    profit: "Résultat",
    bust: "Faillite. Plus de caisse ni de stock.",
    weather: { clear: "Clair", hot: "Chaud", cold: "Froid", rain: "Pluie" },
    event: {
      none: "Un matin calme",
      overtime: "Beaucoup d'heures sup' autour",
      food_scare: "Alerte alimentaire",
      cost_hike: "Les achats ont augmenté",
    },
    hint: "Ce n'est pas un cours de comptabilité. Sauvé sur cet appareil seulement.",
    books: "Livre du jour",
    oiyo: "Voir le jeu de compte de résultat sur oiyo",
    stall: "Stand",
    choose: "Quel commerce ouvrez-vous ?",
    start: "Ouvrir ce stand",
    other: "Un autre stand",
    skip: "Voir les livres",
    loading: "On prépare le stand…",
    unavailable: "Pas de WebGL ici : on passe aux livres.",
    statement: "Compte de résultat",
    gross: "Marge brute",
    cogsTip: "Coût des ventes — ingrédients des bols vendus.",
    wasteTip: "Pertes — stock jeté.",
    opexTip: "Charges — loyer et électricité même sans clients.",
    profitTip: "Net — ventes moins coûts, pertes et charges.",
    overhead: "Charges",
    stalls: {
      ramen: { name: "Ramen", keys: { noodles: "Nouilles", soup: "Bouillon", topping: "Garniture" } },
      lemonade: { name: "Limonade", keys: { lemons: "Citrons", sugar: "Sucre", ice: "Glace" } },
      pcbang: { name: "Cybercafé", keys: { snacks: "Snacks", drinks: "Boissons", seats: "Places" } },
    },
  },
  es: {
    title: "Un día de negocio",
    sub: "Puesto de ramyeon · un día · USD",
    cash: "Caja",
    day: "Día",
    seed: "Semilla",
    open: "Abrir",
    next: "Mañana",
    quit: "Parar",
    again: "Empezar de nuevo",
    buyNoodles: "Fideos",
    buySoup: "Caldo",
    buyTopping: "Topping",
    price: "Precio",
    recipe: "Receta",
    plain: "Suave",
    normal: "Normal",
    rich: "Intenso",
    sold: "Vendidos",
    revenue: "Ventas",
    cogs: "Costo",
    waste: "Merma",
    profit: "PyG",
    bust: "Quiebra. Sin caja ni existencias.",
    weather: { clear: "Despejado", hot: "Calor", cold: "Frío", rain: "Lluvia" },
    event: {
      none: "Una mañana normal",
      overtime: "Mucha gente de horas extra",
      food_scare: "Noticia de intoxicación",
      cost_hike: "Subió el coste de compra",
    },
    hint: "No es una clase de contabilidad. Solo se guarda en este aparato.",
    books: "Libro de hoy",
    oiyo: "Ver el juego de resultados en oiyo",
    stall: "Puesto",
    choose: "¿Qué negocio abres?",
    start: "Abrir este puesto",
    other: "Otro puesto",
    skip: "Ver el libro",
    loading: "Preparando el puesto…",
    unavailable: "Sin WebGL aquí: vamos al libro.",
    statement: "Estado de resultados",
    gross: "Beneficio bruto",
    cogsTip: "Costo de ventas — ingredientes de los platos vendidos.",
    wasteTip: "Merma — stock tirado.",
    opexTip: "Fijos — luz y renta aunque no venga nadie.",
    profitTip: "Neto — ventas menos costo, merma y fijos.",
    overhead: "Fijos",
    stalls: {
      ramen: { name: "Ramyeon", keys: { noodles: "Fideos", soup: "Caldo", topping: "Topping" } },
      lemonade: { name: "Limonada", keys: { lemons: "Limones", sugar: "Azúcar", ice: "Hielo" } },
      pcbang: { name: "Cibercafé", keys: { snacks: "Snacks", drinks: "Bebidas", seats: "Asientos" } },
    },
  },
} as const;

const Scene = lazy(() => import("./RunABusinessScene"));

function newSeed(): string {
  return `d${Math.floor(Math.random() * 1_000_000)}`;
}

function persist(run: RunState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(run));
    const bestRaw = localStorage.getItem(BEST_KEY);
    const best = bestRaw ? (JSON.parse(bestRaw) as { cashCents: number }) : { cashCents: 0 };
    if (run.cashCents > (best.cashCents ?? 0)) {
      localStorage.setItem(BEST_KEY, JSON.stringify({ cashCents: run.cashCents, stall: run.stall, horizon: run.horizon, currency: "USD" }));
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
  for (const key of pack.keys) buy[key] = key === "seats" ? 6 : 12;
  return { buy, priceCents: pack.refPrice, richness: 1 };
}

export default function RunABusiness({ locale }: { locale: Locale }) {
  const t = COPY[locale] ?? COPY.en;
  const [seed, setSeed] = useState("s10");
  const [phase, setPhase] = useState<"pick" | "play">("pick");
  const [rush, setRush] = useState<{ demand: number; sold: number } | null>(null);
  const [run, setRun] = useState<RunState>(() => startRun({ seed: "s10" }));
  const [prep, setPrep] = useState<Prep>(() => defaultPrep("ramen"));
  const card = useMemo(() => morning(run.seed, run.day), [run.seed, run.day]);
  const pack = STALLS[run.stall];
  const stallCopy = t.stalls[run.stall];

  const apply = (next: RunState) => {
    setRun(next);
    persist(next);
  };

  const closeShift = () => {
    apply(playDay(run, prep));
    setRush(null);
  };

  const openShop = () => {
    if (hasWebGL()) {
      const forecast = forecastShift(run, prep);
      setRush({ demand: forecast.demand, sold: forecast.sold });
      return;
    }
    apply(playDay(run, prep));
  };

  const pickStall = (stall: StallId) => {
    setPrep(defaultPrep(stall));
    apply(startRun({ seed: seed || newSeed(), stall }));
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
          <input
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            className="mt-1 h-11 w-full rounded-xl border px-3 font-mono"
          />
        </label>
        <div className="grid gap-3">
          {(Object.keys(STALLS) as StallId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => pickStall(id)}
              className="min-h-14 rounded-2xl border bg-white px-4 py-3 text-left"
            >
              <p className="font-black">{t.stalls[id].name}</p>
              <p className="text-xs text-muted-foreground">{t.start}</p>
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
          {stallCopy.name} · {t.sub.split("·").slice(1).join("·").trim() || t.sub}
        </p>
        <h2 className="text-2xl font-black">{t.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.day} {run.day} · {t.cash} {formatUsd(run.cashCents)}
        </p>
      </div>

      {rush && (
        <Suspense fallback={<p className="rounded-2xl border p-6 text-sm font-bold">{t.loading}</p>}>
          <Scene
            stall={run.stall}
            weather={card.weather}
            sold={rush.sold}
            demand={rush.demand}
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
          onBlur={() => apply(startRun({ seed: seed || newSeed(), stall: run.stall }))}
          className="mt-1 h-11 w-full rounded-xl border px-3 font-mono"
        />
      </label>

      <div className="rounded-2xl border bg-lime-50/60 p-4 text-sm leading-6">
        <p className="font-black">{weather}</p>
        <p className="text-muted-foreground">{event}</p>
      </div>

      {run.result && (
        <div className="rounded-2xl border p-4 text-sm">
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">{t.statement}</p>
          <dl className="grid grid-cols-2 gap-2">
            <div>{t.sold}</div><div className="text-right font-mono">{run.result.sold}</div>
            <div title={t.cogsTip}>{t.revenue}</div><div className="text-right font-mono">{formatUsd(run.result.revenueCents)}</div>
            <div title={t.cogsTip}>{t.cogs}</div><div className="text-right font-mono">{formatUsd(run.result.cogsCents)}</div>
            <div className="text-stone-500">{t.gross}</div>
            <div className="text-right font-mono text-stone-500">{formatUsd(run.result.revenueCents - run.result.cogsCents)}</div>
            <div title={t.wasteTip}>{t.waste}</div><div className="text-right font-mono">{formatUsd(run.result.wasteCents)}</div>
            {run.result.overheadCents > 0 && (
              <>
                <div title={t.opexTip}>{t.overhead}</div>
                <div className="text-right font-mono">{formatUsd(run.result.overheadCents)}</div>
              </>
            )}
            <div className="font-black" title={t.profitTip}>{t.profit}</div>
            <div className={`text-right font-mono font-black ${run.result.profitCents < 0 ? "text-red-700" : "text-emerald-800"}`}>
              {formatUsd(run.result.profitCents)}
            </div>
          </dl>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{t.cogsTip} {t.wasteTip} {t.profitTip}</p>
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
        <button type="button" className="min-h-11 flex-1 rounded-xl border text-sm font-bold" onClick={() => apply(startRun({ seed: seed || newSeed(), stall: run.stall }))}>
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

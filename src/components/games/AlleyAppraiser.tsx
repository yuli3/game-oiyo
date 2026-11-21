import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX, Search, BookOpen, Lamp } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { CORE_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import {
  ALLEY_DAYS,
  ALLEY_SLUG,
  buildDay,
  counterOffer,
  dayProfit,
  dayStars,
  dealProfit,
  genuineTraits,
  isDayCleared,
  loadDayBests,
  saveDayBest,
  totalBest,
  LOUPE_DAY,
  UV_DAY,
  type Category,
  type Deal,
} from "../../lib/games/alley-appraiser";
import { drawItem, type ViewMode } from "../../lib/games/alley-appraiser-draw";
import { ALLEY_APPRAISER_SPRITES } from "../../lib/games/sprites";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  title: string; day: string; target: string; today: string; ask: string; market: string;
  buy: string; refuse: string; haggle: string; offer: string; take: string; pass: string;
  compare: string; theirs: string; reference: string; loupe: string; uv: string;
  countered: string; accepted: string; left: string; report: string; genuine: string; fake: string;
  skipped: string; cleared: string; failed: string; next: string; retry: string; stars: string;
  stages: string; newLoupe: string; newUv: string; start: string; intro: string; best: string;
  full: string; exitFull: string; mute: string; unmute: string; customer: string; finale: string;
  cats: Record<Category, string>; lines: string[];
}> = {
  ko: {
    title: "골목 감정소", day: "{0}일째", target: "목표 {0}", today: "오늘 {0}", ask: "부르는 값", market: "도감 시세",
    buy: "{0}에 매입", refuse: "거절", haggle: "흥정", offer: "{0} 제시", take: "{0}에 받기", pass: "그만두기",
    compare: "도감과 비교", theirs: "손님 물건", reference: "도감 진품", loupe: "돋보기", uv: "자외선",
    countered: "그 값엔 못 드려요. {0}이면 드릴게요.", accepted: "좋아요, 거래하죠.", left: "알겠어요, 다른 데 가볼게요.",
    report: "오늘의 장부", genuine: "진품", fake: "가품", skipped: "거래 안 함", cleared: "목표 달성!", failed: "목표에 못 미쳤어요",
    next: "다음 날", retry: "이 날 다시", stars: "별 {0}개", stages: "날짜 고르기",
    newLoupe: "새 도구: 돋보기. 켜고 물건을 문질러 작은 표식을 확인하세요.", newUv: "새 도구: 자외선 등. 숨은 표식이 보입니다.",
    start: "가게 열기", intro: "손님 물건을 도감 진품과 비교해 다른 곳을 찾으세요. 가품을 사면 산 값을 모두 잃습니다. 진품은 시세보다 싸게 사야 남습니다.",
    best: "최고 장부 {0}", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기", customer: "손님 {0}/{1}",
    finale: "30일 장사를 모두 마쳤어요! 1일부터 다시",
    cats: { vase: "도자기 병", coin: "옛 동전", watch: "회중시계", scroll: "산수화 족자", ring: "보석 반지", stamp: "옛 우표" },
    lines: ["할머니 댁 다락에서 나왔어요.", "이사하다 찾았는데 얼마나 쳐주세요?", "급하게 돈이 필요해서요.", "시장에서 샀는데 진짜일까요?", "대대로 내려온 물건입니다.", "벼룩시장에서 눈에 띄길래요."],
  },
  en: {
    title: "Alley Appraiser", day: "Day {0}", target: "Goal {0}", today: "Today {0}", ask: "Asking", market: "Catalogue value",
    buy: "Buy for {0}", refuse: "Refuse", haggle: "Haggle", offer: "Offer {0}", take: "Take it for {0}", pass: "Pass",
    compare: "Compare with catalogue", theirs: "Customer's piece", reference: "Catalogue original", loupe: "Loupe", uv: "UV lamp",
    countered: "Not at that price. I'll let it go for {0}.", accepted: "Fine, it's a deal.", left: "All right, I'll try elsewhere.",
    report: "Today's ledger", genuine: "Genuine", fake: "Fake", skipped: "No deal", cleared: "Goal reached!", failed: "Short of the goal",
    next: "Next day", retry: "Replay this day", stars: "{0} stars", stages: "Pick a day",
    newLoupe: "New tool: the loupe. Turn it on and rub the piece to read tiny marks.", newUv: "New tool: the UV lamp. It shows hidden marks.",
    start: "Open the shop", intro: "Compare each customer's piece with the catalogue original and find what differs. Buying a fake loses everything you paid. A genuine piece only pays if you buy it below its value.",
    best: "Best ledger {0}", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on", customer: "Customer {0}/{1}",
    finale: "All 30 days done! Start again from day 1",
    cats: { vase: "Porcelain vase", coin: "Old coin", watch: "Pocket watch", scroll: "Landscape scroll", ring: "Gem ring", stamp: "Old stamp" },
    lines: ["Found it in my grandma's attic.", "Turned up when I moved. What will you give me?", "I need cash in a hurry.", "Bought it at a market. Is it real?", "It's been in the family for ages.", "Caught my eye at a flea market."],
  },
  ja: {
    title: "路地裏鑑定所", day: "{0}日目", target: "目標 {0}", today: "今日 {0}", ask: "希望額", market: "図鑑の相場",
    buy: "{0}で買い取る", refuse: "断る", haggle: "値切る", offer: "{0}を提示", take: "{0}で受ける", pass: "やめる",
    compare: "図鑑と比べる", theirs: "客の品", reference: "図鑑の本物", loupe: "ルーペ", uv: "紫外線",
    countered: "その値段では無理です。{0}なら譲ります。", accepted: "いいですよ、取引しましょう。", left: "わかりました、よそを当たります。",
    report: "今日の帳簿", genuine: "本物", fake: "偽物", skipped: "取引なし", cleared: "目標達成！", failed: "目標に届きませんでした",
    next: "次の日", retry: "この日をやり直す", stars: "星{0}つ", stages: "日を選ぶ",
    newLoupe: "新しい道具：ルーペ。オンにして品をなぞると小さな刻印が見えます。", newUv: "新しい道具：紫外線ランプ。隠れた印が見えます。",
    start: "店を開ける", intro: "客の品を図鑑の本物と比べ、違う所を見つけましょう。偽物を買うと払った額をすべて失います。本物は相場より安く買えば儲かります。",
    best: "最高帳簿 {0}", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン", customer: "客 {0}/{1}",
    finale: "30日間の商いを終えました！1日目から再開",
    cats: { vase: "磁器の瓶", coin: "古銭", watch: "懐中時計", scroll: "山水画の掛軸", ring: "宝石の指輪", stamp: "古い切手" },
    lines: ["祖母の家の屋根裏から出てきました。", "引っ越しで見つけました。いくらになります？", "急いでお金が必要で。", "市場で買ったんですが本物ですか？", "代々伝わる品です。", "蚤の市で目に留まって。"],
  },
  zh: {
    title: "胡同鉴定铺", day: "第{0}天", target: "目标 {0}", today: "今日 {0}", ask: "开价", market: "图鉴市价",
    buy: "以{0}收购", refuse: "拒绝", haggle: "讲价", offer: "出价{0}", take: "以{0}成交", pass: "算了",
    compare: "与图鉴对比", theirs: "顾客的物件", reference: "图鉴真品", loupe: "放大镜", uv: "紫外灯",
    countered: "这个价不行。{0}的话就卖给你。", accepted: "好，成交。", left: "那我去别家看看。",
    report: "今日账本", genuine: "真品", fake: "赝品", skipped: "未成交", cleared: "达成目标！", failed: "没达到目标",
    next: "下一天", retry: "重玩这一天", stars: "{0}颗星", stages: "选择日期",
    newLoupe: "新工具：放大镜。打开后在物件上滑动，可看清细小标记。", newUv: "新工具：紫外灯。能照出隐藏标记。",
    start: "开店", intro: "把顾客的物件和图鉴真品对比，找出不同之处。买到赝品会损失全部货款。真品要低于市价买入才能赚钱。",
    best: "最佳账本 {0}", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音", customer: "顾客 {0}/{1}",
    finale: "30天的生意全部完成！从第1天重新开始",
    cats: { vase: "瓷瓶", coin: "古钱币", watch: "怀表", scroll: "山水画卷轴", ring: "宝石戒指", stamp: "旧邮票" },
    lines: ["这是从奶奶家阁楼里找到的。", "搬家时翻出来的，能给多少？", "我急着用钱。", "在市场买的，是真的吗？", "这是祖传的东西。", "在跳蚤市场一眼看中的。"],
  },
  fr: {
    title: "L'Expert de la ruelle", day: "Jour {0}", target: "Objectif {0}", today: "Aujourd'hui {0}", ask: "Prix demandé", market: "Cote du catalogue",
    buy: "Acheter {0}", refuse: "Refuser", haggle: "Marchander", offer: "Proposer {0}", take: "Accepter à {0}", pass: "Laisser",
    compare: "Comparer au catalogue", theirs: "Pièce du client", reference: "Original du catalogue", loupe: "Loupe", uv: "Lampe UV",
    countered: "Pas à ce prix. Je vous la laisse à {0}.", accepted: "D'accord, marché conclu.", left: "Bon, j'essaierai ailleurs.",
    report: "Registre du jour", genuine: "Authentique", fake: "Faux", skipped: "Pas d'affaire", cleared: "Objectif atteint !", failed: "Objectif manqué",
    next: "Jour suivant", retry: "Rejouer ce jour", stars: "{0} étoiles", stages: "Choisir un jour",
    newLoupe: "Nouvel outil : la loupe. Activez-la et passez sur la pièce pour lire les petites marques.", newUv: "Nouvel outil : la lampe UV. Elle révèle les marques cachées.",
    start: "Ouvrir la boutique", intro: "Comparez chaque pièce à l'original du catalogue et trouvez la différence. Acheter un faux fait perdre tout le prix payé. Une pièce authentique ne rapporte que si vous l'achetez sous sa cote.",
    best: "Meilleur registre {0}", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son", customer: "Client {0}/{1}",
    finale: "Les 30 jours sont faits ! Recommencer au jour 1",
    cats: { vase: "Vase en porcelaine", coin: "Pièce ancienne", watch: "Montre à gousset", scroll: "Rouleau de paysage", ring: "Bague à pierre", stamp: "Vieux timbre" },
    lines: ["Trouvé dans le grenier de ma grand-mère.", "Retrouvé en déménageant. Vous m'en donnez combien ?", "J'ai besoin d'argent vite.", "Acheté au marché. C'est du vrai ?", "C'est dans la famille depuis toujours.", "Repéré dans une brocante."],
  },
  es: {
    title: "El Tasador del Callejón", day: "Día {0}", target: "Meta {0}", today: "Hoy {0}", ask: "Pide", market: "Valor de catálogo",
    buy: "Comprar por {0}", refuse: "Rechazar", haggle: "Regatear", offer: "Ofrecer {0}", take: "Aceptar por {0}", pass: "Dejarlo",
    compare: "Comparar con el catálogo", theirs: "Pieza del cliente", reference: "Original del catálogo", loupe: "Lupa", uv: "Lámpara UV",
    countered: "A ese precio no. Se la dejo en {0}.", accepted: "Vale, trato hecho.", left: "Bueno, probaré en otro sitio.",
    report: "Libro del día", genuine: "Auténtica", fake: "Falsa", skipped: "Sin trato", cleared: "¡Meta lograda!", failed: "No llegaste a la meta",
    next: "Día siguiente", retry: "Repetir este día", stars: "{0} estrellas", stages: "Elegir día",
    newLoupe: "Nueva herramienta: la lupa. Actívala y pásala por la pieza para leer marcas diminutas.", newUv: "Nueva herramienta: la lámpara UV. Revela marcas ocultas.",
    start: "Abrir la tienda", intro: "Compara cada pieza con el original del catálogo y encuentra la diferencia. Comprar una falsa te hace perder todo lo pagado. Una auténtica solo deja ganancia si la compras por debajo de su valor.",
    best: "Mejor libro {0}", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido", customer: "Cliente {0}/{1}",
    finale: "¡Los 30 días completados! Empezar de nuevo en el día 1",
    cats: { vase: "Jarrón de porcelana", coin: "Moneda antigua", watch: "Reloj de bolsillo", scroll: "Rollo de paisaje", ring: "Anillo con gema", stamp: "Sello antiguo" },
    lines: ["Salió del desván de mi abuela.", "Apareció en la mudanza. ¿Cuánto me da?", "Necesito dinero rápido.", "La compré en un mercado. ¿Es auténtica?", "Lleva generaciones en la familia.", "Me llamó la atención en un rastro."],
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

type Phase = "intro" | "deal" | "countered" | "reply" | "report";
const CANVAS = 480;
const ZOOM = 3;
const LOUPE_R = 80;
const MUTE_KEY = "oiyo:alley-appraiser:muted";

export default function AlleyAppraiser({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [day, setDay] = useState(1);
  const [cleared, setCleared] = useState<number[]>([]);
  const [bests, setBests] = useState<Record<number, number>>({});
  const plan = useMemo(() => buildDay(day), [day]);
  const [idx, setIdx] = useState(0);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [phase, setPhase] = useState<Phase>("intro");
  const [reply, setReply] = useState("");
  const [counterPrice, setCounterPrice] = useState(0);
  const [showRef, setShowRef] = useState(false);
  const [loupeOn, setLoupeOn] = useState(false);
  const [uvOn, setUvOn] = useState(false);
  const [muted, setMuted] = useState(false);
  const loupePos = useRef<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);

  useEffect(() => {
    const done = loadClearedStages(ALLEY_SLUG, ALLEY_DAYS);
    setCleared(done);
    setBests(loadDayBests());
    setDay(nextOpenStage(done, ALLEY_DAYS) + 1);
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: CORE_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, []);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const customer = plan.customers[idx];
  const profit = dayProfit(deals);
  const total = totalBest(bests);
  useRunRecord(ALLEY_SLUG, phase === "report", total);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !customer) return;
    const traits = showRef ? genuineTraits(customer.item.category, customer.item.model) : customer.item.traits;
    const mode: ViewMode = uvOn && plan.uv ? "uv" : "normal";
    ctx.clearRect(0, 0, CANVAS, CANVAS);
    ctx.fillStyle = mode === "uv" ? "#1a1030" : showRef ? "#f3ecdc" : "#e9dfc9";
    ctx.fillRect(0, 0, CANVAS, CANVAS);
    // velvet pad
    ctx.fillStyle = mode === "uv" ? "#241640" : showRef ? "#d9cfb8" : "#7a2e2e";
    ctx.beginPath();
    ctx.ellipse(CANVAS / 2, CANVAS * 0.9, CANVAS * 0.42, CANVAS * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    drawItem(ctx, customer.item.category, traits, CANVAS, mode);
    const p = loupePos.current;
    if (loupeOn && plan.loupe && p) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, LOUPE_R, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = mode === "uv" ? "#1a1030" : "#f6f0e0";
      ctx.fillRect(p.x - LOUPE_R, p.y - LOUPE_R, LOUPE_R * 2, LOUPE_R * 2);
      ctx.translate(p.x, p.y);
      ctx.scale(ZOOM, ZOOM);
      ctx.translate(-p.x, -p.y);
      drawItem(ctx, customer.item.category, traits, CANVAS, mode);
      ctx.restore();
      ctx.strokeStyle = "#c9a227";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, LOUPE_R, 0, Math.PI * 2);
      ctx.stroke();
    }
    // label
    ctx.fillStyle = showRef ? "#2c6e49" : "#7a2e2e";
    ctx.fillRect(0, 0, CANVAS, 40);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(showRef ? c.reference : c.theirs, 14, 21);
  }, [customer, showRef, uvOn, loupeOn, plan.uv, plan.loupe, c.reference, c.theirs]);

  useEffect(() => {
    draw();
  }, [draw, phase, idx]);

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!loupeOn) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // Lift the loupe above the finger on touch so the finger does not cover the mark.
    const lift = e.pointerType === "touch" ? 70 : 0;
    loupePos.current = {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS - lift,
    };
    draw();
  };

  const resetDay = useCallback((d: number) => {
    setDay(d);
    setIdx(0);
    setDeals([]);
    setPhase("intro");
    setShowRef(false);
    setLoupeOn(false);
    setUvOn(false);
    loupePos.current = null;
  }, []);

  const finishCustomer = useCallback(
    (deal: Deal, line: string) => {
      const next = [...deals, deal];
      setDeals(next);
      setReply(line);
      setPhase("reply");
      sfx(deal.bought ? "place" : "tap");
    },
    [deals, sfx],
  );

  const advance = useCallback(() => {
    setShowRef(false);
    setUvOn(false);
    loupePos.current = null;
    if (idx + 1 < plan.customers.length) {
      setIdx(idx + 1);
      setPhase("deal");
      return;
    }
    setPhase("report");
    if (isDayCleared(plan, deals)) {
      setCleared(markStageCleared(ALLEY_SLUG, day - 1, ALLEY_DAYS));
      setBests(saveDayBest(day, dayProfit(deals)));
      sfx("win");
    } else {
      sfx("lose");
    }
  }, [idx, plan, deals, day, sfx]);

  const buy = (price: number) => {
    if (!customer) return;
    finishCustomer({ customer: idx, bought: true, price, profit: dealProfit(customer.item, price), genuine: customer.item.genuine }, c.accepted);
  };
  const refuse = () => {
    if (!customer) return;
    finishCustomer({ customer: idx, bought: false, price: 0, profit: 0, genuine: customer.item.genuine }, c.left);
  };
  const haggle = (offer: number) => {
    if (!customer) return;
    const r = counterOffer(customer, offer);
    if (r.kind === "accepted") {
      buy(r.price);
    } else {
      setCounterPrice(r.price);
      setPhase("countered");
      sfx("tap");
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const offers = customer ? [0.9, 0.75, 0.6].map((r) => Math.max(5, Math.round((customer.ask * r) / 5) * 5)) : [];
  const stars = phase === "report" ? dayStars(plan, deals) : 0;
  const dayCleared = phase === "report" && isDayCleared(plan, deals);

  return (
    <div
      ref={containerRef}
      data-game="alley-appraiser"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-3 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-3xl space-y-3"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{fill(c.day, day)} / {ALLEY_DAYS}</Badge>
        <Badge variant="outline">{fill(c.target, plan.target)}</Badge>
        <Badge variant={profit >= plan.target ? "default" : "outline"}>{fill(c.today, profit)}</Badge>
        {total > 0 && <span className="text-xs text-muted-foreground">{fill(c.best, total)}</span>}
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      {phase === "intro" && (
        <Card>
          <CardContent>
            <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img src={ALLEY_APPRAISER_SPRITES.catalogue} alt="" width={56} height={56} className="size-14" />
              <p className="text-sm leading-relaxed">{c.intro}</p>
            </div>
            {day === LOUPE_DAY && <p className="rounded-md bg-muted p-2 text-sm font-medium">{c.newLoupe}</p>}
            {day === UV_DAY && <p className="rounded-md bg-muted p-2 text-sm font-medium">{c.newUv}</p>}
            <Button size="lg" className="min-h-12 w-full" onClick={() => { setPhase("deal"); sfx("tap"); }}>
              {c.start} · {fill(c.day, day)}
            </Button>
          </div>
          </CardContent>
        </Card>
      )}

      {phase !== "intro" && phase !== "report" && customer && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="mx-auto w-full max-w-xs space-y-2 md:max-w-none">
            <canvas
              ref={canvasRef}
              width={CANVAS}
              height={CANVAS}
              onPointerDown={onPointer}
              onPointerMove={onPointer}
              className="aspect-square w-full touch-none rounded-xl border border-border bg-card"
              aria-label={c.cats[customer.item.category]}
            />
            <div className="grid grid-cols-3 gap-2">
              <Button variant={showRef ? "default" : "outline"} size="sm" className="min-h-11" onClick={() => { setShowRef((v) => !v); sfx("tap"); }}>
                <BookOpen className="size-4" />
                {c.compare}
              </Button>
              <Button variant={loupeOn ? "default" : "outline"} size="sm" className="min-h-11" disabled={!plan.loupe} onClick={() => { setLoupeOn((v) => !v); loupePos.current = { x: CANVAS / 2, y: CANVAS / 2 }; sfx("tap"); }}>
                <Search className="size-4" />
                {c.loupe}
              </Button>
              <Button variant={uvOn ? "default" : "outline"} size="sm" className="min-h-11" disabled={!plan.uv} onClick={() => { setUvOn((v) => !v); sfx("tap"); }}>
                <Lamp className="size-4" />
                {c.uv}
              </Button>
            </div>
          </div>

          <Card className="order-first md:order-none">
            <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <img src={ALLEY_APPRAISER_SPRITES.customers[customer.face]} alt="" width={72} height={72} className="size-16 shrink-0 rounded-full bg-muted" />
                <div className="min-w-0 space-y-1">
                  <p className="text-xs text-muted-foreground">{fill(c.customer, idx + 1, plan.customers.length)}</p>
                  <p className="font-bold">{c.cats[customer.item.category]}</p>
                  <p className="rounded-lg bg-muted p-2 text-sm">
                    {phase === "deal" ? c.lines[customer.line] : phase === "countered" ? fill(c.countered, counterPrice) : reply}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border border-border p-2">
                  <p className="text-xs text-muted-foreground">{c.ask}</p>
                  <p className="flex items-center gap-1 text-lg font-bold tabular-nums">
                    <img src={ALLEY_APPRAISER_SPRITES.coin} alt="" width={18} height={18} className="size-4" />
                    {customer.ask}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-2">
                  <p className="text-xs text-muted-foreground">{c.market}</p>
                  <p className="flex items-center gap-1 text-lg font-bold tabular-nums">
                    <img src={ALLEY_APPRAISER_SPRITES.coin} alt="" width={18} height={18} className="size-4" />
                    {customer.item.value}
                  </p>
                </div>
              </div>

              {phase === "deal" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button className="min-h-12" onClick={() => buy(customer.ask)}>{fill(c.buy, customer.ask)}</Button>
                    <Button variant="outline" className="min-h-12" onClick={refuse}>{c.refuse}</Button>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">{c.haggle}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {offers.map((o) => (
                      <Button key={o} variant="secondary" size="sm" className="min-h-11" onClick={() => haggle(o)}>
                        {fill(c.offer, o)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {phase === "countered" && (
                <div className="grid grid-cols-2 gap-2">
                  <Button className="min-h-12" onClick={() => buy(counterPrice)}>{fill(c.take, counterPrice)}</Button>
                  <Button variant="outline" className="min-h-12" onClick={refuse}>{c.pass}</Button>
                </div>
              )}
              {phase === "reply" && (
                <Button className="min-h-12 w-full" onClick={advance}>
                  {idx + 1 < plan.customers.length ? fill(c.customer, idx + 2, plan.customers.length) : c.report}
                </Button>
              )}
            </div>
          </CardContent>
          </Card>
        </div>
      )}

      {phase === "report" && (
        <Card>
          <CardContent>
            <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">{c.report} · {fill(c.day, day)}</h2>
              <Badge variant={dayCleared ? "default" : "destructive"}>{dayCleared ? c.cleared : c.failed}</Badge>
            </div>
            <ul className="space-y-1 text-sm">
              {plan.customers.map((cu, i) => {
                const d = deals[i];
                return (
                  <li key={i} className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5">
                    <span className="truncate">{c.cats[cu.item.category]}</span>
                    <span className={cu.item.genuine ? "text-success" : "text-destructive"}>{cu.item.genuine ? c.genuine : c.fake}</span>
                    <span className="w-24 text-right tabular-nums">
                      {d?.bought ? `${d.profit >= 0 ? "+" : ""}${d.profit}` : c.skipped}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-base font-bold tabular-nums">
              {fill(c.today, profit)} / {fill(c.target, plan.target)} {stars > 0 && `· ${"★".repeat(stars)}${"☆".repeat(3 - stars)}`}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => resetDay(day)}>{c.retry}</Button>
              {dayCleared && (
                <Button className="min-h-12" onClick={() => resetDay(day >= ALLEY_DAYS ? 1 : day + 1)}>
                  {day >= ALLEY_DAYS ? c.finale : c.next}
                </Button>
              )}
            </div>
          </div>
          </CardContent>
        </Card>
      )}

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={ALLEY_DAYS} current={day - 1} cleared={cleared} locale={locale} onSelect={(i) => resetDay(i + 1)} />
        </div>
      </details>
    </div>
  );
}

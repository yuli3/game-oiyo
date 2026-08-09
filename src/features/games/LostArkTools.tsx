"use client";
import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import type { Locale } from "@/lib/i18n";
import Copy from "lucide-react/dist/esm/icons/copy";
import Check from "lucide-react/dist/esm/icons/check";
import RotateCcw from "lucide-react/dist/esm/icons/rotate-ccw";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up";

// ─────────────────────────────────────────────
// LOST ARK AUCTION CALCULATOR (lostarkCalculator port)
// ─────────────────────────────────────────────

type AuctionLabels = {
  title: string;
  description: string;
  price: string;
  pricePlaceholder: string;
  members: string;
  people: string;
  copied: string;
  copy: string;
  result: string;
  market: string;
  fee: string;
  net: string;
  equalBid: string;
  equalBenefit: string;
  maxBid: string;
  maxBenefit: string;
  formula: string;
  equalHelp: string;
  maxHelp: string;
  feeHelp: string;
  gold: string;
};

const AUCTION_LABELS: Record<Locale, AuctionLabels> = {
  ko: {
    title: "로스트아크 경매 계산기",
    description: "군단장 레이드 경매 아이템의 적정 입찰가를 계산합니다.",
    price: "시장 가격",
    pricePlaceholder: "시장 가격 입력",
    members: "인원 수",
    people: "명",
    copied: "복사됨",
    copy: "복사",
    result: "입찰 결과",
    market: "시장 가격",
    fee: "거래소 수수료 (5%)",
    net: "분배될 금액 (수수료 제외)",
    equalBid: "균등 분배 입찰가",
    equalBenefit: "내 이득 (균등 분배 시)",
    maxBid: "최대 이득 입찰가",
    maxBenefit: "내 이득 (최대 이득 시)",
    formula: "계산 방식",
    equalHelp: "낙찰자를 포함해 모두 같은 이득이 되는 입찰가",
    maxHelp: "낙찰자가 최대 이득을 얻는 입찰가 (거래 이득 ÷ 1.1)",
    feeHelp: "거래소 수수료 5%는 자동 계산됩니다.",
    gold: "G",
  },
  en: {
    title: "Lost Ark Auction Calculator",
    description: "Calculate a sensible bid for a Legion Raid auction item.",
    price: "Market price",
    pricePlaceholder: "Enter market price",
    members: "Party size",
    people: " players",
    copied: "Copied",
    copy: "Copy",
    result: "Bid results",
    market: "Market price",
    fee: "Trade-house fee (5%)",
    net: "Net amount after fee",
    equalBid: "Equal-share bid",
    equalBenefit: "Your benefit at equal share",
    maxBid: "Max-profit bid",
    maxBenefit: "Your benefit at max profit",
    formula: "How it works",
    equalHelp:
      "The bid where every member, including the winner, benefits equally.",
    maxHelp:
      "The ceiling that maximizes the winner’s benefit (trade gain ÷ 1.1).",
    feeHelp: "The 5% trade-house fee is applied automatically.",
    gold: "G",
  },
  ja: {
    title: "Lost Ark オークション計算機",
    description: "軍団長レイドのオークション品の適正入札額を計算します。",
    price: "市場価格",
    pricePlaceholder: "市場価格を入力",
    members: "パーティ人数",
    people: "人",
    copied: "コピー済み",
    copy: "コピー",
    result: "入札結果",
    market: "市場価格",
    fee: "取引所手数料 (5%)",
    net: "手数料差引後の金額",
    equalBid: "均等分配入札額",
    equalBenefit: "均等分配時の利益",
    maxBid: "最大利益入札額",
    maxBenefit: "最大利益時の利益",
    formula: "計算方法",
    equalHelp: "落札者を含む全員の利益が同じになる入札額です。",
    maxHelp: "落札者の利益を最大化する上限です（取引利益 ÷ 1.1）。",
    feeHelp: "取引所手数料5%は自動計算されます。",
    gold: "G",
  },
  zh: {
    title: "命运方舟拍卖计算器",
    description: "计算军团长副本拍卖物品的合理出价。",
    price: "市场价格",
    pricePlaceholder: "输入市场价格",
    members: "队伍人数",
    people: "人",
    copied: "已复制",
    copy: "复制",
    result: "出价结果",
    market: "市场价格",
    fee: "交易所手续费 (5%)",
    net: "扣除手续费后的金额",
    equalBid: "平均分配出价",
    equalBenefit: "平均分配时的收益",
    maxBid: "最大收益出价",
    maxBenefit: "最大收益时的收益",
    formula: "计算方式",
    equalHelp: "包括中标者在内，所有成员收益相同的出价。",
    maxHelp: "使中标者收益最大的上限（交易收益 ÷ 1.1）。",
    feeHelp: "自动计入5%的交易所手续费。",
    gold: "G",
  },
  fr: {
    title: "Calculateur d’enchères Lost Ark",
    description:
      "Calculez une mise raisonnable pour un objet d’enchère de raid.",
    price: "Prix du marché",
    pricePlaceholder: "Saisir le prix",
    members: "Taille du groupe",
    people: " joueurs",
    copied: "Copié",
    copy: "Copier",
    result: "Résultats",
    market: "Prix du marché",
    fee: "Frais de marché (5 %)",
    net: "Montant net après frais",
    equalBid: "Mise à partage égal",
    equalBenefit: "Votre gain à partage égal",
    maxBid: "Mise au profit maximal",
    maxBenefit: "Votre gain maximal",
    formula: "Méthode de calcul",
    equalHelp:
      "La mise où chaque membre, gagnant inclus, obtient le même bénéfice.",
    maxHelp: "Le plafond qui maximise le bénéfice du gagnant (gain ÷ 1,1).",
    feeHelp: "Les frais de marché de 5 % sont appliqués automatiquement.",
    gold: "G",
  },
  es: {
    title: "Calculadora de subastas Lost Ark",
    description:
      "Calcula una puja razonable para un objeto de subasta de raid.",
    price: "Precio de mercado",
    pricePlaceholder: "Introduce el precio",
    members: "Tamaño del grupo",
    people: " jugadores",
    copied: "Copiado",
    copy: "Copiar",
    result: "Resultados",
    market: "Precio de mercado",
    fee: "Comisión del mercado (5 %)",
    net: "Importe neto tras comisión",
    equalBid: "Puja de reparto igual",
    equalBenefit: "Tu beneficio en reparto igual",
    maxBid: "Puja de beneficio máximo",
    maxBenefit: "Tu beneficio máximo",
    formula: "Cómo se calcula",
    equalHelp:
      "La puja en la que todos, incluido el ganador, obtienen el mismo beneficio.",
    maxHelp:
      "El límite que maximiza el beneficio del ganador (ganancia ÷ 1,1).",
    feeHelp: "La comisión del mercado del 5 % se aplica automáticamente.",
    gold: "G",
  },
};

function CopyBtn({ value, t }: { value: number; t: AuctionLabels }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="ml-2 inline-flex items-center gap-1 rounded-full border border-primary/20 bg-background px-2.5 py-1 text-xs font-bold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
    >
      {copied ? (
        <Check className="w-3 h-3 text-emerald-500" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
      {copied ? t.copied : t.copy}
    </button>
  );
}

export function LostArkAuctionCalc({ locale = "ko" }: { locale?: Locale }) {
  const t = AUCTION_LABELS[locale];
  const [price, setPrice] = useState(0);
  const [members, setMembers] = useState(4);

  const fee = price > 1 ? Math.ceil(price * 0.05) : 0;
  const netPrice = price - fee;
  const equalBid =
    members > 0 ? Math.round((netPrice * (members - 1)) / members) : 0;
  const maxBid = members > 0 ? Math.round(equalBid / 1.1) : 0;
  const equalMyBenefit = netPrice - equalBid;
  const maxMyBenefit = netPrice - maxBid;

  const rows = [
    { label: t.market, value: price, copy: false, highlight: false },
    { label: t.fee, value: fee, copy: false, highlight: false },
    { label: t.net, value: netPrice, copy: false, highlight: false },
    { label: t.equalBid, value: equalBid, copy: true, highlight: true },
    {
      label: t.equalBenefit,
      value: equalMyBenefit,
      copy: false,
      highlight: false,
    },
    { label: t.maxBid, value: maxBid, copy: true, highlight: true },
    { label: t.maxBenefit, value: maxMyBenefit, copy: false, highlight: false },
  ];

  return (
    <Card className="mt-8 border border-primary/20 bg-gradient-to-br from-card to-primary/[0.04] shadow-lg ring-primary/10">
      <CardHeader className="border-b border-primary/10">
        <Badge className="mb-1 bg-primary/10 text-primary hover:bg-primary/10">
          LOST ARK
        </Badge>
        <CardTitle className="text-lg font-black">{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label
              htmlFor="auction-market-price"
              className="text-sm font-bold text-muted-foreground"
            >
              {t.price} ({t.gold})
            </label>
            <input
              type="number"
              min={0}
              value={price || ""}
              id="auction-market-price"
              onChange={(e) =>
                setPrice(Math.max(0, parseInt(e.target.value) || 0))
              }
              placeholder={t.pricePlaceholder}
              className="min-h-11 w-full rounded-xl border border-input bg-background px-4 py-2.5 font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="auction-party-size"
              className="text-sm font-bold text-muted-foreground"
            >
              {t.members}:{" "}
              <span className="text-primary">
                <AnimatedNumber
                  value={members}
                  locales={locale}
                  suffix={t.people}
                />
              </span>
            </label>
            <input
              type="range"
              min={2}
              max={30}
              value={members}
              onChange={(e) => setMembers(Number(e.target.value))}
              id="auction-party-size"
              className="w-full cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>2{t.people}</span>
              <span>16{t.people}</span>
              <span>30{t.people}</span>
            </div>
          </div>
        </div>

        <section aria-labelledby="auction-result-title" className="space-y-1.5">
          <h4
            id="auction-result-title"
            className="mb-2 text-sm font-black text-foreground"
          >
            {t.result}
          </h4>
          {rows.map(({ label, value, copy, highlight }) => (
            <div
              key={label}
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${highlight ? "border-primary/20 bg-primary/[0.09]" : "border-border bg-muted/30"}`}
            >
              <span className="text-sm font-semibold text-muted-foreground">
                {label}
              </span>
              <div className="flex items-center">
                <AnimatedNumber
                  value={value}
                  locales={locale}
                  suffix={t.gold}
                  className={`text-base font-black tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}
                />
                {copy && <CopyBtn value={value} t={t} />}
              </div>
            </div>
          ))}
        </section>

        <div className="rounded-xl border border-primary/10 bg-primary/[0.04] p-4 text-xs text-muted-foreground">
          <p className="mb-1 font-bold text-foreground">{t.formula}</p>
          <p>
            • <strong>{t.equalBid}</strong>: {t.equalHelp}
          </p>
          <p>
            • <strong>{t.maxBid}</strong>: {t.maxHelp}
          </p>
          <p>• {t.feeHelp}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Q1Q3 RAID PARTY SPLITTER
// ─────────────────────────────────────────────

type RaidType = "1-1" | "1-3";
type PartySize = 4 | 8 | 16;

const DEALER = ["ㄷ", "D", "d"];
const SUPP = ["ㅍ", "S", "s"];
const MAIN_SUFFIX = "(M)";

function getGameCount(rt: RaidType) {
  return rt === "1-1" ? 2 : 4;
}

function requiredSupporters(size: PartySize, rt: RaidType) {
  return (size * getGameCount(rt)) / 4;
}

function isMain(char: string) {
  return char.includes(MAIN_SUFFIX);
}
function isDealer(char: string) {
  return DEALER.includes(char.charAt(0));
}
function isSupporter(char: string) {
  return SUPP.includes(char.charAt(0));
}

type GameResult = string[][];

function countByGame(result: GameResult): {
  main: number[];
  sup: number[];
  mainSup: number[];
  subSup: number[];
} {
  const games = result[0].length;
  const main = Array(games).fill(0);
  const sup = Array(games).fill(0);
  const mainSup = Array(games).fill(0);
  const subSup = Array(games).fill(0);

  for (let g = 0; g < games; g++) {
    for (let p = 0; p < result.length; p++) {
      const c = result[p][g];
      if (!c) continue;
      if (isDealer(c) && isMain(c)) main[g]++;
      if (isSupporter(c)) {
        sup[g]++;
        if (isMain(c)) mainSup[g]++;
        else subSup[g]++;
      }
    }
  }
  return { main, sup, mainSup, subSup };
}

function distributeRaid(playersData: string[][], games: number): GameResult {
  const result: GameResult = playersData.map(() => Array(games).fill(""));

  // First pass: assign main characters
  for (let p = 0; p < playersData.length; p++) {
    const mains = playersData[p].filter((c) => isMain(c));
    mains.forEach((c, g) => {
      if (g < games) result[p][g] = c;
    });
  }

  // Second pass: fill remaining slots
  for (let g = 0; g < games; g++) {
    for (let p = 0; p < playersData.length; p++) {
      if (!result[p][g]) {
        const avail = playersData[p].find((c) => !result[p].includes(c));
        if (avail) result[p][g] = avail;
      }
    }
  }

  // Balance pass (swap to equalize supporter/main distribution)
  for (let iter = 0; iter < 100; iter++) {
    const { sup, mainSup, main } = countByGame(result);
    const maxSup = Math.max(...sup),
      minSup = Math.min(...sup);
    const maxMS = Math.max(...mainSup),
      minMS = Math.min(...mainSup);
    const maxM = Math.max(...main),
      minM = Math.min(...main);

    if (maxSup - minSup <= 1 && maxMS - minMS <= 1 && maxM - minM <= 1) break;

    const maxSupG = sup.indexOf(maxSup),
      minSupG = sup.indexOf(minSup);
    const maxMSG = mainSup.indexOf(maxMS),
      minMSG = mainSup.indexOf(minMS);

    let swapped = false;
    for (let p = 1; p < result.length && !swapped; p++) {
      if (maxMS - minMS > 1) {
        const c = result[p][maxMSG];
        if (isSupporter(c) && isMain(c)) {
          [result[p][maxMSG], result[p][minMSG]] = [
            result[p][minMSG],
            result[p][maxMSG],
          ];
          swapped = true;
        }
      } else if (maxSup - minSup > 1) {
        const c = result[p][maxSupG],
          d = result[p][minSupG];
        if (isSupporter(c) && !isMain(c) && isDealer(d)) {
          [result[p][maxSupG], result[p][minSupG]] = [
            result[p][minSupG],
            result[p][maxSupG],
          ];
          swapped = true;
        }
      }
    }
    if (!swapped) break;
  }

  return result;
}

function parsePlayerLine(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

function raidResultText(result: GameResult, partySize: PartySize): string {
  const games = result[0].length;
  const parties = Math.ceil(result.length / partySize);
  let text = "";
  for (let g = 0; g < games; g++) {
    text += `=== ${g + 1}게임 ===\n`;
    for (let party = 0; party < parties; party++) {
      text += `  파티 ${party + 1}: `;
      const start = party * partySize;
      const end = Math.min(start + partySize, result.length);
      text += result
        .slice(start, end)
        .map((p) => p[g] || "?")
        .join(", ");
      text += "\n";
    }
  }
  return text;
}

export function LostArkRaidSplitter() {
  const [raidType, setRaidType] = useState<RaidType>("1-1");
  const [partySize, setPartySize] = useState<PartySize>(4);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<GameResult | null>(null);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const calculate = useCallback(() => {
    setError("");
    const lines = input
      .trim()
      .split("\n")
      .filter((l) => l.trim());
    if (lines.length === 0) {
      setError("파티 데이터를 입력해 주세요.");
      return;
    }

    const playersData = lines.map(parsePlayerLine);
    const expectedPlayers = partySize;

    if (playersData.length !== expectedPlayers) {
      setError(
        `입력된 플레이어 수(${playersData.length})가 파티 크기(${expectedPlayers})와 맞지 않습니다.`,
      );
      return;
    }

    const supCount = playersData.flat().filter((c) => isSupporter(c)).length;
    const reqSup = requiredSupporters(partySize, raidType);
    if (supCount < reqSup) {
      setError(`서포터 부족: 필요 ${reqSup}명, 현재 ${supCount}명`);
    }

    try {
      const games = getGameCount(raidType);
      const distributed = distributeRaid(playersData, games);
      setResult(distributed);
    } catch {
      setError("분배 계산 중 오류가 발생했습니다.");
    }
  }, [input, raidType, partySize]);

  const copyAll = () => {
    if (!result) return;
    navigator.clipboard.writeText(raidResultText(result, partySize));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const roleColor = (char: string) => {
    if (!char) return "bg-slate-100 text-slate-400";
    if (isSupporter(char))
      return isMain(char)
        ? "bg-blue-100 text-blue-700 border border-blue-200"
        : "bg-indigo-50 text-indigo-600 border border-indigo-100";
    return isMain(char)
      ? "bg-rose-100 text-rose-700 border border-rose-200"
      : "bg-slate-50 text-slate-600 border border-slate-200";
  };

  const games = getGameCount(raidType);

  return (
    <Card className="p-6 bg-white border-slate-200 shadow-xl mt-8">
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              로스트아크 공대 분배기 (Q1Q3)
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              레이드 파티 캐릭터 자동 배분 · 본1부1 / 본1부3
            </p>
          </div>
          <button
            onClick={() => setShowHelp((h) => !h)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-full px-2.5 py-1"
          >
            {showHelp ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            사용법
          </button>
        </div>

        {showHelp && (
          <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-600 space-y-1.5 border border-slate-200">
            <p className="font-bold text-slate-700">입력 방식</p>
            <p>• 한 줄에 한 명, 공백으로 캐릭터 구분</p>
            <p>
              • <strong>딜러</strong>: D, ㄷ, d로 시작 / <strong>서포터</strong>
              : S, ㅍ, s로 시작
            </p>
            <p>
              • 본캐릭터(M)는 뒤에 <strong>(M)</strong> 추가 → 예: D(M), ㅍ(M)
            </p>
            <p className="font-bold text-slate-700 mt-2">예시 (파티4 기준)</p>
            <pre className="bg-white rounded p-2 text-xs border border-slate-200">{`D(M) D ㄷ ㅍ
D(M) d ㅍ(M) d
ㅍ(M) D D d
D(M) d d ㅍ`}</pre>
          </div>
        )}

        {/* Controls */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">
              레이드 방식
            </label>
            <div className="flex gap-2">
              {(["1-1", "1-3"] as RaidType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setRaidType(t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${raidType === t ? "bg-amber-50 border-amber-400 text-amber-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                >
                  본{t.replace("-", "부")}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">
              파티 크기
            </label>
            <div className="flex gap-2">
              {([4, 8, 16] as PartySize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setPartySize(s)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${partySize === s ? "bg-amber-50 border-amber-400 text-amber-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                >
                  {s}인
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500">
            파티 데이터 입력 ({partySize}줄, 한 줄에 한 명)
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={Math.min(partySize, 8)}
            placeholder={`D(M) D ㄷ ㅍ\nD(M) d ㅍ(M) d\n...`}
            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:border-amber-400 outline-none transition-colors resize-none"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={calculate}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl transition-colors"
          >
            분배하기
          </button>
          <button
            onClick={() => {
              setInput("");
              setResult(null);
              setError("");
            }}
            className="px-4 py-2.5 border-2 border-slate-200 hover:border-slate-300 rounded-xl text-slate-600 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-800">분배 결과</p>
              <button
                onClick={copyAll}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-colors"
              >
                {copiedAll ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copiedAll ? "복사됨" : "전체 복사"}
              </button>
            </div>
            {Array.from({ length: games }, (_, g) => (
              <div key={g} className="space-y-2">
                <p className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg inline-block">
                  {g + 1}게임
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {result.map((player, p) => (
                    <div key={p} className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-12 text-right">
                        P{p + 1}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-sm font-bold ${roleColor(player[g])}`}
                      >
                        {player[g] || "—"}
                      </span>
                      {isSupporter(player[g]) && (
                        <span className="text-[10px] text-blue-400 font-bold">
                          SUP
                        </span>
                      )}
                      {isDealer(player[g]) && (
                        <span className="text-[10px] text-rose-400 font-bold">
                          DPS
                        </span>
                      )}
                      {isMain(player[g]) && (
                        <span className="text-[10px] text-amber-500 font-bold">
                          본캐
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

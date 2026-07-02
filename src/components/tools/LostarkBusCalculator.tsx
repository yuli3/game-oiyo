import { useState } from "react";
import type { Locale } from "../../lib/i18n";
import {
  calculateAllBid,
  calculateExclusiveOnly,
  isValidParticipantCounts,
  canUseExclusiveOnlyMode,
  formatGold,
  type CalculationMode,
} from "../../lib/lostark/bus";

interface UiLabels {
  partySize: string;
  custom: string;
  carriers: string;
  nonBidders: string;
  exclusiveBidders: string;
  prices: string;
  nonBidderPrice: string;
  exclusiveBidderPrice: string;
  allBid: string;
  exclusiveOnly: string;
  exclusiveDisabled: string;
  invalidTitle: string;
  invalidDesc: string;
  results: string;
  nonBidderAuction: string;
  exclusiveBidderAuction: string;
  nonBidderTrade: string;
  carrierDistribution: string;
  gold: string;
}

const L: Record<string, UiLabels> = {
  en: {
    partySize: "Party size", custom: "Custom", carriers: "Carriers", nonBidders: "Non-bidders", exclusiveBidders: "Exclusive bidders",
    prices: "Prices", nonBidderPrice: "Non-bidder price", exclusiveBidderPrice: "Exclusive price",
    allBid: "All guests bid", exclusiveOnly: "Exclusive only",
    exclusiveDisabled: "Available only when carriers = non-bidders + exclusive bidders.",
    invalidTitle: "Invalid participant counts", invalidDesc: "Total must equal party size, with at least 1 carrier and 1 exclusive bidder.",
    results: "Results", nonBidderAuction: "Non-bidder auction price", exclusiveBidderAuction: "Exclusive auction price",
    nonBidderTrade: "Non-bidder trade price", carrierDistribution: "Per-carrier payout", gold: "G",
  },
  ko: {
    partySize: "파티 인원", custom: "직접 입력", carriers: "기사 인원", nonBidders: "미참 인원", exclusiveBidders: "독식 인원",
    prices: "가격 설정", nonBidderPrice: "미참 가격", exclusiveBidderPrice: "독식 가격",
    allBid: "손님 모두 입찰", exclusiveOnly: "독식만 입찰",
    exclusiveDisabled: "기사 인원 = 미참 + 독식 인원일 때만 사용 가능합니다.",
    invalidTitle: "유효하지 않은 참가자 수", invalidDesc: "총 인원은 파티 인원과 같아야 하며, 기사 1명·독식 1명 이상이 필요합니다.",
    results: "계산 결과", nonBidderAuction: "미참 경매 가격", exclusiveBidderAuction: "독식 경매 가격",
    nonBidderTrade: "미참 거래 가격", carrierDistribution: "기사 1인 분배 금액", gold: "골드",
  },
  ja: {
    partySize: "パーティ人数", custom: "直接入力", carriers: "騎士人数", nonBidders: "未参人数", exclusiveBidders: "独占人数",
    prices: "価格設定", nonBidderPrice: "未参価格", exclusiveBidderPrice: "独占価格",
    allBid: "全員入札", exclusiveOnly: "独占のみ入札",
    exclusiveDisabled: "騎士人数 = 未参 + 独占人数のときのみ使用できます。",
    invalidTitle: "無効な参加者数", invalidDesc: "合計はパーティ人数と一致し、騎士1名・独占1名以上が必要です。",
    results: "計算結果", nonBidderAuction: "未参オークション価格", exclusiveBidderAuction: "独占オークション価格",
    nonBidderTrade: "未参取引価格", carrierDistribution: "騎士1人あたり分配額", gold: "G",
  },
};

const PARTY_SIZES = [4, 8, 16] as const;

interface Props {
  locale: Locale;
}

export default function LostarkBusCalculator({ locale }: Props) {
  const t = L[locale] ?? L.en;

  const [partySize, setPartySize] = useState<number>(8);
  const [carriers, setCarriers] = useState("1");
  const [nonBidders, setNonBidders] = useState("6");
  const [exclusiveBidders, setExclusiveBidders] = useState("1");
  const [nonBidderPrice, setNonBidderPrice] = useState("10000");
  const [exclusiveBidderPrice, setExclusiveBidderPrice] = useState("20000");
  const [mode, setMode] = useState<CalculationMode>("allBid");

  const counts = {
    carriers: parseInt(carriers, 10) || 0,
    nonBidders: parseInt(nonBidders, 10) || 0,
    exclusiveBidders: parseInt(exclusiveBidders, 10) || 0,
  };
  const prices = {
    nonBidderPrice: parseInt(nonBidderPrice, 10) || 0,
    exclusiveBidderPrice: parseInt(exclusiveBidderPrice, 10) || 0,
  };

  const valid = isValidParticipantCounts(counts, partySize);
  const exclusiveAllowed = canUseExclusiveOnlyMode(counts);
  const effectiveMode: CalculationMode =
    mode === "exclusiveOnly" && !exclusiveAllowed ? "allBid" : mode;

  const allBid = valid ? calculateAllBid(counts, prices) : null;
  const exclusiveOnly = valid && exclusiveAllowed ? calculateExclusiveOnly(counts, prices) : null;

  const inputCls =
    "rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-primary";
  const numField = (
    label: string,
    value: string,
    setter: (v: string) => void,
  ) => (
    <label className="block">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <input type="number" inputMode="numeric" min="0" value={value} onChange={(e) => setter(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
    </label>
  );

  const resultRow = (label: string, value: number) => (
    <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold text-foreground">{formatGold(value)} {t.gold}</span>
    </div>
  );

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      {/* Party size */}
      <div className="mb-4">
        <span className="text-sm font-medium text-muted-foreground">{t.partySize}</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {PARTY_SIZES.map((s) => (
            <button key={s} type="button" onClick={() => setPartySize(s)}
              className={`rounded-md border px-4 py-2 text-sm font-semibold transition-colors ${partySize === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-primary/40"}`}>
              {s}
            </button>
          ))}
          <input type="number" inputMode="numeric" min="1" value={partySize}
            onChange={(e) => setPartySize(parseInt(e.target.value, 10) || 1)}
            aria-label={t.custom} className={`w-24 ${inputCls}`} />
        </div>
      </div>

      {/* Participant counts */}
      <div className="grid gap-3 sm:grid-cols-3">
        {numField(t.carriers, carriers, setCarriers)}
        {numField(t.nonBidders, nonBidders, setNonBidders)}
        {numField(t.exclusiveBidders, exclusiveBidders, setExclusiveBidders)}
      </div>

      {/* Prices */}
      <p className="mt-5 mb-1 text-sm font-medium text-muted-foreground">{t.prices}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {numField(t.nonBidderPrice, nonBidderPrice, setNonBidderPrice)}
        {numField(t.exclusiveBidderPrice, exclusiveBidderPrice, setExclusiveBidderPrice)}
      </div>

      {/* Mode tabs */}
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={() => setMode("allBid")}
          className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${effectiveMode === "allBid" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-primary/40"}`}>
          {t.allBid}
        </button>
        <button type="button" onClick={() => exclusiveAllowed && setMode("exclusiveOnly")} disabled={!exclusiveAllowed}
          title={!exclusiveAllowed ? t.exclusiveDisabled : undefined}
          className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-40 ${effectiveMode === "exclusiveOnly" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-primary/40"}`}>
          {t.exclusiveOnly}
        </button>
      </div>

      {/* Results */}
      {!valid ? (
        <div className="mt-5 rounded-md border border-warning/30 bg-warning/10 px-3 py-3">
          <p className="text-sm font-semibold text-foreground">{t.invalidTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t.invalidDesc}</p>
        </div>
      ) : (
        <div className="mt-5">
          <p className="mb-2 text-sm font-bold text-foreground">{t.results}</p>
          <div className="grid gap-2">
            {effectiveMode === "allBid" && allBid && (
              <>
                {resultRow(t.nonBidderAuction, allBid.nonBidderAuctionPrice)}
                {resultRow(t.exclusiveBidderAuction, allBid.exclusiveBidderAuctionPrice)}
                {resultRow(t.carrierDistribution, allBid.carrierDistribution)}
              </>
            )}
            {effectiveMode === "exclusiveOnly" && exclusiveOnly && (
              <>
                {resultRow(t.nonBidderTrade, exclusiveOnly.nonBidderTradePrice)}
                {resultRow(t.exclusiveBidderAuction, exclusiveOnly.exclusiveBidderAuctionPrice)}
                {resultRow(t.carrierDistribution, exclusiveOnly.carrierDistribution)}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

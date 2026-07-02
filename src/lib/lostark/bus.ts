// Lost Ark raid "bus" (carry) auction-price calculator.
// Math ported verbatim from ahoxy lib/lostark-bus-calculator/calculator.ts —
// do not alter the formulas; they mirror the original tool's verified output.

export type PartySize = 4 | 8 | 16 | "custom" | number;

export interface ParticipantCounts {
  carriers: number;
  nonBidders: number;
  exclusiveBidders: number;
}

export interface PriceInputs {
  nonBidderPrice: number;
  exclusiveBidderPrice: number;
}

export interface AllBidCalculationResult {
  nonBidderAuctionPrice: number;
  exclusiveBidderAuctionPrice: number;
  carrierDistribution: number;
}

export interface ExclusiveOnlyCalculationResult {
  nonBidderTradePrice: number;
  exclusiveBidderAuctionPrice: number;
  carrierDistribution: number;
}

export type CalculationMode = "allBid" | "exclusiveOnly";

export function calculateAllBid(
  counts: ParticipantCounts,
  prices: PriceInputs,
): AllBidCalculationResult {
  const totalParticipants =
    counts.carriers + counts.nonBidders + counts.exclusiveBidders;
  const passengerCount = counts.nonBidders + counts.exclusiveBidders;

  const carrierDistribution =
    (prices.nonBidderPrice * counts.nonBidders + prices.exclusiveBidderPrice) /
    counts.carriers;

  const x = (prices.exclusiveBidderPrice - prices.nonBidderPrice) / totalParticipants;

  const y =
    ((prices.nonBidderPrice * counts.nonBidders + prices.exclusiveBidderPrice) /
      counts.carriers -
      x) /
    passengerCount;

  const nonBidderAuctionPrice = y * (totalParticipants - 1);
  const exclusiveBidderAuctionPrice = (x + y) * (totalParticipants - 1);

  return { nonBidderAuctionPrice, exclusiveBidderAuctionPrice, carrierDistribution };
}

export function calculateExclusiveOnly(
  counts: ParticipantCounts,
  prices: PriceInputs,
): ExclusiveOnlyCalculationResult {
  const totalParticipants =
    counts.carriers + counts.nonBidders + counts.exclusiveBidders;

  const x = (prices.exclusiveBidderPrice - prices.nonBidderPrice) / totalParticipants;

  const nonBidderTradePrice = prices.nonBidderPrice + x;
  const exclusiveBidderAuctionPrice = prices.exclusiveBidderPrice - prices.nonBidderPrice - x;
  const carrierDistribution =
    nonBidderTradePrice * 0.95 + exclusiveBidderAuctionPrice / (totalParticipants - 1);

  return { nonBidderTradePrice, exclusiveBidderAuctionPrice, carrierDistribution };
}

export function formatGold(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(value),
  );
}

export function isValidParticipantCounts(
  counts: ParticipantCounts,
  partySize: number,
): boolean {
  const total = counts.carriers + counts.nonBidders + counts.exclusiveBidders;
  return (
    total === partySize &&
    counts.carriers > 0 &&
    counts.nonBidders >= 0 &&
    counts.exclusiveBidders > 0
  );
}

export function canUseExclusiveOnlyMode(counts: ParticipantCounts): boolean {
  return counts.carriers === counts.nonBidders + counts.exclusiveBidders;
}

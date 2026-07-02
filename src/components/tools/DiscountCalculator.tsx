import { useState } from "react";
import type { Locale } from "../../lib/i18n";

interface UiLabels {
  price: string;
  discount: string;
  extra: string;
  extraHint: string;
  final: string;
  saved: string;
  effective: string;
  off: string;
}

const L: Record<string, UiLabels> = {
  en: { price: "Original price", discount: "Discount %", extra: "Extra discount % (optional)", extraHint: "Stacked on the already-discounted price (e.g. coupon).", final: "Final price", saved: "You save", effective: "Effective discount", off: "off" },
  ko: { price: "정가", discount: "할인율 %", extra: "추가 할인 % (선택)", extraHint: "1차 할인된 가격에 추가로 적용됩니다(예: 쿠폰).", final: "최종 가격", saved: "절약 금액", effective: "실질 할인율", off: "할인" },
  ja: { price: "定価", discount: "割引率 %", extra: "追加割引 %（任意）", extraHint: "1次割引後の価格にさらに適用されます（クーポンなど）。", final: "最終価格", saved: "割引額", effective: "実質割引率", off: "OFF" },
  zh: { price: "原价", discount: "折扣 %", extra: "额外折扣 %（可选）", extraHint: "在已折扣价格上叠加（如优惠券）。", final: "最终价格", saved: "节省", effective: "实际折扣", off: "折" },
  fr: { price: "Prix initial", discount: "Remise %", extra: "Remise supplémentaire % (option)", extraHint: "Appliquée sur le prix déjà remisé (ex. coupon).", final: "Prix final", saved: "Économie", effective: "Remise effective", off: "de remise" },
  es: { price: "Precio original", discount: "Descuento %", extra: "Descuento extra % (opcional)", extraHint: "Se aplica sobre el precio ya rebajado (p. ej. cupón).", final: "Precio final", saved: "Ahorro", effective: "Descuento efectivo", off: "de descuento" },
};

const CURRENCY: Record<string, string> = { ko: "₩", en: "$", ja: "¥", fr: "€", es: "€", zh: "¥", };
const LOCALE_NUM: Record<string, string> = { ko: "ko-KR", en: "en-US", ja: "ja-JP", fr: "fr-FR", es: "es-ES", zh: "zh-CN", };

interface Props {
  locale: Locale;
}

export default function DiscountCalculator({ locale }: Props) {
  const t = L[locale] ?? L.en;
  const currency = CURRENCY[locale] ?? "$";
  const noDecimals = locale === "ko" || locale === "ja";
  const defaultPrice = locale === "ko" ? "50000" : locale === "ja" ? "5000" : "100";

  const [price, setPrice] = useState(defaultPrice);
  const [disc, setDisc] = useState("20");
  const [extra, setExtra] = useState("");

  const p = parseFloat(price);
  const d = parseFloat(disc);
  const e = parseFloat(extra);
  const valid = p > 0 && d >= 0 && d <= 100;

  const d1 = valid ? p * (1 - d / 100) : 0;
  const hasExtra = valid && e > 0 && e <= 100;
  const finalPrice = hasExtra ? d1 * (1 - e / 100) : d1;
  const saved = p - finalPrice;
  const effective = p > 0 ? (saved / p) * 100 : 0;

  const fmt = (n: number) =>
    new Intl.NumberFormat(LOCALE_NUM[locale] ?? "en-US", {
      minimumFractionDigits: noDecimals ? 0 : 2,
      maximumFractionDigits: noDecimals ? 0 : 2,
    }).format(noDecimals ? Math.round(n) : n);

  const inputCls =
    "rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-primary";

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">{t.price}</span>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currency}</span>
            <input type="number" inputMode="decimal" value={price} onChange={(ev) => setPrice(ev.target.value)} className={`w-full pl-7 ${inputCls}`} />
          </div>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">{t.discount}</span>
          <input type="number" inputMode="decimal" value={disc} onChange={(ev) => setDisc(ev.target.value)} className={`mt-1 w-full ${inputCls}`} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-muted-foreground">{t.extra}</span>
          <input type="number" inputMode="decimal" value={extra} onChange={(ev) => setExtra(ev.target.value)} className={`mt-1 w-full ${inputCls}`} placeholder="0" />
          <span className="mt-1 block text-xs text-muted-foreground">{t.extraHint}</span>
        </label>
      </div>

      {valid && (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-primary bg-accent px-3 py-3 text-center">
              <p className="text-xs font-medium text-muted-foreground">{t.final}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-primary">{currency}{fmt(finalPrice)}</p>
            </div>
            <div className="rounded-md border border-border bg-background px-3 py-3 text-center">
              <p className="text-xs font-medium text-muted-foreground">{t.saved}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-foreground">{currency}{fmt(saved)}</p>
            </div>
          </div>
          {hasExtra && (
            <div className="mt-3 rounded-md border border-border px-3 py-2 text-center text-sm">
              <span className="text-muted-foreground">{t.effective}: </span>
              <span className="font-mono font-semibold text-foreground">{effective.toFixed(1)}% {t.off}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

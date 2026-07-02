import { useMemo, useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";

interface Labels { title: string; subtitle: string; amount: string; plaintiffs: string; defendants: string; electronic: string; stamp: string; service: string; lawyer: string; total: string; won: string; tips: string; }
const LABELS: Record<Locale, Labels> = {
  en: { title: "Korean Litigation Cost Calculator", subtitle: "Court stamp, service fee, and recoverable attorney-fee cap.", amount: "Claim amount", plaintiffs: "Plaintiffs", defendants: "Defendants", electronic: "Electronic filing discount", stamp: "Court stamp duty", service: "Service fee", lawyer: "Recoverable attorney fee cap", total: "Estimated total", won: "KRW", tips: "Korean civil litigation estimate. Actual court payment can differ by filing type and case handling." },
  ko: { title: "소송비용 계산기", subtitle: "인지대, 송달료, 소송비용 산입 변호사보수를 계산합니다.", amount: "소가", plaintiffs: "원고 수", defendants: "피고 수", electronic: "전자소송 10% 감액", stamp: "인지대", service: "송달료", lawyer: "상대방 청구 가능 변호사보수 한도", total: "예상 합계", won: "원", tips: "대한민국 민사소송 기준의 일반 추정치입니다. 실제 납부액은 사건 유형과 법원 안내를 확인하세요." },
  ja: { title: "韓国訴訟費用計算機", subtitle: "印紙代、送達料、回収可能な弁護士費用上限を計算します。", amount: "請求額", plaintiffs: "原告数", defendants: "被告数", electronic: "電子訴訟10%減額", stamp: "印紙代", service: "送達料", lawyer: "弁護士費用上限", total: "概算合計", won: "KRW", tips: "韓国民事訴訟向けの一般的な概算です。実際の金額は裁判所の案内を確認してください。" },
  zh: { title: "韩国诉讼费用计算器", subtitle: "计算法院印花费、送达费和可请求律师费上限。", amount: "诉讼标的金额", plaintiffs: "原告人数", defendants: "被告人数", electronic: "电子诉讼 10% 减免", stamp: "法院印花费", service: "送达费", lawyer: "可请求律师费上限", total: "估算合计", won: "韩元", tips: "这是韩国民事诉讼的一般估算。实际缴纳金额请确认法院或官方说明。" },
  fr: { title: "Calculateur de Frais de Procès Coréens", subtitle: "Timbre judiciaire, signification et plafond d'honoraires récupérables.", amount: "Montant de la demande", plaintiffs: "Demandeurs", defendants: "Défendeurs", electronic: "Réduction dépôt électronique", stamp: "Droit de timbre", service: "Frais de signification", lawyer: "Plafond d'honoraires récupérables", total: "Total estimé", won: "KRW", tips: "Estimation générale pour une procédure civile coréenne. Confirmez les montants officiels auprès du tribunal." },
  es: { title: "Calculadora de Costas Judiciales de Corea", subtitle: "Tasa judicial, notificaciones y límite de honorarios recuperables.", amount: "Cuantía reclamada", plaintiffs: "Demandantes", defendants: "Demandados", electronic: "Descuento por presentación electrónica", stamp: "Tasa judicial", service: "Gastos de notificación", lawyer: "Límite de honorarios recuperables", total: "Total estimado", won: "KRW", tips: "Estimación general para litigios civiles de Corea. Confirma las cifras oficiales con el tribunal." },
};
function formatWon(value: number) { return new Intl.NumberFormat("ko-KR").format(Math.floor(value)); }
function calcBaseStamp(amount: number) { if (amount < 10000000) return amount * 0.005; if (amount < 100000000) return amount * 0.0045 + 5000; if (amount < 1000000000) return amount * 0.004 + 55000; return amount * 0.0035 + 555000; }
function calcLawyer(amount: number) { if (amount <= 3000000) return 300000; if (amount <= 20000000) return 300000 + (amount - 3000000) * 0.1; if (amount <= 50000000) return 2000000 + (amount - 20000000) * 0.08; if (amount <= 100000000) return 4400000 + (amount - 50000000) * 0.06; if (amount <= 200000000) return 7400000 + (amount - 100000000) * 0.04; if (amount <= 500000000) return 11400000 + (amount - 200000000) * 0.02; return 17400000 + (amount - 500000000) * 0.01; }
export default function LitigationCostCalculator({ locale }: { locale: Locale }) {
  const t = LABELS[locale] ?? LABELS.en;
  const [amount, setAmount] = useState(30000000);
  const [plaintiffs, setPlaintiffs] = useState(1);
  const [defendants, setDefendants] = useState(1);
  const [electronic, setElectronic] = useState(true);
  const result = useMemo(() => {
    let stamp = calcBaseStamp(amount);
    if (electronic) stamp = Math.floor(stamp * 0.9);
    stamp = Math.max(1000, Math.floor(stamp / 100) * 100);
    const times = amount <= 30000000 ? 10 : 15;
    const service = 5200 * times * (plaintiffs + defendants);
    const lawyer = Math.floor(calcLawyer(amount));
    return { stamp, service, lawyer, total: stamp + service + lawyer };
  }, [amount, plaintiffs, defendants, electronic]);
  const inputCls = "mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";
  const row = (label: string, value: number) => <div className="rounded-xl border border-slate-200 bg-white p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-2 font-mono text-xl font-black text-slate-900">{formatWon(value)} {t.won}</dd></div>;
  return <GameContainer title={t.title} subtitle={t.subtitle}><div className="grid gap-4"><div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"><label className="block sm:col-span-2"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.amount}</span><input className={inputCls} type="number" min="0" step="10000" value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></label><label className="block"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.plaintiffs}</span><input className={inputCls} type="number" min="1" value={plaintiffs} onChange={(event) => setPlaintiffs(Math.max(1, Number(event.target.value)))} /></label><label className="block"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.defendants}</span><input className={inputCls} type="number" min="1" value={defendants} onChange={(event) => setDefendants(Math.max(1, Number(event.target.value)))} /></label><label className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 sm:col-span-2"><input type="checkbox" checked={electronic} onChange={(event) => setElectronic(event.target.checked)} />{t.electronic}</label></div><dl className="grid gap-3 sm:grid-cols-2">{row(t.stamp, result.stamp)}{row(t.service, result.service)}{row(t.lawyer, result.lawyer)}<div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{t.total}</dt><dd className="mt-2 font-mono text-2xl font-black text-indigo-950">{formatWon(result.total)} {t.won}</dd></div></dl><p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">{t.tips}</p></div></GameContainer>;
}

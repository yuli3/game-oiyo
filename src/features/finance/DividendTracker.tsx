import { useEffect, useMemo, useState } from "react";
import { FinanceGuardrail } from "./FinanceGuardrail";

// 배당 기록 MVP — 기록·교육 전용(투자 조언 아님). 전부 브라우저 로컬(localStorage), 서버 전송 없음.
type Holding = { id: string; ticker: string; shares: string; perShare: string; freq: string; exDate: string; taxPct: string };
type Lang = "ko" | "en" | "ja" | "zh" | "fr" | "es";
const KEY = "oiyo:dividend-tracker:v1";
const FREQ: Record<string, number> = { monthly: 12, quarterly: 4, semiannual: 2, annual: 1 };

const T: Record<Lang, Record<string, string>> = {
  ko: {
    title: "배당 기록기", desc: "보유 종목의 배당을 기록하고 연 배당·세후 추정을 계산합니다. 투자 조언이 아니며, 모든 데이터는 브라우저에만 저장됩니다.",
    ticker: "종목", shares: "수량", perShare: "1주 배당", freq: "주기", exDate: "배당기준일", tax: "세율%", add: "+ 종목 추가",
    annualGross: "연 배당(세전)", annualNet: "연 배당(세후)", total: "합계", csv: "CSV 내보내기", empty: "종목을 추가하세요.",
    monthly: "월", quarterly: "분기", semiannual: "반기", annual: "연", local: "🔒 로컬 저장 · 서버 전송 없음", remove: "종목 삭제",
  },
  en: {
    title: "Dividend Tracker", desc: "Record holdings and estimate annual / after-tax dividends. Not investment advice. All data stays in your browser.",
    ticker: "Ticker", shares: "Shares", perShare: "Div/share", freq: "Freq", exDate: "Ex-date", tax: "Tax%", add: "+ Add holding",
    annualGross: "Annual (gross)", annualNet: "Annual (net)", total: "Total", csv: "Export CSV", empty: "Add a holding.",
    monthly: "Monthly", quarterly: "Quarterly", semiannual: "Semiannual", annual: "Annual", local: "🔒 stored locally · never uploaded", remove: "Remove holding",
  },
  ja: {
    title: "配当トラッカー", desc: "保有銘柄の配当を記録し、年間・税引後の概算を計算します。投資助言ではなく、データはブラウザ内だけに保存されます。",
    ticker: "銘柄", shares: "株数", perShare: "1株配当", freq: "頻度", exDate: "権利落ち日", tax: "税率%", add: "+ 銘柄を追加",
    annualGross: "年間配当（税前）", annualNet: "年間配当（税後）", total: "合計", csv: "CSVを書き出す", empty: "銘柄を追加してください。",
    monthly: "毎月", quarterly: "四半期", semiannual: "半期", annual: "年次", local: "🔒 ローカル保存 · サーバー送信なし", remove: "銘柄を削除",
  },
  zh: {
    title: "股息记录器", desc: "记录持仓股息并估算年度与税后股息。非投资建议，所有数据只保存在浏览器中。",
    ticker: "代码", shares: "股数", perShare: "每股股息", freq: "频率", exDate: "除息日", tax: "税率%", add: "+ 添加持仓",
    annualGross: "年度股息（税前）", annualNet: "年度股息（税后）", total: "合计", csv: "导出 CSV", empty: "请添加持仓。",
    monthly: "每月", quarterly: "每季", semiannual: "半年", annual: "每年", local: "🔒 本地保存 · 不上传服务器", remove: "删除持仓",
  },
  fr: {
    title: "Suivi de dividendes", desc: "Enregistrez vos positions et estimez les dividendes annuels / après impôt. Pas un conseil en investissement. Les données restent dans votre navigateur.",
    ticker: "Ticker", shares: "Parts", perShare: "Div./part", freq: "Fréq.", exDate: "Date ex-div.", tax: "Impôt%", add: "+ Ajouter une ligne",
    annualGross: "Annuel brut", annualNet: "Annuel net", total: "Total", csv: "Exporter CSV", empty: "Ajoutez une position.",
    monthly: "Mensuel", quarterly: "Trimestriel", semiannual: "Semestriel", annual: "Annuel", local: "🔒 stockage local · aucun envoi serveur", remove: "Supprimer la position",
  },
  es: {
    title: "Registro de dividendos", desc: "Registra posiciones y estima dividendos anuales / después de impuestos. No es asesoramiento de inversión. Los datos quedan en tu navegador.",
    ticker: "Ticker", shares: "Acciones", perShare: "Div./acción", freq: "Frec.", exDate: "Fecha ex-div.", tax: "Impuesto%", add: "+ Añadir posición",
    annualGross: "Anual bruto", annualNet: "Anual neto", total: "Total", csv: "Exportar CSV", empty: "Añade una posición.",
    monthly: "Mensual", quarterly: "Trimestral", semiannual: "Semestral", annual: "Anual", local: "🔒 guardado local · no se sube al servidor", remove: "Eliminar posición",
  },
};

const blank = (): Holding => ({ id: Math.random().toString(36).slice(2, 8), ticker: "", shares: "", perShare: "", freq: "quarterly", exDate: "", taxPct: "15.4" });

export function DividendTracker({ locale }: { locale: string }) {
  const t = T[locale as Lang] ?? T.en;
  const [rows, setRows] = useState<Holding[]>([blank()]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try { const s = localStorage.getItem(KEY); if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length) setRows(p); } } catch {}
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch {} }, [rows, hydrated]);

  const calc = (h: Holding) => {
    const annual = (parseFloat(h.shares) || 0) * (parseFloat(h.perShare) || 0) * (FREQ[h.freq] || 1);
    const net = annual * (1 - (parseFloat(h.taxPct) || 0) / 100);
    return { annual, net };
  };
  const totals = useMemo(() => rows.reduce((a, h) => { const c = calc(h); return { gross: a.gross + c.annual, net: a.net + c.net }; }, { gross: 0, net: 0 }), [rows]);
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  const set = (id: string, k: keyof Holding, v: string) => setRows((r) => r.map((h) => (h.id === id ? { ...h, [k]: v } : h)));
  const del = (id: string) => setRows((r) => (r.length > 1 ? r.filter((h) => h.id !== id) : r));

  const exportCsv = () => {
    const header = ["ticker", "shares", "perShare", "freq", "exDate", "taxPct", "annualGross", "annualNet"];
    const lines = rows.map((h) => { const c = calc(h); return [h.ticker, h.shares, h.perShare, h.freq, h.exDate, h.taxPct, c.annual.toFixed(2), c.net.toFixed(2)].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","); });
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "dividends.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const inp = "w-full rounded border border-green-200 px-2 py-1 text-sm outline-none focus:border-green-500";
  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-black text-green-950">{t.title}</h1>
      <p className="mt-2 text-sm text-green-700">{t.desc}</p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-green-100 bg-white p-4 shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="text-left text-xs text-slate-500">
            <th scope="col" className="pb-2">{t.ticker}</th><th scope="col">{t.shares}</th><th scope="col">{t.perShare}</th><th scope="col">{t.freq}</th><th scope="col">{t.exDate}</th><th scope="col">{t.tax}</th><th scope="col" className="text-right">{t.annualNet}</th><th scope="col"></th>
          </tr></thead>
          <tbody>
            {rows.map((h) => {
              const c = calc(h);
              return (
                <tr key={h.id} className="border-t border-green-50">
                  <td className="py-1.5 pr-2"><input className={inp} value={h.ticker} onChange={(e) => set(h.id, "ticker", e.target.value)} placeholder="JEPI" /></td>
                  <td className="pr-2"><input className={inp} type="number" value={h.shares} onChange={(e) => set(h.id, "shares", e.target.value)} /></td>
                  <td className="pr-2"><input className={inp} type="number" value={h.perShare} onChange={(e) => set(h.id, "perShare", e.target.value)} /></td>
                  <td className="pr-2">
                    <select className={inp} value={h.freq} onChange={(e) => set(h.id, "freq", e.target.value)}>
                      {(["monthly", "quarterly", "semiannual", "annual"] as const).map((f) => <option key={f} value={f}>{t[f]}</option>)}
                    </select>
                  </td>
                  <td className="pr-2"><input className={inp} type="date" value={h.exDate} onChange={(e) => set(h.id, "exDate", e.target.value)} /></td>
                  <td className="pr-2"><input className={inp} type="number" value={h.taxPct} onChange={(e) => set(h.id, "taxPct", e.target.value)} /></td>
                  <td className="pr-2 text-right font-semibold text-green-800">{fmt(c.net)}</td>
                  <td><button type="button" aria-label={t.remove} onClick={() => del(h.id)} className="px-1 text-slate-400 hover:text-red-500">✕</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => setRows((r) => [...r, blank()])} className="rounded-lg border border-green-300 px-3 py-1.5 text-sm font-bold text-green-700 hover:bg-green-50">{t.add}</button>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500">{t.total}</span>
            <span>{t.annualGross}: <b>{fmt(totals.gross)}</b></span>
            <span className="text-green-800">{t.annualNet}: <b>{fmt(totals.net)}</b></span>
            <button onClick={exportCsv} className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-bold text-white hover:bg-green-800">{t.csv}</button>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">{t.local}</p>
      <FinanceGuardrail locale={locale} />
    </section>
  );
}

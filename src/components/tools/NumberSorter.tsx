import { useMemo, useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";

interface Labels {
  title: string;
  subtitle: string;
  inputLabel: string;
  placeholder: string;
  direction: string;
  asc: string;
  desc: string;
  dedupe: string;
  result: string;
  stats: string;
  count: string;
  sum: string;
  min: string;
  max: string;
  average: string;
  empty: string;
}

const LABELS: Record<Locale, Labels> = {
  en: { title: "Number Sorter", subtitle: "Sort pasted numbers and summarize the list.", inputLabel: "Numbers", placeholder: "12, 4, 9\n3 4 18", direction: "Direction", asc: "Ascending", desc: "Descending", dedupe: "Remove duplicates", result: "Sorted result", stats: "Summary", count: "Count", sum: "Sum", min: "Min", max: "Max", average: "Average", empty: "Enter numbers separated by commas, spaces, or line breaks." },
  ko: { title: "숫자 정렬기", subtitle: "붙여 넣은 숫자를 정렬하고 통계를 계산합니다.", inputLabel: "숫자 목록", placeholder: "12, 4, 9\n3 4 18", direction: "정렬 방향", asc: "오름차순", desc: "내림차순", dedupe: "중복 제거", result: "정렬 결과", stats: "요약", count: "개수", sum: "합계", min: "최솟값", max: "최댓값", average: "평균", empty: "쉼표, 공백, 줄바꿈으로 숫자를 구분해 입력하세요." },
  ja: { title: "数値ソーター", subtitle: "貼り付けた数値を並べ替え、要約します。", inputLabel: "数値リスト", placeholder: "12, 4, 9\n3 4 18", direction: "並び順", asc: "昇順", desc: "降順", dedupe: "重複を削除", result: "並べ替え結果", stats: "集計", count: "個数", sum: "合計", min: "最小", max: "最大", average: "平均", empty: "カンマ、空白、改行で数値を区切って入力してください。" },
  zh: { title: "数字排序器", subtitle: "排序粘贴的数字并生成摘要。", inputLabel: "数字列表", placeholder: "12, 4, 9\n3 4 18", direction: "排序方向", asc: "升序", desc: "降序", dedupe: "去除重复值", result: "排序结果", stats: "统计", count: "数量", sum: "总和", min: "最小值", max: "最大值", average: "平均值", empty: "请用逗号、空格或换行分隔数字。" },
  fr: { title: "Trieur de Nombres", subtitle: "Triez des nombres collés et résumez la liste.", inputLabel: "Nombres", placeholder: "12, 4, 9\n3 4 18", direction: "Ordre", asc: "Croissant", desc: "Décroissant", dedupe: "Supprimer les doublons", result: "Résultat trié", stats: "Résumé", count: "Nombre", sum: "Somme", min: "Min", max: "Max", average: "Moyenne", empty: "Entrez des nombres séparés par des virgules, espaces ou retours à la ligne." },
  es: { title: "Ordenador de Números", subtitle: "Ordena números pegados y resume la lista.", inputLabel: "Números", placeholder: "12, 4, 9\n3 4 18", direction: "Orden", asc: "Ascendente", desc: "Descendente", dedupe: "Eliminar duplicados", result: "Resultado ordenado", stats: "Resumen", count: "Cantidad", sum: "Suma", min: "Mín", max: "Máx", average: "Promedio", empty: "Introduce números separados por comas, espacios o saltos de línea." },
};

function parseNumbers(input: string): number[] {
  return input.split(/[\s,;]+/).map((part) => part.trim()).filter(Boolean).map(Number).filter((num) => Number.isFinite(num));
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : parseFloat(value.toFixed(6)).toString();
}

export default function NumberSorter({ locale }: { locale: Locale }) {
  const t = LABELS[locale] ?? LABELS.en;
  const [input, setInput] = useState("12, 4, 9\n3 4 18");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [dedupe, setDedupe] = useState(false);

  const data = useMemo(() => {
    const parsed = parseNumbers(input);
    const list = dedupe ? Array.from(new Set(parsed)) : parsed;
    const sorted = [...list].sort((a, b) => (direction === "asc" ? a - b : b - a));
    const sum = sorted.reduce((total, value) => total + value, 0);
    return { sorted, sum, count: sorted.length, min: sorted.length ? Math.min(...sorted) : 0, max: sorted.length ? Math.max(...sorted) : 0, average: sorted.length ? sum / sorted.length : 0 };
  }, [input, direction, dedupe]);

  const statItems = [[t.count, data.count.toString()], [t.sum, formatNumber(data.sum)], [t.min, data.count ? formatNumber(data.min) : "-"], [t.max, data.count ? formatNumber(data.max) : "-"], [t.average, data.count ? formatNumber(data.average) : "-"]];

  return (
    <GameContainer title={t.title} subtitle={t.subtitle}>
      <div className="grid gap-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.inputLabel}</span>
          <textarea className="mt-2 min-h-32 w-full rounded-lg border border-border px-3 py-2 font-mono text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" value={input} placeholder={t.placeholder} onChange={(event) => setInput(event.target.value)} />
        </label>
        <div className="grid gap-3 rounded-xl border border-border bg-white p-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.direction}</span>
            <select className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" value={direction} onChange={(event) => setDirection(event.target.value as "asc" | "desc")}>
              <option value="asc">{t.asc}</option>
              <option value="desc">{t.desc}</option>
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-lg bg-background px-3 py-2 text-sm font-semibold text-muted-foreground"><input type="checkbox" checked={dedupe} onChange={(event) => setDedupe(event.target.checked)} />{t.dedupe}</label>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <h3 className="font-semibold text-foreground">{t.result}</h3>
          <p className="mt-3 min-h-12 break-words rounded-lg bg-accent px-3 py-2 font-mono text-sm font-semibold text-primary">{data.sorted.length ? data.sorted.map(formatNumber).join(", ") : t.empty}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <h3 className="font-semibold text-foreground">{t.stats}</h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">{statItems.map(([label, value]) => <div key={label} className="rounded-lg bg-background p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-all font-mono text-sm font-bold text-foreground">{value}</dd></div>)}</dl>
        </div>
      </div>
    </GameContainer>
  );
}

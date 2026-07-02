import { useMemo, useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";

interface Labels { title: string; subtitle: string; father: string; mother: string; gender: string; male: string; female: string; average: string; range: string; formula: string; cm: string; }

const LABELS: Record<Locale, Labels> = {
  en: { title: "Child Height Calculator", subtitle: "Mid-parental height estimate with a typical range.", father: "Father height", mother: "Mother height", gender: "Child gender", male: "Male", female: "Female", average: "Estimated average", range: "Typical range", formula: "Formula: (father + mother + gender factor) / 2, with +13 cm for boys and -13 cm for girls.", cm: "cm" },
  ko: { title: "자녀 키 계산기", subtitle: "부모 키 기반 중간부모키 공식으로 예측합니다.", father: "아버지 키", mother: "어머니 키", gender: "자녀 성별", male: "남아", female: "여아", average: "예상 평균", range: "일반 범위", formula: "공식: (아버지 키 + 어머니 키 + 성별 보정값) / 2, 남아 +13cm, 여아 -13cm.", cm: "cm" },
  ja: { title: "子どもの身長予測", subtitle: "両親の身長から中間親身長を推定します。", father: "父の身長", mother: "母の身長", gender: "子どもの性別", male: "男の子", female: "女の子", average: "推定平均", range: "一般的な範囲", formula: "式: (父 + 母 + 性別補正) / 2。男の子は +13cm、女の子は -13cm。", cm: "cm" },
  zh: { title: "儿童身高计算器", subtitle: "用父母身高中值公式估算身高范围。", father: "父亲身高", mother: "母亲身高", gender: "孩子性别", male: "男孩", female: "女孩", average: "估算平均值", range: "常见范围", formula: "公式：（父亲身高 + 母亲身高 + 性别系数）/ 2；男孩 +13cm，女孩 -13cm。", cm: "cm" },
  fr: { title: "Calculateur de Taille d'Enfant", subtitle: "Estimation par la formule de taille parentale moyenne.", father: "Taille du père", mother: "Taille de la mère", gender: "Sexe de l'enfant", male: "Garçon", female: "Fille", average: "Moyenne estimée", range: "Fourchette typique", formula: "Formule : (père + mère + facteur de sexe) / 2, avec +13 cm pour un garçon et -13 cm pour une fille.", cm: "cm" },
  es: { title: "Calculadora de Estatura Infantil", subtitle: "Estimación con la fórmula de talla parental media.", father: "Estatura del padre", mother: "Estatura de la madre", gender: "Sexo del niño", male: "Niño", female: "Niña", average: "Promedio estimado", range: "Rango típico", formula: "Fórmula: (padre + madre + factor de sexo) / 2, con +13 cm para niño y -13 cm para niña.", cm: "cm" },
};

function calculatePredictedHeight(fatherHeight: number, motherHeight: number, childGender: "male" | "female") {
  const genderFactor = childGender === "male" ? 13 : -13;
  const averageHeight = (fatherHeight + motherHeight + genderFactor) / 2;
  return { averageHeight: Math.round(averageHeight), minHeight: Math.round(averageHeight - 7.5), maxHeight: Math.round(averageHeight + 7.5) };
}

export default function ChildHeightCalculator({ locale }: { locale: Locale }) {
  const t = LABELS[locale] ?? LABELS.en;
  const [father, setFather] = useState(175);
  const [mother, setMother] = useState(162);
  const [gender, setGender] = useState<"male" | "female">("male");
  const result = useMemo(() => calculatePredictedHeight(father, mother, gender), [father, mother, gender]);
  const inputCls = "mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";
  return <GameContainer title={t.title} subtitle={t.subtitle}><div className="grid gap-4"><div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"><label className="block"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.father}</span><input className={inputCls} type="number" min="130" max="220" value={father} onChange={(event) => setFather(Number(event.target.value))} /></label><label className="block"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.mother}</span><input className={inputCls} type="number" min="130" max="220" value={mother} onChange={(event) => setMother(Number(event.target.value))} /></label><label className="block sm:col-span-2"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.gender}</span><select className={inputCls} value={gender} onChange={(event) => setGender(event.target.value as "male" | "female")}><option value="male">{t.male}</option><option value="female">{t.female}</option></select></label></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{t.average}</p><p className="mt-2 font-mono text-3xl font-black text-indigo-950">{result.averageHeight} {t.cm}</p></div><div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.range}</p><p className="mt-2 font-mono text-3xl font-black text-slate-900">{result.minHeight}-{result.maxHeight} {t.cm}</p></div></div><p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">{t.formula}</p></div></GameContainer>;
}

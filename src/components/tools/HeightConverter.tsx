import { useState, useCallback } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";

// ── Korean height distributions ──────────────────────────────────────────────
const KR_MALE_MEAN = 173.5;
const KR_MALE_SD = 5.7;
const KR_FEMALE_MEAN = 160.9;
const KR_FEMALE_SD = 5.2;

// Approximate normalCDF via Horner / rational polynomial (accurate to ~1e-4)
function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + p * x);
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

function getPercentile(height: number, mean: number, sd: number): number {
  const z = (height - mean) / sd;
  return normalCDF(z) * 100;
}

// ── i18n labels ───────────────────────────────────────────────────────────────
type L = Locale;

interface Labels {
  title: string;
  subtitle: string;
  sec1: string;
  sec2: string;
  sec3: string;
  sec4: string;
  cmLabel: string;
  ftLabel: string;
  inLabel: string;
  myHeight: string;
  myGender: string;
  male: string;
  female: string;
  equivalentIn: string;
  equivalentDesc: string;
  topPct: string;
  bottomPct: string;
  category: string;
  maleCm: string;
  femaleCm: string;
  veryShort: string;
  short: string;
  average: string;
  tall: string;
  veryTall: string;
  country: string;
  avgMale: string;
  avgFemale: string;
}

const LABELS: Record<L, Labels> = {
  ko: {
    title: "키 변환 & 비교기",
    subtitle: "Height Converter & Comparison",
    sec1: "단위 변환 (cm ↔ ft + in)",
    sec2: "성별 키 비교",
    sec3: "키 참고표",
    sec4: "국가별 평균 신장",
    cmLabel: "cm",
    ftLabel: "ft",
    inLabel: "in",
    myHeight: "내 키 (cm)",
    myGender: "내 성별",
    male: "남성",
    female: "여성",
    equivalentIn: "상대 성별 기준 동등 키",
    equivalentDesc: "같은 키 비율로 환산한 상대 성별 기준 키입니다",
    topPct: "상위",
    bottomPct: "하위",
    category: "범주",
    maleCm: "남성 (cm)",
    femaleCm: "여성 (cm)",
    veryShort: "매우 작음",
    short: "작음",
    average: "보통",
    tall: "큼",
    veryTall: "매우 큼",
    country: "국가",
    avgMale: "평균 남성 (cm)",
    avgFemale: "평균 여성 (cm)",
  },
  en: {
    title: "Height Converter & Comparison",
    subtitle: "cm ↔ ft/in · Gender Height Comparison",
    sec1: "Unit Conversion (cm ↔ ft + in)",
    sec2: "Gender Height Comparison",
    sec3: "Height Reference Table",
    sec4: "Average Height by Country",
    cmLabel: "cm",
    ftLabel: "ft",
    inLabel: "in",
    myHeight: "My Height (cm)",
    myGender: "My Gender",
    male: "Male",
    female: "Female",
    equivalentIn: "Equivalent height in opposite gender",
    equivalentDesc:
      "Height converted by the same proportional ratio to the opposite gender",
    topPct: "Top",
    bottomPct: "Bottom",
    category: "Category",
    maleCm: "Male (cm)",
    femaleCm: "Female (cm)",
    veryShort: "Very Short",
    short: "Short",
    average: "Average",
    tall: "Tall",
    veryTall: "Very Tall",
    country: "Country",
    avgMale: "Avg. Male (cm)",
    avgFemale: "Avg. Female (cm)",
  },
  ja: {
    title: "身長変換・比較ツール",
    subtitle: "cm ↔ フィート/インチ · 性別身長比較",
    sec1: "単位変換 (cm ↔ ft + in)",
    sec2: "性別身長比較",
    sec3: "身長参考表",
    sec4: "国別平均身長",
    cmLabel: "cm",
    ftLabel: "フィート",
    inLabel: "インチ",
    myHeight: "身長 (cm)",
    myGender: "性別",
    male: "男性",
    female: "女性",
    equivalentIn: "相手の性別での同等身長",
    equivalentDesc: "同じ比率で換算した相手の性別基準の身長です",
    topPct: "上位",
    bottomPct: "下位",
    category: "カテゴリ",
    maleCm: "男性 (cm)",
    femaleCm: "女性 (cm)",
    veryShort: "非常に低い",
    short: "低い",
    average: "普通",
    tall: "高い",
    veryTall: "非常に高い",
    country: "国",
    avgMale: "平均男性 (cm)",
    avgFemale: "平均女性 (cm)",
  },
  fr: {
    title: "Convertisseur & Comparateur de Taille",
    subtitle: "cm ↔ pieds/pouces · Comparaison par sexe",
    sec1: "Conversion d'unités (cm ↔ ft + in)",
    sec2: "Comparaison de taille par sexe",
    sec3: "Tableau de référence",
    sec4: "Taille moyenne par pays",
    cmLabel: "cm",
    ftLabel: "pi",
    inLabel: "po",
    myHeight: "Ma taille (cm)",
    myGender: "Mon sexe",
    male: "Homme",
    female: "Femme",
    equivalentIn: "Taille équivalente pour le sexe opposé",
    equivalentDesc: "Taille convertie selon le même ratio proportionnel",
    topPct: "Top",
    bottomPct: "Bas",
    category: "Catégorie",
    maleCm: "Homme (cm)",
    femaleCm: "Femme (cm)",
    veryShort: "Très petit(e)",
    short: "Petit(e)",
    average: "Moyen(ne)",
    tall: "Grand(e)",
    veryTall: "Très grand(e)",
    country: "Pays",
    avgMale: "Moy. Homme (cm)",
    avgFemale: "Moy. Femme (cm)",
  },
  es: {
    title: "Conversor y Comparador de Estatura",
    subtitle: "cm ↔ pies/pulgadas · Comparación por género",
    sec1: "Conversión de unidades (cm ↔ ft + in)",
    sec2: "Comparación de estatura por género",
    sec3: "Tabla de referencia de estatura",
    sec4: "Estatura promedio por país",
    cmLabel: "cm",
    ftLabel: "ft",
    inLabel: "in",
    myHeight: "Mi estatura (cm)",
    myGender: "Mi género",
    male: "Hombre",
    female: "Mujer",
    equivalentIn: "Estatura equivalente en el género opuesto",
    equivalentDesc: "Estatura convertida por el mismo ratio proporcional",
    topPct: "Top",
    bottomPct: "Inferior",
    category: "Categoría",
    maleCm: "Hombre (cm)",
    femaleCm: "Mujer (cm)",
    veryShort: "Muy bajo/a",
    short: "Bajo/a",
    average: "Promedio",
    tall: "Alto/a",
    veryTall: "Muy alto/a",
    country: "País",
    avgMale: "Prom. Hombre (cm)",
    avgFemale: "Prom. Mujer (cm)",
  },
  zh: {
    title: "身高换算与比较工具",
    subtitle: "厘米 ↔ 英尺/英寸 · 性别身高比较",
    sec1: "单位换算（厘米 ↔ 英尺 + 英寸）",
    sec2: "性别身高比较",
    sec3: "身高参考表",
    sec4: "各国平均身高",
    cmLabel: "厘米",
    ftLabel: "英尺",
    inLabel: "英寸",
    myHeight: "我的身高（厘米）",
    myGender: "我的性别",
    male: "男性",
    female: "女性",
    equivalentIn: "换算为异性别的等效身高",
    equivalentDesc: "以相同比例换算为异性别基准的身高",
    topPct: "前",
    bottomPct: "后",
    category: "类别",
    maleCm: "男性（厘米）",
    femaleCm: "女性（厘米）",
    veryShort: "非常矮",
    short: "较矮",
    average: "普通",
    tall: "较高",
    veryTall: "非常高",
    country: "国家",
    avgMale: "平均男性（厘米）",
    avgFemale: "平均女性（厘米）",
  },
};

// ── Data ─────────────────────────────────────────────────────────────────────
interface CategoryRow {
  label: keyof Pick<
    Labels,
    "veryShort" | "short" | "average" | "tall" | "veryTall"
  >;
  male: string;
  female: string;
}

const HEIGHT_CATEGORIES: CategoryRow[] = [
  { label: "veryShort", male: "~163", female: "~150" },
  { label: "short", male: "163~168", female: "150~156" },
  { label: "average", male: "168~178", female: "156~166" },
  { label: "tall", male: "178~183", female: "166~171" },
  { label: "veryTall", male: "183~", female: "171~" },
];

interface CountryRow {
  name: Record<L, string>;
  male: number;
  female: number;
}

const COUNTRY_DATA: CountryRow[] = [
  {
    name: { ko: "한국", en: "South Korea", ja: "韓国", fr: "Corée du Sud", es: "Corea del Sur", zh: "韩国", },
    male: 173.5,
    female: 160.9,
  },
  {
    name: { ko: "미국", en: "USA", ja: "アメリカ", fr: "États-Unis", es: "EE.UU.", zh: "美国", },
    male: 175.4,
    female: 162.1,
  },
  {
    name: { ko: "일본", en: "Japan", ja: "日本", fr: "Japon", es: "Japón", zh: "日本", },
    male: 171.2,
    female: 158.0,
  },
  {
    name: { ko: "네덜란드", en: "Netherlands", ja: "オランダ", fr: "Pays-Bas", es: "Países Bajos", zh: "荷兰", },
    male: 182.5,
    female: 170.4,
  },
  {
    name: { ko: "중국", en: "China", ja: "中国", fr: "Chine", es: "China", zh: "中国", },
    male: 171.8,
    female: 159.7,
  },
];

// ── cm ↔ ft/in helpers ───────────────────────────────────────────────────────
function cmToFtIn(cm: number): { ft: number; inch: number } {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inch = Math.round((totalInches % 12) * 10) / 10;
  return { ft, inch };
}

function ftInToCm(ft: number, inch: number): number {
  return Math.round(((ft * 12 + inch) * 2.54) * 10) / 10;
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  locale: Locale;
}

export default function HeightConverter({ locale }: Props) {
  const t = LABELS[locale] ?? LABELS.en;

  // Section 1 state
  const [cmVal, setCmVal] = useState("170");
  const [ftVal, setFtVal] = useState("5");
  const [inVal, setInVal] = useState("7.0");

  // Section 2 state
  const [myHeight, setMyHeight] = useState("170");
  const [myGender, setMyGender] = useState<"male" | "female">("male");

  const handleCmChange = useCallback((val: string) => {
    setCmVal(val);
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0) {
      const { ft, inch } = cmToFtIn(n);
      setFtVal(String(ft));
      setInVal(String(inch));
    }
  }, []);

  const handleFtInChange = useCallback(
    (newFt: string, newIn: string) => {
      setFtVal(newFt);
      setInVal(newIn);
      const ft = parseFloat(newFt);
      const inch = parseFloat(newIn);
      if (!isNaN(ft) && !isNaN(inch)) {
        setCmVal(String(ftInToCm(ft, inch)));
      }
    },
    []
  );

  // Section 2 calculations
  const myHeightNum = parseFloat(myHeight);
  const validMyHeight = !isNaN(myHeightNum) && myHeightNum > 0;

  const DIFF = KR_MALE_MEAN - KR_FEMALE_MEAN; // 12.6

  const equivalentHeight = validMyHeight
    ? myGender === "male"
      ? myHeightNum - DIFF
      : myHeightNum + DIFF
    : null;

  const myMean = myGender === "male" ? KR_MALE_MEAN : KR_FEMALE_MEAN;
  const mySd = myGender === "male" ? KR_MALE_SD : KR_FEMALE_SD;
  const percentile = validMyHeight
    ? getPercentile(myHeightNum, myMean, mySd)
    : null;

  const isTop = percentile !== null ? percentile >= 50 : false;
  const pctDisplay =
    percentile !== null
      ? isTop
        ? `${t.topPct} ${(100 - percentile).toFixed(1)}%`
        : `${t.bottomPct} ${percentile.toFixed(1)}%`
      : "—";

  return (
    <GameContainer
      title={t.title}
      subtitle={t.subtitle}
      onReset={() => {
        setCmVal("170");
        setFtVal("5");
        setInVal("7.0");
        setMyHeight("170");
        setMyGender("male");
      }}
    >
      <div className="flex flex-col gap-10">
        {/* ── Section 1: Unit Conversion ──────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            {t.sec1}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* cm input */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase">
                {t.cmLabel}
              </label>
              <input
                type="number"
                value={cmVal}
                onChange={(e) => handleCmChange(e.target.value)}
                aria-label={t.cmLabel}
                className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg"
                placeholder="170"
              />
            </div>
            {/* ft + in inputs */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase">
                {t.ftLabel} + {t.inLabel}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={ftVal}
                  onChange={(e) => handleFtInChange(e.target.value, inVal)}
                  aria-label={t.ftLabel}
                  className="w-1/2 p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg"
                  placeholder="5"
                />
                <input
                  type="number"
                  value={inVal}
                  onChange={(e) => handleFtInChange(ftVal, e.target.value)}
                  aria-label={t.inLabel}
                  className="w-1/2 p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg"
                  placeholder="7"
                  step="0.1"
                />
              </div>
            </div>
          </div>
          {/* Visual result */}
          <div className="p-6 bg-muted/20 rounded-3xl flex flex-col sm:flex-row gap-4 items-center justify-around text-center">
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                {t.cmLabel}
              </p>
              <p className="text-4xl font-black text-primary">
                {parseFloat(cmVal) > 0 ? parseFloat(cmVal).toFixed(1) : "—"}
              </p>
            </div>
            <div className="text-2xl text-muted-foreground">↔</div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                {t.ftLabel} / {t.inLabel}
              </p>
              <p className="text-4xl font-black text-primary">
                {ftVal}′ {inVal}″
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 2: Gender Comparison ───────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            {t.sec2}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase">
                {t.myHeight}
              </label>
              <input
                type="number"
                value={myHeight}
                onChange={(e) => setMyHeight(e.target.value)}
                aria-label={t.myHeight}
                className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-lg"
                placeholder="170"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase">
                {t.myGender}
              </label>
              <div className="flex gap-2 p-1 bg-muted rounded-xl h-[60px] items-center">
                <button
                  onClick={() => setMyGender("male")}
                  aria-pressed={myGender === "male"}
                  aria-label={t.male}
                  className={`flex-1 py-2 rounded-lg font-black text-xs transition-colors ${
                    myGender === "male"
                      ? "bg-background shadow-sm text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {t.male}
                </button>
                <button
                  onClick={() => setMyGender("female")}
                  aria-pressed={myGender === "female"}
                  aria-label={t.female}
                  className={`flex-1 py-2 rounded-lg font-black text-xs transition-colors ${
                    myGender === "female"
                      ? "bg-background shadow-sm text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {t.female}
                </button>
              </div>
            </div>
          </div>

          {/* Result card */}
          <div className="p-8 bg-foreground rounded-[32px] text-background flex flex-col sm:flex-row gap-8 items-center justify-around shadow-2xl">
            <div className="text-center space-y-1">
              <p className="text-[10px] font-black text-background/50 uppercase tracking-widest">
                {t.equivalentIn}
              </p>
              <p className="text-5xl font-black text-primary">
                {equivalentHeight !== null
                  ? equivalentHeight.toFixed(1)
                  : "—"}{" "}
                <span className="text-xl">{t.cmLabel}</span>
              </p>
              <p className="text-[10px] text-background/50">{t.equivalentDesc}</p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-[10px] font-black text-background/50 uppercase tracking-widest">
                {myGender === "male" ? t.male : t.female} · KR
              </p>
              <p className="text-3xl font-black text-warning">{pctDisplay}</p>
            </div>
          </div>
        </section>

        {/* ── Section 3: Reference Table ──────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            {t.sec3}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-left font-black text-[10px] uppercase text-muted-foreground">
                    {t.category}
                  </th>
                  <th className="px-4 py-3 text-center font-black text-[10px] uppercase text-muted-foreground">
                    {t.maleCm}
                  </th>
                  <th className="px-4 py-3 text-center font-black text-[10px] uppercase text-muted-foreground">
                    {t.femaleCm}
                  </th>
                </tr>
              </thead>
              <tbody>
                {HEIGHT_CATEGORIES.map((row, i) => (
                  <tr
                    key={row.label}
                    className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
                  >
                    <td className="px-4 py-3 font-semibold">{t[row.label]}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {row.male}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {row.female}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Section 4: Country Average ──────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            {t.sec4}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-left font-black text-[10px] uppercase text-muted-foreground">
                    {t.country}
                  </th>
                  <th className="px-4 py-3 text-center font-black text-[10px] uppercase text-muted-foreground">
                    {t.avgMale}
                  </th>
                  <th className="px-4 py-3 text-center font-black text-[10px] uppercase text-muted-foreground">
                    {t.avgFemale}
                  </th>
                </tr>
              </thead>
              <tbody>
                {COUNTRY_DATA.map((row, i) => (
                  <tr
                    key={row.name.en}
                    className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
                  >
                    <td className="px-4 py-3 font-semibold">
                      {row.name[locale] ?? row.name.en}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {row.male}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {row.female}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </GameContainer>
  );
}

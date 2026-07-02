import { useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";

const labels: Record<Locale, {
  title: string;
  desc: string;
  homelessPeriod: string;
  homelessYears: string;
  under30Unmarried: string;
  under30Note: string;
  dependents: string;
  dependentsNote: string;
  subscriptionPeriod: string;
  subscriptionMonths: string;
  totalScore: string;
  maxScore: string;
  scoreBreakdown: string;
  item: string;
  score: string;
  grade: string;
  avgWinScore: string;
  avgWinNote: string;
  seoulGangnam: string;
  seoulOther: string;
  metro: string;
  regional: string;
  tips: string;
  tip1: string;
  tip2: string;
  tip3: string;
  homelessLabel: string;
  dependentsLabel: string;
  subscriptionLabel: string;
  years: string;
  people: string;
  months: string;
  grade70: string;
  grade55: string;
  grade40: string;
  grade0: string;
  year: string;
}> = {
  ko: {
    title: "청약 가점 계산기",
    desc: "2024년 기준 아파트 청약 가점을 계산합니다.",
    homelessPeriod: "무주택 기간",
    homelessYears: "무주택 기간 (년)",
    under30Unmarried: "만 30세 미만 미혼",
    under30Note: "해당 시 무주택 기간 0점 처리",
    dependents: "부양가족 수",
    dependentsNote: "배우자, 직계존속(부모·조부모 등), 직계비속(자녀·손자녀) 포함. 주민등록상 동일 세대원.",
    subscriptionPeriod: "청약통장 가입기간",
    subscriptionMonths: "청약통장 가입기간 (개월)",
    totalScore: "총 가점",
    maxScore: "최대 84점",
    scoreBreakdown: "항목별 점수",
    item: "항목",
    score: "점수",
    grade: "등급 판정",
    avgWinScore: "평균 당첨 가점 참고",
    avgWinNote: "지역별 평균 당첨 가점 (참고용)",
    seoulGangnam: "서울 강남권",
    seoulOther: "서울 기타",
    metro: "수도권",
    regional: "지방",
    tips: "가점 올리는 방법",
    tip1: "무주택 상태를 유지하면 매년 2점씩 증가합니다 (최대 32점).",
    tip2: "청약통장은 해지하지 말고 꾸준히 유지하세요 (최대 17점).",
    tip3: "부양가족이 많을수록 점수가 높습니다 (최대 35점).",
    homelessLabel: "무주택 기간",
    dependentsLabel: "부양가족 수",
    subscriptionLabel: "청약통장",
    years: "년",
    people: "명",
    months: "개월",
    grade70: "💎 최상위권 — 서울 주요 단지 청약 가능",
    grade55: "🥇 상위권 — 수도권 청약 경쟁력 있음",
    grade40: "🥈 중위권 — 수도권 외곽·지방 청약 가능",
    grade0: "🥉 하위권 — 추가 적립 기간 필요",
    year: "년",
  },
  en: {
    title: "Apt Subscription Score",
    desc: "Calculate Korean apartment subscription priority score (2024 standard).",
    homelessPeriod: "Homeless Period",
    homelessYears: "Homeless Period (years)",
    under30Unmarried: "Under 30, never married",
    under30Note: "If applicable, homeless period score = 0",
    dependents: "Number of Dependents",
    dependentsNote: "Includes spouse, lineal ascendants (parents/grandparents), and lineal descendants (children/grandchildren). Must be registered in the same household.",
    subscriptionPeriod: "Subscription Account Period",
    subscriptionMonths: "Subscription Account Period (months)",
    totalScore: "Total Score",
    maxScore: "Max 84 pts",
    scoreBreakdown: "Score Breakdown",
    item: "Category",
    score: "Score",
    grade: "Grade",
    avgWinScore: "Average Winning Score Reference",
    avgWinNote: "Regional average winning scores (for reference)",
    seoulGangnam: "Seoul Gangnam",
    seoulOther: "Seoul Others",
    metro: "Metro Area",
    regional: "Regional",
    tips: "Tips to Improve Score",
    tip1: "Remain homeless — score increases by 2 pts/year (max 32 pts).",
    tip2: "Keep your subscription account active (max 17 pts).",
    tip3: "More dependents means higher score (max 35 pts).",
    homelessLabel: "Homeless Period",
    dependentsLabel: "Dependents",
    subscriptionLabel: "Subscription",
    years: "yrs",
    people: " ppl",
    months: " mo",
    grade70: "💎 Top Tier — Eligible for major Seoul complexes",
    grade55: "🥇 Upper Tier — Competitive in metro area",
    grade40: "🥈 Mid Tier — Eligible for outer metro & regional",
    grade0: "🥉 Lower Tier — Need more savings time",
    year: "yr",
  },
  ja: {
    title: "アパート청약 加点計算機",
    desc: "韓国のアパート청약（分譲申込）加点を計算します（2024年基準）。",
    homelessPeriod: "無住宅期間",
    homelessYears: "無住宅期間（年）",
    under30Unmarried: "30歳未満・未婚",
    under30Note: "該当する場合、無住宅期間は0点",
    dependents: "扶養家族数",
    dependentsNote: "配偶者・直系尊属（両親・祖父母等）・直系卑属（子・孫等）を含む。住民登録上の同一世帯員。",
    subscriptionPeriod: "청약通帳加入期間",
    subscriptionMonths: "청약通帳加入期間（ヶ月）",
    totalScore: "合計点数",
    maxScore: "最大84点",
    scoreBreakdown: "項目別点数",
    item: "項目",
    score: "点数",
    grade: "等級判定",
    avgWinScore: "平均当選加点参考",
    avgWinNote: "地域別平均当選加点（参考値）",
    seoulGangnam: "ソウル江南",
    seoulOther: "ソウル他",
    metro: "首都圏",
    regional: "地方",
    tips: "加点アップのコツ",
    tip1: "無住宅状態を維持すれば毎年2点加算（最大32点）。",
    tip2: "청약통장は解約せず維持すること（最大17点）。",
    tip3: "扶養家族が多いほど高得点（最大35点）。",
    homelessLabel: "無住宅期間",
    dependentsLabel: "扶養家族",
    subscriptionLabel: "청약通帳",
    years: "年",
    people: "人",
    months: "ヶ月",
    grade70: "💎 最上位圏 — ソウル主要物件に申込可能",
    grade55: "🥇 上位圏 — 首都圏で競争力あり",
    grade40: "🥈 中位圏 — 首都圏外・地方に申込可能",
    grade0: "🥉 下位圏 — 積立期間の延長が必要",
    year: "年",
  },
  fr: {
    title: "Calculateur de Points de Souscription",
    desc: "Calculez votre score de priorité pour la souscription d'appartement en Corée (2024).",
    homelessPeriod: "Période sans logement",
    homelessYears: "Période sans logement (années)",
    under30Unmarried: "Moins de 30 ans, célibataire",
    under30Note: "Si applicable, score période sans logement = 0",
    dependents: "Nombre de personnes à charge",
    dependentsNote: "Conjoint, ascendants directs (parents/grands-parents), descendants directs (enfants/petits-enfants). Même foyer selon le registre de résidence.",
    subscriptionPeriod: "Durée du compte de souscription",
    subscriptionMonths: "Durée du compte (mois)",
    totalScore: "Score total",
    maxScore: "Max 84 pts",
    scoreBreakdown: "Détail par catégorie",
    item: "Catégorie",
    score: "Score",
    grade: "Niveau",
    avgWinScore: "Scores moyens de réussite",
    avgWinNote: "Scores moyens par région (à titre indicatif)",
    seoulGangnam: "Séoul Gangnam",
    seoulOther: "Séoul autres",
    metro: "Zone métro",
    regional: "Régional",
    tips: "Conseils pour améliorer votre score",
    tip1: "Restez sans logement — le score augmente de 2 pts/an (max 32 pts).",
    tip2: "Conservez votre compte de souscription actif (max 17 pts).",
    tip3: "Plus de personnes à charge = score plus élevé (max 35 pts).",
    homelessLabel: "Sans logement",
    dependentsLabel: "Personnes à charge",
    subscriptionLabel: "Souscription",
    years: "ans",
    people: " pers.",
    months: " mois",
    grade70: "💎 Niveau supérieur — Éligible aux complexes majeurs de Séoul",
    grade55: "🥇 Niveau haut — Compétitif en zone métro",
    grade40: "🥈 Niveau moyen — Éligible en périphérie et régional",
    grade0: "🥉 Niveau bas — Plus de temps d'épargne nécessaire",
    year: "an",
  },
  es: {
    title: "Calculadora de Puntos de Suscripción",
    desc: "Calcule su puntaje de prioridad para suscripción de apartamento en Corea (2024).",
    homelessPeriod: "Período sin vivienda",
    homelessYears: "Período sin vivienda (años)",
    under30Unmarried: "Menor de 30 años, soltero/a",
    under30Note: "Si aplica, puntaje período sin vivienda = 0",
    dependents: "Número de dependientes",
    dependentsNote: "Cónyuge, ascendientes directos (padres/abuelos), descendientes directos (hijos/nietos). Mismo hogar según registro de residencia.",
    subscriptionPeriod: "Duración de cuenta de suscripción",
    subscriptionMonths: "Duración de cuenta (meses)",
    totalScore: "Puntuación total",
    maxScore: "Máx. 84 pts",
    scoreBreakdown: "Desglose por categoría",
    item: "Categoría",
    score: "Puntos",
    grade: "Nivel",
    avgWinScore: "Puntajes promedio de éxito",
    avgWinNote: "Puntajes promedio por región (referencial)",
    seoulGangnam: "Seúl Gangnam",
    seoulOther: "Seúl otros",
    metro: "Área metropolitana",
    regional: "Regional",
    tips: "Consejos para mejorar su puntuación",
    tip1: "Permanezca sin vivienda — el puntaje sube 2 pts/año (máx. 32 pts).",
    tip2: "Mantenga su cuenta de suscripción activa (máx. 17 pts).",
    tip3: "Más dependientes = mayor puntaje (máx. 35 pts).",
    homelessLabel: "Sin vivienda",
    dependentsLabel: "Dependientes",
    subscriptionLabel: "Suscripción",
    years: "años",
    people: " pers.",
    months: " mes.",
    grade70: "💎 Nivel superior — Elegible para complejos principales de Seúl",
    grade55: "🥇 Nivel alto — Competitivo en área metropolitana",
    grade40: "🥈 Nivel medio — Elegible en periferia y regional",
    grade0: "🥉 Nivel bajo — Se necesita más tiempo de ahorro",
    year: "año",
  },
  zh: {
    title: "公寓认购加分计算器",
    desc: "计算韩国公寓认购优先加分（2024年标准）。",
    homelessPeriod: "无自有住宅期间",
    homelessYears: "无自有住宅期间（年）",
    under30Unmarried: "未满30岁且未婚",
    under30Note: "符合条件时，无自有住宅期间得分为0",
    dependents: "扶养人数",
    dependentsNote: "含配偶、直系尊亲（父母/祖父母等）、直系卑亲（子女/孙子女等）。须为户籍同一户成员。",
    subscriptionPeriod: "认购账户存款期间",
    subscriptionMonths: "认购账户期间（月）",
    totalScore: "总加分",
    maxScore: "最高84分",
    scoreBreakdown: "各项目得分",
    item: "项目",
    score: "得分",
    grade: "等级判定",
    avgWinScore: "平均中签加分参考",
    avgWinNote: "各地区平均中签加分（仅供参考）",
    seoulGangnam: "首尔江南",
    seoulOther: "首尔其他",
    metro: "首都圈",
    regional: "地方",
    tips: "提升加分的方法",
    tip1: "维持无自有住宅状态，每年增加2分（最高32分）。",
    tip2: "请勿解除认购账户，持续维持（最高17分）。",
    tip3: "扶养人数越多，得分越高（最高35分）。",
    homelessLabel: "无自有住宅",
    dependentsLabel: "扶养人数",
    subscriptionLabel: "认购账户",
    years: "年",
    people: "人",
    months: "月",
    grade70: "💎 顶尖 — 可申请首尔主要住宅",
    grade55: "🥇 上层 — 首都圈竞争力强",
    grade40: "🥈 中层 — 可申请首都圈外围及地方",
    grade0: "🥉 下层 — 需要更多积累时间",
    year: "年",
  },
};

function getHomelessScore(years: number, under30Unmarried: boolean): number {
  if (under30Unmarried) return 0;
  if (years < 1) return 2;
  if (years < 2) return 4;
  if (years < 3) return 6;
  if (years < 4) return 8;
  if (years < 5) return 10;
  if (years < 6) return 12;
  if (years < 7) return 14;
  if (years < 8) return 16;
  if (years < 9) return 18;
  if (years < 10) return 20;
  if (years < 11) return 22;
  if (years < 12) return 24;
  if (years < 13) return 26;
  if (years < 14) return 28;
  if (years < 15) return 30;
  return 32;
}

function getDependentsScore(count: number): number {
  if (count === 0) return 5;
  if (count === 1) return 10;
  if (count === 2) return 15;
  if (count === 3) return 20;
  if (count === 4) return 25;
  if (count === 5) return 30;
  return 35;
}

function getSubscriptionScore(months: number): number {
  if (months < 6) return 1;
  if (months < 12) return 2;
  if (months < 24) return 3;
  if (months < 36) return 4;
  if (months < 48) return 5;
  if (months < 60) return 6;
  if (months < 72) return 7;
  if (months < 84) return 8;
  if (months < 96) return 9;
  if (months < 108) return 10;
  if (months < 120) return 11;
  if (months < 132) return 12;
  if (months < 144) return 13;
  if (months < 156) return 14;
  if (months < 168) return 15;
  if (months < 180) return 16;
  return 17;
}

interface Props {
  locale?: Locale;
}

const AptSubscriptionScore: React.FC<Props> = ({ locale = "ko" }) => {
  const t = labels[locale] ?? labels.en;

  const [homelessYears, setHomelessYears] = useState(5);
  const [under30Unmarried, setUnder30Unmarried] = useState(false);
  const [dependents, setDependents] = useState(2);
  const [subscriptionMonths, setSubscriptionMonths] = useState(60);

  const homelessScore = getHomelessScore(homelessYears, under30Unmarried);
  const dependentsScore = getDependentsScore(dependents);
  const subscriptionScore = getSubscriptionScore(subscriptionMonths);
  const totalScore = homelessScore + dependentsScore + subscriptionScore;

  const getGrade = (score: number): string => {
    if (score >= 70) return t.grade70;
    if (score >= 55) return t.grade55;
    if (score >= 40) return t.grade40;
    return t.grade0;
  };

  const getScoreBarWidth = (score: number, max: number) =>
    `${Math.round((score / max) * 100)}%`;

  return (
    <GameContainer
      title={t.title}
      subtitle="2024"
      onReset={() => {
        setHomelessYears(5);
        setUnder30Unmarried(false);
        setDependents(2);
        setSubscriptionMonths(60);
      }}
    >
      <div className="flex flex-col gap-8">
        <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>

        {/* Homeless Period */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black text-muted-foreground uppercase">{t.homelessPeriod}</label>
            <span className="text-sm font-black text-primary">{homelessYears}{t.years}</span>
          </div>
          <input
            type="range"
            min={0}
            max={15}
            step={1}
            value={homelessYears}
            onChange={(e) => setHomelessYears(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex items-center gap-3 mt-2">
            <input
              type="checkbox"
              id="under30"
              checked={under30Unmarried}
              onChange={(e) => setUnder30Unmarried(e.target.checked)}
              className="w-4 h-4 accent-primary cursor-pointer"
            />
            <label htmlFor="under30" className="text-xs font-bold cursor-pointer">
              {t.under30Unmarried}
              <span className="ml-1 text-muted-foreground font-normal">({t.under30Note})</span>
            </label>
          </div>
        </div>

        {/* Dependents */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black text-muted-foreground uppercase">{t.dependents}</label>
            <span className="text-sm font-black text-primary">{dependents}{t.people}</span>
          </div>
          <input
            type="range"
            min={0}
            max={6}
            step={1}
            value={dependents}
            onChange={(e) => setDependents(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <p className="text-[10px] text-muted-foreground">{t.dependentsNote}</p>
        </div>

        {/* Subscription Period */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black text-muted-foreground uppercase">{t.subscriptionPeriod}</label>
            <span className="text-sm font-black text-primary">{subscriptionMonths}{t.months}</span>
          </div>
          <input
            type="range"
            min={0}
            max={180}
            step={6}
            value={subscriptionMonths}
            onChange={(e) => setSubscriptionMonths(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        {/* Total Score */}
        <div className="bg-foreground rounded-[32px] p-8 text-background text-center animate-in zoom-in-95">
          <p className="text-[10px] font-black text-background/60 uppercase tracking-widest mb-1">{t.totalScore}</p>
          <h2 className="text-7xl font-black text-primary leading-none">{totalScore}</h2>
          <p className="text-xs text-background/60 mt-1">{t.maxScore}</p>
          <div className="mt-6 border-t border-background/15 pt-6">
            <p className="text-sm font-bold">{getGrade(totalScore)}</p>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-3">
          <p className="text-[10px] font-black text-muted-foreground uppercase">{t.scoreBreakdown}</p>
          <div className="rounded-2xl border border-border overflow-hidden">
            {[
              { label: t.homelessLabel, score: homelessScore, max: 32 },
              { label: t.dependentsLabel, score: dependentsScore, max: 35 },
              { label: t.subscriptionLabel, score: subscriptionScore, max: 17 },
            ].map(({ label, score, max }) => (
              <div key={label} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
                <span className="text-xs font-bold w-24 shrink-0">{label}</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: getScoreBarWidth(score, max) }}
                  />
                </div>
                <span className="text-xs font-black w-14 text-right">
                  {score} / {max}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Average Winning Scores */}
        <div className="space-y-3">
          <p className="text-[10px] font-black text-muted-foreground uppercase">{t.avgWinScore}</p>
          <p className="text-[10px] text-muted-foreground">{t.avgWinNote}</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t.seoulGangnam, score: 70 },
              { label: t.seoulOther, score: 60 },
              { label: t.metro, score: 50 },
              { label: t.regional, score: 40 },
            ].map(({ label, score }) => (
              <div
                key={label}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  totalScore >= score
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/30"
                }`}
              >
                <p className="text-[10px] font-bold text-muted-foreground">{label}</p>
                <p className={`text-lg font-black ${totalScore >= score ? "text-primary" : "text-muted-foreground"}`}>
                  {score}+
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="space-y-2 bg-muted/30 rounded-2xl p-5 border border-border">
          <p className="text-[10px] font-black text-muted-foreground uppercase">{t.tips}</p>
          <ul className="space-y-1">
            {[t.tip1, t.tip2, t.tip3].map((tip, i) => (
              <li key={i} className="text-xs text-muted-foreground flex gap-2">
                <span className="shrink-0">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </GameContainer>
  );
};

export default AptSubscriptionScore;

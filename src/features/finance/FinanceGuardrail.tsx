// 금융·시장 콘텐츠 공통 가드레일 (YMYL 신뢰) — 출처·확인일자·투자조언 아님 면책을 일관 표기.
// 배당 기록기 등 모든 finance surface 가 동일 가드레일을 쓰도록 단일 컴포넌트로 통일.
// source/asOf 는 외부 데이터를 인용할 때만(예: 시장 briefing). 사용자 입력 도구는 면책만 표기.

type Props = {
  locale: string;
  /** 외부 데이터 출처명 (예: "한국거래소"). 인용 시에만. */
  source?: string;
  /** 출처 URL (공식·1차 출처 우대). */
  sourceUrl?: string;
  /** 데이터 확인일자 YYYY-MM-DD. */
  asOf?: string;
  /** true=사용자 입력 기반 도구(추정 문구), false=정보 제공. 기본 true. */
  tool?: boolean;
};

type Copy = { notAdvice: string; toolNote: string; source: string; asOf: string };
const COPY: Record<string, Copy> = {
  ko: { notAdvice: "투자 조언이 아닙니다", toolNote: "입력값 기준 추정이며 투자 권유가 아닙니다", source: "출처", asOf: "확인일자" },
  en: { notAdvice: "Not investment advice", toolNote: "estimates from your inputs; not a solicitation to invest", source: "Source", asOf: "As of" },
  ja: { notAdvice: "投資助言ではありません", toolNote: "入力値に基づく概算であり投資勧誘ではありません", source: "出典", asOf: "確認日" },
  zh: { notAdvice: "非投资建议", toolNote: "基于输入值的估算，非投资邀约", source: "来源", asOf: "更新日期" },
  fr: { notAdvice: "Pas un conseil en investissement", toolNote: "estimations basées sur vos saisies ; pas une sollicitation à investir", source: "Source", asOf: "Au" },
  es: { notAdvice: "No es asesoramiento de inversión", toolNote: "estimaciones según tus datos; no es una invitación a invertir", source: "Fuente", asOf: "A fecha de" },
};

export function FinanceGuardrail({ locale, source, sourceUrl, asOf, tool = true }: Props) {
  const c = COPY[locale] ?? COPY.en;
  return (
    <aside
      role="note"
      className="mt-3 flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500"
    >
      <span>
        <span aria-hidden="true">⚠ </span>
        <b className="font-semibold text-slate-600">{c.notAdvice}.</b>
        {tool ? ` ${c.toolNote}.` : ""}
      </span>
      {(source || asOf) && (
        <span className="text-slate-400">
          {source && (
            <>
              {c.source}:{" "}
              {sourceUrl ? (
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">{source}</a>
              ) : (
                source
              )}
            </>
          )}
          {source && asOf ? " · " : ""}
          {asOf && <>{c.asOf} {asOf}</>}
        </span>
      )}
    </aside>
  );
}

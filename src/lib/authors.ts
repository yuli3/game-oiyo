// Author registry (SSOT) — turns fragmented bylines into accountable, role-accurate
// editorial entities for E-E-A-T. Each content `author:` string resolves here to a
// real role, expertise area, locale-aware bio, and schema.org type. Unknown bylines
// fall back to the OIYO editorial desk rather than a misleading generic bio.

export type AuthorSchemaType = "Organization" | "Person";

export interface AuthorEntity {
  /** Canonical display name (overrides the raw byline when set). */
  name?: string;
  /** schema.org type emitted for this entity. */
  schemaType: AuthorSchemaType;
  /** Short role badge, per locale. */
  role: Record<string, string>;
  /** 1–2 sentence bio describing remit + method, per locale. */
  bio: Record<string, string>;
  /** E-E-A-T: declared areas of expertise (schema.org knowsAbout). */
  knowsAbout?: string[];
}

const DESKS = {
  editorial: {
    schemaType: "Organization",
    knowsAbout: ["개인 재무","소비자 법률","생활 정보","자기이해","personal finance","consumer protection"],
    role: { ko: "편집부", en: "Editorial Desk", ja: "編集部" },
    bio: {
      ko: "OIYO 편집부는 경제·법률·생활·자기이해 주제를 1차 자료와 공개 통계로 검증해 정리합니다. 모든 글은 출처 표기와 정기 점검을 거쳐 실용성과 정확성을 함께 유지합니다.",
      en: "The OIYO editorial desk researches money, law, lifestyle, and self-understanding topics against primary sources and public statistics. Every piece carries source notes and is reviewed on a regular cycle for accuracy and usefulness.",
      ja: "OIYO編集部は、経済・法律・生活・自己理解のテーマを一次資料と公開統計で検証してまとめます。すべての記事は出典を明記し、定期的に見直して正確さと実用性を保ちます。",
    },
  },
  research: {
    schemaType: "Organization",
    knowsAbout: ["심리검사","통계 리터러시","행동과학","psychometrics","behavioral science"],
    role: { ko: "리서치팀", en: "Research Team", ja: "リサーチチーム" },
    bio: {
      ko: "OIYO 리서치팀은 심리 검사, 통계, 학술 문헌을 토대로 자료를 구조화합니다. 대중적 분류 언어와 학술적 한계를 함께 밝혀, 단정보다 self-reflection의 도구로 쓰이도록 설계합니다.",
      en: "The OIYO research team structures material from psychometric scales, statistics, and academic literature. We name both the popular framing and its scholarly limits, so each guide works as a tool for reflection rather than a verdict.",
      ja: "OIYOリサーチチームは、心理検査・統計・学術文献をもとに情報を構造化します。一般的な分類と学術的な限界を併記し、断定ではなく内省の道具として使えるよう設計します。",
    },
  },
  psychology: {
    schemaType: "Organization",
    knowsAbout: ["MBTI","Big Five","애착이론","성격심리학","personality psychology","attachment theory"],
    role: { ko: "심리 리서치", en: "Psychology Research", ja: "心理リサーチ" },
    bio: {
      ko: "성격·심리 콘텐츠는 MBTI, Big5, 애착이론 등 널리 쓰이는 모델을 검사 척도와 함께 정리합니다. 유형을 고정된 정체성이 아니라 상황별 자기관찰의 언어로 다룹니다.",
      en: "Our personality content organizes widely used models — MBTI, Big Five, attachment theory — alongside the scales behind them. We treat types as a language for situational self-observation, not a fixed identity.",
      ja: "性格・心理コンテンツは、MBTI・ビッグファイブ・愛着理論など広く使われるモデルを検査尺度とともに整理します。タイプを固定的な自己ではなく、状況ごとの自己観察の言葉として扱います。",
    },
  },
  science: {
    schemaType: "Organization",
    knowsAbout: ["천문학","물리학","생활과학","astronomy","physics","everyday science"],
    role: { ko: "과학부", en: "Science Desk", ja: "サイエンス編集" },
    bio: {
      ko: "OIYO 과학부는 천문·물리·생활과학을 암기보다 구조 이해 중심으로 풉니다. 교과 개념과 최신 합의를 쉬운 비유로 옮기되, 단순화로 사실이 왜곡되지 않도록 검토합니다.",
      en: "The OIYO science desk explains astronomy, physics, and everyday science with structure before memorization. We translate textbook concepts and current consensus into plain analogies, checked so simplification never distorts the facts.",
      ja: "OIYOサイエンス編集は、天文・物理・生活科学を暗記より構造理解で解説します。教科の概念と最新の合意を平易な比喩に置き換えつつ、単純化で事実が歪まないよう確認します。",
    },
  },
  culture: {
    schemaType: "Organization",
    knowsAbout: ["신화","고전","역사","전통사상","mythology","classics","history"],
    role: { ko: "역사·문화부", en: "History & Culture Desk", ja: "歴史・文化編集" },
    bio: {
      ko: "역사·문화 콘텐츠는 신화, 고전, 전통 사상을 1차 텍스트와 정설을 바탕으로 소개합니다. 해석의 폭이 넓은 주제일수록 출처와 이설을 함께 밝힙니다.",
      en: "Our history and culture content presents myth, classics, and traditional thought from primary texts and established scholarship. The more open a topic is to interpretation, the more we surface sources and competing readings.",
      ja: "歴史・文化コンテンツは、神話・古典・伝統思想を一次テキストと定説に基づいて紹介します。解釈の幅が広い主題ほど、出典と異説を併記します。",
    },
  },
} satisfies Record<string, AuthorEntity>;

// Raw byline (lower-cased, trimmed) → desk. Keep this list aligned with the
// `author:` values actually used across the content collection.
const BYLINE_MAP: Record<string, AuthorEntity> = {
  "oiyo 편집부": DESKS.editorial,
  "oiyo editorial": DESKS.editorial,
  "oiyo": DESKS.editorial,
  "oiyo team": DESKS.editorial,
  "antigravity": DESKS.editorial,
  "seun": DESKS.editorial,
  "oiyo research team": DESKS.research,
  "oiyo research institute": DESKS.research,
  "oiyo 연구소": DESKS.research,
  "fortune research team": DESKS.research,
  "mbti research team": DESKS.psychology,
  "oiyo 과학부": DESKS.science,
  "oiyo 역사부": DESKS.culture,
  "the imperial scribe": DESKS.culture,
  "mythos mind": DESKS.culture,
};

/** Resolve a raw byline to an accountable editorial entity (never null). */
export function getAuthor(rawByline: string): AuthorEntity {
  const key = (rawByline ?? "").trim().toLowerCase();
  return BYLINE_MAP[key] ?? DESKS.editorial;
}

/** The distinct editorial desks, for the /about transparency section. */
export const EDITORIAL_DESKS: AuthorEntity[] = [
  DESKS.editorial,
  DESKS.research,
  DESKS.psychology,
  DESKS.science,
  DESKS.culture,
];

/** Pick a locale string with en fallback. */
export function pick(map: Record<string, string>, locale: string): string {
  return map[locale] ?? map.en ?? Object.values(map)[0] ?? "";
}

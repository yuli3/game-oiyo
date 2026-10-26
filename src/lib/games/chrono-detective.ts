// Memento Mori Chrono (#145) — 1-bit dithering Pocket Watch time-freeze mystery
// with 3 maritime disaster scenes, interactive Hotspot Evidence Clues, and the
// Obra Dinn / Golden Idol "Rule of Three" Fate Ledger validation.
// WHY: Inspired by Return of the Obra Dinn's deductive fate-triad lock-in mechanic.

export interface EvidenceClue {
  id: string;
  labelKo: string;
  labelEn: string;
  detailKo: string;
  detailEn: string;
  unlockedWords: string[];
}

export interface FateEntrySpec {
  id: string;
  portraitIcon: string;
  silhouetteTitleKo: string;
  silhouetteTitleEn: string;
  correctIdentity: string;
  correctCause: string;
  correctCulprit: string;
}

export interface FateEntryDraft {
  entryId: string;
  identity: string;
  cause: string;
  culprit: string;
  lockedCorrect: boolean;
}

export interface ChronoDetectiveState {
  status: 'investigating' | 'case-solved';
  activeSceneIndex: number;
  inspectedClueIds: string[];
  drafts: FateEntryDraft[];
  confirmedTriadsCount: number;
  feedbackKo: string;
  feedbackEn: string;
}

export interface MaritimeScene {
  id: string;
  timestamp: string;
  titleKo: string;
  titleEn: string;
  summaryKo: string;
  summaryEn: string;
  clues: EvidenceClue[];
}

export const MARITIME_SCENES: MaritimeScene[] = [
  {
    id: 'quarterdeck-mutiny',
    timestamp: '1807-10-14 · 23:42 (Quarterdeck)',
    titleKo: '제1장: 선미 갑판의 총성 (Quarterdeck Mutiny)',
    titleEn: 'Scene I: Shot on the Quarterdeck',
    summaryKo:
      '회중시계(Memento Mori)가 비춘 정지된 찰나: 조타륜 옆에 선장 모자를 쓴 남성이 쓰러져 있고, 일등항해사가 화승총 권총을 든 채 서 있습니다.',
    summaryEn:
      'Frozen by the Memento Mori watch: A man in a Captain bicorne collapses beside the helm while the First Mate stands holding a smoking flintlock.',
    clues: [
      {
        id: 'clue-helm-log',
        labelKo: '🔍 항해일지 & 선장 제복 각인',
        labelEn: '🔍 Captain Logbook & Brass Coat',
        detailKo:
          '쓰러진 장교의 코트 안주머니에 『선장 로버트 베일 (Capt. Robert Vale)』의 항해일지가 들어 있으며, 가슴에 화승총 탄흔이 있습니다.',
        detailEn:
          'Inside the fallen officer coat is the logbook of "Capt. Robert Vale", pierced through the chest by a flintlock ball.',
        unlockedWords: ['capt-vale', 'flintlock-shot'],
      },
      {
        id: 'clue-mate-ring',
        labelKo: '🔍 총을 쥔 남성의 문장 반지',
        labelEn: '🔍 Signet Ring on the Shooter',
        detailKo:
          '연기가 피어오르는 화승총을 쥔 남성은 선장의 처남인 『1등항해사 윌리엄 호크 (First Mate William Hawke)』입니다.',
        detailEn:
          'The officer firing the smoking pistol wears the signet ring of "First Mate William Hawke".',
        unlockedWords: ['mate-hawke'],
      },
    ],
  },
  {
    id: 'gun-deck-lightning',
    timestamp: '1807-10-14 · 23:18 (Main Mast & Gun Deck)',
    titleKo: '제2장: 벼락 맞은 주마스트와 크라켄의 촉수',
    titleEn: 'Scene II: Lightning on the Main Mast',
    summaryKo:
      '폭풍우 속에서 거대한 촉수가 난간을 휘감고 있으며, 마스트 망루 위 파수꾼이 창을 던지다 낙뢰에 휘말려 있습니다.',
    summaryEn:
      'In the raging storm, a giant tentacle crushes the starboard rail while the crow-nest lookout hurls a harpoon as lightning strikes.',
    clues: [
      {
        id: 'clue-crow-tattoo',
        labelKo: '🔍 망루 파수꾼의 작살과 문신',
        labelEn: '🔍 Crow-Nest Harpoon & Tattoo',
        detailKo:
          '망루 위에서 벼락(낙뢰 감전)에 직격당한 선원은 포경선 출신 『갑판장 사무엘 린 (Bosun Samuel Lin)』입니다.',
        detailEn:
          'The sailor struck by natural lightning in the crow-nest bears the whale tattoo of "Bosun Samuel Lin".',
        unlockedWords: ['bosun-lin', 'lightning-strike', 'nature-storm'],
      },
    ],
  },
  {
    id: 'cargo-vault-poison',
    timestamp: '1807-10-14 · 22:55 (Orlop Cargo Vault)',
    titleKo: '제3장: 화물창 금고의 푸른 조개 유물',
    titleEn: 'Scene III: The Glowing Shell in the Vault',
    summaryKo:
      '사건의 발단: 선의(Surgeon)가 금고 앞 와인잔을 들고 쓰러져 있고, 화물 관리인이 단검을 숨긴 채 열쇠를 훔치고 있습니다.',
    summaryEn:
      'Where it began: The Ship Surgeon lies beside a spilled goblet near the vault while the Purser pockets the brass key.',
    clues: [
      {
        id: 'clue-apothecary-vial',
        labelKo: '🔍 깨진 비소 약병과 의료 가방',
        labelEn: '🔍 Arsenic Vial & Medical Bag',
        detailKo:
          '쓰러진 인물은 『군의관 클라라 보스 (Surgeon Clara Voss)』이며, 잔에서 독극물(Poisoned Wine)이 검출되었습니다. 금고 열쇠를 쥔 범인은 『사무장 에드워드 크로우 (Purser Edward Crow)』입니다.',
        detailEn:
          'The victim is "Surgeon Clara Voss", felled by "Poisoned Wine" poured by "Purser Edward Crow" to steal the vault key.',
        unlockedWords: ['surgeon-voss', 'poisoned-wine', 'purser-crow'],
      },
    ],
  },
];

export const FATE_LEDGER_SPECS: FateEntrySpec[] = [
  {
    id: 'fate-1',
    portraitIcon: '⚓',
    silhouetteTitleKo: '인물 #1: 조타륜 옆 제복 장교',
    silhouetteTitleEn: 'Victim #1: Officer by the Helm',
    correctIdentity: 'capt-vale',
    correctCause: 'flintlock-shot',
    correctCulprit: 'mate-hawke',
  },
  {
    id: 'fate-2',
    portraitIcon: '🌩️',
    silhouetteTitleKo: '인물 #2: 주마스트 망루의 작살수',
    silhouetteTitleEn: 'Victim #2: Harpooner in the Crow-Nest',
    correctIdentity: 'bosun-lin',
    correctCause: 'lightning-strike',
    correctCulprit: 'nature-storm',
  },
  {
    id: 'fate-3',
    portraitIcon: '🍷',
    silhouetteTitleKo: '인물 #3: 화물창 금고 앞 의료진',
    silhouetteTitleEn: 'Victim #3: Medic by the Cargo Vault',
    correctIdentity: 'surgeon-voss',
    correctCause: 'poisoned-wine',
    correctCulprit: 'purser-crow',
  },
];

export const IDENTITY_OPTIONS: Array<{ id: string; ko: string; en: string }> = [
  { id: 'capt-vale', ko: '선장 로버트 베일', en: 'Capt. Robert Vale' },
  { id: 'bosun-lin', ko: '갑판장 사무엘 린', en: 'Bosun Samuel Lin' },
  { id: 'surgeon-voss', ko: '군의관 클라라 보스', en: 'Surgeon Clara Voss' },
];

export const CAUSE_OPTIONS: Array<{ id: string; ko: string; en: string }> = [
  { id: 'flintlock-shot', ko: '화승총 총격 (Shot)', en: 'Shot by Flintlock' },
  { id: 'lightning-strike', ko: '폭풍 낙뢰 감전 (Electrocuted)', en: 'Struck by Lightning' },
  { id: 'poisoned-wine', ko: '독이 든 포도주 (Poisoned)', en: 'Poisoned Wine' },
];

export const CULPRIT_OPTIONS: Array<{ id: string; ko: string; en: string }> = [
  { id: 'mate-hawke', ko: '1등항해사 윌리엄 호크', en: 'First Mate William Hawke' },
  { id: 'nature-storm', ko: '자연재해 (폭풍 해일)', en: 'Force of Nature (Storm)' },
  { id: 'purser-crow', ko: '사무장 에드워드 크로우', en: 'Purser Edward Crow' },
];

export function createChronoDetectiveState(): ChronoDetectiveState {
  return {
    status: 'investigating',
    activeSceneIndex: 0,
    inspectedClueIds: [],
    drafts: FATE_LEDGER_SPECS.map((spec) => ({
      entryId: spec.id,
      identity: '',
      cause: '',
      culprit: '',
      lockedCorrect: false,
    })),
    confirmedTriadsCount: 0,
    feedbackKo:
      '⏱️ 회중시계(Memento Mori)로 3개의 과거 정지 장면을 조사해 단서를 모으고, 우측 운명 장부(Ledger)에 3인의 [신원 · 사인 · 가해자]를 기록하세요.',
    feedbackEn:
      '⏱️ Inspect the 3 frozen scenes with your Memento Mori watch, then complete all 3 Fates [Identity · Cause · Culprit] in the Ledger to trigger the Rule of Three.',
  };
}

export function inspectSceneClue(
  state: ChronoDetectiveState,
  clueId: string
): ChronoDetectiveState {
  const scene = MARITIME_SCENES[state.activeSceneIndex];
  const clue = scene.clues.find((c) => c.id === clueId);
  if (!clue) return state;

  const nextInspected = state.inspectedClueIds.includes(clueId)
    ? state.inspectedClueIds
    : [...state.inspectedClueIds, clueId];

  return {
    ...state,
    inspectedClueIds: nextInspected,
    feedbackKo: `${clue.labelKo}: ${clue.detailKo}`,
    feedbackEn: `${clue.labelEn}: ${clue.detailEn}`,
  };
}

export function updateFateDraft(
  state: ChronoDetectiveState,
  entryId: string,
  field: 'identity' | 'cause' | 'culprit',
  value: string
): ChronoDetectiveState {
  if (state.status === 'case-solved') return state;

  const nextDrafts = state.drafts.map((d) => {
    if (d.entryId !== entryId || d.lockedCorrect) return d;
    return { ...d, [field]: value };
  });

  return validateRuleOfThree({
    ...state,
    drafts: nextDrafts,
  });
}

export function validateRuleOfThree(
  state: ChronoDetectiveState
): ChronoDetectiveState {
  let correctCount = 0;
  for (const spec of FATE_LEDGER_SPECS) {
    const draft = state.drafts.find((d) => d.entryId === spec.id);
    if (
      draft &&
      draft.identity === spec.correctIdentity &&
      draft.cause === spec.correctCause &&
      draft.culprit === spec.correctCulprit
    ) {
      correctCount += 1;
    }
  }

  // Rule of Three: When all 3 fates are accurately deduced, the Ledger locks them in permanently!
  if (correctCount === FATE_LEDGER_SPECS.length) {
    return {
      ...state,
      status: 'case-solved',
      confirmedTriadsCount: 3,
      drafts: state.drafts.map((d) => ({ ...d, lockedCorrect: true })),
      feedbackKo:
        '🏆 [3인의 법칙 (Rule of Three) 검증 완료!] 선장·갑판장·군의관 3인의 신원과 사인이 완벽히 일치하여 장부가 영구 봉인되었습니다!',
      feedbackEn:
        '🏆 [Rule of Three Confirmed!] All 3 Fates are 100% accurate—the Obra Dinn Ledger has permanently sealed the truth!',
    };
  }

  return {
    ...state,
    confirmedTriadsCount: correctCount,
  };
}

export function applyAutoDeductionHint(
  state: ChronoDetectiveState
): ChronoDetectiveState {
  const solvedDrafts: FateEntryDraft[] = FATE_LEDGER_SPECS.map((spec) => ({
    entryId: spec.id,
    identity: spec.correctIdentity,
    cause: spec.correctCause,
    culprit: spec.correctCulprit,
    lockedCorrect: true,
  }));

  return validateRuleOfThree({
    ...state,
    inspectedClueIds: MARITIME_SCENES.flatMap((s) => s.clues.map((c) => c.id)),
    drafts: solvedDrafts,
  });
}

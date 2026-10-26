/**
 * Border Inspector Desk (#138) — Document Verification & Discrepancy Inspection Engine
 *
 * Implements:
 * - Checkpoint Date (`1982-11-23`) and Ministry Rulebook (Valid Issuing Cities, Official Seal, Non-Expired Dates)
 * - Multi-document Applicant Dossiers (Passport + Entry Permit) with clean and forged/discrepant cases
 * - 2-Field Discrepancy Inspector laser linker (highlights matching vs. conflicting fields)
 * - APPROVED / DENIED ink stamp judgment, Ministry Citations, and Daily Quota progression
 */

export type NationId = 'arstotzka' | 'kolechia' | 'obristan';

export interface NationRule {
  id: NationId;
  validCities: string[];
}

export const CHECKPOINT_DATE = '1982-11-23';

export const NATION_RULES: Record<NationId, NationRule> = {
  arstotzka: {
    id: 'arstotzka',
    validCities: ['Orvech Vonor', 'East Grestin'],
  },
  kolechia: {
    id: 'kolechia',
    validCities: ['Yurko City', 'Vedor'],
  },
  obristan: {
    id: 'obristan',
    validCities: ['Skal', 'Lorndaz'],
  },
};

export type DiscrepancyType =
  | 'none'
  | 'expired_passport'
  | 'invalid_city'
  | 'id_mismatch'
  | 'name_mismatch'
  | 'forged_seal'
  | 'expired_permit';

export interface ApplicantCase {
  index: number;
  fullName: string;
  permitName: string;
  nation: NationId;
  issuingCity: string;
  passportId: string;
  permitPassportId: string;
  passportExpiry: string;
  permitExpiry: string;
  purpose: 'transit' | 'work' | 'visit';
  sealAuthentic: boolean;
  isValid: boolean;
  discrepancyType: DiscrepancyType;
  avatarSeed: number;
}

export type InspectFieldId =
  | 'clock_date'
  | 'rule_cities'
  | 'rule_seal'
  | 'passport_name'
  | 'passport_nation'
  | 'passport_city'
  | 'passport_id'
  | 'passport_expiry'
  | 'permit_name'
  | 'permit_id'
  | 'permit_expiry'
  | 'permit_seal';

export interface StampMark {
  decision: 'approved' | 'denied';
  x: number;
  y: number;
}

export interface BorderInspectorState {
  status: 'playing' | 'shift_complete' | 'fired';
  currentIndex: number;
  cases: ApplicantCase[];
  inspectSelection: InspectFieldId[];
  discrepancyFound: boolean;
  lastInspectResult: 'none' | 'conflict' | 'verified';
  stampMark: StampMark | null;
  credits: number;
  correctCount: number;
  citations: number;
  maxCitations: number;
  streak: number;
  lastCitationReason: DiscrepancyType | 'wrongful_denial' | null;
}

export const SHIFT_CASES: ApplicantCase[] = [
  {
    index: 0,
    fullName: 'Viktor Krazny',
    permitName: 'Viktor Krazny',
    nation: 'arstotzka',
    issuingCity: 'East Grestin',
    passportId: 'AR-8841-K',
    permitPassportId: 'AR-8841-K',
    passportExpiry: '1984-05-12',
    permitExpiry: '1983-02-01',
    purpose: 'work',
    sealAuthentic: true,
    isValid: true,
    discrepancyType: 'none',
    avatarSeed: 1,
  },
  {
    index: 1,
    fullName: 'Elena Voronina',
    permitName: 'Elena Voronina',
    nation: 'kolechia',
    issuingCity: 'Yurko City',
    passportId: 'KL-2094-V',
    permitPassportId: 'KL-2094-V',
    passportExpiry: '1982-09-14', // Expired before 1982-11-23!
    permitExpiry: '1983-01-10',
    purpose: 'visit',
    sealAuthentic: true,
    isValid: false,
    discrepancyType: 'expired_passport',
    avatarSeed: 2,
  },
  {
    index: 2,
    fullName: 'Jorji Costava',
    permitName: 'Jorji Costava',
    nation: 'obristan',
    issuingCity: 'Cobrastan', // Invalid issuing city!
    passportId: 'OB-7712-J',
    permitPassportId: 'OB-7712-J',
    passportExpiry: '1984-11-30',
    permitExpiry: '1983-06-15',
    purpose: 'transit',
    sealAuthentic: true,
    isValid: false,
    discrepancyType: 'invalid_city',
    avatarSeed: 3,
  },
  {
    index: 3,
    fullName: 'Mikhail Petrov',
    permitName: 'Mikhail Petrov',
    nation: 'arstotzka',
    issuingCity: 'Orvech Vonor',
    passportId: 'AR-5510-M',
    permitPassportId: 'AR-5599-M', // Mismatched passport number on permit!
    passportExpiry: '1985-03-20',
    permitExpiry: '1983-08-19',
    purpose: 'work',
    sealAuthentic: true,
    isValid: false,
    discrepancyType: 'id_mismatch',
    avatarSeed: 4,
  },
  {
    index: 4,
    fullName: 'Anya Sokolova',
    permitName: 'Anya Sokolova',
    nation: 'obristan',
    issuingCity: 'Skal',
    passportId: 'OB-3391-A',
    permitPassportId: 'OB-3391-A',
    passportExpiry: '1984-07-01',
    permitExpiry: '1983-04-22',
    purpose: 'visit',
    sealAuthentic: true,
    isValid: true,
    discrepancyType: 'none',
    avatarSeed: 5,
  },
  {
    index: 5,
    fullName: 'Darius Vane',
    permitName: 'Darius Vane',
    nation: 'kolechia',
    issuingCity: 'Vedor',
    passportId: 'KL-9102-D',
    permitPassportId: 'KL-9102-D',
    passportExpiry: '1983-12-01',
    permitExpiry: '1983-03-11',
    purpose: 'transit',
    sealAuthentic: false, // Forged seal!
    isValid: false,
    discrepancyType: 'forged_seal',
    avatarSeed: 6,
  },
  {
    index: 6,
    fullName: 'Sergei Volkov',
    permitName: 'Stepan Volkov', // Name mismatch!
    nation: 'arstotzka',
    issuingCity: 'East Grestin',
    passportId: 'AR-6400-S',
    permitPassportId: 'AR-6400-S',
    passportExpiry: '1984-09-10',
    permitExpiry: '1983-05-05',
    purpose: 'work',
    sealAuthentic: true,
    isValid: false,
    discrepancyType: 'name_mismatch',
    avatarSeed: 7,
  },
  {
    index: 7,
    fullName: 'Klara Lindqvist',
    permitName: 'Klara Lindqvist',
    nation: 'kolechia',
    issuingCity: 'Yurko City',
    passportId: 'KL-4418-K',
    permitPassportId: 'KL-4418-K',
    passportExpiry: '1985-01-18',
    permitExpiry: '1983-09-30',
    purpose: 'work',
    sealAuthentic: true,
    isValid: true,
    discrepancyType: 'none',
    avatarSeed: 8,
  },
];

export function createInitialBorderState(): BorderInspectorState {
  return {
    status: 'playing',
    currentIndex: 0,
    cases: SHIFT_CASES,
    inspectSelection: [],
    discrepancyFound: false,
    lastInspectResult: 'none',
    stampMark: null,
    credits: 50,
    correctCount: 0,
    citations: 0,
    maxCitations: 4,
    streak: 0,
    lastCitationReason: null,
  };
}

export function getCurrentApplicant(state: BorderInspectorState): ApplicantCase {
  return state.cases[Math.min(state.currentIndex, state.cases.length - 1)];
}

export function checkPairDiscrepancy(
  applicant: ApplicantCase,
  fieldA: InspectFieldId,
  fieldB: InspectFieldId
): boolean {
  const pair = new Set([fieldA, fieldB]);

  if (pair.has('clock_date') && pair.has('passport_expiry')) {
    return applicant.passportExpiry < CHECKPOINT_DATE;
  }
  if (pair.has('clock_date') && pair.has('permit_expiry')) {
    return applicant.permitExpiry < CHECKPOINT_DATE;
  }
  if (pair.has('rule_cities') && pair.has('passport_city')) {
    const valid = NATION_RULES[applicant.nation].validCities;
    return !valid.includes(applicant.issuingCity);
  }
  if (pair.has('passport_id') && pair.has('permit_id')) {
    return applicant.passportId !== applicant.permitPassportId;
  }
  if (pair.has('passport_name') && pair.has('permit_name')) {
    return applicant.fullName !== applicant.permitName;
  }
  if (pair.has('rule_seal') && pair.has('permit_seal')) {
    return !applicant.sealAuthentic;
  }
  return false;
}

export function selectInspectField(
  state: BorderInspectorState,
  fieldId: InspectFieldId
): BorderInspectorState {
  if (state.status !== 'playing') return state;

  const existing = state.inspectSelection;
  if (existing.includes(fieldId)) {
    return {
      ...state,
      inspectSelection: existing.filter((f) => f !== fieldId),
      lastInspectResult: 'none',
    };
  }

  if (existing.length === 0) {
    return {
      ...state,
      inspectSelection: [fieldId],
      lastInspectResult: 'none',
    };
  }

  const first = existing[0];
  const applicant = getCurrentApplicant(state);
  const isConflict = checkPairDiscrepancy(applicant, first, fieldId);

  return {
    ...state,
    inspectSelection: [first, fieldId],
    discrepancyFound: state.discrepancyFound || isConflict,
    lastInspectResult: isConflict ? 'conflict' : 'verified',
  };
}

export function stampApplicantDecision(
  state: BorderInspectorState,
  decision: 'approved' | 'denied'
): BorderInspectorState {
  if (state.status !== 'playing') return state;

  const applicant = getCurrentApplicant(state);
  const expectedDecision = applicant.isValid ? 'approved' : 'denied';
  const isCorrect = decision === expectedDecision;

  let credits = state.credits;
  let correctCount = state.correctCount;
  let citations = state.citations;
  let streak = state.streak;
  let lastCitationReason: BorderInspectorState['lastCitationReason'] = null;

  if (isCorrect) {
    correctCount += 1;
    streak += 1;
    const bonus = !applicant.isValid && state.discrepancyFound ? 15 : 0;
    credits += 20 + bonus;
  } else {
    citations += 1;
    streak = 0;
    if (citations >= 2) {
      credits = Math.max(0, credits - 10);
    }
    lastCitationReason = applicant.isValid ? 'wrongful_denial' : applicant.discrepancyType;
  }

  const nextIndex = state.currentIndex + 1;
  const status: BorderInspectorState['status'] =
    citations >= state.maxCitations
      ? 'fired'
      : nextIndex >= state.cases.length
        ? 'shift_complete'
        : 'playing';

  return {
    ...state,
    status,
    currentIndex: status === 'playing' ? nextIndex : state.currentIndex,
    inspectSelection: [],
    discrepancyFound: false,
    lastInspectResult: 'none',
    stampMark: { decision, x: 180, y: 120 },
    credits,
    correctCount,
    citations,
    streak,
    lastCitationReason,
  };
}

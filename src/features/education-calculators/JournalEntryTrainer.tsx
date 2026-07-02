'use client';

import React, { useReducer, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface QuizScenario {
  id: number;
  descKo: string;
  descEn: string;
  amount: number;
  correctDebit: string;
  correctCredit: string;
  explanationKo: string;
  explanationEn: string;
}

interface State {
  currentIdx: number;
  selectedDebit: string;
  selectedCredit: string;
  debitAmount: string;
  creditAmount: string;
  checked: boolean;
  isCorrect: boolean;
  score: number;
  answeredIds: Set<number>;
  showResults: boolean;
}

type Action =
  | { type: 'SELECT_DEBIT'; payload: string }
  | { type: 'SELECT_CREDIT'; payload: string }
  | { type: 'SET_DEBIT_AMOUNT'; payload: string }
  | { type: 'SET_CREDIT_AMOUNT'; payload: string }
  | { type: 'CHECK_ANSWER'; correct: boolean }
  | { type: 'NEXT' }
  | { type: 'SHOW_RESULTS' }
  | { type: 'RESTART' };

// ── Data ─────────────────────────────────────────────────────────────────────

const ACCOUNTS = [
  '현금', '매출채권', '재고자산', '유형자산', '감가상각누계액',
  '선급비용', '미수수익', '매입채무', '선수금', '차입금',
  '사채', '자본금', '이익잉여금', '매출', '매출원가',
  '급여', '감가상각비', '이자비용', '법인세비용', '배당금',
];

const SCENARIOS: QuizScenario[] = [
  {
    id: 1,
    descKo: '현금으로 매출 100만원 발생',
    descEn: 'Cash sales of 1,000,000 won',
    amount: 1000000,
    correctDebit: '현금',
    correctCredit: '매출',
    explanationKo: '현금 수령(자산 증가) → 차변, 매출 발생(수익 발생) → 대변',
    explanationEn: 'Cash received (asset increase) → Debit; Revenue earned → Credit',
  },
  {
    id: 2,
    descKo: '외상으로 상품 매입 200만원',
    descEn: 'Credit purchase of goods 2,000,000 won',
    amount: 2000000,
    correctDebit: '재고자산',
    correctCredit: '매입채무',
    explanationKo: '재고자산 증가(자산 증가) → 차변, 매입채무 발생(부채 증가) → 대변',
    explanationEn: 'Inventory increase (asset) → Debit; Accounts payable created (liability) → Credit',
  },
  {
    id: 3,
    descKo: '급여 350만원을 현금으로 지급',
    descEn: 'Salary paid in cash 3,500,000 won',
    amount: 3500000,
    correctDebit: '급여',
    correctCredit: '현금',
    explanationKo: '급여비용 발생 → 차변, 현금 감소(자산 감소) → 대변',
    explanationEn: 'Salary expense incurred → Debit; Cash decreases (asset) → Credit',
  },
  {
    id: 4,
    descKo: '은행에서 차입금 500만원 수령',
    descEn: 'Bank loan received 5,000,000 won',
    amount: 5000000,
    correctDebit: '현금',
    correctCredit: '차입금',
    explanationKo: '현금 증가(자산 증가) → 차변, 차입금 발생(부채 증가) → 대변',
    explanationEn: 'Cash received (asset increase) → Debit; Loan payable created (liability) → Credit',
  },
  {
    id: 5,
    descKo: '감가상각비 50만원 계상',
    descEn: 'Depreciation expense recorded 500,000 won',
    amount: 500000,
    correctDebit: '감가상각비',
    correctCredit: '감가상각누계액',
    explanationKo: '감가상각비 발생(비용) → 차변, 감가상각누계액 증가(자산 차감) → 대변',
    explanationEn: 'Depreciation expense → Debit; Accumulated depreciation increases → Credit',
  },
  {
    id: 6,
    descKo: '고객으로부터 선수금 150만원 수령',
    descEn: 'Advance payment received from customer 1,500,000 won',
    amount: 1500000,
    correctDebit: '현금',
    correctCredit: '선수금',
    explanationKo: '현금 증가(자산 증가) → 차변, 선수금 발생(부채 증가) → 대변',
    explanationEn: 'Cash received → Debit; Advance received (liability, obligation to deliver) → Credit',
  },
  {
    id: 7,
    descKo: '매출채권 300만원 현금 회수',
    descEn: 'Accounts receivable collected 3,000,000 won',
    amount: 3000000,
    correctDebit: '현금',
    correctCredit: '매출채권',
    explanationKo: '현금 증가(자산 증가) → 차변, 매출채권 감소(자산 감소) → 대변',
    explanationEn: 'Cash increases → Debit; A/R decreases (asset goes away) → Credit',
  },
  {
    id: 8,
    descKo: '임차료 60만원을 현금으로 선납',
    descEn: 'Prepaid rent paid in cash 600,000 won',
    amount: 600000,
    correctDebit: '선급비용',
    correctCredit: '현금',
    explanationKo: '선급비용 증가(자산 증가, 미래 효익) → 차변, 현금 감소 → 대변',
    explanationEn: 'Prepaid expense (future benefit, asset) → Debit; Cash decreases → Credit',
  },
  {
    id: 9,
    descKo: '이자비용 20만원 미지급 발생',
    descEn: 'Interest expense accrued 200,000 won',
    amount: 200000,
    correctDebit: '이자비용',
    correctCredit: '매입채무',
    explanationKo: '이자비용 발생(비용) → 차변, 미지급이자(부채 증가) → 대변. 실무상 미지급비용 계정 사용.',
    explanationEn: 'Interest expense accrued → Debit; Accrued interest payable (liability) → Credit',
  },
  {
    id: 10,
    descKo: '유형자산 1,000만원 현금 취득',
    descEn: 'Fixed asset purchased for cash 10,000,000 won',
    amount: 10000000,
    correctDebit: '유형자산',
    correctCredit: '현금',
    explanationKo: '유형자산 증가(자산 증가) → 차변, 현금 감소(자산 감소) → 대변',
    explanationEn: 'Fixed asset acquired (asset increase) → Debit; Cash paid → Credit',
  },
  {
    id: 11,
    descKo: '미수수익 80만원 계상',
    descEn: 'Accrued revenue recorded 800,000 won',
    amount: 800000,
    correctDebit: '미수수익',
    correctCredit: '매출',
    explanationKo: '미수수익(자산 증가, 받을 권리) → 차변, 수익 인식 → 대변',
    explanationEn: 'Accrued receivable (asset, right to receive) → Debit; Revenue recognized → Credit',
  },
  {
    id: 12,
    descKo: '배당금 200만원 현금 지급',
    descEn: 'Dividends paid in cash 2,000,000 won',
    amount: 2000000,
    correctDebit: '배당금',
    correctCredit: '현금',
    explanationKo: '배당금(자본 차감 또는 비용성 항목) → 차변, 현금 감소 → 대변',
    explanationEn: 'Dividends (reduction of equity) → Debit; Cash decreases → Credit',
  },
  {
    id: 13,
    descKo: '재고자산 감모손실 30만원',
    descEn: 'Inventory shrinkage loss 300,000 won',
    amount: 300000,
    correctDebit: '매출원가',
    correctCredit: '재고자산',
    explanationKo: '감모손실(비용, 매출원가 또는 재고자산감모손실) → 차변, 재고자산 감소 → 대변',
    explanationEn: 'Inventory loss (expense) → Debit; Inventory decreases → Credit',
  },
  {
    id: 14,
    descKo: '사채 1,000만원 발행 (현금 수령)',
    descEn: 'Bonds issued for cash 10,000,000 won',
    amount: 10000000,
    correctDebit: '현금',
    correctCredit: '사채',
    explanationKo: '현금 증가(자산 증가) → 차변, 사채 발행(부채 증가) → 대변',
    explanationEn: 'Cash received → Debit; Bonds payable (long-term liability) → Credit',
  },
  {
    id: 15,
    descKo: '법인세 250만원 현금 납부',
    descEn: 'Corporate income tax paid in cash 2,500,000 won',
    amount: 2500000,
    correctDebit: '법인세비용',
    correctCredit: '현금',
    explanationKo: '법인세비용 발생(비용) → 차변, 현금 감소 → 대변',
    explanationEn: 'Income tax expense → Debit; Cash paid → Credit',
  },
];

// ── Reducer ───────────────────────────────────────────────────────────────────

function initialState(): State {
  return {
    currentIdx: 0,
    selectedDebit: '',
    selectedCredit: '',
    debitAmount: '',
    creditAmount: '',
    checked: false,
    isCorrect: false,
    score: 0,
    answeredIds: new Set(),
    showResults: false,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SELECT_DEBIT':
      return { ...state, selectedDebit: action.payload };
    case 'SELECT_CREDIT':
      return { ...state, selectedCredit: action.payload };
    case 'SET_DEBIT_AMOUNT':
      return { ...state, debitAmount: action.payload };
    case 'SET_CREDIT_AMOUNT':
      return { ...state, creditAmount: action.payload };
    case 'CHECK_ANSWER': {
      const newAnsweredIds = new Set(state.answeredIds);
      newAnsweredIds.add(SCENARIOS[state.currentIdx].id);
      return {
        ...state,
        checked: true,
        isCorrect: action.correct,
        score: action.correct ? state.score + 1 : state.score,
        answeredIds: newAnsweredIds,
      };
    }
    case 'NEXT': {
      if (state.currentIdx >= SCENARIOS.length - 1) {
        return { ...state, showResults: true };
      }
      return {
        ...state,
        currentIdx: state.currentIdx + 1,
        selectedDebit: '',
        selectedCredit: '',
        debitAmount: '',
        creditAmount: '',
        checked: false,
        isCorrect: false,
      };
    }
    case 'SHOW_RESULTS':
      return { ...state, showResults: true };
    case 'RESTART':
      return initialState();
    default:
      return state;
  }
}

// ── Components ────────────────────────────────────────────────────────────────

interface TAccountDisplayProps {
  scenario: QuizScenario;
  locale: 'ko' | 'en';
}

const TAccountDisplay: React.FC<TAccountDisplayProps> = ({ scenario, locale }) => {
  return (
    <div className="mt-6">
      <h4 className="text-sm font-bold text-slate-700 mb-3">
        {locale === 'ko' ? 'T계정 시각화' : 'T-Account Visualization'}
      </h4>
      <div className="grid grid-cols-2 gap-4">
        {/* Debit T-account */}
        <div className="border-2 border-emerald-300 rounded-xl overflow-hidden">
          <div className="bg-emerald-100 px-3 py-1.5 text-center text-xs font-bold text-emerald-800">
            {scenario.correctDebit}
          </div>
          <div className="flex min-h-[80px]">
            <div className="flex-1 border-r border-emerald-200 p-2">
              <p className="text-xs font-bold text-slate-500 mb-1">
                {locale === 'ko' ? '차변 (Dr)' : 'Debit (Dr)'}
              </p>
              <p className="text-sm font-bold text-emerald-700">
                {scenario.amount.toLocaleString()}
              </p>
            </div>
            <div className="flex-1 p-2">
              <p className="text-xs font-bold text-slate-500 mb-1">
                {locale === 'ko' ? '대변 (Cr)' : 'Credit (Cr)'}
              </p>
            </div>
          </div>
        </div>
        {/* Credit T-account */}
        <div className="border-2 border-blue-300 rounded-xl overflow-hidden">
          <div className="bg-blue-100 px-3 py-1.5 text-center text-xs font-bold text-blue-800">
            {scenario.correctCredit}
          </div>
          <div className="flex min-h-[80px]">
            <div className="flex-1 border-r border-blue-200 p-2">
              <p className="text-xs font-bold text-slate-500 mb-1">
                {locale === 'ko' ? '차변 (Dr)' : 'Debit (Dr)'}
              </p>
            </div>
            <div className="flex-1 p-2">
              <p className="text-xs font-bold text-slate-500 mb-1">
                {locale === 'ko' ? '대변 (Cr)' : 'Credit (Cr)'}
              </p>
              <p className="text-sm font-bold text-blue-700">
                {scenario.amount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

interface JournalEntryTrainerProps {
  locale?: 'ko' | 'en';
}

export const JournalEntryTrainer: React.FC<JournalEntryTrainerProps> = ({ locale = 'ko' }) => {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  const currentScenario = SCENARIOS[state.currentIdx];

  const handleCheck = useCallback(() => {
    if (state.checked) return;
    const scenario = SCENARIOS[state.currentIdx];
    const correct =
      state.selectedDebit === scenario.correctDebit &&
      state.selectedCredit === scenario.correctCredit;
    dispatch({ type: 'CHECK_ANSWER', correct });
  }, [state]);

  const canCheck =
    !state.checked &&
    state.selectedDebit !== '' &&
    state.selectedCredit !== '';

  if (state.showResults) {
    const pct = Math.round((state.score / SCENARIOS.length) * 100);
    return (
      <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-3xl shadow-xl">
        <h3 className="text-xl font-bold text-emerald-900 mb-2">
          {locale === 'ko' ? '결과 보기' : 'Quiz Results'}
        </h3>
        <div className="flex flex-col items-center py-8">
          <div className="w-28 h-28 rounded-full bg-emerald-100 border-4 border-emerald-400 flex flex-col items-center justify-center mb-4">
            <span className="text-3xl font-bold text-emerald-700">{state.score}</span>
            <span className="text-sm text-emerald-500">/ {SCENARIOS.length}</span>
          </div>
          <p className="text-lg font-bold text-slate-700 mb-1">
            {locale === 'ko' ? `정답률 ${pct}%` : `${pct}% Correct`}
          </p>
          <p className="text-sm text-slate-500 mb-6">
            {pct >= 80
              ? locale === 'ko' ? '우수합니다! 분개 원리를 잘 이해하고 있습니다.' : 'Excellent! You understand journal entry principles well.'
              : pct >= 60
              ? locale === 'ko' ? '양호합니다. 헷갈리는 유형을 복습해 보세요.' : 'Good. Review the entry types you got wrong.'
              : locale === 'ko' ? '분개의 기본 원리를 다시 학습해 보세요.' : 'Review the basic principles of journal entries.'}
          </p>
          <button
            onClick={() => dispatch({ type: 'RESTART' })}
            className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors"
            aria-label={locale === 'ko' ? '다시 시작' : 'Restart quiz'}
          >
            {locale === 'ko' ? '다시 시작' : 'Restart Quiz'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-3xl shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-emerald-900">
          {locale === 'ko' ? '회계 분개 연습기' : 'Journal Entry Trainer'}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-emerald-700" aria-live="polite">
            {locale === 'ko' ? `점수: ${state.score}/${SCENARIOS.length}` : `Score: ${state.score}/${SCENARIOS.length}`}
          </span>
          <span className="text-xs text-slate-500">
            ({state.currentIdx + 1}/{SCENARIOS.length})
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-emerald-100 rounded-full h-2 mb-6" role="progressbar" aria-valuenow={state.currentIdx + 1} aria-valuemin={1} aria-valuemax={SCENARIOS.length}>
        <div
          className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((state.currentIdx + 1) / SCENARIOS.length) * 100}%` }}
        />
      </div>

      {/* Scenario */}
      <div className="bg-white border border-emerald-200 rounded-2xl p-5 mb-6">
        <p className="text-xs font-bold text-emerald-600 mb-1">
          {locale === 'ko' ? `문제 ${state.currentIdx + 1}` : `Question ${state.currentIdx + 1}`}
        </p>
        <p className="text-base font-bold text-slate-800 mb-0.5">
          {locale === 'ko' ? currentScenario.descKo : currentScenario.descEn}
        </p>
        <p className="text-sm text-slate-400">
          {locale === 'ko' ? currentScenario.descEn : currentScenario.descKo}
        </p>
        <p className="text-sm font-bold text-slate-600 mt-2">
          {locale === 'ko' ? `금액: ${currentScenario.amount.toLocaleString()}원` : `Amount: ₩${currentScenario.amount.toLocaleString()}`}
        </p>
      </div>

      {/* Entry inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Debit */}
        <div className="bg-white border border-emerald-200 rounded-2xl p-4">
          <label className="block text-xs font-bold text-emerald-700 mb-2" htmlFor="debit-account">
            {locale === 'ko' ? '차변 계정 (Dr)' : 'Debit Account (Dr)'}
          </label>
          <select
            id="debit-account"
            value={state.selectedDebit}
            onChange={(e) => dispatch({ type: 'SELECT_DEBIT', payload: e.target.value })}
            disabled={state.checked}
            className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60"
            aria-label={locale === 'ko' ? '차변 계정 선택' : 'Select debit account'}
          >
            <option value="">{locale === 'ko' ? '-- 계정 선택 --' : '-- Select Account --'}</option>
            {ACCOUNTS.map((acc) => (
              <option key={acc} value={acc}>{acc}</option>
            ))}
          </select>
        </div>

        {/* Credit */}
        <div className="bg-white border border-blue-200 rounded-2xl p-4">
          <label className="block text-xs font-bold text-blue-700 mb-2" htmlFor="credit-account">
            {locale === 'ko' ? '대변 계정 (Cr)' : 'Credit Account (Cr)'}
          </label>
          <select
            id="credit-account"
            value={state.selectedCredit}
            onChange={(e) => dispatch({ type: 'SELECT_CREDIT', payload: e.target.value })}
            disabled={state.checked}
            className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60"
            aria-label={locale === 'ko' ? '대변 계정 선택' : 'Select credit account'}
          >
            <option value="">{locale === 'ko' ? '-- 계정 선택 --' : '-- Select Account --'}</option>
            {ACCOUNTS.map((acc) => (
              <option key={acc} value={acc}>{acc}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Check button */}
      {!state.checked && (
        <button
          onClick={handleCheck}
          disabled={!canCheck}
          className="w-full py-3 rounded-xl font-bold text-sm transition-colors bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={locale === 'ko' ? '정답 확인' : 'Check answer'}
        >
          {locale === 'ko' ? '정답 확인' : 'Check Answer'}
        </button>
      )}

      {/* Result panel */}
      {state.checked && (
        <div
          className={`rounded-2xl p-4 border ${state.isCorrect ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'}`}
          role="alert"
          aria-live="polite"
        >
          <p className={`text-base font-bold mb-1 ${state.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
            {state.isCorrect
              ? locale === 'ko' ? '정답입니다!' : 'Correct!'
              : locale === 'ko' ? '오답입니다.' : 'Incorrect.'}
          </p>
          {!state.isCorrect && (
            <p className="text-sm text-slate-700 mb-1">
              {locale === 'ko'
                ? `정답: 차변 — ${currentScenario.correctDebit} / 대변 — ${currentScenario.correctCredit}`
                : `Answer: Debit — ${currentScenario.correctDebit} / Credit — ${currentScenario.correctCredit}`}
            </p>
          )}
          <p className="text-sm text-slate-600">
            {locale === 'ko' ? currentScenario.explanationKo : currentScenario.explanationEn}
          </p>

          {/* T-account visualization */}
          <TAccountDisplay scenario={currentScenario} locale={locale} />

          {/* Navigation buttons */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => dispatch({ type: 'NEXT' })}
              className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors text-sm"
              aria-label={state.currentIdx >= SCENARIOS.length - 1
                ? locale === 'ko' ? '결과 보기' : 'View results'
                : locale === 'ko' ? '다음 문제' : 'Next question'}
            >
              {state.currentIdx >= SCENARIOS.length - 1
                ? locale === 'ko' ? '결과 보기' : 'View Results'
                : locale === 'ko' ? '다음 문제' : 'Next Question'}
            </button>
            {state.currentIdx < SCENARIOS.length - 1 && (
              <button
                onClick={() => dispatch({ type: 'SHOW_RESULTS' })}
                className="px-4 py-2.5 border border-emerald-300 text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 transition-colors text-sm"
                aria-label={locale === 'ko' ? '결과 보기' : 'View results now'}
              >
                {locale === 'ko' ? '결과 보기' : 'Results'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Principle reminder */}
      <div className="mt-6 p-3 bg-white border border-emerald-100 rounded-xl text-xs text-slate-500">
        <span className="font-bold text-emerald-700">
          {locale === 'ko' ? '분개 원칙: ' : 'Principle: '}
        </span>
        {locale === 'ko'
          ? '차변 = 자산 증가 · 비용 발생 | 대변 = 부채·자본 증가 · 수익 발생'
          : 'Debit = asset increase · expense | Credit = liability/equity increase · revenue'}
      </div>
    </div>
  );
};

export default JournalEntryTrainer;

'use client';

import React, { useReducer, useMemo } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface JournalEntry {
  id: number;
  date: string;
  debitAccount: string;
  debitAmount: string;
  creditAccount: string;
  creditAmount: string;
}

type ActiveTab = 'entries' | 'taccounts' | 'trialbalance';

interface State {
  entries: JournalEntry[];
  activeTab: ActiveTab;
}

type Action =
  | { type: 'UPDATE_ENTRY'; id: number; field: keyof JournalEntry; value: string }
  | { type: 'ADD_ENTRY' }
  | { type: 'REMOVE_ENTRY'; id: number }
  | { type: 'SET_TAB'; tab: ActiveTab };

// ── Data ──────────────────────────────────────────────────────────────────────

const ACCOUNTS = [
  '현금', '매출채권', '재고자산', '유형자산', '감가상각누계액',
  '선급비용', '미수수익', '매입채무', '선수금', '차입금',
  '사채', '자본금', '이익잉여금', '매출', '매출원가',
  '급여', '감가상각비', '이자비용', '법인세비용', '배당금',
];

// Account type classification for color coding
// Blue = asset/expense accounts (debit-normal)
// Red = liability/equity/revenue accounts (credit-normal)
const DEBIT_NORMAL_ACCOUNTS = new Set([
  '현금', '매출채권', '재고자산', '유형자산', '선급비용', '미수수익',
  '매출원가', '급여', '감가상각비', '이자비용', '법인세비용', '배당금',
]);

function getAccountColor(account: string): { bg: string; border: string; text: string; label: string } {
  if (DEBIT_NORMAL_ACCOUNTS.has(account)) {
    return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', label: '자산/비용' };
  }
  return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', label: '부채·자본·수익' };
}

const DEFAULT_ENTRIES: JournalEntry[] = [
  { id: 1, date: '2026-01-01', debitAccount: '현금', debitAmount: '5000000', creditAccount: '자본금', creditAmount: '5000000' },
  { id: 2, date: '2026-01-05', debitAccount: '재고자산', debitAmount: '2000000', creditAccount: '매입채무', creditAmount: '2000000' },
  { id: 3, date: '2026-01-10', debitAccount: '매출채권', debitAmount: '3000000', creditAccount: '매출', creditAmount: '3000000' },
];

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'UPDATE_ENTRY':
      return {
        ...state,
        entries: state.entries.map((e) =>
          e.id === action.id ? { ...e, [action.field]: action.value } : e
        ),
      };
    case 'ADD_ENTRY':
      if (state.entries.length >= 10) return state;
      return {
        ...state,
        entries: [
          ...state.entries,
          {
            id: Date.now(),
            date: '',
            debitAccount: '',
            debitAmount: '',
            creditAccount: '',
            creditAmount: '',
          },
        ],
      };
    case 'REMOVE_ENTRY':
      if (state.entries.length <= 1) return state;
      return { ...state, entries: state.entries.filter((e) => e.id !== action.id) };
    case 'SET_TAB':
      return { ...state, activeTab: action.tab };
    default:
      return state;
  }
}

// ── Derived data helpers ──────────────────────────────────────────────────────

interface TAccountData {
  account: string;
  debits: Array<{ date: string; amount: number }>;
  credits: Array<{ date: string; amount: number }>;
  debitTotal: number;
  creditTotal: number;
  balance: number;
  isDebitNormal: boolean;
}

function buildTAccounts(entries: JournalEntry[]): TAccountData[] {
  const accountMap = new Map<string, TAccountData>();

  function getOrCreate(account: string): TAccountData {
    if (!accountMap.has(account)) {
      accountMap.set(account, {
        account,
        debits: [],
        credits: [],
        debitTotal: 0,
        creditTotal: 0,
        balance: 0,
        isDebitNormal: DEBIT_NORMAL_ACCOUNTS.has(account),
      });
    }
    return accountMap.get(account)!;
  }

  for (const entry of entries) {
    const debitAmt = parseFloat(entry.debitAmount) || 0;
    const creditAmt = parseFloat(entry.creditAmount) || 0;

    if (entry.debitAccount && debitAmt > 0) {
      const acc = getOrCreate(entry.debitAccount);
      acc.debits.push({ date: entry.date, amount: debitAmt });
      acc.debitTotal += debitAmt;
    }

    if (entry.creditAccount && creditAmt > 0) {
      const acc = getOrCreate(entry.creditAccount);
      acc.credits.push({ date: entry.date, amount: creditAmt });
      acc.creditTotal += creditAmt;
    }
  }

  // Calculate balances
  for (const acc of accountMap.values()) {
    acc.balance = acc.isDebitNormal
      ? acc.debitTotal - acc.creditTotal
      : acc.creditTotal - acc.debitTotal;
  }

  return Array.from(accountMap.values());
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface EntryRowProps {
  entry: JournalEntry;
  onUpdate: (field: keyof JournalEntry, value: string) => void;
  onRemove: () => void;
  canRemove: boolean;
  locale: 'ko' | 'en';
}

const EntryRow: React.FC<EntryRowProps> = ({ entry, onUpdate, onRemove, canRemove, locale }) => (
  <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center p-3 bg-white border border-emerald-100 rounded-xl">
    <input
      type="date"
      value={entry.date}
      onChange={(e) => onUpdate('date', e.target.value)}
      className="border border-emerald-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
      aria-label={locale === 'ko' ? '날짜' : 'Date'}
    />
    <select
      value={entry.debitAccount}
      onChange={(e) => onUpdate('debitAccount', e.target.value)}
      className="border border-blue-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
      aria-label={locale === 'ko' ? '차변 계정' : 'Debit account'}
    >
      <option value="">{locale === 'ko' ? '차변 계정' : 'Debit Acct'}</option>
      {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
    </select>
    <input
      type="number"
      value={entry.debitAmount}
      onChange={(e) => onUpdate('debitAmount', e.target.value)}
      placeholder={locale === 'ko' ? '차변 금액' : 'Dr Amount'}
      className="border border-blue-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
      aria-label={locale === 'ko' ? '차변 금액' : 'Debit amount'}
    />
    <select
      value={entry.creditAccount}
      onChange={(e) => onUpdate('creditAccount', e.target.value)}
      className="border border-red-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
      aria-label={locale === 'ko' ? '대변 계정' : 'Credit account'}
    >
      <option value="">{locale === 'ko' ? '대변 계정' : 'Credit Acct'}</option>
      {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
    </select>
    <input
      type="number"
      value={entry.creditAmount}
      onChange={(e) => onUpdate('creditAmount', e.target.value)}
      placeholder={locale === 'ko' ? '대변 금액' : 'Cr Amount'}
      className="border border-red-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
      aria-label={locale === 'ko' ? '대변 금액' : 'Credit amount'}
    />
    <button
      onClick={onRemove}
      disabled={!canRemove}
      className="text-rose-400 hover:text-rose-600 disabled:opacity-30 text-xs font-bold px-2 py-1.5 rounded-lg border border-rose-100 hover:border-rose-300 transition-colors"
      aria-label={locale === 'ko' ? '행 삭제' : 'Remove row'}
    >
      {locale === 'ko' ? '삭제' : 'Del'}
    </button>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

interface TAccountVisualizerProps {
  locale?: 'ko' | 'en';
}

export const TAccountVisualizer: React.FC<TAccountVisualizerProps> = ({ locale = 'ko' }) => {
  const [state, dispatch] = useReducer(reducer, {
    entries: DEFAULT_ENTRIES,
    activeTab: 'entries',
  });

  const tAccounts = useMemo(() => buildTAccounts(state.entries), [state.entries]);

  const totalDebit = useMemo(
    () => state.entries.reduce((sum, e) => sum + (parseFloat(e.debitAmount) || 0), 0),
    [state.entries]
  );
  const totalCredit = useMemo(
    () => state.entries.reduce((sum, e) => sum + (parseFloat(e.creditAmount) || 0), 0),
    [state.entries]
  );
  const isBalanced = totalDebit === totalCredit;

  const tabs: Array<{ key: ActiveTab; ko: string; en: string }> = [
    { key: 'entries', ko: '분개 입력', en: 'Journal Entries' },
    { key: 'taccounts', ko: 'T계정', en: 'T-Accounts' },
    { key: 'trialbalance', ko: '잔액시산표', en: 'Trial Balance' },
  ];

  return (
    <div className="not-prose my-12 p-6 md:p-8 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-3xl shadow-xl">
      <h3 className="text-xl font-bold text-emerald-900 mb-2">
        {locale === 'ko' ? 'T계정 시각화기' : 'T-Account Visualizer'}
      </h3>
      <p className="text-sm text-emerald-600 mb-6">
        {locale === 'ko'
          ? '분개를 입력하면 T계정과 잔액시산표를 자동 생성합니다.'
          : 'Enter journal entries to auto-generate T-accounts and trial balance.'}
      </p>

      {/* Tab selector */}
      <div className="flex gap-2 mb-6" role="tablist" aria-label={locale === 'ko' ? '탭 선택' : 'Tab selection'}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={state.activeTab === tab.key}
            onClick={() => dispatch({ type: 'SET_TAB', tab: tab.key })}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors border ${
              state.activeTab === tab.key
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            {locale === 'ko' ? tab.ko : tab.en}
          </button>
        ))}
      </div>

      {/* Tab: Entries */}
      {state.activeTab === 'entries' && (
        <div role="tabpanel">
          <div className="hidden md:grid md:grid-cols-6 gap-2 px-3 mb-1">
            {[
              locale === 'ko' ? '날짜' : 'Date',
              locale === 'ko' ? '차변 계정' : 'Debit Acct',
              locale === 'ko' ? '차변 금액' : 'Dr Amount',
              locale === 'ko' ? '대변 계정' : 'Credit Acct',
              locale === 'ko' ? '대변 금액' : 'Cr Amount',
              '',
            ].map((h, i) => (
              <span key={i} className="text-xs font-bold text-slate-500">{h}</span>
            ))}
          </div>

          <div className="space-y-2 mb-4">
            {state.entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                onUpdate={(field, value) => dispatch({ type: 'UPDATE_ENTRY', id: entry.id, field, value })}
                onRemove={() => dispatch({ type: 'REMOVE_ENTRY', id: entry.id })}
                canRemove={state.entries.length > 1}
                locale={locale}
              />
            ))}
          </div>

          {state.entries.length < 10 && (
            <button
              onClick={() => dispatch({ type: 'ADD_ENTRY' })}
              className="w-full py-2.5 border-2 border-dashed border-emerald-300 text-emerald-600 font-bold rounded-xl hover:border-emerald-400 hover:bg-emerald-50 transition-colors text-sm"
              aria-label={locale === 'ko' ? '행 추가' : 'Add row'}
            >
              + {locale === 'ko' ? '행 추가' : 'Add Row'}
            </button>
          )}

          {/* Balance check */}
          <div className={`mt-4 p-3 rounded-xl border text-sm ${isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}
            role="status" aria-live="polite">
            <span className="font-bold mr-2">{isBalanced ? '✓' : '!'}</span>
            {locale === 'ko'
              ? `차변 합계 ${totalDebit.toLocaleString()}원 / 대변 합계 ${totalCredit.toLocaleString()}원 ${isBalanced ? '— 균형' : '— 불균형'}`
              : `Dr total ₩${totalDebit.toLocaleString()} / Cr total ₩${totalCredit.toLocaleString()} ${isBalanced ? '— Balanced' : '— Unbalanced'}`}
          </div>
        </div>
      )}

      {/* Tab: T-Accounts */}
      {state.activeTab === 'taccounts' && (
        <div role="tabpanel">
          {tAccounts.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">
              {locale === 'ko' ? '분개를 입력하면 T계정이 표시됩니다.' : 'Enter journal entries to see T-accounts.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tAccounts.map((acc) => {
                const colors = getAccountColor(acc.account);
                const maxRows = Math.max(acc.debits.length, acc.credits.length, 1);
                return (
                  <div
                    key={acc.account}
                    className={`rounded-2xl border-2 overflow-hidden ${colors.border}`}
                    aria-label={`${acc.account} T-account`}
                  >
                    {/* Account name header */}
                    <div className={`px-3 py-2 flex items-center justify-between ${colors.bg}`}>
                      <span className={`text-sm font-bold ${colors.text}`}>{acc.account}</span>
                      <span className={`text-xs ${colors.text} opacity-70`}>{colors.label}</span>
                    </div>

                    {/* T shape */}
                    <div className="flex bg-white">
                      {/* Debit side */}
                      <div className="flex-1 border-r-2 border-slate-300 p-2">
                        <p className="text-xs font-bold text-slate-500 mb-1">{locale === 'ko' ? '차변 (Dr)' : 'Dr'}</p>
                        {acc.debits.length === 0 ? (
                          <div style={{ minHeight: `${maxRows * 24}px` }} />
                        ) : (
                          acc.debits.map((d, i) => (
                            <div key={i} className="flex justify-between text-xs py-0.5">
                              <span className="text-slate-400">{d.date.slice(5)}</span>
                              <span className="font-bold text-blue-700">{d.amount.toLocaleString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                      {/* Credit side */}
                      <div className="flex-1 p-2">
                        <p className="text-xs font-bold text-slate-500 mb-1">{locale === 'ko' ? '대변 (Cr)' : 'Cr'}</p>
                        {acc.credits.length === 0 ? (
                          <div style={{ minHeight: `${maxRows * 24}px` }} />
                        ) : (
                          acc.credits.map((c, i) => (
                            <div key={i} className="flex justify-between text-xs py-0.5">
                              <span className="text-slate-400">{c.date.slice(5)}</span>
                              <span className="font-bold text-red-700">{c.amount.toLocaleString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Balance row */}
                    <div className={`px-3 py-1.5 border-t-2 border-slate-300 ${colors.bg} flex justify-between`}>
                      <span className={`text-xs font-bold ${colors.text}`}>
                        {locale === 'ko' ? '잔액' : 'Balance'}
                      </span>
                      <span className={`text-xs font-bold ${colors.text}`}>
                        {acc.balance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Trial Balance */}
      {state.activeTab === 'trialbalance' && (
        <div role="tabpanel">
          {tAccounts.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">
              {locale === 'ko' ? '분개를 입력하면 잔액시산표가 표시됩니다.' : 'Enter journal entries to see the trial balance.'}
            </p>
          ) : (
            <div className="bg-white border border-emerald-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm" aria-label={locale === 'ko' ? '잔액시산표' : 'Trial Balance'}>
                <thead>
                  <tr className="bg-emerald-50">
                    <th className="text-left px-4 py-3 text-xs font-bold text-emerald-700">
                      {locale === 'ko' ? '계정과목' : 'Account'}
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-blue-700">
                      {locale === 'ko' ? '차변' : 'Debit'}
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-red-700">
                      {locale === 'ko' ? '대변' : 'Credit'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tAccounts.map((acc, idx) => (
                    <tr key={acc.account} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-4 py-2 text-slate-700">{acc.account}</td>
                      <td className="px-4 py-2 text-right font-bold text-blue-700">
                        {acc.debitTotal > 0 ? acc.debitTotal.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-red-700">
                        {acc.creditTotal > 0 ? acc.creditTotal.toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-emerald-100 border-t-2 border-emerald-300">
                    <td className="px-4 py-3 font-bold text-emerald-800">
                      {locale === 'ko' ? '합계' : 'Total'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-blue-800">
                      {tAccounts.reduce((s, a) => s + a.debitTotal, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-800">
                      {tAccounts.reduce((s, a) => s + a.creditTotal, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Balance check */}
              <div
                className={`px-4 py-3 border-t flex items-center gap-2 text-sm font-bold ${
                  isBalanced ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}
                role="status"
                aria-live="polite"
              >
                <span className="text-lg">{isBalanced ? '✓' : '!'}</span>
                {locale === 'ko'
                  ? isBalanced ? '차변합계 = 대변합계 — 균형 잡힌 시산표' : '차변합계 ≠ 대변합계 — 오류 확인 필요'
                  : isBalanced ? 'Debit total = Credit total — Balanced' : 'Debit total ≠ Credit total — Check for errors'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TAccountVisualizer;

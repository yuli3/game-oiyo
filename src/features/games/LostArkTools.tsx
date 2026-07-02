'use client';
import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import Copy from 'lucide-react/dist/esm/icons/copy'
import Check from 'lucide-react/dist/esm/icons/check'
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw'
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';

// ─────────────────────────────────────────────
// LOST ARK AUCTION CALCULATOR (lostarkCalculator port)
// ─────────────────────────────────────────────

function fmtGold(n: number): string {
  return n.toLocaleString('ko-KR');
}

function CopyBtn({ value }: { value: number }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy}
      className="inline-flex items-center gap-1 ml-2 px-2.5 py-1 text-xs font-bold rounded-full border transition-colors bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-500 hover:text-rose-600">
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      {copied ? '복사됨' : '복사'}
    </button>
  );
}

export function LostArkAuctionCalc() {
  const [price, setPrice] = useState(0);
  const [members, setMembers] = useState(4);

  const fee = price > 1 ? Math.ceil(price * 0.05) : 0;
  const netPrice = price - fee;
  const equalBid = members > 0 ? Math.round(netPrice * (members - 1) / members) : 0;
  const maxBid = members > 0 ? Math.round(equalBid / 1.1) : 0;
  const equalMyBenefit = netPrice - equalBid;
  const maxMyBenefit = netPrice - maxBid;

  const rows = [
    { label: '시장 가격', value: price, copy: false, highlight: false },
    { label: '거래소 수수료 (5%)', value: fee, copy: false, highlight: false },
    { label: '분배될 금액 (수수료 제외)', value: netPrice, copy: false, highlight: false },
    { label: '균등 분배 입찰가', value: equalBid, copy: true, highlight: true },
    { label: '내 이득 (균등 분배 시)', value: equalMyBenefit, copy: false, highlight: false },
    { label: '최대 이득 입찰가', value: maxBid, copy: true, highlight: true },
    { label: '내 이득 (최대 이득 시)', value: maxMyBenefit, copy: false, highlight: false },
  ];

  return (
    <Card className="p-6 bg-white border-slate-200 shadow-xl mt-8">
      <div className="space-y-5">
        <div>
          <h3 className="text-lg font-black text-slate-900 mb-1">로스트아크 경매 계산기</h3>
          <p className="text-sm text-slate-500">군단장 레이드 경매 아이템의 적정 입찰가를 계산합니다.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-600">시장 가격 (골드)</label>
            <input type="number" min={0} value={price || ''}
              onChange={e => setPrice(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="시장 가격 입력"
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 font-semibold text-slate-800 focus:border-amber-400 outline-none transition-colors" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-600">인원 수: <span className="text-amber-600">{members}명</span></label>
            <input type="range" min={2} max={30} value={members} onChange={e => setMembers(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer" />
            <div className="flex justify-between text-xs text-slate-400">
              <span>2명</span><span>16명</span><span>30명</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          {rows.map(({ label, value, copy, highlight }) => (
            <div key={label} className={`flex items-center justify-between px-4 py-3 rounded-xl ${highlight ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50 border border-slate-100'}`}>
              <span className="text-sm font-semibold text-slate-600">{label}</span>
              <div className="flex items-center">
                <span className={`text-base font-black ${highlight ? 'text-amber-700' : 'text-slate-800'}`}>{fmtGold(value)}G</span>
                {copy && <CopyBtn value={value} />}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 border border-slate-100">
          <p className="font-bold text-slate-600 mb-1">계산 방식</p>
          <p>• <strong>균등 분배 입찰가</strong>: 낙찰자를 포함해 모두 같은 이득이 되는 입찰가</p>
          <p>• <strong>최대 이득 입찰가</strong>: 낙찰자가 최대 이득을 얻는 입찰가 (거래 이득 ÷ 1.1 = 최대 이득)</p>
          <p>• 거래소 수수료 5%는 자동 계산됩니다.</p>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Q1Q3 RAID PARTY SPLITTER
// ─────────────────────────────────────────────

type RaidType = '1-1' | '1-3';
type PartySize = 4 | 8 | 16;

const DEALER = ['ㄷ', 'D', 'd'];
const SUPP = ['ㅍ', 'S', 's'];
const MAIN_SUFFIX = '(M)';

function getGameCount(rt: RaidType) { return rt === '1-1' ? 2 : 4; }

function requiredSupporters(size: PartySize, rt: RaidType) {
  return (size * getGameCount(rt)) / 4;
}

function isMain(char: string) { return char.includes(MAIN_SUFFIX); }
function isDealer(char: string) { return DEALER.includes(char.charAt(0)); }
function isSupporter(char: string) { return SUPP.includes(char.charAt(0)); }

type GameResult = string[][];

function countByGame(result: GameResult): { main: number[]; sup: number[]; mainSup: number[]; subSup: number[] } {
  const games = result[0].length;
  const main = Array(games).fill(0);
  const sup = Array(games).fill(0);
  const mainSup = Array(games).fill(0);
  const subSup = Array(games).fill(0);

  for (let g = 0; g < games; g++) {
    for (let p = 0; p < result.length; p++) {
      const c = result[p][g];
      if (!c) continue;
      if (isDealer(c) && isMain(c)) main[g]++;
      if (isSupporter(c)) {
        sup[g]++;
        if (isMain(c)) mainSup[g]++;
        else subSup[g]++;
      }
    }
  }
  return { main, sup, mainSup, subSup };
}

function distributeRaid(playersData: string[][], games: number): GameResult {
  const result: GameResult = playersData.map(() => Array(games).fill(''));

  // First pass: assign main characters
  for (let p = 0; p < playersData.length; p++) {
    const mains = playersData[p].filter(c => isMain(c));
    mains.forEach((c, g) => { if (g < games) result[p][g] = c; });
  }

  // Second pass: fill remaining slots
  for (let g = 0; g < games; g++) {
    for (let p = 0; p < playersData.length; p++) {
      if (!result[p][g]) {
        const avail = playersData[p].find(c => !result[p].includes(c));
        if (avail) result[p][g] = avail;
      }
    }
  }

  // Balance pass (swap to equalize supporter/main distribution)
  for (let iter = 0; iter < 100; iter++) {
    const { sup, mainSup, main } = countByGame(result);
    const maxSup = Math.max(...sup), minSup = Math.min(...sup);
    const maxMS = Math.max(...mainSup), minMS = Math.min(...mainSup);
    const maxM = Math.max(...main), minM = Math.min(...main);

    if (maxSup - minSup <= 1 && maxMS - minMS <= 1 && maxM - minM <= 1) break;

    const maxSupG = sup.indexOf(maxSup), minSupG = sup.indexOf(minSup);
    const maxMSG = mainSup.indexOf(maxMS), minMSG = mainSup.indexOf(minMS);

    let swapped = false;
    for (let p = 1; p < result.length && !swapped; p++) {
      if (maxMS - minMS > 1) {
        const c = result[p][maxMSG];
        if (isSupporter(c) && isMain(c)) {
          [result[p][maxMSG], result[p][minMSG]] = [result[p][minMSG], result[p][maxMSG]];
          swapped = true;
        }
      } else if (maxSup - minSup > 1) {
        const c = result[p][maxSupG], d = result[p][minSupG];
        if (isSupporter(c) && !isMain(c) && isDealer(d)) {
          [result[p][maxSupG], result[p][minSupG]] = [result[p][minSupG], result[p][maxSupG]];
          swapped = true;
        }
      }
    }
    if (!swapped) break;
  }

  return result;
}

function parsePlayerLine(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

function raidResultText(result: GameResult, partySize: PartySize): string {
  const games = result[0].length;
  const parties = Math.ceil(result.length / partySize);
  let text = '';
  for (let g = 0; g < games; g++) {
    text += `=== ${g + 1}게임 ===\n`;
    for (let party = 0; party < parties; party++) {
      text += `  파티 ${party + 1}: `;
      const start = party * partySize;
      const end = Math.min(start + partySize, result.length);
      text += result.slice(start, end).map(p => p[g] || '?').join(', ');
      text += '\n';
    }
  }
  return text;
}

export function LostArkRaidSplitter() {
  const [raidType, setRaidType] = useState<RaidType>('1-1');
  const [partySize, setPartySize] = useState<PartySize>(4);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<GameResult | null>(null);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const calculate = useCallback(() => {
    setError('');
    const lines = input.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) { setError('파티 데이터를 입력해 주세요.'); return; }

    const playersData = lines.map(parsePlayerLine);
    const expectedPlayers = partySize;

    if (playersData.length !== expectedPlayers) {
      setError(`입력된 플레이어 수(${playersData.length})가 파티 크기(${expectedPlayers})와 맞지 않습니다.`);
      return;
    }

    const supCount = playersData.flat().filter(c => isSupporter(c)).length;
    const reqSup = requiredSupporters(partySize, raidType);
    if (supCount < reqSup) {
      setError(`서포터 부족: 필요 ${reqSup}명, 현재 ${supCount}명`);
    }

    try {
      const games = getGameCount(raidType);
      const distributed = distributeRaid(playersData, games);
      setResult(distributed);
    } catch {
      setError('분배 계산 중 오류가 발생했습니다.');
    }
  }, [input, raidType, partySize]);

  const copyAll = () => {
    if (!result) return;
    navigator.clipboard.writeText(raidResultText(result, partySize));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const roleColor = (char: string) => {
    if (!char) return 'bg-slate-100 text-slate-400';
    if (isSupporter(char)) return isMain(char) ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-indigo-50 text-indigo-600 border border-indigo-100';
    return isMain(char) ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-50 text-slate-600 border border-slate-200';
  };

  const games = getGameCount(raidType);

  return (
    <Card className="p-6 bg-white border-slate-200 shadow-xl mt-8">
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">로스트아크 공대 분배기 (Q1Q3)</h3>
            <p className="text-sm text-slate-500 mt-0.5">레이드 파티 캐릭터 자동 배분 · 본1부1 / 본1부3</p>
          </div>
          <button onClick={() => setShowHelp(h => !h)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-full px-2.5 py-1">
            {showHelp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            사용법
          </button>
        </div>

        {showHelp && (
          <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-600 space-y-1.5 border border-slate-200">
            <p className="font-bold text-slate-700">입력 방식</p>
            <p>• 한 줄에 한 명, 공백으로 캐릭터 구분</p>
            <p>• <strong>딜러</strong>: D, ㄷ, d로 시작 / <strong>서포터</strong>: S, ㅍ, s로 시작</p>
            <p>• 본캐릭터(M)는 뒤에 <strong>(M)</strong> 추가 → 예: D(M), ㅍ(M)</p>
            <p className="font-bold text-slate-700 mt-2">예시 (파티4 기준)</p>
            <pre className="bg-white rounded p-2 text-xs border border-slate-200">{`D(M) D ㄷ ㅍ
D(M) d ㅍ(M) d
ㅍ(M) D D d
D(M) d d ㅍ`}</pre>
          </div>
        )}

        {/* Controls */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">레이드 방식</label>
            <div className="flex gap-2">
              {(['1-1', '1-3'] as RaidType[]).map(t => (
                <button key={t} onClick={() => setRaidType(t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${raidType === t ? 'bg-amber-50 border-amber-400 text-amber-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  본{t.replace('-', '부')}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">파티 크기</label>
            <div className="flex gap-2">
              {([4, 8, 16] as PartySize[]).map(s => (
                <button key={s} onClick={() => setPartySize(s)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${partySize === s ? 'bg-amber-50 border-amber-400 text-amber-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  {s}인
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500">파티 데이터 입력 ({partySize}줄, 한 줄에 한 명)</label>
          <textarea value={input} onChange={e => setInput(e.target.value)} rows={Math.min(partySize, 8)}
            placeholder={`D(M) D ㄷ ㅍ\nD(M) d ㅍ(M) d\n...`}
            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:border-amber-400 outline-none transition-colors resize-none" />
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={calculate}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl transition-colors">
            분배하기
          </button>
          <button onClick={() => { setInput(''); setResult(null); setError(''); }}
            className="px-4 py-2.5 border-2 border-slate-200 hover:border-slate-300 rounded-xl text-slate-600 transition-colors">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-800">분배 결과</p>
              <button onClick={copyAll}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-colors">
                {copiedAll ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copiedAll ? '복사됨' : '전체 복사'}
              </button>
            </div>
            {Array.from({ length: games }, (_, g) => (
              <div key={g} className="space-y-2">
                <p className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg inline-block">{g + 1}게임</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {result.map((player, p) => (
                    <div key={p} className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-12 text-right">P{p + 1}</span>
                      <span className={`px-2.5 py-1 rounded-lg text-sm font-bold ${roleColor(player[g])}`}>
                        {player[g] || '—'}
                      </span>
                      {isSupporter(player[g]) && <span className="text-[10px] text-blue-400 font-bold">SUP</span>}
                      {isDealer(player[g]) && <span className="text-[10px] text-rose-400 font-bold">DPS</span>}
                      {isMain(player[g]) && <span className="text-[10px] text-amber-500 font-bold">본캐</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

import React, { useState, useCallback } from 'react';

const CHARSET = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}|;:,.<>?',
  ambiguous: 'Il1O0',
};

function calcEntropy(charset: number, length: number): number {
  if (charset === 0 || length === 0) return 0;
  return Math.floor(length * Math.log2(charset));
}

function generateOne(
  length: number,
  useUpper: boolean,
  useLower: boolean,
  useNumbers: boolean,
  useSymbols: boolean,
  excludeAmbiguous: boolean
): string {
  let pool = '';
  if (useUpper) pool += CHARSET.upper;
  if (useLower) pool += CHARSET.lower;
  if (useNumbers) pool += CHARSET.numbers;
  if (useSymbols) pool += CHARSET.symbols;
  if (excludeAmbiguous) {
    for (const ch of CHARSET.ambiguous) pool = pool.split(ch).join('');
  }
  if (!pool) return '';

  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => pool[n % pool.length]).join('');
}

const PasswordGenerator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const t = locale === 'ko'
    ? {
        title: '비밀번호 생성기',
        length: '길이',
        uppercase: '대문자 (A-Z)',
        lowercase: '소문자 (a-z)',
        numbers: '숫자 (0-9)',
        symbols: '특수문자 (!@#...)',
        excludeAmbiguous: '헷갈리는 문자 제외 (I, l, 1, O, 0)',
        count: '생성 개수',
        generate: '비밀번호 생성',
        copy: '복사',
        copied: '복사됨',
        strength: '강도',
        strengthLabels: ['매우 약함', '약함', '보통', '강함', '매우 강함'],
        entropy: '엔트로피',
        bits: '비트',
        noChars: '최소 한 가지 문자 종류를 선택하세요.',
      }
    : {
        title: 'Password Generator',
        length: 'Length',
        uppercase: 'Uppercase (A-Z)',
        lowercase: 'Lowercase (a-z)',
        numbers: 'Numbers (0-9)',
        symbols: 'Symbols (!@#...)',
        excludeAmbiguous: 'Exclude ambiguous chars (I, l, 1, O, 0)',
        count: 'Count',
        generate: 'Generate',
        copy: 'Copy',
        copied: 'Copied',
        strength: 'Strength',
        strengthLabels: ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'],
        entropy: 'Entropy',
        bits: 'bits',
        noChars: 'Select at least one character type.',
      };

  const [length, setLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [count, setCount] = useState(1);
  const [passwords, setPasswords] = useState<string[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [error, setError] = useState('');

  const charsetSize = (() => {
    let size = 0;
    if (useUpper) size += excludeAmbiguous ? CHARSET.upper.split('').filter(c => !CHARSET.ambiguous.includes(c)).length : CHARSET.upper.length;
    if (useLower) size += excludeAmbiguous ? CHARSET.lower.split('').filter(c => !CHARSET.ambiguous.includes(c)).length : CHARSET.lower.length;
    if (useNumbers) size += excludeAmbiguous ? CHARSET.numbers.split('').filter(c => !CHARSET.ambiguous.includes(c)).length : CHARSET.numbers.length;
    if (useSymbols) size += CHARSET.symbols.length;
    return size;
  })();

  const entropy = calcEntropy(charsetSize, length);

  const strengthIndex = entropy < 28 ? 0 : entropy < 36 ? 1 : entropy < 60 ? 2 : entropy < 128 ? 3 : 4;
  const strengthColors = ['bg-destructive/40', 'bg-warning/40', 'bg-warning/40', 'bg-success/40', 'bg-success'];

  const handleGenerate = useCallback(() => {
    if (!useUpper && !useLower && !useNumbers && !useSymbols) {
      setError(t.noChars);
      return;
    }
    setError('');
    const results: string[] = [];
    for (let i = 0; i < count; i++) {
      results.push(generateOne(length, useUpper, useLower, useNumbers, useSymbols, excludeAmbiguous));
    }
    setPasswords(results);
    setCopiedIdx(null);
  }, [length, useUpper, useLower, useNumbers, useSymbols, excludeAmbiguous, count, t.noChars]);

  const handleCopy = (pw: string, idx: number) => {
    navigator.clipboard.writeText(pw).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    });
  };

  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-success' : 'bg-muted'}`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`}
        />
      </button>
      <span className="text-sm text-muted-foreground">{label}</span>
    </label>
  );

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 font-sans">
      <h1 className="text-2xl font-bold text-center text-success">{t.title}</h1>

      <div className="rounded-2xl border border-success/20 bg-white/80 p-5 space-y-5 shadow-sm">
        {/* Length slider */}
        <div className="space-y-2">
          <label className="flex justify-between text-sm font-bold text-muted-foreground">
            <span>{t.length}</span>
            <span className="text-success">{length}</span>
          </label>
          <input
            type="range"
            min={8}
            max={64}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full accent-success"
            aria-label={t.length}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>8</span><span>64</span>
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Toggle checked={useUpper} onChange={() => setUseUpper(!useUpper)} label={t.uppercase} />
          <Toggle checked={useLower} onChange={() => setUseLower(!useLower)} label={t.lowercase} />
          <Toggle checked={useNumbers} onChange={() => setUseNumbers(!useNumbers)} label={t.numbers} />
          <Toggle checked={useSymbols} onChange={() => setUseSymbols(!useSymbols)} label={t.symbols} />
          <Toggle checked={excludeAmbiguous} onChange={() => setExcludeAmbiguous(!excludeAmbiguous)} label={t.excludeAmbiguous} />
        </div>

        {/* Count */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-bold text-muted-foreground whitespace-nowrap">{t.count}</label>
          {[1, 3, 5, 10].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${count === n ? 'bg-success text-white' : 'bg-success/10 text-success hover:bg-success/15'}`}
              aria-pressed={count === n}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Entropy / strength */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${strengthColors[strengthIndex]}`}
              style={{ width: `${Math.min((entropy / 128) * 100, 100)}%` }}
              role="presentation"
            />
          </div>
          <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">
            {t.strengthLabels[strengthIndex]} — {entropy} {t.bits}
          </span>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="button"
          onClick={handleGenerate}
          className="w-full py-3 rounded-2xl bg-success text-white font-bold text-sm hover:bg-success active:scale-95 transition-all shadow"
          aria-label={t.generate}
        >
          {t.generate}
        </button>
      </div>

      {passwords.length > 0 && (
        <div className="space-y-3">
          {passwords.map((pw, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-success/20 bg-white/80 px-4 py-3 shadow-sm">
              <code className="flex-1 text-sm font-mono text-foreground break-all select-all">{pw}</code>
              <button
                type="button"
                onClick={() => handleCopy(pw, i)}
                className="px-3 py-1.5 rounded-xl bg-success/10 text-success text-xs font-bold hover:bg-success/15 transition-colors whitespace-nowrap"
                aria-label={`${t.copy} ${i + 1}`}
              >
                {copiedIdx === i ? t.copied : t.copy}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PasswordGenerator;

import React, { useState, useCallback } from 'react';

function generateUuidV4(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  arr[6] = (arr[6] & 0x0f) | 0x40;
  arr[8] = (arr[8] & 0x3f) | 0x80;
  const hex = Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const BULK_OPTIONS = [1, 5, 10, 50] as const;

const UuidGenerator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const t = locale === 'ko'
    ? {
        title: 'UUID 생성기',
        version: 'UUID v4 (랜덤)',
        count: '생성 개수',
        uppercase: '대문자',
        hyphens: '하이픈 포함',
        generate: '생성하기',
        copyAll: '전체 복사',
        copy: '복사',
        copied: '복사됨',
        allCopied: '전체 복사됨',
      }
    : {
        title: 'UUID Generator',
        version: 'UUID v4 (Random)',
        count: 'Count',
        uppercase: 'Uppercase',
        hyphens: 'Include Hyphens',
        generate: 'Generate',
        copyAll: 'Copy All',
        copy: 'Copy',
        copied: 'Copied',
        allCopied: 'All Copied',
      };

  const [count, setCount] = useState<typeof BULK_OPTIONS[number]>(1);
  const [uppercase, setUppercase] = useState(false);
  const [hyphens, setHyphens] = useState(true);
  const [uuids, setUuids] = useState<string[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState(false);

  const format = useCallback((uuid: string) => {
    let result = hyphens ? uuid : uuid.replace(/-/g, '');
    return uppercase ? result.toUpperCase() : result;
  }, [uppercase, hyphens]);

  const handleGenerate = useCallback(() => {
    const results: string[] = [];
    for (let i = 0; i < count; i++) results.push(format(generateUuidV4()));
    setUuids(results);
    setCopiedIdx(null);
    setAllCopied(false);
  }, [count, format]);

  const handleCopy = (uuid: string, idx: number) => {
    navigator.clipboard.writeText(uuid).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    });
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(uuids.join('\n')).then(() => {
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 1500);
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
        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
      <span className="text-sm text-muted-foreground">{label}</span>
    </label>
  );

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 font-sans">
      <h1 className="text-2xl font-bold text-center text-success">{t.title}</h1>

      <div className="rounded-2xl border border-success/20 bg-white/80 p-5 space-y-5 shadow-sm">
        <p className="text-xs font-bold text-success uppercase tracking-widest">{t.version}</p>

        {/* Count */}
        <div className="space-y-2">
          <p className="text-sm font-bold text-muted-foreground">{t.count}</p>
          <div className="flex gap-2 flex-wrap">
            {BULK_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${count === n ? 'bg-success text-white' : 'bg-success/10 text-success hover:bg-success/15'}`}
                aria-pressed={count === n}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="flex flex-wrap gap-4">
          <Toggle checked={uppercase} onChange={() => setUppercase(!uppercase)} label={t.uppercase} />
          <Toggle checked={hyphens} onChange={() => setHyphens(!hyphens)} label={t.hyphens} />
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          className="w-full py-3 rounded-2xl bg-success text-white font-bold text-sm hover:bg-success active:scale-95 transition-all shadow"
        >
          {t.generate}
        </button>
      </div>

      {uuids.length > 0 && (
        <div className="space-y-3">
          {uuids.length > 1 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCopyAll}
                className="px-4 py-2 rounded-xl bg-success/15 text-success text-sm font-bold hover:bg-success/20 transition-colors"
              >
                {allCopied ? t.allCopied : t.copyAll}
              </button>
            </div>
          )}
          {uuids.map((uuid, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-success/20 bg-white/80 px-4 py-3 shadow-sm">
              <code className="flex-1 text-sm font-mono text-foreground break-all select-all">{uuid}</code>
              <button
                type="button"
                onClick={() => handleCopy(uuid, i)}
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

export default UuidGenerator;

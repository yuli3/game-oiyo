import React, { useState, useCallback } from 'react';

type Algorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';
const ALGORITHMS: Algorithm[] = ['SHA-256', 'SHA-384', 'SHA-512'];

async function hashText(algorithm: Algorithm, text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

const HashGenerator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const t = locale === 'ko'
    ? {
        title: '해시 생성기',
        placeholder: '해시로 변환할 텍스트를 입력하세요...',
        generate: '해시 생성',
        clear: '지우기',
        copy: '복사',
        copied: '복사됨',
        loading: '생성 중...',
        empty: '텍스트를 입력하고 해시 생성 버튼을 누르세요.',
      }
    : {
        title: 'Hash Generator',
        placeholder: 'Enter text to hash...',
        generate: 'Generate Hashes',
        clear: 'Clear',
        copy: 'Copy',
        copied: 'Copied',
        loading: 'Generating...',
        empty: 'Enter text and click Generate Hashes.',
      };

  const [input, setInput] = useState('');
  const [hashes, setHashes] = useState<Record<Algorithm, string>>({} as Record<Algorithm, string>);
  const [loading, setLoading] = useState(false);
  const [copiedAlgo, setCopiedAlgo] = useState<Algorithm | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        ALGORITHMS.map(async (algo) => [algo, await hashText(algo, input)] as [Algorithm, string])
      );
      setHashes(Object.fromEntries(results) as Record<Algorithm, string>);
    } finally {
      setLoading(false);
    }
  }, [input]);

  const handleCopy = (algo: Algorithm) => {
    const hash = hashes[algo];
    if (!hash) return;
    navigator.clipboard.writeText(hash).then(() => {
      setCopiedAlgo(algo);
      setTimeout(() => setCopiedAlgo(null), 1500);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate();
  };

  const hasResults = ALGORITHMS.some((a) => hashes[a]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 font-sans">
      <h1 className="text-2xl font-bold text-center text-success">{t.title}</h1>

      <div className="rounded-2xl border border-success/20 bg-white/80 p-5 space-y-4 shadow-sm">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.placeholder}
            rows={4}
            className="w-full rounded-2xl border border-success/30 bg-white/80 p-4 text-sm leading-relaxed text-foreground shadow-sm outline-none focus:ring-2 focus:ring-success/30 resize-y"
            aria-label={t.placeholder}
          />
          {input && (
            <button
              type="button"
              onClick={() => { setInput(''); setHashes({} as Record<Algorithm, string>); }}
              className="absolute top-3 right-3 rounded-xl bg-success/15 px-3 py-1 text-xs font-bold text-success hover:bg-success/20 transition-colors"
              aria-label={t.clear}
            >
              {t.clear}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!input.trim() || loading}
          className="w-full py-3 rounded-2xl bg-success text-white font-bold text-sm hover:bg-success active:scale-95 transition-all shadow disabled:opacity-50 disabled:cursor-not-allowed"
          aria-busy={loading}
        >
          {loading ? t.loading : t.generate}
        </button>
      </div>

      {!hasResults && (
        <p className="text-center text-sm text-muted-foreground">{t.empty}</p>
      )}

      {hasResults && (
        <div className="space-y-3">
          {ALGORITHMS.map((algo) => (
            <div key={algo} className="rounded-2xl border border-success/20 bg-white/80 p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-success uppercase tracking-widest">{algo}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(algo)}
                  className="px-3 py-1.5 rounded-xl bg-success/10 text-success text-xs font-bold hover:bg-success/15 transition-colors"
                  aria-label={`${t.copy} ${algo}`}
                >
                  {copiedAlgo === algo ? t.copied : t.copy}
                </button>
              </div>
              <code className="block w-full text-xs font-mono text-muted-foreground break-all select-all bg-success/10 rounded-xl px-3 py-2">
                {hashes[algo] ?? '—'}
              </code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HashGenerator;

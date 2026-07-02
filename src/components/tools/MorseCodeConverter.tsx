import React, { useState, useCallback } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh';
type Mode = 'encode' | 'decode';

const L: Record<Locale, { title: string; subtitle: string; encode: string; decode: string; input: string; output: string; copy: string; copied: string; clear: string; inputPlaceholder: string; decodePlaceholder: string; }> = {
  ko: { title: '모스 부호 변환기', subtitle: 'Morse Code Converter', encode: '문자 → 모스', decode: '모스 → 문자', input: '입력', output: '결과', copy: '복사', copied: '복사됨', clear: '지우기', inputPlaceholder: '텍스트를 입력하세요…', decodePlaceholder: '모스 부호를 입력하세요 (예: ... --- ...)' },
  en: { title: 'Morse Code Converter', subtitle: 'Encode & Decode', encode: 'Text → Morse', decode: 'Morse → Text', input: 'Input', output: 'Output', copy: 'Copy', copied: 'Copied!', clear: 'Clear', inputPlaceholder: 'Type text here…', decodePlaceholder: 'Enter Morse code (e.g. ... --- ...)' },
  ja: { title: 'モールス信号変換機', subtitle: 'Morse Code Converter', encode: 'テキスト→モールス', decode: 'モールス→テキスト', input: '入力', output: '出力', copy: 'コピー', copied: 'コピー済', clear: 'クリア', inputPlaceholder: 'テキストを入力…', decodePlaceholder: 'モールス信号を入力 (例: ... --- ...)' },
  fr: { title: 'Convertisseur Code Morse', subtitle: 'Morse Code Converter', encode: 'Texte → Morse', decode: 'Morse → Texte', input: 'Entrée', output: 'Sortie', copy: 'Copier', copied: 'Copié !', clear: 'Effacer', inputPlaceholder: 'Tapez votre texte…', decodePlaceholder: 'Entrez le code Morse (ex: ... --- ...)' },
  es: { title: 'Conversor Código Morse', subtitle: 'Morse Code Converter', encode: 'Texto → Morse', decode: 'Morse → Texto', input: 'Entrada', output: 'Salida', copy: 'Copiar', copied: '¡Copiado!', clear: 'Borrar', inputPlaceholder: 'Escribe tu texto…', decodePlaceholder: 'Introduce código Morse (ej: ... --- ...)' },
  zh: { title: '摩斯电码转换器', subtitle: 'Morse Code Converter', encode: '文字→摩斯码', decode: '摩斯码→文字', input: '输入', output: '输出', copy: '复制', copied: '已复制', clear: '清除', inputPlaceholder: '在此输入文字…', decodePlaceholder: '输入摩斯电码（例：... --- ...）' },
};

const MORSE: Record<string, string> = {
  A:'.-', B:'-...', C:'-.-.', D:'-..', E:'.', F:'..-.', G:'--.', H:'....', I:'..', J:'.---', K:'-.-', L:'.-..', M:'--',
  N:'-.', O:'---', P:'.--.', Q:'--.-', R:'.-.', S:'...', T:'-', U:'..-', V:'...-', W:'.--', X:'-..-', Y:'-.--', Z:'--..',
  '0':'-----', '1':'.----', '2':'..---', '3':'...--', '4':'....-', '5':'.....', '6':'-....', '7':'--...', '8':'---..', '9':'----.',
  '.':'.-.-.-', ',':'--..--', '?':'..--..', "'":'.----.', '!':'-.-.--', '/':'-..-.', '(':'-.--.', ')':'-.--.-', '&':'.-...', ':':'---...',
  ';':'-.-.-.', '=':'-...-', '+':'.-.-.', '-':'-....-', '_':'..--.-', '"':'.-..-.', '$':'...-..-', '@':'.--.-.', ' ':'//',
};

const MORSE_REV: Record<string, string> = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

function encode(text: string): string {
  return text.toUpperCase().split('').map(c => MORSE[c] ?? '?').join(' ');
}

function decode(morse: string): string {
  // Words are separated by ' // ' or '/', letters by ' '
  return morse.trim().split(/\s*\/\/?\s*/).map(word =>
    word.trim().split(' ').filter(Boolean).map(code => MORSE_REV[code] ?? '?').join('')
  ).join(' ');
}

const MorseCodeConverter: React.FC<{ locale?: Locale }> = ({ locale = 'en' }) => {
  const t = L[locale] ?? L.en;
  const [mode, setMode] = useState<Mode>('encode');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const output = mode === 'encode' ? encode(input) : decode(input);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback silent fail
    }
  }, [output]);

  return (
    <GameContainer
      title={t.title}
      subtitle={t.subtitle}
      onReset={() => setInput('')}
    >
      <div className="flex flex-col gap-6">
        {/* Mode toggle */}
        <div className="flex rounded-2xl border border-border overflow-hidden">
          {(['encode', 'decode'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setInput(''); }}
              aria-pressed={mode === m}
              aria-label={m === 'encode' ? t.encode : t.decode}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
            >
              {m === 'encode' ? t.encode : t.decode}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.input}</label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={mode === 'encode' ? t.inputPlaceholder : t.decodePlaceholder}
            aria-label={t.input}
            rows={4}
            className="w-full px-4 py-3 bg-muted/30 rounded-2xl border border-border font-mono text-sm outline-none focus:border-primary transition-colors resize-none"
          />
        </div>

        {/* Output */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.output}</label>
            <button
              onClick={handleCopy}
              disabled={!output}
              aria-label={copied ? t.copied : t.copy}
              className="px-3 py-1 rounded-lg bg-muted border border-border text-xs font-bold hover:bg-accent transition-colors disabled:opacity-40"
            >
              {copied ? t.copied : t.copy}
            </button>
          </div>
          <div className="w-full min-h-[100px] px-4 py-3 bg-muted/20 rounded-2xl border border-border font-mono text-sm break-all select-all whitespace-pre-wrap">
            {output || <span className="text-muted-foreground/50 select-none">—</span>}
          </div>
        </div>

        {/* Quick reference */}
        <details className="group">
          <summary className="text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
            Morse Reference ▸
          </summary>
          <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-1.5 text-[11px] font-mono">
            {Object.entries(MORSE).filter(([k]) => /[A-Z0-9]/.test(k)).map(([k, v]) => (
              <div key={k} className="flex gap-1 px-2 py-1 bg-muted/30 rounded-lg">
                <span className="font-black text-foreground">{k}</span>
                <span className="text-muted-foreground">{v}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </GameContainer>
  );
};

export default MorseCodeConverter;

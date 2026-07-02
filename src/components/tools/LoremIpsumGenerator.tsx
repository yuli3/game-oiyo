import React, { useState } from 'react';

const LOREM_WORDS = [
  'lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do',
  'eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua','enim',
  'ad','minim','veniam','quis','nostrud','exercitation','ullamco','laboris','nisi',
  'aliquip','ex','ea','commodo','consequat','duis','aute','irure','in','reprehenderit',
  'voluptate','velit','esse','cillum','fugiat','nulla','pariatur','excepteur','sint',
  'occaecat','cupidatat','non','proident','sunt','culpa','qui','officia','deserunt',
  'mollit','anim','id','est','laborum','curabitur','pretium','tincidunt','lacus',
  'nunc','pulvinar','sapien','ligula','scelerisque','mauris','pellentesque',
  'facilisis','vehicula','semper','faucibus','orci','luctus','ultrices','posuere',
];

const KO_WORDS = [
  '동해','물과','백두산이','마르고','닳도록','하느님이','보우하사','우리나라','만세',
  '남산','위에','저','소나무','철갑을','두른','듯','바람','서리','불변함은',
  '우리나라','기상이라','가을','하늘','공활한데','높고','구름','없이','밝은달은',
  '우리가슴','일편단심','일세','이','기상과','이','맘으로','충성을','다하여',
  '괴로우나','즐거우나','나라','사랑하세','무궁화','삼천리','화려강산','대한','사람',
  '대한으로','길이','보전하세','산','들','강','바다','하늘','구름','바람','비',
  '눈','얼음','불','땅','사람','나무','꽃','풀','물','돌','새','소','말','집',
];

function buildParagraph(words: string[], wordCount: number): string {
  const result: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    result.push(words[Math.floor(Math.random() * words.length)]);
  }
  const sentence = result.join(' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}

function buildParagraphs(words: string[], paraCount: number, wordsPerPara: number): string[] {
  return Array.from({ length: paraCount }, () => buildParagraph(words, wordsPerPara));
}

type GenMode = 'paragraphs' | 'words';
type Lang = 'latin' | 'ko';

const LoremIpsumGenerator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
  const t = locale === 'ko'
    ? {
        title: '로렘 입숨 생성기',
        mode: '생성 방식',
        byParagraph: '단락 수',
        byWords: '단어 수',
        count: '개수',
        language: '텍스트 언어',
        latin: '라틴어 (Lorem Ipsum)',
        korean: '한국어 더미 텍스트',
        generate: '생성하기',
        copy: '복사',
        copied: '복사됨',
        placeholder: '생성하기 버튼을 누르면 텍스트가 나타납니다.',
      }
    : {
        title: 'Lorem Ipsum Generator',
        mode: 'Generation Mode',
        byParagraph: 'Paragraphs',
        byWords: 'Words',
        count: 'Count',
        language: 'Text Language',
        latin: 'Latin (Lorem Ipsum)',
        korean: 'Korean Dummy Text',
        generate: 'Generate',
        copy: 'Copy',
        copied: 'Copied',
        placeholder: 'Click Generate to produce text.',
      };

  const [mode, setMode] = useState<GenMode>('paragraphs');
  const [genLang, setGenLang] = useState<Lang>('latin');
  const [count, setCount] = useState(3);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const wordPool = genLang === 'ko' ? KO_WORDS : LOREM_WORDS;

  const handleGenerate = () => {
    let text = '';
    if (mode === 'paragraphs') {
      text = buildParagraphs(wordPool, count, 50).join('\n\n');
    } else {
      text = buildParagraph(wordPool, count);
    }
    setOutput(text);
    setCopied(false);
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const countOptions = mode === 'paragraphs' ? [1, 2, 3, 5, 10] : [50, 100, 200, 500];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 font-sans">
      <h1 className="text-2xl font-bold text-center text-success">{t.title}</h1>

      <div className="rounded-2xl border border-success/20 bg-white/80 p-5 space-y-5 shadow-sm">
        {/* Mode */}
        <div className="space-y-2">
          <p className="text-sm font-bold text-muted-foreground">{t.mode}</p>
          <div className="flex gap-2">
            {(['paragraphs', 'words'] as GenMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setCount(m === 'paragraphs' ? 3 : 100); }}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${mode === m ? 'bg-success text-white' : 'bg-success/10 text-success hover:bg-success/15'}`}
                aria-pressed={mode === m}
              >
                {m === 'paragraphs' ? t.byParagraph : t.byWords}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <div className="space-y-2">
          <p className="text-sm font-bold text-muted-foreground">{t.count}</p>
          <div className="flex gap-2 flex-wrap">
            {countOptions.map((n) => (
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

        {/* Language */}
        <div className="space-y-2">
          <p className="text-sm font-bold text-muted-foreground">{t.language}</p>
          <div className="flex gap-2">
            {(['latin', 'ko'] as Lang[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setGenLang(lang)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${genLang === lang ? 'bg-success text-white' : 'bg-success/10 text-success hover:bg-success/15'}`}
                aria-pressed={genLang === lang}
              >
                {lang === 'latin' ? t.latin : t.korean}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          className="w-full py-3 rounded-2xl bg-success text-white font-bold text-sm hover:bg-success active:scale-95 transition-all shadow"
        >
          {t.generate}
        </button>
      </div>

      <div className="relative rounded-2xl border border-success/20 bg-white/80 p-4 shadow-sm min-h-[160px]">
        {output ? (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{output}</p>
            <button
              type="button"
              onClick={handleCopy}
              className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-success/10 text-success text-xs font-bold hover:bg-success/15 transition-colors"
            >
              {copied ? t.copied : t.copy}
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center mt-8">{t.placeholder}</p>
        )}
      </div>
    </div>
  );
};

export default LoremIpsumGenerator;

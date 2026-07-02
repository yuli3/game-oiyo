import { useState } from 'react'

type Locale = 'ko' | 'en' | 'ja'

function lang(lp: string): Locale {
  return (['ko', 'en', 'ja'].includes(lp) ? lp : 'en') as Locale
}

const LABELS: Record<Locale, {
  title: string
  subtitle: string
  widthLabel: string
  heightLabel: string
  ratioLabel: string
  calcRatio: string
  calcDimension: string
  knownRatio: string
  knownWidth: string
  knownHeight: string
  solveWidth: string
  solveHeight: string
  result: string
  presets: string
  px: string
  copy: string
  copied: string
  simplified: string
  decimalRatio: string
  clearAll: string
  widthPlaceholder: string
  heightPlaceholder: string
  inputWidth: string
  inputHeight: string
  calcModeLabel: string
  modeRatio: string
  modeDim: string
}> = {
  ko: {
    title: '화면 비율 계산기',
    subtitle: '종횡비 계산 및 화면 크기 변환',
    widthLabel: '너비 (W)',
    heightLabel: '높이 (H)',
    ratioLabel: '종횡비',
    calcRatio: '비율 계산',
    calcDimension: '치수 계산',
    knownRatio: '알고 있는 비율',
    knownWidth: '너비를 알고 있을 때',
    knownHeight: '높이를 알고 있을 때',
    solveWidth: '너비 구하기',
    solveHeight: '높이 구하기',
    result: '결과',
    presets: '일반 비율',
    px: 'px',
    copy: '복사',
    copied: '복사됨',
    simplified: '단순화 비율',
    decimalRatio: '소수 비율',
    clearAll: '초기화',
    widthPlaceholder: '너비 입력',
    heightPlaceholder: '높이 입력',
    inputWidth: '너비를 입력하세요',
    inputHeight: '높이를 입력하세요',
    calcModeLabel: '계산 모드',
    modeRatio: '비율 구하기',
    modeDim: '치수 구하기',
  },
  en: {
    title: 'Aspect Ratio Calculator',
    subtitle: 'Calculate & Convert Aspect Ratios and Screen Sizes',
    widthLabel: 'Width (W)',
    heightLabel: 'Height (H)',
    ratioLabel: 'Aspect Ratio',
    calcRatio: 'Calculate Ratio',
    calcDimension: 'Calculate Dimension',
    knownRatio: 'Known Ratio',
    knownWidth: 'When width is known',
    knownHeight: 'When height is known',
    solveWidth: 'Find Width',
    solveHeight: 'Find Height',
    result: 'Result',
    presets: 'Common Ratios',
    px: 'px',
    copy: 'Copy',
    copied: 'Copied',
    simplified: 'Simplified Ratio',
    decimalRatio: 'Decimal Ratio',
    clearAll: 'Reset',
    widthPlaceholder: 'Enter width',
    heightPlaceholder: 'Enter height',
    inputWidth: 'Enter width value',
    inputHeight: 'Enter height value',
    calcModeLabel: 'Calculation Mode',
    modeRatio: 'Find Ratio',
    modeDim: 'Find Dimension',
  },
  ja: {
    title: '画面比率計算機',
    subtitle: 'アスペクト比の計算と画面サイズ変換',
    widthLabel: '幅 (W)',
    heightLabel: '高さ (H)',
    ratioLabel: 'アスペクト比',
    calcRatio: '比率を計算',
    calcDimension: '寸法を計算',
    knownRatio: '既知の比率',
    knownWidth: '幅がわかっている場合',
    knownHeight: '高さがわかっている場合',
    solveWidth: '幅を求める',
    solveHeight: '高さを求める',
    result: '結果',
    presets: '一般的な比率',
    px: 'px',
    copy: 'コピー',
    copied: 'コピー済',
    simplified: '簡略化比率',
    decimalRatio: '小数比率',
    clearAll: 'リセット',
    widthPlaceholder: '幅を入力',
    heightPlaceholder: '高さを入力',
    inputWidth: '幅の値を入力してください',
    inputHeight: '高さの値を入力してください',
    calcModeLabel: '計算モード',
    modeRatio: '比率を求める',
    modeDim: '寸法を求める',
  },
}

interface PresetRatio {
  label: string
  w: number
  h: number
}

const PRESETS: PresetRatio[] = [
  { label: '16:9', w: 16, h: 9 },
  { label: '4:3', w: 4, h: 3 },
  { label: '1:1', w: 1, h: 1 },
  { label: '9:16', w: 9, h: 16 },
  { label: '3:2', w: 3, h: 2 },
  { label: '2:1', w: 2, h: 1 },
  { label: '21:9', w: 21, h: 9 },
  { label: '5:4', w: 5, h: 4 },
]

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

function simplifyRatio(w: number, h: number): { w: number; h: number } {
  if (!w || !h) return { w: 0, h: 0 }
  const g = gcd(Math.round(w), Math.round(h))
  return { w: Math.round(w) / g, h: Math.round(h) / g }
}

type Mode = 'ratio' | 'dimension'
type DimSolve = 'height' | 'width'

interface Props { locale?: string }

export default function AspectRatioCalculator({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp)
  const lb = LABELS[locale]

  // Mode: find ratio or find dimension
  const [mode, setMode] = useState<Mode>('ratio')

  // Mode 1: find ratio from W x H
  const [inputW, setInputW] = useState('')
  const [inputH, setInputH] = useState('')

  // Mode 2: find dimension from ratio + one known value
  const [ratioW, setRatioW] = useState('')
  const [ratioH, setRatioH] = useState('')
  const [knownValue, setKnownValue] = useState('')
  const [dimSolve, setDimSolve] = useState<DimSolve>('height')

  const [copied, setCopied] = useState<string | null>(null)

  function copyText(key: string, value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  // Compute results for mode 1
  const w1 = parseFloat(inputW)
  const h1 = parseFloat(inputH)
  const ratioResult = (w1 > 0 && h1 > 0)
    ? simplifyRatio(w1, h1)
    : null
  const decimalResult = (w1 > 0 && h1 > 0)
    ? (w1 / h1).toFixed(4)
    : null

  // Compute results for mode 2
  const rw = parseFloat(ratioW)
  const rh = parseFloat(ratioH)
  const kv = parseFloat(knownValue)
  let dimResult: number | null = null
  if (rw > 0 && rh > 0 && kv > 0) {
    if (dimSolve === 'height') {
      dimResult = Math.round(kv * rh / rw)
    } else {
      dimResult = Math.round(kv * rw / rh)
    }
  }

  function applyPreset(preset: PresetRatio) {
    if (mode === 'ratio') {
      setInputW(String(preset.w * 100))
      setInputH(String(preset.h * 100))
    } else {
      setRatioW(String(preset.w))
      setRatioH(String(preset.h))
    }
  }

  function clearAll() {
    setInputW('')
    setInputH('')
    setRatioW('')
    setRatioH('')
    setKnownValue('')
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">{lb.title}</h1>
        <p className="text-muted-foreground text-sm">{lb.subtitle}</p>
      </div>

      {/* Mode selector */}
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <p className="text-sm font-medium">{lb.calcModeLabel}</p>
        <div className="grid grid-cols-2 gap-2">
          {(['ratio', 'dimension'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card hover:bg-accent'
              }`}
            >
              {m === 'ratio' ? lb.modeRatio : lb.modeDim}
            </button>
          ))}
        </div>
      </div>

      {/* Preset ratios */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h3 className="font-semibold text-sm">{lb.presets}</h3>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              aria-label={`${preset.label} ${lb.presets}`}
              className="rounded-lg border bg-card px-2 py-2 text-xs font-medium hover:bg-accent hover:border-primary/50 transition-colors text-center"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'ratio' ? (
        /* Mode 1: W × H → ratio */
        <div className="rounded-xl border bg-card p-4 space-y-4">
          <h3 className="font-semibold text-sm">{lb.modeRatio}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="w1" className="text-xs text-muted-foreground">{lb.widthLabel}</label>
              <div className="flex items-center gap-1">
                <input
                  id="w1"
                  type="number"
                  min={1}
                  value={inputW}
                  onChange={e => setInputW(e.target.value)}
                  placeholder={lb.widthPlaceholder}
                  aria-label={lb.inputWidth}
                  className="flex-1 rounded-lg border bg-card px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
                <span className="text-xs text-muted-foreground">{lb.px}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="h1" className="text-xs text-muted-foreground">{lb.heightLabel}</label>
              <div className="flex items-center gap-1">
                <input
                  id="h1"
                  type="number"
                  min={1}
                  value={inputH}
                  onChange={e => setInputH(e.target.value)}
                  placeholder={lb.heightPlaceholder}
                  aria-label={lb.inputHeight}
                  className="flex-1 rounded-lg border bg-card px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
                <span className="text-xs text-muted-foreground">{lb.px}</span>
              </div>
            </div>
          </div>

          {ratioResult && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-3">
              <h4 className="text-sm font-medium text-primary">{lb.result}</h4>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{lb.simplified}</p>
                  <p className="text-2xl font-bold">{ratioResult.w}:{ratioResult.h}</p>
                </div>
                <button
                  onClick={() => copyText('simplified', `${ratioResult.w}:${ratioResult.h}`)}
                  aria-label={`${lb.simplified} ${lb.copy}`}
                  className="rounded-md border px-3 py-1 text-xs hover:bg-accent transition-colors"
                >
                  {copied === 'simplified' ? lb.copied : lb.copy}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{lb.decimalRatio}</p>
                  <p className="text-lg font-bold">{decimalResult}</p>
                </div>
                <button
                  onClick={() => copyText('decimal', decimalResult ?? '')}
                  aria-label={`${lb.decimalRatio} ${lb.copy}`}
                  className="rounded-md border px-3 py-1 text-xs hover:bg-accent transition-colors"
                >
                  {copied === 'decimal' ? lb.copied : lb.copy}
                </button>
              </div>

              {/* Visual representation */}
              <div className="pt-2">
                <div
                  className="rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center"
                  style={{
                    width: '100%',
                    paddingTop: `${Math.min(70, (h1 / w1) * 100)}%`,
                    position: 'relative',
                    maxHeight: '200px',
                  }}
                  role="img"
                  aria-label={`${ratioResult.w}:${ratioResult.h} visual`}
                >
                  <span
                    className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary"
                  >
                    {ratioResult.w}:{ratioResult.h}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Mode 2: ratio + one dimension → other dimension */
        <div className="rounded-xl border bg-card p-4 space-y-4">
          <h3 className="font-semibold text-sm">{lb.modeDim}</h3>

          {/* Ratio input */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{lb.knownRatio}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={ratioW}
                onChange={e => setRatioW(e.target.value)}
                placeholder="W"
                aria-label="Ratio width"
                className="w-20 rounded-lg border bg-card px-3 py-2 text-sm text-center focus:outline-none focus:border-primary"
              />
              <span className="text-muted-foreground font-bold">:</span>
              <input
                type="number"
                min={1}
                value={ratioH}
                onChange={e => setRatioH(e.target.value)}
                placeholder="H"
                aria-label="Ratio height"
                className="w-20 rounded-lg border bg-card px-3 py-2 text-sm text-center focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Solve mode */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{lb.calcDimension}</label>
            <div className="grid grid-cols-2 gap-2">
              {(['height', 'width'] as DimSolve[]).map(ds => (
                <button
                  key={ds}
                  onClick={() => setDimSolve(ds)}
                  aria-pressed={dimSolve === ds}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    dimSolve === ds
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card hover:bg-accent'
                  }`}
                >
                  {ds === 'height' ? lb.solveHeight : lb.solveWidth}
                </button>
              ))}
            </div>
          </div>

          {/* Known value */}
          <div className="space-y-1">
            <label htmlFor="knownVal" className="text-xs text-muted-foreground">
              {dimSolve === 'height' ? lb.knownWidth : lb.knownHeight}
            </label>
            <div className="flex items-center gap-1">
              <input
                id="knownVal"
                type="number"
                min={1}
                value={knownValue}
                onChange={e => setKnownValue(e.target.value)}
                placeholder={dimSolve === 'height' ? lb.widthPlaceholder : lb.heightPlaceholder}
                aria-label={dimSolve === 'height' ? lb.inputWidth : lb.inputHeight}
                className="flex-1 rounded-lg border bg-card px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
              <span className="text-xs text-muted-foreground">{lb.px}</span>
            </div>
          </div>

          {dimResult !== null && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2">
              <h4 className="text-sm font-medium text-primary">{lb.result}</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {dimSolve === 'height' ? lb.heightLabel : lb.widthLabel}
                  </p>
                  <p className="text-2xl font-bold">
                    {dimResult} <span className="text-sm font-normal text-muted-foreground">{lb.px}</span>
                  </p>
                  {dimSolve === 'height' ? (
                    <p className="text-xs text-muted-foreground">{inputW || knownValue} × {dimResult}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">{dimResult} × {inputH || knownValue}</p>
                  )}
                </div>
                <button
                  onClick={() => copyText('dim', String(dimResult))}
                  aria-label={`${lb.result} ${lb.copy}`}
                  className="rounded-md border px-3 py-1 text-xs hover:bg-accent transition-colors"
                >
                  {copied === 'dim' ? lb.copied : lb.copy}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reset */}
      <button
        onClick={clearAll}
        className="w-full rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
      >
        {lb.clearAll}
      </button>
    </div>
  )
}

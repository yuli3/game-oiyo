import { useState, useCallback } from 'react'

type Locale = 'ko' | 'en' | 'ja'

function lang(lp: string): Locale {
  return (['ko', 'en', 'ja'].includes(lp) ? lp : 'en') as Locale
}

const LABELS: Record<Locale, {
  title: string
  subtitle: string
  hex: string
  rgb: string
  hsl: string
  complementary: string
  analogous: string
  copy: string
  copied: string
  inputPlaceholder: string
  preview: string
  randomize: string
  colorName: string
}> = {
  ko: {
    title: '색상 선택기',
    subtitle: 'HEX·RGB·HSL 색상 코드 변환기',
    hex: 'HEX 코드',
    rgb: 'RGB 값',
    hsl: 'HSL 값',
    complementary: '보색',
    analogous: '유사색',
    copy: '복사',
    copied: '복사됨',
    inputPlaceholder: 'HEX 입력 (예: #3b82f6)',
    preview: '색상 미리보기',
    randomize: '무작위 색상',
    colorName: '색상',
  },
  en: {
    title: 'Color Picker',
    subtitle: 'HEX · RGB · HSL Color Code Converter',
    hex: 'HEX Code',
    rgb: 'RGB Values',
    hsl: 'HSL Values',
    complementary: 'Complementary',
    analogous: 'Analogous',
    copy: 'Copy',
    copied: 'Copied',
    inputPlaceholder: 'Enter HEX (e.g. #3b82f6)',
    preview: 'Color Preview',
    randomize: 'Random Color',
    colorName: 'Color',
  },
  ja: {
    title: 'カラーピッカー',
    subtitle: 'HEX・RGB・HSL カラーコード変換器',
    hex: 'HEXコード',
    rgb: 'RGB値',
    hsl: 'HSL値',
    complementary: '補色',
    analogous: '類似色',
    copy: 'コピー',
    copied: 'コピー済',
    inputPlaceholder: 'HEXを入力 (例: #3b82f6)',
    preview: 'カラープレビュー',
    randomize: 'ランダムカラー',
    colorName: 'カラー',
  },
}

// Color conversion utilities
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '')
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) return null
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  }
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break
      case gn: h = ((bn - rn) / d + 2) / 6; break
      case bn: h = ((rn - gn) / d + 4) / 6; break
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100, ln = l / 100
  const a = sn * Math.min(ln, 1 - ln)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function getComplementary(h: number, s: number, l: number): string {
  return hslToHex((h + 180) % 360, s, l)
}

function getAnalogous(h: number, s: number, l: number): string[] {
  return [
    hslToHex((h + 30) % 360, s, l),
    hslToHex((h + 60) % 360, s, l),
    hslToHex((h - 30 + 360) % 360, s, l),
    hslToHex((h - 60 + 360) % 360, s, l),
  ]
}

function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#000000'
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

function randomHex(): string {
  return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')
}

interface Props { locale?: string }

export default function ColorPickerTool({ locale: lp = 'ko' }: Props) {
  const locale = lang(lp)
  const lb = LABELS[locale]

  const [hex, setHex] = useState('#3b82f6')
  const [hexInput, setHexInput] = useState('#3b82f6')
  const [pickerHex, setPickerHex] = useState('#3b82f6')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const rgb = hexToRgb(hex)
  const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null
  const complementary = hsl ? getComplementary(hsl.h, hsl.s, hsl.l) : null
  const analogous = hsl ? getAnalogous(hsl.h, hsl.s, hsl.l) : []
  const contrastColor = getContrastColor(hex)

  function applyHex(value: string) {
    const clean = value.startsWith('#') ? value : `#${value}`
    if (hexToRgb(clean)) {
      setHex(clean)
      setHexInput(clean)
      setPickerHex(clean)
    }
  }

  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setPickerHex(val)
    setHex(val)
    setHexInput(val)
  }

  function handleHexInput(e: React.ChangeEvent<HTMLInputElement>) {
    setHexInput(e.target.value)
  }

  function handleHexBlur() {
    applyHex(hexInput)
  }

  function handleHexKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') applyHex(hexInput)
  }

  function handleRgbChange(channel: 'r' | 'g' | 'b', value: string) {
    if (!rgb) return
    const num = Math.min(255, Math.max(0, parseInt(value) || 0))
    const newRgb = { ...rgb, [channel]: num }
    const newHex = '#' +
      newRgb.r.toString(16).padStart(2, '0') +
      newRgb.g.toString(16).padStart(2, '0') +
      newRgb.b.toString(16).padStart(2, '0')
    setHex(newHex)
    setHexInput(newHex)
    setPickerHex(newHex)
  }

  function handleHslChange(channel: 'h' | 's' | 'l', value: string) {
    if (!hsl) return
    const max = channel === 'h' ? 360 : 100
    const num = Math.min(max, Math.max(0, parseInt(value) || 0))
    const newHsl = { ...hsl, [channel]: num }
    const newHex = hslToHex(newHsl.h, newHsl.s, newHsl.l)
    setHex(newHex)
    setHexInput(newHex)
    setPickerHex(newHex)
  }

  const copyValue = useCallback((key: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1500)
    })
  }, [])

  function handleRandomize() {
    const rh = randomHex()
    setHex(rh)
    setHexInput(rh)
    setPickerHex(rh)
  }

  const hexStr = hex.toUpperCase()
  const rgbStr = rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : ''
  const hslStr = hsl ? `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` : ''

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">{lb.title}</h1>
        <p className="text-muted-foreground text-sm">{lb.subtitle}</p>
      </div>

      {/* Color Picker + Preview */}
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <div
          className="rounded-xl h-32 flex items-center justify-center transition-colors duration-200"
          style={{ backgroundColor: hex }}
          role="img"
          aria-label={`${lb.preview}: ${hexStr}`}
        >
          <span
            className="text-2xl font-bold tracking-wider"
            style={{ color: contrastColor }}
          >
            {hexStr}
          </span>
        </div>

        <div className="flex gap-3 items-center">
          <input
            type="color"
            value={pickerHex}
            onChange={handlePickerChange}
            aria-label={lb.colorName}
            className="w-14 h-10 rounded-lg border cursor-pointer bg-transparent p-0.5"
            style={{ minWidth: '3.5rem' }}
          />
          <input
            type="text"
            value={hexInput}
            onChange={handleHexInput}
            onBlur={handleHexBlur}
            onKeyDown={handleHexKey}
            placeholder={lb.inputPlaceholder}
            aria-label={lb.hex}
            maxLength={7}
            className="flex-1 rounded-lg border bg-card px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleRandomize}
            aria-label={lb.randomize}
            className="rounded-lg border bg-card px-3 py-2 text-sm hover:bg-accent transition-colors whitespace-nowrap"
          >
            {lb.randomize}
          </button>
        </div>
      </div>

      {/* HEX */}
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{lb.hex}</h3>
          <button
            onClick={() => copyValue('hex', hexStr)}
            aria-label={`${lb.hex} ${lb.copy}`}
            className="rounded-md border px-3 py-1 text-xs hover:bg-accent transition-colors"
          >
            {copiedKey === 'hex' ? lb.copied : lb.copy}
          </button>
        </div>
        <p className="font-mono text-lg font-bold">{hexStr}</p>
      </div>

      {/* RGB */}
      {rgb && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{lb.rgb}</h3>
            <button
              onClick={() => copyValue('rgb', rgbStr)}
              aria-label={`${lb.rgb} ${lb.copy}`}
              className="rounded-md border px-3 py-1 text-xs hover:bg-accent transition-colors"
            >
              {copiedKey === 'rgb' ? lb.copied : lb.copy}
            </button>
          </div>
          <p className="font-mono text-sm text-muted-foreground">{rgbStr}</p>
          <div className="space-y-2">
            {(['r', 'g', 'b'] as const).map(ch => {
              const colors = { r: '#ef4444', g: '#22c55e', b: '#3b82f6' }
              return (
                <div key={ch} className="flex items-center gap-3">
                  <span
                    className="w-6 text-xs font-bold uppercase text-center"
                    style={{ color: colors[ch] }}
                  >
                    {ch}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={255}
                    value={rgb[ch]}
                    onChange={e => handleRgbChange(ch, e.target.value)}
                    aria-label={`RGB ${ch.toUpperCase()} (${rgb[ch]})`}
                    className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: colors[ch] }}
                  />
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={rgb[ch]}
                    onChange={e => handleRgbChange(ch, e.target.value)}
                    aria-label={`${ch.toUpperCase()} value`}
                    className="w-14 rounded-md border bg-card px-2 py-1 text-xs font-mono text-center focus:outline-none focus:border-primary"
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* HSL */}
      {hsl && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{lb.hsl}</h3>
            <button
              onClick={() => copyValue('hsl', hslStr)}
              aria-label={`${lb.hsl} ${lb.copy}`}
              className="rounded-md border px-3 py-1 text-xs hover:bg-accent transition-colors"
            >
              {copiedKey === 'hsl' ? lb.copied : lb.copy}
            </button>
          </div>
          <p className="font-mono text-sm text-muted-foreground">{hslStr}</p>
          <div className="space-y-2">
            {([
              { ch: 'h' as const, max: 360, label: 'H', color: '#8b5cf6' },
              { ch: 's' as const, max: 100, label: 'S', color: '#ec4899' },
              { ch: 'l' as const, max: 100, label: 'L', color: '#f59e0b' },
            ]).map(({ ch, max, label, color }) => (
              <div key={ch} className="flex items-center gap-3">
                <span className="w-6 text-xs font-bold text-center" style={{ color }}>{label}</span>
                <input
                  type="range"
                  min={0}
                  max={max}
                  value={hsl[ch]}
                  onChange={e => handleHslChange(ch, e.target.value)}
                  aria-label={`HSL ${label} (${hsl[ch]})`}
                  className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: color }}
                />
                <input
                  type="number"
                  min={0}
                  max={max}
                  value={hsl[ch]}
                  onChange={e => handleHslChange(ch, e.target.value)}
                  aria-label={`${label} value`}
                  className="w-14 rounded-md border bg-card px-2 py-1 text-xs font-mono text-center focus:outline-none focus:border-primary"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complementary */}
      {complementary && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="font-semibold text-sm">{lb.complementary}</h3>
          <div className="flex gap-3">
            {[hex, complementary].map((c, i) => (
              <button
                key={i}
                onClick={() => {
                  applyHex(c)
                  copyValue(`comp-${i}`, c.toUpperCase())
                }}
                aria-label={`${c.toUpperCase()} ${lb.copy}`}
                className="flex-1 rounded-xl h-14 flex items-end justify-start p-2 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ backgroundColor: c }}
              >
                <span
                  className="text-xs font-mono font-bold"
                  style={{ color: getContrastColor(c) }}
                >
                  {c.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Analogous */}
      {analogous.length > 0 && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="font-semibold text-sm">{lb.analogous}</h3>
          <div className="grid grid-cols-4 gap-2">
            {analogous.map((c, i) => (
              <button
                key={i}
                onClick={() => {
                  applyHex(c)
                  copyValue(`analog-${i}`, c.toUpperCase())
                }}
                aria-label={`${c.toUpperCase()} ${lb.copy}`}
                className="rounded-xl h-14 flex items-end justify-start p-1.5 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ backgroundColor: c }}
              >
                <span
                  className="text-xs font-mono"
                  style={{ color: getContrastColor(c), fontSize: '10px' }}
                >
                  {c.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

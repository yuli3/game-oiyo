import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import {
  createHitori,
  explainHitoriHint,
  hintHitori,
  parseHitori,
  serializeHitori,
  toggleHitori,
  undoHitori,
  type HitoriHint,
  type HitoriState,
} from '../../lib/games/hitori';
import { validateHitori } from '../../lib/games/logic-puzzles';
import { LOGIC_CELL_SPRITES, HITORI_UI_SPRITES } from '../../lib/games/sprites';
import { Camera, Check, Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';
import { celebrate } from '../../lib/games/celebration';
import { copyShareCardToClipboard, createShareCardCanvas, downloadShareCard } from '../../lib/games/share-card';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import { useCardTiltPro, MobileHapticsPro } from '../../lib/games/engine-suite-unified';

const SAVE = 'oiyo:hitori:v1';
const COPY = {
  ko: { title: '히토리', sub: '고요한 논리 정원', desc: '중복 숫자를 가리고, 흰 칸의 연결을 지키세요.', newGame: '새 퍼즐', undo: '되돌리기', hint: '힌트', sound: '소리', pause: '일시정지', resume: '계속하기', moves: '수', shaded: '검은 칸', win: '정원이 완성되었어요', next: '다음 퍼즐', restored: '이어서 플레이할 준비가 됐어요', duplicate: '중복', adjacent: '검은 칸 인접', connected: '흰 칸 연결', progress: '정원 완성도' },
  en: { title: 'Hitori', sub: 'A quiet logic garden', desc: 'Shade duplicates while keeping every white cell connected.', newGame: 'New puzzle', undo: 'Undo', hint: 'Hint', sound: 'Sound', pause: 'Pause', resume: 'Resume', moves: 'Moves', shaded: 'Shaded', win: 'The garden is complete', next: 'Next puzzle', restored: 'Your puzzle is ready to continue', duplicate: 'Unique lines', adjacent: 'Black spacing', connected: 'White network', progress: 'Garden Purity' },
  ja: { title: 'ひとりにしてくれ', sub: '静かな論理の庭', desc: '重複を黒くして、白マスをつなげましょう。', newGame: '新しい問題', undo: '戻す', hint: 'ヒント', sound: 'サウンド', pause: '一時停止', resume: '続ける', moves: '手数', shaded: '黒マス', win: '庭が完成しました', next: '次の問題', restored: '続きから遊べます', duplicate: '重複なし', adjacent: '黒の間隔', connected: '白の接続', progress: '庭の完成度' },
  zh: { title: '数壹', sub: '静谧逻辑花园', desc: '涂掉重复数字，并保持所有白格相连。', newGame: '新谜题', undo: '撤销', hint: '提示', sound: '声音', pause: '暂停', resume: '继续', moves: '步数', shaded: '黑格', win: '花园完成了', next: '下一题', restored: '可以继续上次谜题', duplicate: '行列唯一', adjacent: '黑格间距', connected: '白格连通', progress: '花园完成度' },
  fr: { title: 'Hitori', sub: 'Un jardin de logique', desc: 'Noircissez les doublons en gardant les cases blanches reliées.', newGame: 'Nouvelle grille', undo: 'Annuler', hint: 'Indice', sound: 'Son', pause: 'Pause', resume: 'Reprendre', moves: 'Coups', shaded: 'Noires', win: 'Le jardin est terminé', next: 'Grille suivante', restored: 'Votre partie est prête', duplicate: 'Lignes uniques', adjacent: 'Espacement noir', connected: 'Réseau blanc', progress: 'Harmonie du jardin' },
  es: { title: 'Hitori', sub: 'Un jardín lógico', desc: 'Sombrea duplicados y mantén conectadas todas las casillas blancas.', newGame: 'Nuevo puzle', undo: 'Deshacer', hint: 'Pista', sound: 'Sonido', pause: 'Pausa', resume: 'Continuar', moves: 'Movimientos', shaded: 'Negras', win: 'El jardín está completo', next: 'Siguiente puzle', restored: 'Tu partida está lista', duplicate: 'Líneas únicas', adjacent: 'Separación negra', connected: 'Red blanca', progress: 'Armonía del jardín' }
};

const HINT_COPY: Record<keyof typeof COPY, Record<HitoriHint['reason'], string>> = {
  ko: { duplicate: '같은 행·열의 중복 숫자 두 칸을 비교하세요.', adjacent: '붙어 있는 검은 칸을 다시 확인하세요.', connected: '흰 칸이 하나의 길로 이어지는지 확인하세요.' },
  en: { duplicate: 'Compare the two duplicate numbers in this row or column.', adjacent: 'Recheck the touching black cells.', connected: 'Check whether every white cell still shares one path.' },
  ja: { duplicate: '同じ行・列の重複する2マスを比べましょう。', adjacent: '隣り合う黒マスを見直しましょう。', connected: '白マスが1本の道でつながるか確認しましょう。'},
  zh: { duplicate: '比较同一行或列中的两个重复数字。', adjacent: '重新检查相邻的黑格。', connected: '检查所有白格是否仍连成一片。'},
  fr: { duplicate: 'Comparez les deux nombres répétés de cette ligne ou colonne.', adjacent: 'Revérifiez les cases noires voisines.', connected: 'Vérifiez que toutes les blanches restent reliées.' },
  es: { duplicate: 'Compara los dos números repetidos de esta fila o columna.', adjacent: 'Revisa las casillas negras contiguas.', connected: 'Comprueba que todas las blancas sigan conectadas.' }
};

function TiltHitoriButton({
  children,
  onClick,
  className = '',
  disabled = false,
  title,
  ariaLabel,
  ariaPressed,
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
  ariaPressed?: boolean;
  type?: 'button' | 'submit';
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();

  return (
    <button
      type={type}
      onClick={() => {
        triggerPop(0.2);
        onClick?.();
      }}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{ '--hitori-tilt': transformCss } as React.CSSProperties}
      className={`touch-manipulation will-change-transform transform-(--hitori-tilt) transition-transform duration-100 active:scale-95 disabled:pointer-events-none disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export default function Hitori({ locale = 'ko' }: { locale?: string }) {
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const hintCopy = HINT_COPY[locale as keyof typeof COPY] ?? HINT_COPY.en;
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: (locale as any) || 'ko' });
  const [state, setState] = useState<HitoriState>(() => createHitori());
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('hitori_sound_muted') !== 'true';
      }
    } catch {}
    return true;
  });

  const toggleSound = useCallback(() => {
    setSound((s) => {
      const next = !s;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('hitori_sound_muted', String(!next));
        }
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        MobileHapticsPro.light();
        togglePortal();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        MobileHapticsPro.light();
        toggleSound();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePortal, toggleSound]);

  const [restored, setRestored] = useState(false);
  const [active, setActive] = useState(0);
  const [hint, setHint] = useState<HitoriHint | null>(null);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'downloaded'>('idle');

  useEffect(() => {
    const saved = parseHitori(localStorage.getItem(SAVE));
    if (saved) {
      setState(saved);
      setRestored(true);
      setPaused(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SAVE, serializeHitori(state));
  }, [state]);

  const tone = useCallback((win = false) => {
    if (!sound) return;
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return;
    const a = new A();
    const o = a.createOscillator();
    const g = a.createGain();
    o.frequency.value = win ? 720 : 330;
    g.gain.setValueAtTime(0.035, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.12);
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + 0.12);
  }, [sound]);

  const act = (fn: (s: HitoriState) => HitoriState) => {
    if (paused) return;
    setState((s) => {
      const n = fn(s);
      if (n !== s) {
        tone(n.won);
        if (n.won) {
          MobileHapticsPro.success();
          celebrate(containerRef.current, { preset: 'shards' });
        }
      }
      return n;
    });
  };

  const fresh = () => {
    MobileHapticsPro.medium();
    setState(createHitori(state.seed + 1));
    setPaused(false);
    setRestored(false);
    setHint(null);
  };

  const v = validateHitori(state.values, state.dark);
  const shaded = state.dark.flat().filter(Boolean).length;
  const passedRules = [v.duplicateFree, v.noAdjacentBlack, v.whiteConnected].filter(Boolean).length;
  const rulesPct = Math.round((passedRules / 3) * 100);

  const hasAdjBlack = (r: number, c: number) => {
    if (!state.dark[r][c]) return false;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    return dirs.some(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      return nr >= 0 && nr < 5 && nc >= 0 && nc < 5 && state.dark[nr][nc];
    });
  };

  const move = (e: React.KeyboardEvent, index: number) => {
    const r = Math.floor(index / 5);
    const c = index % 5;
    let n = index;
    if (e.key === 'ArrowUp') n = Math.max(0, r - 1) * 5 + c;
    else if (e.key === 'ArrowDown') n = Math.min(4, r + 1) * 5 + c;
    else if (e.key === 'ArrowLeft') n = r * 5 + Math.max(0, c - 1);
    else if (e.key === 'ArrowRight') n = r * 5 + Math.min(4, c + 1);
    else return;
    e.preventDefault();
    MobileHapticsPro.light();
    setActive(n);
    refs.current[n]?.focus();
  };

  return (
    <div
      ref={containerRef}
      data-game-surface
      className={
        isImmersive
          ? 'fixed inset-0 z-50 w-screen h-dvh bg-background p-3 sm:p-5 overflow-y-auto flex flex-col items-center justify-between m-0 select-none'
          : 'relative'
      }
    >
      <GameContainer title={t.title} subtitle={t.sub} resetLabel={t.newGame} onReset={fresh}>
        <div className="mx-auto max-w-md space-y-5">
          <p className="text-center text-sm text-muted-foreground">{t.desc}</p>
          
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2" aria-label="game stats">
            <Stat label={t.moves} value={state.moves} />
            <Stat label={t.shaded} value={shaded} />
            <Stat label="Seed" value={state.seed + 1} />
          </div>

          {/* Progress Bar */}
          <div className="space-y-1 rounded-2xl border border-border/60 bg-muted/20 p-3">
            <div className="flex justify-between text-xs text-muted-foreground font-semibold">
              <span>{t.progress}</span>
              <span className="font-mono text-primary font-bold">{passedRules} / 3 ({rulesPct}%)</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300 w-(--rules-pct)"
                style={{ '--rules-pct': `${rulesPct}%` } as React.CSSProperties}
              />
            </div>
          </div>

          {restored && (
            <p className="rounded-xl bg-primary/10 p-3 text-center text-xs font-bold text-primary" role="status">
              {t.restored}
            </p>
          )}

          {/* Puzzle Grid */}
          <div className="relative rounded-3xl border border-border bg-muted/30 p-3 shadow-inner">
            <div className="grid grid-cols-5 gap-1.5" role="grid" aria-label={t.title}>
              {state.values.flatMap((row, r) =>
                row.map((value, c) => {
                  const i = r * 5 + c;
                  const isAdjError = hasAdjBlack(r, c);
                  return (
                    <button
                      key={i}
                      ref={(n) => {
                        refs.current[i] = n;
                      }}
                      role="gridcell"
                      aria-pressed={state.dark[r][c]}
                      aria-label={`${r + 1}, ${c + 1}: ${value}`}
                      tabIndex={active === i ? 0 : -1}
                      disabled={paused || state.won}
                      onFocus={() => setActive(i)}
                      onKeyDown={(e) => move(e, i)}
                      onClick={() => {
                        if (isAdjError) {
                          MobileHapticsPro.warning();
                        } else {
                          MobileHapticsPro.selection();
                        }
                        act((s) => toggleHitori(s, i));
                      }}
                      className={`relative overflow-hidden aspect-square min-h-12 rounded-xl border text-lg font-black transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-primary ${
                        state.dark[r][c] ? 'text-primary-foreground border-foreground/30 shadow-sm' : 'bg-card hover:bg-primary/10 border-border text-foreground'
                      } ${hint?.cells.includes(i) ? 'ring-4 ring-warning' : ''} ${
                        isAdjError ? 'ring-2 ring-destructive animate-pulse' : ''
                      }`}
                    >
                      {state.dark[r][c] ? (
                        <img
                          src={LOGIC_CELL_SPRITES.black}
                          alt=""
                          draggable={false}
                          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                        />
                      ) : null}
                      <span className="relative z-1">{value}</span>
                    </button>
                  );
                })
              )}
            </div>
            {paused && (
              <button
                type="button"
                onClick={() => {
                  MobileHapticsPro.light();
                  setPaused(false);
                }}
                className="absolute inset-3 rounded-2xl bg-background/95 text-lg font-black backdrop-blur transition-transform active:scale-95"
              >
                {t.resume}
              </button>
            )}
          </div>

          {/* Validation Rules */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <Rule ok={v.duplicateFree} text={t.duplicate} />
            <Rule ok={v.noAdjacentBlack} text={t.adjacent} />
            <Rule ok={v.whiteConnected} text={t.connected} />
          </div>

          {hint && (
            <p className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-center text-xs font-bold text-foreground" role="status">
              {hintCopy[hint.reason]}
              {hint.cells.length ? ` · ${hint.cells.map((i) => `${Math.floor(i / 5) + 1},${(i % 5) + 1}`).join(' / ')}` : ''}
            </p>
          )}

          {/* Controls */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <TiltHitoriButton
              onClick={() => {
                MobileHapticsPro.light();
                act(undoHitori);
              }}
              disabled={!state.history.length || state.won}
              className="flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-2 text-xs font-bold text-foreground hover:bg-muted"
            >
              {t.undo}
            </TiltHitoriButton>

            <TiltHitoriButton
              onClick={() => {
                MobileHapticsPro.light();
                const next = explainHitoriHint(state);
                setHint(next);
                act(hintHitori);
              }}
              disabled={state.won}
              className="flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-2 text-xs font-bold text-foreground hover:bg-muted"
            >
              {t.hint}
            </TiltHitoriButton>

            <TiltHitoriButton
              onClick={() => {
                MobileHapticsPro.light();
                toggleSound();
              }}
              ariaPressed={sound}
              ariaLabel={sound ? portalLabels.mute : portalLabels.unmute}
              title={`${sound ? portalLabels.mute : portalLabels.unmute} (M)`}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 text-xs font-bold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              <span>{t.sound}</span>
            </TiltHitoriButton>

            <TiltHitoriButton
              onClick={() => {
                MobileHapticsPro.light();
                togglePortal();
              }}
              ariaPressed={isImmersive}
              ariaLabel={isImmersive ? portalLabels.exit : portalLabels.enter}
              title={`${isImmersive ? portalLabels.exit : portalLabels.enter} (F)`}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 text-xs font-bold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              <span>{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
            </TiltHitoriButton>

            <TiltHitoriButton
              onClick={() => {
                MobileHapticsPro.light();
                setPaused((x) => !x);
              }}
              className="flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-2 text-xs font-bold text-foreground hover:bg-muted"
            >
              {paused ? t.resume : t.pause}
            </TiltHitoriButton>
          </div>

          {/* Victory Modal */}
          {state.won && (
            <div className="rounded-3xl border border-primary/30 bg-primary/10 p-6 text-center animate-in fade-in zoom-in-95" role="status" aria-live="polite">
              <div className="flex justify-center mb-2">
                <img src={HITORI_UI_SPRITES.trophy} alt="Victory Trophy" className="size-16 object-contain animate-bounce drop-shadow" />
              </div>
              <h3 className="mt-2 text-xl font-black text-foreground">{t.win}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {state.moves} {t.moves} · {state.hints} {t.hint}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <TiltHitoriButton
                  onClick={fresh}
                  className="min-h-11 rounded-full bg-primary px-8 font-bold text-primary-foreground hover:bg-primary/90 shadow-md"
                >
                  {t.next}
                </TiltHitoriButton>
                <TiltHitoriButton
                  onClick={async () => {
                    MobileHapticsPro.light();
                    const canvas = createShareCardCanvas({
                      title: 'OIYO Hitori',
                      slug: 'hitori',
                      score: state.moves,
                      customStats: [
                        { label: 'Shaded', value: String(shaded) },
                        { label: 'Hints', value: String(state.hints) },
                      ],
                    });
                    const ok = await copyShareCardToClipboard(canvas);
                    if (ok) {
                      setShareStatus('copied');
                      setTimeout(() => setShareStatus('idle'), 2000);
                    } else {
                      downloadShareCard(canvas, 'hitori.png');
                      setShareStatus('downloaded');
                      setTimeout(() => setShareStatus('idle'), 2000);
                    }
                  }}
                  className="min-h-11 rounded-full border border-border bg-card px-5 font-bold inline-flex items-center gap-1.5 hover:bg-muted text-foreground"
                >
                  {shareStatus === 'copied' ? (
                    <>
                      <Check className="size-4 text-primary" />
                      <span>복사됨!</span>
                    </>
                  ) : (
                    <>
                      <Camera className="size-4" />
                      <span>성과 카드</span>
                    </>
                  )}
                </TiltHitoriButton>
              </div>
            </div>
          )}
        </div>
      </GameContainer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-2 text-center shadow-xs">
      <div className="text-xl font-black text-foreground">{value}</div>
      <div className="text-xs uppercase text-muted-foreground font-semibold">{label}</div>
    </div>
  );
}

function Rule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className={`rounded-xl p-2 font-bold transition-colors ${ok ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground border border-border'}`}>
      {ok ? '✓' : '•'} {text}
    </div>
  );
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

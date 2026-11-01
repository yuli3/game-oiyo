"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { evaluateAkari } from '../../lib/games/logic-puzzles';
import { createLightUp, explainLightUpHint, hintLightUp, LIGHT_UP_SPEC, parseLightUp, serializeLightUp, toggleLightUp, undoLightUp, type LightUpHint, type LightUpState } from '../../lib/games/light-up';
import { LIGHT_UP_SPRITES } from '../../lib/games/sprites';
import { usePrefersReducedMotion } from '../../lib/games/reduced-motion';
import { Maximize2, Minimize2, Volume2, VolumeX, Share2, Check } from 'lucide-react';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import { celebrate } from '../../lib/games/celebration';
import { createShareCardCanvas, copyShareCardToClipboard, downloadShareCard } from '../../lib/games/share-card';
import { useCardTiltPro, MobileHapticsPro } from '../../lib/games/engine-suite-unified';

function TiltLightUpButton({
  children,
  onClick,
  className = '',
  disabled = false,
  title,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();

  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel || title}
      onClick={() => {
        triggerPop(0.12);
        onClick?.();
      }}
      disabled={disabled}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`transition-all duration-150 transform-(--card-tilt) will-change-transform ${className}`}
      style={{ '--card-tilt': transformCss } as React.CSSProperties}
    >
      {children}
    </button>
  );
}

const SAVE = 'oiyo:light-up:v1';
const COPY = {
 ko: { title: '라이트 업', sub: '빛의 논리 극장', desc: '모든 방을 밝히되 전구끼리 마주 보지 않게 배치하세요.', newGame: '새 무대', undo: '되돌리기', hint: '빛 힌트', sound: '소리', pause: '일시정지', resume: '계속하기', moves: '수', bulbs: '전구', dark: '어두운 칸', win: '모든 조명이 켜졌어요', next: '다음 무대', restored: '저장된 무대를 불러왔어요' },
 en: { title: 'Light Up', sub: 'The theatre of illumination', desc: 'Light every room without letting two bulbs see each other.', newGame: 'New stage', undo: 'Undo', hint: 'Light hint', sound: 'Sound', pause: 'Pause', resume: 'Resume', moves: 'Moves', bulbs: 'Bulbs', dark: 'Dark cells', win: 'Every light is on', next: 'Next stage', restored: 'Your saved stage is ready' },
 ja: { title: '美術館', sub: '光の論理劇場', desc: '電球同士を向かい合わせず、すべての部屋を照らします。', newGame: '新しい舞台', undo: '戻す', hint: '光のヒント', sound: 'サウンド', pause: '一時停止', resume: '続ける', moves: '手数', bulbs: '電球', dark: '暗いマス', win: 'すべての光が灯りました', next: '次の舞台', restored: '保存した舞台を復元しました' },
 zh: { title: '点灯', sub: '光之逻辑剧场', desc: '点亮所有房间，同时避免灯泡互相照射。', newGame: '新舞台', undo: '撤销', hint: '光提示', sound: '声音', pause: '暂停', resume: '继续', moves: '步数', bulbs: '灯泡', dark: '暗格', win: '所有灯光都亮了', next: '下一舞台', restored: '已恢复保存的舞台' },
 fr: { title: 'Light Up', sub: "Le théâtre de lumière", desc: 'Éclairez chaque pièce sans que deux ampoules se voient.', newGame: 'Nouvelle scène', undo: 'Annuler', hint: 'Indice', sound: 'Son', pause: 'Pause', resume: 'Reprendre', moves: 'Coups', bulbs: 'Ampoules', dark: 'Cases sombres', win: 'Toutes les lumières brillent', next: 'Scène suivante', restored: 'Votre scène a été restaurée' },
 es: { title: 'Light Up', sub: 'El teatro de la luz', desc: 'Ilumina cada sala sin que dos bombillas se vean.', newGame: 'Nuevo escenario', undo: 'Deshacer', hint: 'Pista de luz', sound: 'Sonido', pause: 'Pausa', resume: 'Continuar', moves: 'Movimientos', bulbs: 'Bombillas', dark: 'Casillas oscuras', win: 'Todas las luces están encendidas', next: 'Siguiente escenario', restored: 'Tu escenario fue restaurado' }
};

const HINT: Record<keyof typeof COPY, Record<LightUpHint['reason'], string>> = {
  ko: { clue: '벽 숫자 주변의 전구 수를 확인하세요.', conflict: '서로 마주 보는 전구를 확인하세요.', dark: '아직 빛이 닿지 않는 칸을 확인하세요.' },
  en: { clue: 'Check the bulbs around this numbered wall.', conflict: 'Check the bulbs that can see each other.', dark: 'Check this cell that no light reaches yet.' },
  ja: { clue: '数字壁の周りの電球数を確認。', conflict: '向かい合う電球を確認。', dark: 'まだ光が届かないマスを確認。' },
  zh: { clue: '检查数字墙周围的灯泡数。', conflict: '检查互相照射的灯泡。', dark: '检查尚未被照亮的格子。' },
  fr: { clue: 'Vérifiez les ampoules autour du mur numéroté.', conflict: 'Vérifiez les ampoules qui se voient.', dark: 'Vérifiez cette case encore sombre.' },
  es: { clue: 'Revisa las bombillas junto al muro numerado.', conflict: 'Revisa las bombillas que se ven entre sí.', dark: 'Revisa esta casilla aún oscura.' }
};

export default function LightUp({ locale = 'ko' }: { locale?: string }) {
 const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
 const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: (locale as any) || 'ko' });
 const [state, setState] = useState<LightUpState>(() => createLightUp());
 const [paused, setPaused] = useState(false);
 const [sound, setSound] = useState<boolean>(() => {
   try {
     if (typeof window !== 'undefined' && window.localStorage) {
       return window.localStorage.getItem('light_up_sound_muted') !== 'true';
     }
   } catch {}
   return true;
 });

 const toggleSound = useCallback(() => {
   setSound((s) => {
     const next = !s;
     try {
       if (typeof window !== 'undefined' && window.localStorage) {
         window.localStorage.setItem('light_up_sound_muted', String(!next));
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
       togglePortal();
     } else if (e.key === 'm' || e.key === 'M') {
       e.preventDefault();
       toggleSound();
     }
   };
   window.addEventListener('keydown', handleKeyDown);
   return () => window.removeEventListener('keydown', handleKeyDown);
 }, [togglePortal, toggleSound]);

 const [restored, setRestored] = useState(false);
 const [active, setActive] = useState(0);
 const [hint, setHint] = useState<LightUpHint | null>(null);
 const [freshBulb, setFreshBulb] = useState<number | null>(null);
 const [shareCardCopied, setShareCardCopied] = useState(false);
 const reducedMotion = usePrefersReducedMotion();
 const refs = useRef<Array<HTMLButtonElement | null>>([]);

 useEffect(() => {
   const saved = parseLightUp(localStorage.getItem(SAVE));
   if (saved) {
     setState(saved);
     setRestored(true);
     setPaused(true);
   }
 }, []);

 useEffect(() => localStorage.setItem(SAVE, serializeLightUp(state)), [state]);

 const tone = useCallback((win = false) => {
   if (!sound || typeof window === 'undefined') return;
   const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
   if (!AudioContextClass) return;
   const a = new AudioContextClass();
   const o = a.createOscillator();
   const g = a.createGain();
   o.frequency.value = win ? 880 : 520;
   g.gain.setValueAtTime(0.03, a.currentTime);
   g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.16);
   o.connect(g).connect(a.destination);
   o.start();
   o.stop(a.currentTime + 0.16);
 }, [sound]);

 const act = (fn: (s: LightUpState) => LightUpState) => {
   if (paused) return;
   setState(s => {
     const n = fn(s);
     if (n !== s) {
       tone(n.won);
       if (n.won && !s.won) {
         MobileHapticsPro.successPattern();
         if (containerRef.current) celebrate(containerRef.current, { preset: "stardust" });
       }
     }
     return n;
   });
 };

 const fresh = useCallback(() => {
   setState(createLightUp(state.seed + 1));
   setPaused(false);
   setRestored(false);
   setFreshBulb(null);
   MobileHapticsPro.selectionClick();
 }, [state.seed]);

 const ev = evaluateAkari(LIGHT_UP_SPEC, state.bulbs);
 const bulbs = state.bulbs.flat().filter(Boolean).length;
 const dark = ev.lit.flat().filter((lit, i) => LIGHT_UP_SPEC[Math.floor(i / 7)][i % 7] === null && !lit).length;

 const handleShareCard = useCallback(async () => {
   const canvas = createShareCardCanvas({
     title: "Light Up (Akari)",
     subtitle: "Logic Grid Puzzle Solved",
     score: `${state.moves} Moves`,
     slug: "light-up",
     customStats: [
       { label: "Bulbs Lit", value: `${bulbs}` },
       { label: "Hints Used", value: `${state.hints}` },
       { label: "Dark Cells", value: "0" },
     ],
   });
   const ok = await copyShareCardToClipboard(canvas);
   if (ok) {
     setShareCardCopied(true);
     MobileHapticsPro.successPattern();
     setTimeout(() => setShareCardCopied(false), 2000);
   } else {
     downloadShareCard(canvas, `light-up-${state.moves}moves.png`);
   }
 }, [state.moves, state.hints, bulbs]);

 const focus = (e: React.KeyboardEvent, index: number) => {
   const r = Math.floor(index / 7);
   const c = index % 7;
   let n = index;
   if (e.key === 'ArrowUp') n = Math.max(0, r - 1) * 7 + c;
   else if (e.key === 'ArrowDown') n = Math.min(6, r + 1) * 7 + c;
   else if (e.key === 'ArrowLeft') n = r * 7 + Math.max(0, c - 1);
   else if (e.key === 'ArrowRight') n = r * 7 + Math.min(6, c + 1);
   else return;
   e.preventDefault();
   while (n >= 0 && n < 49 && LIGHT_UP_SPEC[Math.floor(n / 7)][n % 7] !== null) {
     n += e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
   }
   setActive(n);
   refs.current[n]?.focus();
 };

 return (
  <div
   ref={containerRef}
   data-game-surface
   className={
    isImmersive
     ? "fixed inset-0 z-50 w-screen h-dvh bg-background p-3 sm:p-5 overflow-y-auto flex flex-col items-center justify-between m-0 select-none"
     : "relative"
   }
  >
   <GameContainer title={t.title} subtitle={t.sub} resetLabel={t.newGame} onReset={fresh}>
    <div className="mx-auto max-w-lg space-y-5">
     <p className="text-center text-sm text-muted-foreground">{t.desc}</p>
     <div className="grid grid-cols-3 gap-2">
      <Stat label={t.moves} value={state.moves} />
      <Stat label={t.bulbs} value={bulbs} />
      <Stat label={t.dark} value={dark} />
     </div>
     {restored && <p className="rounded-xl border border-border bg-muted/40 p-3 text-center text-xs font-bold text-foreground" role="status">{t.restored}</p>}
     <div className="relative mx-auto w-full max-w-100 rounded-3xl border border-border bg-card p-2 shadow-2xl">
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={t.title}>
       {LIGHT_UP_SPEC.flatMap((row, r) => row.map((wall, c) => {
        const i = r * 7 + c;
        if (wall !== null) {
          return (
            <div
              key={i}
              role="gridcell"
              aria-label={`wall ${wall}`}
              className={`aspect-square rounded-lg border border-border/40 bg-muted flex items-center justify-center font-black text-foreground ${ev.clueErrors[r][c] ? 'ring-2 ring-destructive' : ''}`}
            >
              {wall}
            </div>
          );
        }
        const bulb = state.bulbs[r][c];
        const lit = ev.lit[r][c];
        const error = ev.bulbErrors[r][c];
        return (
          <button
            key={i}
            ref={n => { refs.current[i] = n; }}
            role="gridcell"
            aria-pressed={bulb}
            aria-label={`${r + 1}, ${c + 1}: ${bulb ? t.bulbs : lit ? 'lit' : t.dark}`}
            tabIndex={active === i ? 0 : -1}
            disabled={paused || state.won}
            onFocus={() => setActive(i)}
            onKeyDown={e => focus(e, i)}
            onClick={() => {
              if (!bulb) {
                setFreshBulb(i);
                MobileHapticsPro.mediumImpact();
              } else {
                setFreshBulb(null);
                MobileHapticsPro.lightImpact();
              }
              act(s => toggleLightUp(s, i));
            }}
            className={`aspect-square min-h-10 rounded-lg border transition-all focus-visible:ring-2 focus-visible:ring-primary ${
              error
                ? 'bg-destructive/20 border-destructive text-destructive'
                : bulb
                  ? 'bg-primary/20 border-primary shadow-[0_0_22px_rgba(var(--primary),0.3)]'
                  : lit
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-background border-border hover:bg-muted'
            }`}
          >
            {bulb ? (
              <img
                src={LIGHT_UP_SPRITES.bulb}
                alt=""
                draggable={false}
                className={`pointer-events-none mx-auto h-[70%] w-[70%] object-contain ${freshBulb === i && !reducedMotion ? 'oiyo-tile-land' : ''}`}
              />
            ) : ''}
          </button>
        );
       }))}
      </div>
      {paused && (
        <button
          onClick={() => setPaused(false)}
          className="absolute inset-2 rounded-2xl bg-card/95 text-lg font-black text-foreground backdrop-blur-xs flex items-center justify-center border border-border"
        >
          {t.resume}
        </button>
      )}
     </div>
     {hint && (
       <p className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-center text-xs font-bold text-foreground" role="status">
         {HINT[locale as keyof typeof COPY]?.[hint.reason] ?? HINT.en[hint.reason]}
         {hint.cells.length ? ` · ${hint.cells.map(i => `${Math.floor(i / 7) + 1},${i % 7 + 1}`).join(' / ')}` : ''}
       </p>
     )}
     <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      <TiltLightUpButton
        onClick={() => {
          setFreshBulb(null);
          MobileHapticsPro.selectionClick();
          act(undoLightUp);
        }}
        disabled={!state.history.length || state.won}
        className="min-h-11 rounded-xl border border-border bg-card px-2 text-xs font-bold text-foreground disabled:opacity-40"
      >
        {t.undo}
      </TiltLightUpButton>
      <TiltLightUpButton
        onClick={() => {
          MobileHapticsPro.selectionClick();
          setHint(explainLightUpHint(state));
          act(hintLightUp);
        }}
        disabled={state.won}
        className="min-h-11 rounded-xl border border-border bg-card px-2 text-xs font-bold text-foreground disabled:opacity-40"
      >
        {t.hint}
      </TiltLightUpButton>
      <button
       type="button"
       onClick={toggleSound}
       aria-pressed={sound}
       aria-label={sound ? portalLabels.mute : portalLabels.unmute}
       title={`${sound ? portalLabels.mute : portalLabels.unmute} (M)`}
       className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 text-xs font-bold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
       {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
       <span>{t.sound}</span>
      </button>
      <button
       type="button"
       onClick={togglePortal}
       aria-pressed={isImmersive}
       aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
       title={`${isImmersive ? portalLabels.exit : portalLabels.enter} (F)`}
       className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 text-xs font-bold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
       {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
       <span>{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
      </button>
      <TiltLightUpButton
        onClick={() => {
          MobileHapticsPro.selectionClick();
          setPaused(x => !x);
        }}
        className="min-h-11 rounded-xl border border-border bg-card px-2 text-xs font-bold text-foreground"
      >
        {paused ? t.resume : t.pause}
      </TiltLightUpButton>
     </div>
     {state.won && (
      <div className="rounded-3xl border border-primary/50 bg-card p-6 text-center text-card-foreground shadow-lg" role="status" aria-live="polite">
       <div className="text-4xl">✨</div>
       <h3 className="mt-2 text-xl font-black">{t.win}</h3>
       <p className="mt-1 text-sm text-muted-foreground">{state.moves} {t.moves} · {state.hints} {t.hint}</p>
       <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <TiltLightUpButton onClick={fresh} className="min-h-11 rounded-full bg-primary px-8 font-bold text-primary-foreground hover:opacity-90">
          {t.next}
        </TiltLightUpButton>
        <TiltLightUpButton
         onClick={handleShareCard}
         className="flex min-h-11 items-center gap-1.5 rounded-full border border-primary/50 bg-primary/20 px-5 text-sm font-bold text-primary shadow-xs hover:bg-primary/30 transition-colors"
         title={shareCardCopied ? "복사됨!" : "결과 카드"}
        >
         {shareCardCopied ? <Check className="size-4" /> : <Share2 className="size-4" />}
         <span>{shareCardCopied ? "복사 완료" : "결과 카드"}</span>
        </TiltLightUpButton>
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
    <div className="rounded-2xl border border-border bg-card p-2 text-center">
      <div className="text-xl font-black text-foreground">{value}</div>
      <div className="text-xs uppercase text-muted-foreground font-bold">{label}</div>
    </div>
  );
}

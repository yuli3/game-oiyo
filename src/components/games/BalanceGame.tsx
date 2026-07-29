import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PENDING_STORAGE_KEY, addVote, parsePending, removeFlushed, shouldFlush, toDeltas,
  withLocalPending, type PendingVotes,
} from '../../lib/games/vote-batch';
import { GameContainer } from '../ui/game/GamePrimitives';
import { BALANCE_GAME_PROMPTS } from '../../data/balance-game-prompts';

const STORAGE_KEY = 'oiyo:balance-game:v1';

type Tally = { a: number; b: number };
type Stored = { answered: number; picks: Record<number, 'a' | 'b'> };

function loadStored(): Stored {
  if (typeof localStorage === 'undefined') return { answered: 0, picks: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { answered: 0, picks: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.picks !== 'object') return { answered: 0, picks: {} };
    const picks: Record<number, 'a' | 'b'> = {};
    for (const [key, value] of Object.entries(parsed.picks)) {
      const id = Number(key);
      if (Number.isInteger(id) && (value === 'a' || value === 'b')) picks[id] = value;
    }
    return { answered: Object.keys(picks).length, picks };
  } catch {
    return { answered: 0, picks: {} };
  }
}

function shuffledOrder(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

const BalanceGame: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
  const COPY = {
    ko: {
      title: '밸런스 게임', subtitle: '둘 중 하나만 고를 수 있다면?',
      note: '이 게임은 한국어 전용 콘텐츠입니다.', progress: (n: number, total: number) => `${n} / ${total}`,
      restart: '처음부터 다시', done: '68문항을 모두 골랐습니다!', doneSub: '당신의 선택 기록',
      pickA: 'A 선택', pickB: 'B 선택', myPicks: '내 선택 비율', vs: 'VS',
      crowd: '다른 사람들의 선택', crowdFirst: '이 질문에 처음 답했어요', crowdNote: (n: number) => `${n.toLocaleString()}명 참여 · 집계는 잠시 뒤 반영됩니다`,
    },
    en: {
      title: 'Balance Game', subtitle: 'Which would you choose?',
      note: 'This game’s prompts are Korean-only content.', progress: (n: number, total: number) => `${n} / ${total}`,
      restart: 'Restart from the beginning', done: 'You’ve answered all 68!', doneSub: 'Your pick history',
      pickA: 'Pick A', pickB: 'Pick B', myPicks: 'My pick split', vs: 'VS',
      crowd: 'What everyone else picked', crowdFirst: 'You answered this first', crowdNote: (n: number) => `${n.toLocaleString()} answers · totals update shortly`,
    },
    ja: {
      title: 'バランスゲーム', subtitle: 'どちらか一つを選ぶなら？',
      note: 'このゲームは韓国語専用コンテンツです。', progress: (n: number, total: number) => `${n} / ${total}`,
      restart: '最初からやり直す', done: '68問すべて選びました！', doneSub: 'あなたの選択履歴',
      pickA: 'Aを選ぶ', pickB: 'Bを選ぶ', myPicks: '選択の割合', vs: 'VS',
      crowd: 'みんなの選択', crowdFirst: 'この質問に最初に答えました', crowdNote: (n: number) => `${n.toLocaleString()}人が回答 · 集計は少し後に反映されます`,
    },
    zh: {
      title: '二选一游戏', subtitle: '如果只能选一个？',
      note: '本游戏为韩语专属内容。', progress: (n: number, total: number) => `${n} / ${total}`,
      restart: '从头开始', done: '你已回答全部68题！', doneSub: '你的选择记录',
      pickA: '选择A', pickB: '选择B', myPicks: '我的选择比例', vs: 'VS',
      crowd: '其他人的选择', crowdFirst: '你是第一个回答的', crowdNote: (n: number) => `${n.toLocaleString()}人参与 · 统计稍后更新`,
    },
    fr: {
      title: 'Jeu du dilemme', subtitle: 'Si vous ne pouviez choisir qu’un seul ?',
      note: 'Ce jeu propose un contenu uniquement en coréen.', progress: (n: number, total: number) => `${n} / ${total}`,
      restart: 'Recommencer depuis le début', done: 'Vous avez répondu aux 68 questions !', doneSub: 'Votre historique de choix',
      pickA: 'Choisir A', pickB: 'Choisir B', myPicks: 'Répartition de mes choix', vs: 'VS',
      crowd: 'Le choix des autres', crowdFirst: 'Vous avez répondu en premier', crowdNote: (n: number) => `${n.toLocaleString()} réponses · totaux mis à jour bientôt`,
    },
    es: {
      title: 'Juego del dilema', subtitle: '¿Si solo pudieras elegir uno?',
      note: 'Este juego tiene contenido solo en coreano.', progress: (n: number, total: number) => `${n} / ${total}`,
      restart: 'Reiniciar desde el principio', done: '¡Has respondido las 68 preguntas!', doneSub: 'Tu historial de elecciones',
      pickA: 'Elegir A', pickB: 'Elegir B', myPicks: 'Mi reparto de elecciones', vs: 'VS',
      crowd: 'Lo que eligieron los demás', crowdFirst: 'Has respondido primero', crowdNote: (n: number) => `${n.toLocaleString()} respuestas · totales se actualizan pronto`,
    },
  };
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const total = BALANCE_GAME_PROMPTS.length;

  const [stored, setStored] = useState<Stored>(() => loadStored());
  const [order, setOrder] = useState<number[]>(() => shuffledOrder(total));
  const [cursor, setCursor] = useState(0);

  // Server-side splits, and the votes we have not shipped yet. Votes are batched
  // because the endpoint refuses one KV write per vote — see lib/games/vote-batch.ts.
  const [crowd, setCrowd] = useState<Record<number, { a: number; b: number }>>({});
  const [revealed, setRevealed] = useState<{ id: number; choice: 'a' | 'b' } | null>(null);
  const pendingRef = useRef<PendingVotes>({});
  const inFlightRef = useRef(false);

  useEffect(() => {
    try { pendingRef.current = parsePending(localStorage.getItem(PENDING_STORAGE_KEY)); } catch { /* best effort */ }
  }, []);

  const persistPending = useCallback(() => {
    try { localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pendingRef.current)); } catch { /* best effort */ }
  }, []);

  const flush = useCallback(async () => {
    if (inFlightRef.current) return;
    const sent = toDeltas(pendingRef.current);
    if (sent.length === 0) return;
    inFlightRef.current = true;
    try {
      const res = await fetch('/api/balance-tally', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ deltas: sent }),
      });
      if (res.ok) {
        const body = await res.json() as { tallies?: Record<number, { a: number; b: number }> };
        pendingRef.current = removeFlushed(pendingRef.current, sent);
        persistPending();
        if (body.tallies) setCrowd((prev) => ({ ...prev, ...body.tallies }));
      }
      // Any failure (no KV binding, budget spent, offline) leaves the batch
      // pending for a later attempt. The game never surfaces an error for this.
    } catch { /* offline — keep the batch */ }
    finally { inFlightRef.current = false; }
  }, [persistPending]);

  // Ship whatever is pending when the tab goes away, so a player who answers a
  // few prompts and leaves still has them counted.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') void flush(); };
    document.addEventListener('visibilitychange', onHide);
    return () => { document.removeEventListener('visibilitychange', onHide); void flush(); };
  }, [flush]);

  const currentPrompt = order[cursor] !== undefined ? BALANCE_GAME_PROMPTS[order[cursor]] : null;
  const finished = cursor >= order.length;

  const currentId = currentPrompt?.id;
  useEffect(() => {
    if (currentId === undefined || crowd[currentId] !== undefined) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/balance-tally?ids=${currentId}`);
        if (!res.ok || cancelled) return;
        const body = await res.json() as { tallies?: Record<number, { a: number; b: number }> };
        if (body.tallies) setCrowd((prev) => ({ ...prev, ...body.tallies }));
      } catch { /* offline — the local-only view is still correct */ }
    })();
    return () => { cancelled = true; };
  }, [currentId, crowd]);

  const tally: Tally = useMemo(() => {
    let a = 0, b = 0;
    for (const pick of Object.values(stored.picks)) { if (pick === 'a') a += 1; else b += 1; }
    return { a, b };
  }, [stored]);

  const pick = useCallback((choice: 'a' | 'b') => {
    if (!currentPrompt) return;
    setStored((prev) => {
      const next: Stored = { answered: prev.answered + (prev.picks[currentPrompt.id] ? 0 : 1), picks: { ...prev.picks, [currentPrompt.id]: choice } };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage best-effort */ }
      return next;
    });
    setRevealed({ id: currentPrompt.id, choice });
    pendingRef.current = addVote(pendingRef.current, currentPrompt.id, choice);
    persistPending();
    if (shouldFlush(pendingRef.current)) void flush();
    setCursor((c) => c + 1);
  }, [currentPrompt, persistPending, flush]);

  const restart = useCallback(() => {
    setOrder(shuffledOrder(total));
    setCursor(0);
  }, [total]);

  const answeredCount = Object.keys(stored.picks).length;
  const pickTotal = tally.a + tally.b;
  const aPct = pickTotal > 0 ? Math.round((tally.a / pickTotal) * 100) : 0;

  return (
    <GameContainer title={t.title} subtitle={t.subtitle} resetLabel={t.restart} onReset={restart}>
      <div className="flex flex-col items-center gap-5">
        <p className="text-xs font-medium text-muted-foreground">{t.note}</p>
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <span>{t.progress(Math.min(cursor, total), total)}</span>
        </div>

        {!finished && currentPrompt && (
          <div className="w-full max-w-xl">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label={t.subtitle}>
              <button
                type="button"
                onClick={() => pick('a')}
                className="min-h-24 rounded-2xl border-2 border-border bg-card p-5 text-center text-base font-bold shadow-sm transition-all hover:border-primary hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {currentPrompt.a}
              </button>
              <button
                type="button"
                onClick={() => pick('b')}
                className="min-h-24 rounded-2xl border-2 border-border bg-card p-5 text-center text-base font-bold shadow-sm transition-all hover:border-primary hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {currentPrompt.b}
              </button>
            </div>
            <p className="mt-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.vs}</p>
          </div>
        )}

        {/* Revealed only after answering. Showing the split beforehand would
            anchor the choice and degrade the data we are collecting. */}
        {revealed && (() => {
          const merged = withLocalPending(crowd[revealed.id] ?? { a: 0, b: 0 }, pendingRef.current[revealed.id]);
          const sum = merged.a + merged.b;
          if (sum === 0) return null;
          const aPctCrowd = Math.round((merged.a / sum) * 100);
          return (
            <div className="w-full max-w-xl rounded-2xl border border-border bg-muted/30 p-4" role="status" aria-live="polite">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t.crowd}</p>
              <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-muted">
                <div className="bg-primary" style={{ width: `${aPctCrowd}%` }} />
                <div className="bg-chart-2 flex-1" />
              </div>
              <p className="mt-2 text-sm font-bold">
                A {aPctCrowd}% · B {100 - aPctCrowd}%
                <span className="ml-2 font-normal text-muted-foreground">
                  {sum === 1 ? t.crowdFirst : t.crowdNote(sum)}
                </span>
              </p>
            </div>
          );
        })()}

        {finished && (
          <div className="w-full max-w-xl text-center animate-in zoom-in-95 motion-reduce:animate-none" role="status" aria-live="polite">
            <h4 className="text-xl font-black text-primary">{t.done}</h4>
            {answeredCount > 0 && (
              <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t.myPicks}</p>
                <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div className="bg-primary" style={{ width: `${aPct}%` }} />
                  <div className="bg-chart-2 flex-1" />
                </div>
                <p className="mt-2 text-sm font-bold">A {aPct}% · B {100 - aPct}% <span className="font-normal text-muted-foreground">({t.doneSub}: {answeredCount}/{total})</span></p>
              </div>
            )}
          </div>
        )}
      </div>
    </GameContainer>
  );
};

export default BalanceGame;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import type { Locale } from '../../lib/i18n';
import { createReversi, playReversi, restoreReversi, reversiAnalysis, reversiBestMove, reversiMoveReview, reversiMoves, type ReversiMoveReview, type ReversiState } from '../../lib/games/reversi';
import type { AiLevel, GameMode } from '../../lib/games/ai/types';
import { getRecord, recordResult, type GameRecord } from '../../lib/games/records';
import { usePrefersReducedMotion } from '../../lib/games/reduced-motion';
import { clearReversiSave, loadReversiSave, storeReversiSave } from '../../lib/games/active-game-save';
import { REVERSI_SPRITES } from '../../lib/games/sprites';

const SIZE = 8;
const AI_PLAYER = 2; // AI plays white; human opens as black
const AI_DELAY_MS = 500;

const i18n: Record<Locale, {
    title: string; turn: string; black: string; white: string; win: string; over: string; reset: string; score: string;
    modeLocal: string; modeAi: string; level1: string; level2: string; level3: string;
    thinking: string; youWin: string; aiWins: string; draw: string; record: string; board: string; pause: string; resume: string; restored: string; passed: (side: string) => string; moves: string; mobility: string; corners: string; share: string; next: string; square: (row: number, column: number, state: string) => string;
}> = {
    ko: { title: "리버시", turn: "차례", black: "흑", white: "백", win: "승리!", over: "게임 종료", reset: "새 게임", score: "점수", modeLocal: "2인 대전", modeAi: "AI 대전", level1: "견습생", level2: "숙련가", level3: "명인", thinking: "상대가 수를 읽고 있습니다…", youWin: "당신의 승리!", aiWins: "AI 승리", draw: "무승부", record: "전적", board: "리버시 판", pause: "일시정지", resume: "계속하기", restored: "이전 대국을 복원했습니다", passed: s => `${s}은 둘 곳이 없어 차례를 넘깁니다`, moves: "착수", mobility: "가능한 수", corners: "모서리", share: "결과 복사", next: "다음 목표: 모서리를 먼저 확보하세요", square: (r, c, s) => `${r}행 ${c}열, ${s}` },
    en: { title: "Reversi", turn: "Turn", black: "Black", white: "White", win: "Wins!", over: "Game Over", reset: "New Game", score: "Score", modeLocal: "2 Players", modeAi: "vs AI", level1: "Apprentice", level2: "Adept", level3: "Master", thinking: "Your opponent is reading the board…", youWin: "You win!", aiWins: "AI wins", draw: "Draw", record: "Record", board: "Reversi board", pause: "Pause", resume: "Resume", restored: "Previous match restored", passed: s => `${s} has no legal move and passes`, moves: "Moves", mobility: "Legal moves", corners: "Corners", share: "Copy result", next: "Next goal: secure a corner first", square: (r, c, s) => `Row ${r}, column ${c}, ${s}` },
    ja: { title: "リバーシ", turn: "手番", black: "黒", white: "白", win: "勝利！", over: "ゲーム終了", reset: "新しい対局", score: "スコア", modeLocal: "2人対戦", modeAi: "AI対戦", level1: "見習い", level2: "熟練者", level3: "名人", thinking: "相手が盤面を読んでいます…", youWin: "あなたの勝ち！", aiWins: "AIの勝ち", draw: "引き分け", record: "戦績", board: "リバーシ盤", pause: "一時停止", resume: "再開", restored: "前の対局を復元しました", passed: s => `${s}は置ける場所がなくパスします`, moves: "手数", mobility: "合法手", corners: "隅", share: "結果をコピー", next: "次の目標：先に隅を確保", square: (r, c, s) => `${r}行 ${c}列、${s}` },
    zh: { title: "黑白棋", turn: "回合", black: "黑", white: "白", win: "获胜！", over: "游戏结束", reset: "新对局", score: "分数", modeLocal: "双人对战", modeAi: "人机对战", level1: "学徒", level2: "行家", level3: "大师", thinking: "对手正在读盘…", youWin: "你赢了！", aiWins: "AI 获胜", draw: "平局", record: "战绩", board: "黑白棋棋盘", pause: "暂停", resume: "继续", restored: "已恢复上一局", passed: s => `${s}无合法落子，跳过回合`, moves: "步数", mobility: "合法位置", corners: "角", share: "复制结果", next: "下个目标：先占一个角", square: (r, c, s) => `第 ${r} 行，第 ${c} 列，${s}` },
    fr: { title: "Reversi", turn: "Tour", black: "Noir", white: "Blanc", win: "gagne !", over: "Partie terminée", reset: "Nouvelle partie", score: "Score", modeLocal: "2 joueurs", modeAi: "contre l'IA", level1: "Apprenti", level2: "Adepte", level3: "Maître", thinking: "Votre adversaire lit le plateau…", youWin: "Vous gagnez !", aiWins: "L'IA gagne", draw: "Match nul", record: "Bilan", board: "Plateau de Reversi", pause: "Pause", resume: "Reprendre", restored: "Partie restaurée", passed: s => `${s} ne peut pas jouer et passe`, moves: "Coups", mobility: "Coups légaux", corners: "Coins", share: "Copier le résultat", next: "Prochain objectif : prenez un coin", square: (r, c, s) => `Ligne ${r}, colonne ${c}, ${s}` },
    es: { title: "Reversi", turn: "Turno", black: "Negras", white: "Blancas", win: "¡gana!", over: "Fin de la partida", reset: "Nueva partida", score: "Puntos", modeLocal: "2 jugadores", modeAi: "contra la IA", level1: "Aprendiz", level2: "Experto", level3: "Maestro", thinking: "Tu rival está leyendo el tablero…", youWin: "¡Has ganado!", aiWins: "Gana la IA", draw: "Tablas", record: "Historial", board: "Tablero de Reversi", pause: "Pausa", resume: "Continuar", restored: "Partida restaurada", passed: s => `${s} no tiene jugada y pasa`, moves: "Jugadas", mobility: "Jugadas legales", corners: "Esquinas", share: "Copiar resultado", next: "Siguiente meta: asegura una esquina", square: (r, c, s) => `Fila ${r}, columna ${c}, ${s}` },
};
const soundLabel: Record<Locale, string> = { ko: "소리", en: "Sound", ja: "サウンド", zh: "声音", fr: "Son", es: "Sonido" };

const AI_INFO: Record<Locale,{difficulty:string;level:Record<AiLevel,string>;review:string;corner:string;edge:string;flips:string;mobility:string}>={
 ko:{difficulty:'AI 탐색',level:{1:'상위 4개 · 뒤집기 우선',2:'2수 · 위치와 이동성',3:'4수 · 위치와 이동성'},review:'패배 복기',corner:'모서리 확보',edge:'변 확보',flips:'개 뒤집기',mobility:'내 다음 수'},
 en:{difficulty:'AI search',level:{1:'top 4 · max flips',2:'2 ply · position/mobility',3:'4 ply · position/mobility'},review:'Loss review',corner:'secured corner',edge:'secured edge',flips:'flips',mobility:'your replies'},
 ja:{difficulty:'AI探索',level:{1:'上位4手 · 返し優先',2:'2 ply · 位置と手数',3:'4 ply · 位置と手数'},review:'敗局の振り返り',corner:'隅を確保',edge:'辺を確保',flips:'枚返し',mobility:'次の合法手'},
 zh:{difficulty:'AI搜索',level:{1:'前4候选 · 翻子优先',2:'2 ply · 位置与行动力',3:'4 ply · 位置与行动力'},review:'败局复盘',corner:'占据角',edge:'占据边',flips:'枚翻转',mobility:'你的后续着法'},
 fr:{difficulty:'Recherche IA',level:{1:'top 4 · prises max',2:'2 ply · position/mobilité',3:'4 ply · position/mobilité'},review:'Revoir la défaite',corner:'coin sécurisé',edge:'bord sécurisé',flips:'retournements',mobility:'vos réponses'},
 es:{difficulty:'Búsqueda IA',level:{1:'top 4 · giros máximos',2:'2 ply · posición/movilidad',3:'4 ply · posición/movilidad'},review:'Revisión de derrota',corner:'esquina asegurada',edge:'borde asegurado',flips:'giros',mobility:'tus respuestas'},
};

const Reversi: React.FC<{ locale?: Locale }> = ({ locale = 'ko' }) => {
    const t = i18n[locale] ?? i18n.en;
    const aiInfo=AI_INFO[locale]??AI_INFO.en;
    const reducedMotion = usePrefersReducedMotion();

    const [game, setGame] = useState<ReversiState>(createReversi);
    const [mode, setMode] = useState<GameMode>('local');
    const [level, setLevel] = useState<AiLevel>(2);
    const [thinking, setThinking] = useState(false);
    const [record, setRecord] = useState<GameRecord | null>(null);
    const [paused, setPaused] = useState(false); const [restored, setRestored] = useState(false); const [muted, setMuted] = useState(false); const [lastAiReview,setLastAiReview]=useState<ReversiMoveReview|null>(null);
    const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const audio = useRef<AudioContext | null>(null);
    const tone = (frequency: number, duration = .08) => { if (muted || typeof window === 'undefined') return; const context = audio.current ?? new AudioContext(); audio.current = context; const oscillator = context.createOscillator(), gain = context.createGain(); oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.035, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration); oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + duration); };

    const initGame = useCallback(() => {
        clearReversiSave();
        if (aiTimer.current) clearTimeout(aiTimer.current);
        setGame(createReversi()); setThinking(false); setPaused(false); setRestored(false); setLastAiReview(null); setLastPlace(null);
    }, []);

    useEffect(() => {
        const restored = loadReversiSave();
        if (restored) {
            if (aiTimer.current) clearTimeout(aiTimer.current);
            const next = restoreReversi(restored.board, restored.isBlackTurn ? 1 : 2);
            if (next) setGame(next);
            setMode(restored.mode);
            setLevel(restored.level);
            setThinking(false); setPaused(true); setRestored(true);
        } else {
            initGame();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => { setRecord(getRecord('reversi')); }, []);
    useEffect(() => () => { if (aiTimer.current) clearTimeout(aiTimer.current); void audio.current?.close(); }, []);
    useEffect(() => { const hidden = () => { if (document.hidden && game.status === 'playing') { setPaused(true); setThinking(false); if (aiTimer.current) clearTimeout(aiTimer.current); } }; document.addEventListener('visibilitychange', hidden); return () => document.removeEventListener('visibilitychange', hidden); }, [game.status]);

    useEffect(() => {
        if (game.status === 'over') { clearReversiSave(); return; }
        storeReversiSave({ board: game.board, isBlackTurn: game.current === 1, mode, level });
    }, [game, mode, level]);

    const [lastPlace, setLastPlace] = useState<{ index: number; flips: number[]; key: number } | null>(null);
    const flipKey = useRef(0);
    const applyMove = (index: number) => { const review=game.current===AI_PLAYER?reversiMoveReview(game.board,index,AI_PLAYER):null;const prevBoard=game.board;const next = playReversi(game, index); if (next === game) { tone(150); return false; } if(review)setLastAiReview(review);const flips=prevBoard.flatMap((cell, i) => cell !== null && next.board[i] !== cell && i !== index ? [i] : []);flipKey.current+=1;setLastPlace({ index, flips, key: flipKey.current });setGame(next); setRestored(false); tone(next.status === 'over' ? 880 : next.passed ? 260 : 520, next.status === 'over' ? .24 : .08); if (next.status === 'over' && mode === 'ai') setRecord(recordResult('reversi', next.winner === 0 ? 'd' : next.winner === AI_PLAYER ? 'l' : 'w')); return true; };

    const handleClick = (index: number) => {
        if (game.status === 'over' || thinking || paused) return;
        if (mode === 'ai' && game.current === 2) return;
        applyMove(index);
    };

    // AI turn — also refires after a human pass (board dep) since turn may stay with the AI.
    useEffect(() => {
        if (mode !== 'ai' || game.status === 'over' || game.current === 1 || paused) return;
        setThinking(true);
        aiTimer.current = setTimeout(() => {
            const move = reversiBestMove(game.board, AI_PLAYER, level);
            setThinking(false);
            if (move >= 0) applyMove(move);
        }, AI_DELAY_MS);
        return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, game, paused, level]);

    const switchMode = (m: GameMode) => {
        if (m === mode) return;
        setMode(m);
        initGame();
    };

    const bCount = game.board.filter(v => v === 1).length;
    const wCount = game.board.filter(v => v === 2).length;
    const validMoves = game.status === 'playing' && !paused && !(mode === 'ai' && game.current === 2)
        ? reversiMoves(game.board, game.current)
        : [];

    const winLabel = game.winner === 0 ? t.draw
        : mode === 'ai' ? (game.winner === AI_PLAYER ? t.aiWins : t.youWin)
        : `${game.winner === 1 ? t.black : t.white} ${t.win}`;
    const analysis = reversiAnalysis(game, 1);
    const handleKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => { if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return; event.preventDefault(); let next=index; if(event.key==='ArrowLeft')next=Math.max(0,index-1);if(event.key==='ArrowRight')next=Math.min(63,index+1);if(event.key==='ArrowUp')next=Math.max(0,index-8);if(event.key==='ArrowDown')next=Math.min(63,index+8);if(event.key==='Home')next=0;if(event.key==='End')next=63;document.querySelector<HTMLButtonElement>(`[data-reversi-cell="${next}"]`)?.focus(); };
    const share = async () => { try { await navigator.clipboard.writeText(`OIYO Reversi · ${bCount}-${wCount} · ${game.moves} moves · ${winLabel}`); } catch { /* best effort */ } };

    return (
        <GameContainer title={t.title} subtitle="Reversal Strategy" onReset={initGame}>
            {/* Mode + difficulty */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl border border-border overflow-hidden" role="group" aria-label={`${t.modeLocal} / ${t.modeAi}`}>
                    {(['local', 'ai'] as GameMode[]).map((m) => (
                        <button key={m} onClick={() => switchMode(m)}
                            aria-pressed={mode === m}
                            className={`px-3 py-1.5 text-xs font-bold transition-colors ${mode === m ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
                            {m === 'local' ? t.modeLocal : t.modeAi}
                        </button>
                    ))}
                </div>
                {mode === 'ai' && (
                    <div className="inline-flex gap-1">
                        {([1, 2, 3] as AiLevel[]).map((lv) => (
                            <button key={lv} onClick={() => { setLevel(lv); initGame(); }}
                                aria-pressed={level === lv}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${level === lv ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                                {lv === 1 ? t.level1 : lv === 2 ? t.level2 : t.level3}
                            </button>
                        ))}
                    </div>
                )}
                {mode === 'ai' && <p className="basis-full text-[11px] font-medium text-muted-foreground">{aiInfo.difficulty}: {aiInfo.level[level]}</p>}
                {mode === 'ai' && record && (record.w + record.l + record.d > 0) && (
                    <span className="ml-auto text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {t.record} {record.w}–{record.l}{record.d ? `–${record.d}` : ''}
                    </span>
                )}
            </div>

            <div className="flex justify-between items-center mb-6">
                <div className="flex gap-4">
                    <div className={`flex items-center gap-2 p-3 rounded-2xl border ${!reducedMotion ? 'transition-all' : ''} ${game.current === 1 ? 'bg-primary/10 border-primary' : 'bg-muted border-transparent opacity-50'}`}>
                        <img src={REVERSI_SPRITES.black} alt="" draggable={false} className="h-4 w-4 object-contain" />
                        <span className="text-xs font-black">{t.black}: {bCount}</span>
                    </div>
                    <div className={`flex items-center gap-2 p-3 rounded-2xl border ${!reducedMotion ? 'transition-all' : ''} ${game.current === 2 ? 'bg-primary/10 border-primary' : 'bg-muted border-transparent opacity-50'}`}>
                        <img src={REVERSI_SPRITES.white} alt="" draggable={false} className="h-4 w-4 object-contain" />
                        <span className="text-xs font-black">{t.white}: {wCount}</span>
                    </div>
                </div>
                {thinking && <span className={`text-xs font-semibold text-muted-foreground ${!reducedMotion ? 'animate-pulse' : ''}`} aria-live="polite">{t.thinking}</span>}
            </div>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold" role="status" aria-live="polite">
                <span>{restored ? t.restored : game.passed ? t.passed(game.passed === 1 ? t.black : t.white) : `${t.turn}: ${game.current === 1 ? t.black : t.white} · ${t.moves} ${game.moves}`}</span>
                <div className="flex gap-2">
                    <button type="button" onClick={() => setPaused(value => !value)} className="min-h-11 rounded-xl border px-3" aria-pressed={paused}>{paused ? '▶' : 'Ⅱ'}<span className="sr-only">{paused ? t.resume : t.pause}</span></button>
                    <button type="button" onClick={() => setMuted(value => !value)} className="min-h-11 rounded-xl border px-3" aria-pressed={muted}>{muted ? '🔇' : '🔊'}<span className="sr-only">{soundLabel[locale]}</span></button>
                </div>
            </div>

            <div className="relative mx-auto grid aspect-square w-full max-w-[352px] grid-cols-8 grid-rows-8 overflow-hidden rounded-xl border-2 border-primary bg-primary/70 shadow-inner" role="grid" aria-label={t.board}>
                {game.board.map((cell, i) => (
                    <button
                        key={i}
                        onClick={() => handleClick(i)}
                        onKeyDown={(event) => handleKey(event, i)}
                        data-reversi-cell={i}
                        type="button"
                        role="gridcell"
                        aria-label={t.square(Math.floor(i / SIZE) + 1, (i % SIZE) + 1, cell === 1 ? t.black : cell === 2 ? t.white : validMoves.includes(i) ? t.turn : t.board)}
                        aria-disabled={game.status === 'over' || paused || thinking || (mode === 'ai' && game.current === 2)}
                        className={`relative flex min-h-10 min-w-10 items-center justify-center border border-primary-foreground/25 ${!reducedMotion ? 'transition-colors' : ''} ${
                            validMoves.includes(i) ? 'bg-primary/60 hover:bg-primary/40 cursor-pointer' : 'bg-primary/80'
                        }`}
                    >
                        {validMoves.includes(i) && <div className="h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-900/70" />}
                        {cell !== null && (
                            <img
                                key={lastPlace?.flips.includes(i) ? `flip-${lastPlace.key}-${i}` : lastPlace?.index === i ? `place-${lastPlace.key}` : `disc-${i}`}
                                src={cell === 1 ? REVERSI_SPRITES.black : REVERSI_SPRITES.white}
                                alt=""
                                draggable={false}
                                className={`pointer-events-none h-[85%] w-[85%] object-contain drop-shadow-md ${
                                    lastPlace && lastPlace.flips.includes(i) && !reducedMotion
                                        ? 'oiyo-disc-flip'
                                        : lastPlace?.index === i && !reducedMotion
                                            ? 'animate-in zoom-in-75 duration-300'
                                            : ''
                                }`}
                            />
                        )}
                    </button>
                ))}

                {game.status === 'over' && (
                    <div className={`absolute inset-0 z-10 bg-background/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center ${!reducedMotion ? 'animate-in fade-in zoom-in-95' : ''}`}>
                        <div className="m-3 rounded-3xl border-4 border-primary/20 bg-card p-5 text-center shadow-xl">
                            <h4 className="text-2xl font-black text-foreground mb-2">{winLabel}</h4>
                            <p className="text-sm font-bold text-muted-foreground">{bCount}–{wCount} · {t.moves} {game.moves}</p><p className="text-xs font-bold text-muted-foreground">{t.mobility} {analysis.mobility} · {t.corners} {analysis.corners}</p><p className="mt-1 text-xs font-bold text-primary">{t.next}</p>
                            {mode === 'ai' && game.winner === AI_PLAYER && lastAiReview && <div className="mx-auto mt-3 max-w-xs rounded-2xl border border-amber-300/60 bg-amber-50 p-3 text-left text-xs text-stone-800"><p className="font-black text-amber-900">{aiInfo.review} · {String.fromCharCode(65+lastAiReview.index%8)}{8-Math.floor(lastAiReview.index/8)}</p><p className="mt-1">{lastAiReview.corner?aiInfo.corner:lastAiReview.edge?aiInfo.edge:`${lastAiReview.flips} ${aiInfo.flips}`} · {aiInfo.mobility} ${lastAiReview.opponentMobility}</p><p className="mt-1 text-[10px] text-stone-500">{aiInfo.difficulty}: {aiInfo.level[level]}</p></div>}
                            <div className="mt-4 flex justify-center gap-2"><button type="button" onClick={initGame} className={`min-h-11 rounded-xl bg-primary px-5 font-black text-primary-foreground ${!reducedMotion ? 'hover:scale-105 transition-transform' : ''}`}>
                                {t.reset}
                            </button><button type="button" onClick={share} className="min-h-11 rounded-xl border px-4 text-sm font-bold">{t.share}</button></div>
                        </div>
                    </div>
                )}
            </div>
        </GameContainer>
    );
};

export default Reversi;

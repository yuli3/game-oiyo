import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import type { Locale } from '../../lib/i18n';
import { checkersApply, checkersApplyTurn, checkersBestMove, checkersMoves, checkersTurnReview, type CheckersPiece, type CheckersMove, type CheckersTurnReview } from '../../lib/games/checkers';
import type { AiLevel, GameMode } from '../../lib/games/ai/types';
import { getRecord, recordResult, type GameRecord } from '../../lib/games/records';
import { clearCheckersSave, loadCheckersSave, storeCheckersSave } from '../../lib/games/active-game-save';

const SIZE = 8;

type Piece = CheckersPiece;
const AI_PLAYER = 2; // AI plays black; human opens as red
const AI_DELAY_MS = 500;
const EXTRA: Record<Locale, { pause: string; resume: string; sound: string; restored: string; redLeft: string; blackLeft: string; captured: string; next: string }> = {
    ko: { pause: '일시정지', resume: '계속하기', sound: '소리', restored: '이전 대국을 일시정지 상태로 복원했습니다', redLeft: '남은 홍', blackLeft: '남은 흑', captured: '잡은 말', next: '다음 목표' },
    en: { pause: 'Pause', resume: 'Resume', sound: 'Sound', restored: 'Previous match restored and paused', redLeft: 'Red left', blackLeft: 'Black left', captured: 'Captured', next: 'Next target' },
    ja: { pause: '一時停止', resume: '再開', sound: 'サウンド', restored: '前の対局を一時停止で復元しました', redLeft: '赤の残り', blackLeft: '黒の残り', captured: '取った駒', next: '次の目標' },
    zh: { pause: '暂停', resume: '继续', sound: '声音', restored: '已恢复并暂停上一局', redLeft: '剩余红棋', blackLeft: '剩余黑棋', captured: '吃子', next: '下个目标' },
    fr: { pause: 'Pause', resume: 'Reprendre', sound: 'Son', restored: 'Partie précédente restaurée en pause', redLeft: 'Rouges restantes', blackLeft: 'Noires restantes', captured: 'Prises', next: 'Prochain objectif' },
    es: { pause: 'Pausa', resume: 'Continuar', sound: 'Sonido', restored: 'Partida anterior restaurada y pausada', redLeft: 'Rojas restantes', blackLeft: 'Negras restantes', captured: 'Capturadas', next: 'Siguiente meta' },
};

const i18n: Record<Locale, {
    title: string; turn: string; red: string; black: string; win: string; over: string; reset: string;
    modeLocal: string; modeAi: string; level1: string; level2: string; level3: string;
    thinking: string; youWin: string; aiWins: string; record: string; subtitle: string;
    rules: string; continueJump: string; captureRequired: string;
    boardLabel: string; empty: string; king: string; selectedLabel: string; destinationLabel: string;
}> = {
    ko: { title: "체커 (Checkers)", turn: "차례", red: "홍(Red)", black: "흑(Black)", win: "승리!", over: "게임 종료", reset: "판 갈기", modeLocal: "2인 대전", modeAi: "AI 대전", level1: "견습생", level2: "숙련가", level3: "명인", thinking: "상대가 수를 읽고 있습니다…", youWin: "당신의 승리!", aiWins: "AI 승리", record: "전적", subtitle: "아메리칸 체커 · AI 대전", rules: "잡을 수 있으면 반드시 잡아야 하며, 같은 말로 연속 점프합니다. 일반 말은 앞쪽으로만 움직이고 잡습니다. 점프 중 킹이 되면 그 차례는 즉시 끝납니다. 움직일 수 없는 쪽이 패배합니다.", continueJump: "같은 말로 연속 점프하세요", captureRequired: "잡기가 필수입니다", boardLabel: "체커판. 화살표 키로 이동하고 Enter 또는 Space로 선택하세요.", empty: "빈 칸", king: "킹", selectedLabel: "선택됨", destinationLabel: "이동 가능" },
    en: { title: "Checkers", turn: "Turn", red: "Red", black: "Black", win: "Wins!", over: "Game Over", reset: "New Match", modeLocal: "2 Players", modeAi: "vs AI", level1: "Apprentice", level2: "Adept", level3: "Master", thinking: "Your opponent is thinking…", youWin: "You win!", aiWins: "AI wins", record: "Record", subtitle: "American checkers · vs AI", rules: "Captures are mandatory and multiple jumps continue with the same piece. Men move and capture forward only. Crowning during a jump ends that turn. A player with no legal move loses.", continueJump: "Continue jumping with the same piece", captureRequired: "A capture is required", boardLabel: "Checkers board. Use arrow keys to move and Enter or Space to select.", empty: "Empty", king: "king", selectedLabel: "Selected", destinationLabel: "Legal destination" },
    ja: { title: "チェッカー", turn: "手番", red: "赤", black: "黒", win: "勝利！", over: "ゲーム終了", reset: "新しい対局", modeLocal: "2人対戦", modeAi: "AI対戦", level1: "見習い", level2: "熟練者", level3: "名人", thinking: "相手が考えています…", youWin: "あなたの勝ち！", aiWins: "AIの勝ち", record: "戦績", subtitle: "アメリカン・チェッカー · AI対戦", rules: "取れる駒があれば必ず取り、同じ駒で連続ジャンプします。通常の駒は前方にだけ進み、取ります。ジャンプ中のキング昇格でその手番は終了します。合法手がない側の負けです。", continueJump: "同じ駒でジャンプを続けてください", captureRequired: "駒取りが必須です", boardLabel: "チェッカー盤。矢印キーで移動し、EnterまたはSpaceで選択します。", empty: "空き", king: "キング", selectedLabel: "選択中", destinationLabel: "移動可能" },
    zh: { title: "西洋跳棋 (Checkers)", turn: "回合", red: "红", black: "黑", win: "获胜！", over: "游戏结束", reset: "重新开局", modeLocal: "双人对战", modeAi: "人机对战", level1: "学徒", level2: "行家", level3: "大师", thinking: "对手正在思考…", youWin: "你赢了！", aiWins: "AI 获胜", record: "战绩", subtitle: "美式西洋跳棋 · 人机对战", rules: "有吃子时必须吃子，并由同一棋子连续跳吃。普通棋子只能向前移动和吃子。跳吃中升王后本回合立即结束。无合法走法的一方判负。", continueJump: "请用同一棋子继续跳吃", captureRequired: "必须吃子", boardLabel: "西洋跳棋棋盘。使用方向键移动，按 Enter 或空格选择。", empty: "空格", king: "王", selectedLabel: "已选择", destinationLabel: "可移动到此处" },
    fr: { title: "Dames américaines", turn: "Tour", red: "Rouge", black: "Noir", win: "gagne !", over: "Partie terminée", reset: "Nouvelle partie", modeLocal: "2 joueurs", modeAi: "contre l'IA", level1: "Apprenti", level2: "Adepte", level3: "Maître", thinking: "Votre adversaire réfléchit…", youWin: "Vous gagnez !", aiWins: "L'IA gagne", record: "Bilan", subtitle: "Dames américaines · contre l'IA", rules: "La prise est obligatoire et les sauts multiples continuent avec la même pièce. Un pion avance et prend seulement vers l'avant. Une promotion pendant un saut termine le tour. Sans coup légal, la partie est perdue.", continueJump: "Continuez à sauter avec la même pièce", captureRequired: "Une prise est obligatoire", boardLabel: "Damier. Utilisez les flèches puis Entrée ou Espace pour sélectionner.", empty: "Vide", king: "dame", selectedLabel: "Sélectionnée", destinationLabel: "Destination possible" },
    es: { title: "Damas americanas", turn: "Turno", red: "Rojas", black: "Negras", win: "¡gana!", over: "Fin de la partida", reset: "Nueva partida", modeLocal: "2 jugadores", modeAi: "contra la IA", level1: "Aprendiz", level2: "Experto", level3: "Maestro", thinking: "Tu rival está pensando…", youWin: "¡Has ganado!", aiWins: "Gana la IA", record: "Historial", subtitle: "Damas americanas · contra la IA", rules: "Las capturas son obligatorias y los saltos múltiples continúan con la misma pieza. Las fichas normales solo avanzan y capturan hacia delante. Coronar durante un salto termina el turno. Pierde quien no tenga jugadas legales.", continueJump: "Sigue saltando con la misma pieza", captureRequired: "La captura es obligatoria", boardLabel: "Tablero de damas. Usa las flechas y Enter o Espacio para seleccionar.", empty: "Vacía", king: "dama", selectedLabel: "Seleccionada", destinationLabel: "Destino posible" },
};

const AI_INFO: Record<Locale, { difficulty: string; depth: Record<AiLevel,string>; review: string; captures: string; quiet: string }> = {
    ko:{difficulty:'AI 탐색',depth:{1:'2수 · 상위 3개 변주',2:'4수 · 최선 수',3:'6수 · 최선 수'},review:'패배 복기',captures:'개 연속 잡기',quiet:'이 수로 다음 합법 수가 막혔습니다'},
    en:{difficulty:'AI search',depth:{1:'2 ply · weighted top 3',2:'4 ply · best move',3:'6 ply · best move'},review:'Loss review',captures:'captures in chain',quiet:'This turn closed your remaining legal moves'},
    ja:{difficulty:'AI探索',depth:{1:'2 ply · 上位3手を変化',2:'4 ply · 最善手',3:'6 ply · 最善手'},review:'敗局の振り返り',captures:'連続取り',quiet:'この手で合法手がなくなりました'},
    zh:{difficulty:'AI搜索',depth:{1:'2 ply · 前3候选变体',2:'4 ply · 最佳着',3:'6 ply · 最佳着'},review:'败局复盘',captures:'次连续吃子',quiet:'这一步封住了剩余合法走法'},
    fr:{difficulty:'Recherche IA',depth:{1:'2 ply · top 3 pondéré',2:'4 ply · meilleur coup',3:'6 ply · meilleur coup'},review:'Revoir la défaite',captures:'prises en chaîne',quiet:'Ce tour a fermé vos derniers coups légaux'},
    es:{difficulty:'Búsqueda IA',depth:{1:'2 ply · top 3 ponderado',2:'4 ply · mejor jugada',3:'6 ply · mejor jugada'},review:'Revisión de derrota',captures:'capturas encadenadas',quiet:'Este turno cerró tus jugadas legales'},
};

const Checkers: React.FC<{ locale?: Locale }> = ({ locale = 'ko' }) => {
    const t = i18n[locale] ?? i18n.en;
    const x = EXTRA[locale] ?? EXTRA.en;
    const aiInfo = AI_INFO[locale] ?? AI_INFO.en;

    const [board, setBoard] = useState<(Piece | null)[]>(Array(SIZE * SIZE).fill(null));
    const [isRedTurn, setIsRedTurn] = useState(true);
    const [selected, setSelected] = useState<number | null>(null);
    const [forcedFrom, setForcedFrom] = useState<number | null>(null);
    const [winner, setWinner] = useState<number | null>(null);
    const [mode, setMode] = useState<GameMode>('local');
    const [level, setLevel] = useState<AiLevel>(2);
    const [thinking, setThinking] = useState(false);
    const [record, setRecord] = useState<GameRecord | null>(null);
    const [focusIndex, setFocusIndex] = useState(56);
    const [paused, setPaused] = useState(false);
    const [restored, setRestored] = useState(false);
    const [muted, setMuted] = useState(false);
    const [lastAiReview, setLastAiReview] = useState<CheckersTurnReview | null>(null);
    const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const squareRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const audio = useRef<AudioContext | null>(null);

    const tone = useCallback((kind: 'move' | 'capture' | 'win') => {
        if (muted || typeof AudioContext === 'undefined') return;
        const context = audio.current ?? new AudioContext(); audio.current = context;
        const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.frequency.value = kind === 'capture' ? 180 : kind === 'win' ? 620 : 360;
        gain.gain.setValueAtTime(.045, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .1);
        oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .1);
    }, [muted]);

    const initGame = useCallback(() => {
        clearCheckersSave();
        if (aiTimer.current) clearTimeout(aiTimer.current);
        const newBoard = Array(SIZE * SIZE).fill(null);
        for (let i = 0; i < SIZE * SIZE; i++) {
            const r = Math.floor(i / SIZE);
            const c = i % SIZE;
            if ((r + c) % 2 === 1) {
                if (r < 3) newBoard[i] = { player: 2, isKing: false };
                else if (r > 4) newBoard[i] = { player: 1, isKing: false };
            }
        }
        setBoard(newBoard);
        setIsRedTurn(true);
        setSelected(null);
        setForcedFrom(null);
        setWinner(null);
        setThinking(false);
        setFocusIndex(56);
        setPaused(false);
        setRestored(false);
        setLastAiReview(null);
    }, []);

    useEffect(() => {
        const restored = loadCheckersSave();
        if (restored) {
            if (aiTimer.current) clearTimeout(aiTimer.current);
            setBoard(restored.board);
            setIsRedTurn(restored.isRedTurn);
            setForcedFrom(restored.forcedFrom);
            setSelected(restored.forcedFrom);
            setMode(restored.mode);
            setLevel(restored.level);
            setWinner(null);
            setThinking(false);
            setFocusIndex(56);
            setPaused(true);
            setRestored(true);
        } else {
            initGame();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => { setRecord(getRecord('checkers')); }, []);
    useEffect(() => {
        const hidden = () => { if (document.hidden && winner === null) setPaused(true); };
        document.addEventListener('visibilitychange', hidden);
        return () => { document.removeEventListener('visibilitychange', hidden); if (aiTimer.current) clearTimeout(aiTimer.current); void audio.current?.close(); };
    }, [winner]);

    useEffect(() => {
        if (winner !== null) { clearCheckersSave(); return; }
        storeCheckersSave({ board, isRedTurn, forcedFrom, mode, level });
    }, [board, isRedTurn, forcedFrom, mode, level, winner]);

    const finish = (w: number) => {
        setWinner(w);
        tone('win');
        clearCheckersSave();
        if (mode === 'ai') setRecord(recordResult('checkers', w === AI_PLAYER ? 'l' : 'w'));
    };

    const handleSquareClick = (index: number) => {
        if (winner !== null || thinking || paused) return;
        if (mode === 'ai' && !isRedTurn) return; // AI's turn
        const piece = board[index];
        const player = isRedTurn ? 1 : 2;
        const legalMoves = checkersMoves(board, player, forcedFrom ?? undefined);

        if (selected !== null) {
            if (selected === index && forcedFrom === null) { setSelected(null); return; }
            const move = legalMoves.find((candidate) => candidate.from === selected && candidate.to === index);
            if (move) executeMove(move);
            else if (forcedFrom === null && piece?.player === player && legalMoves.some((candidate) => candidate.from === index)) setSelected(index);
        } else if (piece?.player === player && legalMoves.some((move) => move.from === index)) {
            setSelected(index);
        }
    };

    const endTurn = (newBoard: (Piece | null)[], mover: number) => {
        const opponent = mover === 1 ? 2 : 1;
        setForcedFrom(null);
        setSelected(null);
        if (checkersMoves(newBoard, opponent).length === 0) finish(mover);
        else setIsRedTurn(mover === 2);
    };

    const executeMove = (move: CheckersMove) => {
        const before = board[move.from]!;
        const newBoard = checkersApply(board, move);
        const crowned = !before.isKing && newBoard[move.to]?.isKing;

        setBoard(newBoard);
        tone(move.jumpOver !== undefined ? 'capture' : 'move');
        if (move.jumpOver !== undefined && !crowned && checkersMoves(newBoard, before.player, move.to).length > 0) {
            setForcedFrom(move.to);
            setSelected(move.to);
            return;
        }
        endTurn(newBoard, before.player);
    };

    // AI turn
    useEffect(() => {
        if (mode !== 'ai' || winner !== null || isRedTurn || paused) return;
        setThinking(true);
        aiTimer.current = setTimeout(() => {
            const move = checkersBestMove(board, AI_PLAYER, level);
            setThinking(false);
            if (move) {
                setLastAiReview(checkersTurnReview(move));
                const newBoard = checkersApplyTurn(board, move);
                setBoard(newBoard);
                endTurn(newBoard, AI_PLAYER);
            }
            else finish(1); // AI has no moves — human wins
        }, AI_DELAY_MS);
        return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, isRedTurn, winner, paused]);

    const switchMode = (m: GameMode) => {
        if (m === mode) return;
        setMode(m);
        initGame();
    };

    const moveBoardFocus = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        const row = Math.floor(index / SIZE), col = index % SIZE;
        let next = index;
        if (event.key === 'ArrowUp') next = Math.max(0, row - 1) * SIZE + col;
        else if (event.key === 'ArrowDown') next = Math.min(SIZE - 1, row + 1) * SIZE + col;
        else if (event.key === 'ArrowLeft') next = row * SIZE + Math.max(0, col - 1);
        else if (event.key === 'ArrowRight') next = row * SIZE + Math.min(SIZE - 1, col + 1);
        else if (event.key === 'Home') next = event.ctrlKey ? 0 : row * SIZE;
        else if (event.key === 'End') next = event.ctrlKey ? SIZE * SIZE - 1 : row * SIZE + SIZE - 1;
        else return;
        event.preventDefault();
        setFocusIndex(next);
        squareRefs.current[next]?.focus();
    };

    const winLabel = mode === 'ai'
        ? (winner === AI_PLAYER ? t.aiWins : t.youWin)
        : `${winner === 1 ? t.red : t.black} ${t.win}`;
    const availableMoves = checkersMoves(board, isRedTurn ? 1 : 2, forcedFrom ?? undefined);
    const squareName = (index: number) => `${String.fromCharCode(65 + index % SIZE)}${8 - Math.floor(index / SIZE)}`;

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} onReset={initGame}>
            <div className="mb-3 flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => { setPaused(value => !value); setRestored(false); }} className="min-h-11 rounded-xl border border-border px-3 text-xs font-bold">{paused ? `▶ ${x.resume}` : `Ⅱ ${x.pause}`}</button>
                <button type="button" onClick={() => setMuted(value => !value)} aria-pressed={muted} className="min-h-11 rounded-xl border border-border px-3 text-xs font-bold">{muted ? '🔇' : '🔊'} {x.sound}</button>
            </div>
            {(paused || restored) && winner === null && <p role="status" className="mb-3 text-center text-xs font-bold text-muted-foreground">{restored ? x.restored : x.pause}</p>}
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
                {mode === 'ai' && <p className="basis-full text-[11px] font-medium text-muted-foreground">{aiInfo.difficulty}: {aiInfo.depth[level]}</p>}
                {mode === 'ai' && record && (record.w + record.l + record.d > 0) && (
                    <span className="ml-auto text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {t.record} {record.w}–{record.l}{record.d ? `–${record.d}` : ''}
                    </span>
                )}
            </div>

            <div className="flex justify-between items-center mb-6">
                <div className={`flex items-center gap-2 p-2 rounded-xl border ${isRedTurn ? 'bg-destructive/10 border-destructive' : 'bg-muted border-transparent opacity-50'}`} aria-live="polite">
                    <div className="w-3 h-3 rounded-full bg-destructive shadow-sm" />
                    <span className="text-xs font-black uppercase tracking-widest">
                        {thinking ? t.thinking : forcedFrom !== null ? t.continueJump : `${isRedTurn ? t.red : t.black} ${t.turn}`}
                    </span>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase">
                    <span>{t.red}: {board.filter(p=>p?.player===1).length}</span>
                    <span>{t.black}: {board.filter(p=>p?.player===2).length}</span>
                </div>
            </div>

            <div className="pb-2">
            <div className="grid grid-cols-8 grid-rows-8 aspect-square w-full border-4 border-stone-800 shadow-lg overflow-hidden rounded-lg" role="grid" aria-label={t.boardLabel} aria-disabled={paused}>
                {board.map((piece, i) => {
                    const r = Math.floor(i / SIZE), c = i % SIZE;
                    const isDark = (r + c) % 2 === 1;
                    const isSelected = selected === i;
                    const isDestination = selected !== null && availableMoves.some((move) => move.from === selected && move.to === i);
                    return (
                        <button
                            key={i}
                            ref={(node) => { squareRefs.current[i] = node; }}
                            onClick={() => handleSquareClick(i)}
                            disabled={paused}
                            onFocus={() => setFocusIndex(i)}
                            onKeyDown={(event) => moveBoardFocus(event, i)}
                            tabIndex={focusIndex === i ? 0 : -1}
                            role="gridcell"
                            aria-selected={isSelected}
                            aria-label={`${String.fromCharCode(65 + c)}${8 - r}, ${piece ? `${piece.player === 1 ? t.red : t.black}${piece.isKing ? ` ${t.king}` : ''}` : t.empty}${isSelected ? `, ${t.selectedLabel}` : ''}${isDestination ? `, ${t.destinationLabel}` : ''}`}
                            className={`relative flex min-h-11 min-w-11 items-center justify-center cursor-pointer transition-colors motion-reduce:transition-none focus-visible:z-20 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-sky-500 ${
                                isDark ? 'bg-stone-700' : 'bg-stone-200'
                            }`}
                        >
                            {isSelected && <div className="absolute inset-0 bg-primary/20 ring-4 ring-primary ring-inset z-10" />}
                            {isDestination && <div className="absolute w-3 h-3 rounded-full bg-primary/70 z-10" />}
                            {piece && (
                                <div className={`w-[80%] h-[80%] rounded-full shadow-lg border-b-4 transform transition-all animate-in zoom-in-75 motion-reduce:transform-none motion-reduce:transition-none motion-reduce:animate-none ${
                                    piece.player === 1 ? 'bg-destructive border-destructive-foreground/30' : 'bg-slate-900 border-slate-700'
                                } flex items-center justify-center`}>
                                    {piece.isKing && <span className="text-white text-xs sm:text-lg">👑</span>}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">{availableMoves.some((move) => move.jumpOver !== undefined) ? `${t.captureRequired} · ` : ''}</strong>{t.rules}
            </div>

            {winner && (
                <div className="absolute inset-0 z-20 bg-background/60 backdrop-blur-sm rounded-4xl flex flex-col items-center justify-center animate-in fade-in zoom-in-95 motion-reduce:animate-none" role="status" aria-live="assertive">
                    <h4 className="text-4xl font-black text-foreground mb-4">{winLabel}</h4>
                    <p className="mb-4 text-sm font-bold text-muted-foreground">{x.redLeft} {board.filter(piece => piece?.player === 1).length} · {x.blackLeft} {board.filter(piece => piece?.player === 2).length}</p>
                    <p className="mb-4 text-xs text-muted-foreground">{x.captured} {winner === 1 ? 12 - board.filter(piece => piece?.player === 2).length : 12 - board.filter(piece => piece?.player === 1).length} · {x.next} 12</p>
                    {mode === 'ai' && winner === AI_PLAYER && lastAiReview && <div className="mb-4 max-w-xs rounded-2xl border border-amber-300/60 bg-amber-50 p-3 text-left text-xs text-stone-800"><p className="font-black text-amber-900">{aiInfo.review} · {squareName(lastAiReview.from)}→{squareName(lastAiReview.to)}</p><p className="mt-1">{lastAiReview.captures > 0 ? `${lastAiReview.captures} ${aiInfo.captures}` : aiInfo.quiet}</p><p className="mt-1 text-[10px] text-stone-500">{aiInfo.difficulty}: {aiInfo.depth[level]}</p></div>}
                    <button onClick={initGame} className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg">
                        {t.reset}
                    </button>
                </div>
            )}
        </GameContainer>
    );
};

export default Checkers;

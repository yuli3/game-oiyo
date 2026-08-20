import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { getBest, recordAchievementEvent, recordBest } from '../../lib/games/records';
import { loadReplayEnvelope, saveReplayEnvelope, verifyReplayEnvelope, type ReplayInput } from '../../lib/games/replay';
import { createGame2048Replay, game2048GhostBoards, replayGame2048, type Game2048ReplayAction } from '../../lib/games/game-2048-replay';
import { clearGame2048Save, loadGame2048Save, storeGame2048Save } from '../../lib/games/active-game-save';
import { usePrefersReducedMotion } from '../../lib/games/reduced-motion';
import { createGame2048, game2048Analysis, moveGame2048, restoreGame2048, type Game2048Direction, type Game2048State } from '../../lib/games/game-2048';

const COPY = {
    ko: { title: "2048 게임", subtitle: "Growth Logic", score: "점수", best: "최고 점수", over: "게임 종료", win: "2048 달성!", reset: "다시 시작", hint: "방향키 또는 스와이프로 이동" },
    en: { title: "2048 Game", subtitle: "Growth Logic", score: "Score", best: "Best", over: "Game Over", win: "2048 reached!", reset: "Reset", hint: "Arrow keys or swipe to move" },
    ja: { title: "2048ゲーム", subtitle: "Growth Logic", score: "スコア", best: "ベスト", over: "ゲーム終了", win: "2048達成！", reset: "リスタート", hint: "矢印キーまたはスワイプで移動" },
    zh: { title: "2048游戏", subtitle: "Growth Logic", score: "分数", best: "最高分", over: "游戏结束", win: "达成2048！", reset: "重新开始", hint: "方向键或滑动操作" },
    fr: { title: "Jeu 2048", subtitle: "Growth Logic", score: "Score", best: "Record", over: "Partie terminée", win: "2048 atteint !", reset: "Recommencer", hint: "Flèches ou glissez pour jouer" },
    es: { title: "Juego 2048", subtitle: "Growth Logic", score: "Puntos", best: "Récord", over: "Fin del juego", win: "¡2048 logrado!", reset: "Reiniciar", hint: "Flechas o desliza para mover" },
} as const;

const LEGACY_BEST_KEY = 'oiyo-2048-best'; // pre-unification key, read once for migration
const EXTRA={ko:{pause:"일시정지",resume:"계속",restored:"게임을 복원했습니다",sound:"소리",max:"최대 타일",empty:"빈 칸"},en:{pause:"Pause",resume:"Resume",restored:"Game restored",sound:"Sound",max:"Max tile",empty:"empty cells"},ja:{pause:"一時停止",resume:"再開",restored:"ゲームを復元しました",sound:"音",max:"最大タイル",empty:"空きマス"},zh:{pause:"暂停",resume:"继续",restored:"已恢复游戏",sound:"声音",max:"最大方块",empty:"空格"},fr:{pause:"Pause",resume:"Reprendre",restored:"Partie restaurée",sound:"Son",max:"Tuile max",empty:"cases vides"},es:{pause:"Pausa",resume:"Continuar",restored:"Partida restaurada",sound:"Sonido",max:"Ficha máxima",empty:"casillas vacías"}} as const;

const REPLAY={ko:{same:"같은 보드 재도전",fresh:"새 보드",ghost:"PB 고스트 보드"},en:{same:"Retry same board",fresh:"New board",ghost:"PB ghost board"},ja:{same:"同じ盤面で再挑戦",fresh:"新しい盤面",ghost:"PBゴースト盤面"},zh:{same:"重试同一棋盘",fresh:"新棋盘",ghost:"PB幽灵棋盘"},fr:{same:"Rejouer la même grille",fresh:"Nouvelle grille",ghost:"Grille fantôme PB"},es:{same:"Reintentar tablero",fresh:"Nuevo tablero",ghost:"Tablero fantasma PB"}} as const;

const Game2048: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;
    const x=EXTRA[(locale as keyof typeof EXTRA)]??EXTRA.en;
    const replayCopy=REPLAY[(locale as keyof typeof REPLAY)]??REPLAY.en;
    const reducedMotion = usePrefersReducedMotion();

    const [game, setGame] = useState<Game2048State>(()=>createGame2048(1));
    const [best, setBest] = useState(0);
    const [paused,setPaused]=useState(false);const[restored,setRestored]=useState(false);const[muted,setMuted]=useState(false);const[hasGhost,setHasGhost]=useState(false);const audio=useRef<AudioContext|null>(null);
    const seedRef=useRef<number|null>(null);const replayInputsRef=useRef<ReplayInput<Game2048ReplayAction>[]>([]);const ghostBoardsRef=useRef<(number|null)[][]>([]);const terminalRef=useRef(false);
    const touchStart = useRef<{ x: number; y: number } | null>(null);

    const startRun = useCallback((seedOverride?:number) => {
        clearGame2048Save();
        const seed=seedOverride??(typeof crypto!=="undefined"?crypto.getRandomValues(new Uint32Array(1))[0]:Date.now()>>>0);
        seedRef.current=seed>>>0;replayInputsRef.current=[];ghostBoardsRef.current=[];terminalRef.current=false;
        const prior=loadReplayEnvelope<Game2048ReplayAction>('game-2048');
        if(prior?.seed===seedRef.current){try{if(verifyReplayEnvelope(prior,replayGame2048))ghostBoardsRef.current=game2048GhostBoards(prior)}catch{ghostBoardsRef.current=[]}}
        setHasGhost(ghostBoardsRef.current.length>0);setGame(createGame2048(seedRef.current));setPaused(false);setRestored(false);
    }, []);
    const initGame=useCallback(()=>startRun(),[startRun]);
    const retrySame=useCallback(()=>startRun(seedRef.current??undefined),[startRun]);

    useEffect(() => {
        const saved = loadGame2048Save();
        if (saved) {
            seedRef.current=null;replayInputsRef.current=[];ghostBoardsRef.current=[];setHasGhost(false);
            const restoredState=restoreGame2048(saved.board,saved.score);if(restoredState){setGame(restoredState);setPaused(true);setRestored(true)}else initGame();
        } else {
            initGame();
        }
        const existing = getBest('game-2048');
        if (existing) { setBest(existing.value); return; }
        // One-time migration from the pre-unification per-game key
        try {
            const legacy = Number(localStorage.getItem(LEGACY_BEST_KEY));
            if (Number.isFinite(legacy) && legacy > 0) setBest(recordBest('game-2048', legacy, 'score', undefined, { trackPlay: false }).value);
        } catch { /* ignore */ }
    }, [initGame]);
    useEffect(()=>{const hidden=()=>{if(document.hidden)setPaused(true)};document.addEventListener("visibilitychange",hidden);return()=>{document.removeEventListener("visibilitychange",hidden);void audio.current?.close()}},[]);

    // Persist the active board after every applied move; terminal states are not resumable.
    useEffect(() => {
        if (game.status !== 'playing') { clearGame2048Save(); return; } storeGame2048Save({board:game.board,score:game.score});
    }, [game]);

    useEffect(() => {
        if(game.status==='playing'){terminalRef.current=false;return}
        if(!terminalRef.current){terminalRef.current=true;recordAchievementEvent('game-2048','played')}
    },[game.status]);

    const move = useCallback((direction: Game2048Direction) => { if(paused)return;const next=moveGame2048(game,direction);if(next===game)return;const nextInputs=[...replayInputsRef.current,{tick:game.moves,input:{type:'move' as const,direction}}];replayInputsRef.current=nextInputs;setGame(next);if(!muted){const context=audio.current??new AudioContext();audio.current=context;const o=context.createOscillator(),g=context.createGain();o.frequency.value=next.lastGain?440:220;g.gain.setValueAtTime(.04,context.currentTime);g.gain.exponentialRampToValueAtTime(.001,context.currentTime+.07);o.connect(g).connect(context.destination);o.start();o.stop(context.currentTime+.07)}if(next.score>best){if(seedRef.current!==null){try{const replay=createGame2048Replay(seedRef.current,next,nextInputs);if(verifyReplayEnvelope(replay,replayGame2048))saveReplayEnvelope(replay)}catch{/* drifted replay is discarded */}}recordAchievementEvent('game-2048','personal-best');setBest(recordBest('game-2048',next.score,'score',undefined,{trackPlay:false}).value);} }, [game,best,paused,muted]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (game.status !== 'playing') return;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                move(e.key.replace('Arrow', '').toLowerCase() as Game2048Direction);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [move, game.status]);

    const onTouchStart = (e: React.TouchEvent) => {
        const tch = e.touches[0];
        touchStart.current = { x: tch.clientX, y: tch.clientY };
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart.current) return;
        const tch = e.changedTouches[0];
        const dx = tch.clientX - touchStart.current.x;
        const dy = tch.clientY - touchStart.current.y;
        touchStart.current = null;
        const absX = Math.abs(dx), absY = Math.abs(dy);
        if (Math.max(absX, absY) < 24) return; // ignore taps
        if (absX > absY) move(dx > 0 ? 'right' : 'left');
        else move(dy > 0 ? 'down' : 'up');
    };

    const getTileColor = (val: number) => {
        const colors: Record<number, string> = {
            2: 'bg-muted text-muted-foreground',
            4: 'bg-accent/50 text-accent-foreground',
            8: 'bg-primary/20 text-primary',
            16: 'bg-primary/40 text-primary-foreground',
            32: 'bg-primary/60 text-primary-foreground',
            64: 'bg-primary/80 text-primary-foreground',
            128: 'bg-primary text-primary-foreground shadow-md',
            256: 'bg-chart-1 text-foreground shadow-md',
            512: 'bg-chart-2 text-foreground shadow-md',
            1024: 'bg-chart-3 text-foreground shadow-lg',
            2048: `bg-chart-4 text-foreground shadow-xl ${reducedMotion ? '' : 'animate-pulse'}`,
        };
        return colors[val] || 'bg-slate-900 text-white';
    };
    const analysis=game2048Analysis(game);const tiles=game.board.map((value,index)=>value===null?null:{id:`${index}-${value}`,value,x:index%4,y:Math.floor(index/4)});const ghostBoard=ghostBoardsRef.current[game.moves];

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} onReset={initGame}>
            <div className="flex justify-end gap-2 mb-6">
                <button type="button" onClick={()=>{setPaused(v=>!v);setRestored(false)}} className="min-h-11 px-3 rounded-xl border border-border font-bold text-xs">{paused?`▶ ${x.resume}`:`Ⅱ ${x.pause}`}</button><button type="button" onClick={()=>setMuted(v=>!v)} aria-pressed={muted} className="min-h-11 px-3 rounded-xl border border-border font-bold text-xs">{muted?'🔇':'🔊'} {x.sound}</button>
                <div className="px-3 py-1.5 bg-muted rounded-xl text-center min-w-[72px]">
                    <div className="text-[10px] font-black text-muted-foreground uppercase leading-none">{t.score}</div>
                    <div className="text-lg font-black text-primary leading-tight">{game.score.toLocaleString()}</div>
                </div>
                <div className="px-3 py-1.5 bg-muted rounded-xl text-center min-w-[72px]">
                    <div className="text-[10px] font-black text-muted-foreground uppercase leading-none">{t.best}</div>
                    <div className="text-lg font-black text-chart-2 leading-tight">{best.toLocaleString()}</div>
                </div>
            </div>
            {(paused||restored)&&<p className="mb-3 text-center text-xs font-bold text-muted-foreground" role="status">{x.restored} · {x.pause}</p>}

            <div
                className="relative aspect-square w-full max-w-sm mx-auto bg-muted/50 rounded-2xl p-2 grid grid-cols-4 grid-rows-4 gap-2 border border-border touch-none"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                role="grid"
                aria-label={t.title}
            >
                {/* Background Grid */}
                {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="bg-muted/80 rounded-lg" />
                ))}

                {/* Real Tiles */}
                <div className="absolute inset-0 p-2 pointer-events-none">
                    {tiles.map((tile) => tile && (
                        <div
                            key={tile.id}
                            style={{
                                left: `${tile.x * 25}%`,
                                top: `${tile.y * 25}%`,
                                width: '25%',
                                height: '25%',
                                padding: '4px',
                            }}
                            className={`absolute transition-all ease-in-out ${reducedMotion ? 'duration-50' : 'duration-100'}`}
                        >
                            <div className={`w-full h-full rounded-lg flex items-center justify-center font-black text-lg sm:text-2xl ${reducedMotion ? 'animate-in fade-in duration-75' : 'animate-in zoom-in-50'} ${getTileColor(tile.value)}`}>
                                {tile.value}
                            </div>
                        </div>
                    ))}
                </div>

                {game.status !== 'playing' && (
                    <div className={`absolute inset-0 z-10 bg-background/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center space-y-4 animate-in fade-in ${reducedMotion ? 'duration-75' : 'zoom-in-95'}`} role="status" aria-live="polite">
                        <h4 className="text-3xl font-black text-foreground">{game.status === 'won' ? t.win : t.over}</h4>
                        <p className="text-sm text-muted-foreground">{x.max} {analysis.max} · {analysis.empty} {x.empty}</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            <button onClick={retrySame} disabled={seedRef.current===null} className="min-h-11 rounded-full bg-primary px-6 font-bold text-primary-foreground disabled:opacity-50">{replayCopy.same}</button>
                            <button onClick={initGame} className="min-h-11 rounded-full border bg-muted px-6 font-bold">{replayCopy.fresh}</button>
                        </div>
                    </div>
                )}
            </div>

            {hasGhost && ghostBoard && game.status==='playing' && <section className="mx-auto mt-4 w-full max-w-sm rounded-2xl border border-amber-300/60 bg-amber-50 p-3" aria-label={replayCopy.ghost}><p className="mb-2 text-[10px] font-black uppercase tracking-wider text-amber-800">◇ {replayCopy.ghost} · {game.moves}</p><div className="grid grid-cols-4 gap-1">{ghostBoard.map((value,index)=><div key={index} className="grid aspect-square place-items-center rounded bg-white/70 text-[10px] font-black text-amber-900">{value??''}</div>)}</div></section>}

            <div className="mt-6 text-center text-[10px] text-muted-foreground font-medium italic">
                {t.hint}
            </div>
        </GameContainer>
    );
};

export default Game2048;

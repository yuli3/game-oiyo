import React, { useEffect, useRef, useState } from 'react';
import { Die, GameContainer } from '../ui/game/GamePrimitives';
import {
    initializeGame, rollDice, scoreCategory, toggleHoldDie,
    UPPER_CATEGORIES, LOWER_CATEGORIES,
    type Category, type GameState,
} from '../../lib/games/yahtzee';

const BEST_KEY = 'oiyo-yahtzee-best';
const ROLL_MS = 500;

const COPY = {
    ko: {
        title: '야찌 (Yahtzee)', subtitle: 'Dice Strategy',
        round: (n: number) => `라운드 ${n} / 13`, rollsLeft: (n: number) => `남은 굴림 ${n}`,
        total: '총점', best: '최고 기록', roll: '주사위 굴리기 🎲', rollFirst: '먼저 주사위를 굴리세요',
        gameOver: '게임 종료!', playAgain: '다시 하기', holdHint: '주사위를 눌러 고정/해제',
        upper: '상단 섹션', lower: '하단 섹션', bonus: '보너스 (63점 이상 +35)', yahtzeeBonus: '야찌 보너스',
        rules: '규칙 보기',
        rulesBody: ['13라운드 동안 매 라운드 주사위 5개를 최대 3번 굴립니다.', '굴림 사이에 주사위를 눌러 고정할 수 있습니다.', '굴림 후 점수표에서 한 칸을 선택해 채점합니다(빈 칸은 0점 처리 가능).', '상단(1~6) 합계가 63점 이상이면 +35 보너스.', '야찌(같은 눈 5개)는 50점, 이후 추가 야찌마다 +100 보너스.'],
        cats: { aces: '1 (Aces)', twos: '2 (Twos)', threes: '3 (Threes)', fours: '4 (Fours)', fives: '5 (Fives)', sixes: '6 (Sixes)', threeOfAKind: '트리플', fourOfAKind: '포카드', fullHouse: '풀하우스', smallStraight: '스몰 스트레이트', largeStraight: '라지 스트레이트', yahtzee: '야찌!', chance: '찬스' },
    },
    en: {
        title: 'Yahtzee', subtitle: 'Dice Strategy',
        round: (n: number) => `Round ${n} / 13`, rollsLeft: (n: number) => `Rolls left ${n}`,
        total: 'Total', best: 'Best', roll: 'Roll Dice 🎲', rollFirst: 'Roll the dice first',
        gameOver: 'Game Over!', playAgain: 'Play Again', holdHint: 'Tap a die to hold/release it',
        upper: 'Upper Section', lower: 'Lower Section', bonus: 'Bonus (63+ → +35)', yahtzeeBonus: 'Yahtzee Bonus',
        rules: 'Rules',
        rulesBody: ['Play 13 rounds; each round roll five dice up to 3 times.', 'Tap dice between rolls to hold them.', 'After rolling, pick one scorecard category (you may take a 0).', 'Upper section (1–6) totalling 63+ earns a +35 bonus.', 'Yahtzee (five of a kind) scores 50; each extra yahtzee adds +100.'],
        cats: { aces: 'Aces', twos: 'Twos', threes: 'Threes', fours: 'Fours', fives: 'Fives', sixes: 'Sixes', threeOfAKind: '3 of a Kind', fourOfAKind: '4 of a Kind', fullHouse: 'Full House', smallStraight: 'Small Straight', largeStraight: 'Large Straight', yahtzee: 'Yahtzee!', chance: 'Chance' },
    },
    ja: {
        title: 'ヤッツィー', subtitle: 'Dice Strategy',
        round: (n: number) => `ラウンド ${n} / 13`, rollsLeft: (n: number) => `残り ${n} 回`,
        total: '合計', best: 'ベスト', roll: 'サイコロを振る 🎲', rollFirst: 'まずサイコロを振ってください',
        gameOver: 'ゲーム終了！', playAgain: 'もう一度', holdHint: 'サイコロをタップでホールド/解除',
        upper: '上段セクション', lower: '下段セクション', bonus: 'ボーナス (63点以上 +35)', yahtzeeBonus: 'ヤッツィーボーナス',
        rules: 'ルール',
        rulesBody: ['13ラウンド、各ラウンドで5個のサイコロを最大3回振ります。', '振る合間にサイコロをタップしてホールドできます。', '振った後、スコア表から1つのカテゴリを選んで記入します(0点も可)。', '上段(1〜6)の合計が63点以上で+35ボーナス。', 'ヤッツィー(同じ目5個)は50点、以降の追加ヤッツィーは+100。'],
        cats: { aces: '1の目', twos: '2の目', threes: '3の目', fours: '4の目', fives: '5の目', sixes: '6の目', threeOfAKind: 'スリーカード', fourOfAKind: 'フォーカード', fullHouse: 'フルハウス', smallStraight: 'Sストレート', largeStraight: 'Lストレート', yahtzee: 'ヤッツィー！', chance: 'チャンス' },
    },
    zh: {
        title: '快艇骰子 (Yahtzee)', subtitle: 'Dice Strategy',
        round: (n: number) => `第 ${n} / 13 轮`, rollsLeft: (n: number) => `剩余 ${n} 次`,
        total: '总分', best: '最高分', roll: '掷骰子 🎲', rollFirst: '请先掷骰子',
        gameOver: '游戏结束！', playAgain: '再来一局', holdHint: '点击骰子锁定/解锁',
        upper: '上区', lower: '下区', bonus: '奖励 (满63分 +35)', yahtzeeBonus: '快艇奖励',
        rules: '规则',
        rulesBody: ['共13轮，每轮最多掷5颗骰子3次。', '两次投掷之间可点击骰子锁定。', '掷完后在计分表中选择一格计分(可记0分)。', '上区(1~6)合计满63分获得+35奖励。', '快艇(五个相同)得50分，之后每次额外快艇+100。'],
        cats: { aces: '一点', twos: '二点', threes: '三点', fours: '四点', fives: '五点', sixes: '六点', threeOfAKind: '三条', fourOfAKind: '四条', fullHouse: '葫芦', smallStraight: '小顺', largeStraight: '大顺', yahtzee: '快艇！', chance: '全选' },
    },
    fr: {
        title: 'Yahtzee', subtitle: 'Dice Strategy',
        round: (n: number) => `Manche ${n} / 13`, rollsLeft: (n: number) => `Lancers restants ${n}`,
        total: 'Total', best: 'Record', roll: 'Lancer les dés 🎲', rollFirst: "Lancez d'abord les dés",
        gameOver: 'Partie terminée !', playAgain: 'Rejouer', holdHint: 'Touchez un dé pour le garder/relâcher',
        upper: 'Section supérieure', lower: 'Section inférieure', bonus: 'Bonus (63+ → +35)', yahtzeeBonus: 'Bonus Yahtzee',
        rules: 'Règles',
        rulesBody: ['13 manches ; à chaque manche, lancez 5 dés jusqu\'à 3 fois.', 'Touchez les dés entre les lancers pour les garder.', 'Après un lancer, choisissez une case du tableau (0 possible).', 'Section supérieure (1–6) à 63+ : bonus de +35.', 'Le Yahtzee (5 identiques) vaut 50 ; chaque Yahtzee suivant +100.'],
        cats: { aces: 'As', twos: 'Deux', threes: 'Trois', fours: 'Quatre', fives: 'Cinq', sixes: 'Six', threeOfAKind: 'Brelan', fourOfAKind: 'Carré', fullHouse: 'Full', smallStraight: 'Petite suite', largeStraight: 'Grande suite', yahtzee: 'Yahtzee !', chance: 'Chance' },
    },
    es: {
        title: 'Yahtzee', subtitle: 'Dice Strategy',
        round: (n: number) => `Ronda ${n} / 13`, rollsLeft: (n: number) => `Tiradas restantes ${n}`,
        total: 'Total', best: 'Récord', roll: 'Lanzar dados 🎲', rollFirst: 'Lanza los dados primero',
        gameOver: '¡Fin del juego!', playAgain: 'Jugar otra vez', holdHint: 'Toca un dado para fijarlo/soltarlo',
        upper: 'Sección superior', lower: 'Sección inferior', bonus: 'Bono (63+ → +35)', yahtzeeBonus: 'Bono Yahtzee',
        rules: 'Reglas',
        rulesBody: ['13 rondas; en cada una lanza 5 dados hasta 3 veces.', 'Toca los dados entre tiradas para fijarlos.', 'Tras lanzar, elige una casilla del marcador (puedes anotar 0).', 'Sección superior (1–6) con 63+ gana un bono de +35.', 'El Yahtzee (5 iguales) vale 50; cada Yahtzee extra suma +100.'],
        cats: { aces: 'Unos', twos: 'Doses', threes: 'Treses', fours: 'Cuatros', fives: 'Cincos', sixes: 'Seises', threeOfAKind: 'Trío', fourOfAKind: 'Póker', fullHouse: 'Full', smallStraight: 'Escalera corta', largeStraight: 'Escalera larga', yahtzee: '¡Yahtzee!', chance: 'Suerte' },
    },
} as const;

const Yahtzee: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;

    const [state, setState] = useState<GameState>(initializeGame);
    const [best, setBest] = useState(0);
    const [rolling, setRolling] = useState(false);
    const [showRules, setShowRules] = useState(false);
    const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        try {
            const stored = Number(localStorage.getItem(BEST_KEY));
            if (Number.isFinite(stored) && stored > 0) setBest(stored);
        } catch { /* ignore */ }
        return () => { if (rollTimer.current) clearTimeout(rollTimer.current); };
    }, []);

    const handleRoll = () => {
        if (rolling || state.rollsLeft <= 0 || state.isGameOver) return;
        setRolling(true);
        rollTimer.current = setTimeout(() => {
            setRolling(false);
            setState((s) => rollDice(s));
        }, ROLL_MS);
    };

    const handleScore = (category: Category) => {
        if (rolling) return;
        setState((s) => {
            const next = scoreCategory(s, category);
            if (next.isGameOver && next.scorecard.totalScore > best) {
                setBest(next.scorecard.totalScore);
                try { localStorage.setItem(BEST_KEY, String(next.scorecard.totalScore)); } catch { /* ignore */ }
            }
            return next;
        });
    };

    const restart = () => setState(initializeGame());

    const canPick = state.rollsLeft < 3 && !state.isGameOver && !rolling;

    const ScoreRow: React.FC<{ category: Category; section: 'upper' | 'lower' }> = ({ category, section }) => {
        const cell = section === 'upper'
            ? state.scorecard.upper[category as keyof typeof state.scorecard.upper]
            : state.scorecard.lower[category as keyof typeof state.scorecard.lower];
        return (
            <tr className="border-b border-border/50">
                <td className="py-1.5 px-3 text-sm font-medium text-foreground">{t.cats[category]}</td>
                <td
                    onClick={() => canPick && !cell.used && handleScore(category)}
                    className={`py-1.5 px-3 text-center text-sm w-20 transition-colors ${
                        cell.used
                            ? 'bg-muted/60 font-black text-foreground'
                            : canPick
                                ? 'cursor-pointer hover:bg-primary/10 text-muted-foreground'
                                : 'text-muted-foreground/40'
                    }`}
                    role={!cell.used && canPick ? 'button' : undefined}
                    aria-label={`${t.cats[category]}: ${cell.used ? cell.score : cell.possibleScore ?? ''}`}
                >
                    {cell.used ? cell.score : canPick ? cell.possibleScore ?? 0 : ''}
                </td>
            </tr>
        );
    };

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} onReset={restart}>
            {/* Status */}
            <div className="flex justify-between items-center mb-4 text-xs font-bold text-muted-foreground">
                <div>
                    <div>{t.round(Math.min(state.round, 13))}</div>
                    <div>{t.rollsLeft(state.rollsLeft)}</div>
                </div>
                <div className="text-right">
                    <div>{t.total}: <span className="text-primary text-lg font-black">{state.scorecard.totalScore}</span></div>
                    <div>{t.best}: <span className="text-chart-2 font-black">{best}</span></div>
                </div>
            </div>

            {state.isGameOver ? (
                <div className="py-10 text-center space-y-4 animate-fade-up motion-reduce:animate-none" role="status" aria-live="polite">
                    <h4 className="text-2xl font-black text-foreground">{t.gameOver}</h4>
                    <p className="text-4xl font-black text-primary">{state.scorecard.totalScore}</p>
                    <button onClick={restart} className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity">
                        {t.playAgain}
                    </button>
                </div>
            ) : (
                <>
                    {/* Dice tray */}
                    <div className="flex justify-center gap-2 sm:gap-3 my-4">
                        {state.diceValues.map((value, i) => (
                            <button
                                key={i}
                                onClick={() => setState((s) => toggleHoldDie(s, i))}
                                disabled={state.rollsLeft === 3 || state.rollsLeft === 0 || rolling}
                                aria-pressed={state.heldDice[i]}
                                aria-label={`Die ${i + 1}: ${value}${state.heldDice[i] ? ' (held)' : ''}`}
                                className={`rounded-2xl p-1 transition-all ${
                                    state.heldDice[i] ? 'ring-2 ring-primary bg-primary/10 -translate-y-1' : ''
                                } disabled:cursor-default`}
                            >
                                <Die type="D6" value={value} rolling={rolling && !state.heldDice[i]} size={52} />
                            </button>
                        ))}
                    </div>
                    <p className="text-center text-[10px] text-muted-foreground mb-3">
                        {state.rollsLeft === 3 ? t.rollFirst : t.holdHint}
                    </p>

                    <button
                        onClick={handleRoll}
                        disabled={state.rollsLeft === 0 || rolling}
                        className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-black shadow-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        {t.roll}
                    </button>

                    {/* Scorecard */}
                    <div className="mt-6 grid sm:grid-cols-2 gap-4">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr><th colSpan={2} className="text-left py-2 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">{t.upper}</th></tr>
                            </thead>
                            <tbody>
                                {UPPER_CATEGORIES.map((c) => <ScoreRow key={c} category={c} section="upper" />)}
                                <tr>
                                    <td className="py-1.5 px-3 text-xs font-bold text-muted-foreground">{t.bonus}</td>
                                    <td className="py-1.5 px-3 text-center text-sm font-black">{state.scorecard.upperBonus}</td>
                                </tr>
                            </tbody>
                        </table>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr><th colSpan={2} className="text-left py-2 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">{t.lower}</th></tr>
                            </thead>
                            <tbody>
                                {LOWER_CATEGORIES.map((c) => <ScoreRow key={c} category={c} section="lower" />)}
                                {state.scorecard.yahtzeeBonusCount > 0 && (
                                    <tr>
                                        <td className="py-1.5 px-3 text-xs font-bold text-chart-2">{t.yahtzeeBonus}</td>
                                        <td className="py-1.5 px-3 text-center text-sm font-black text-chart-2">+{state.scorecard.yahtzeeBonusCount * 100}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Rules */}
            <div className="mt-6">
                <button
                    onClick={() => setShowRules((v) => !v)}
                    aria-expanded={showRules}
                    className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                    {showRules ? '▾' : '▸'} {t.rules}
                </button>
                {showRules && (
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground list-disc pl-5">
                        {t.rulesBody.map((line, i) => <li key={i}>{line}</li>)}
                    </ul>
                )}
            </div>
        </GameContainer>
    );
};

export default Yahtzee;

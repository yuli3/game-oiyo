import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { getBest, recordBest, getBestForConditions, recordBestForConditions, getDailyStreak, recordAchievementEvent, recordDailyWin, type BestConditions, type DailyStreak } from '../../lib/games/records';
import { dayIndex, todayKey, previousDayKey } from '../../lib/games/daily';
import { displayedGameSeconds, elapsedGameMilliseconds, recordedGameSeconds, restoredElapsedMilliseconds } from '../../lib/games/minesweeper-timing';
import { clearMinesweeperSave, loadMinesweeperSave, storeMinesweeperSave } from '../../lib/games/minesweeper-save';
import {
    advanceMinesweeperOnboarding,
    freshMinesweeperOnboarding,
    loadMinesweeperOnboarding,
    nextMinesweeperOnboardingStep,
    storeMinesweeperOnboarding,
    type MinesweeperOnboarding,
    type MinesweeperOnboardingMilestone,
} from '../../lib/games/minesweeper-onboarding';
import {
    chordMinesweeperCell,
    createEmptyBoard,
    createNoGuessMinesweeperBoard,
    findMinesweeperHint,
    revealMinesweeperCell,
    toggleMinesweeperFlag,
    summarizeMinesweeperResult,
    MINESWEEPER_DIFFICULTIES,
    type MinesweeperBoard,
    type MinesweeperDifficultyId,
    type MinesweeperHint,
    type RevealResult,
} from '../../lib/games/minesweeper';
import { MINESWEEPER_SPRITES } from '../../lib/games/sprites';

const LEGACY_BEST_KEY = 'oiyo-minesweeper-best'; // pre-unification key, read once for migration

// Daily challenge is pinned to Intermediate size and a fixed centre opening so
// every player gets the exact same board — first-click-safe generation
// otherwise depends on wherever the player clicks, which free play wants but a
// shared daily puzzle can't allow.
const DAILY_DIFFICULTY_ID: MinesweeperDifficultyId = 'intermediate';
const DAILY_GAME_ID = 'minesweeper-daily';

function createGenerationSeed(): number {
    return (Date.now() ^ Math.floor(Math.random() * 0x1_0000_0000)) | 0;
}

function bestKeyFor(id: MinesweeperDifficultyId): string {
    return id === 'beginner' ? 'minesweeper' : `minesweeper-${id}`;
}

function generateDailyBoard() {
    const difficulty = MINESWEEPER_DIFFICULTIES[DAILY_DIFFICULTY_ID];
    const cx = Math.floor(difficulty.width / 2);
    const cy = Math.floor(difficulty.height / 2);
    const seed = (0x4d53 ^ Math.imul(dayIndex() + 1, 2654435761)) | 0;
    const generated = createNoGuessMinesweeperBoard(difficulty, cx, cy, seed);
    const opened = revealMinesweeperCell(generated.board, cx, cy).board;
    return { board: opened, strategy: generated.strategy, seed };
}

const COPY = {
    ko: { title: "지뢰찾기", subtitle: "Logic Sweep", mines: "남은 지뢰", time: "시간", over: "폭발! 게임 종료", win: "모든 안전 칸을 열었습니다!", reset: "새 게임", dig: "파기", flag: "깃발", best: "최단 기록", hint: "숫자를 다시 누르면 주변 깃발 수가 맞을 때 한꺼번에 엽니다 · 모바일: 깃발 모드 · PC: 우클릭", pending: "첫 클릭은 항상 안전하며, 클릭 위치에 맞춰 판을 만듭니다.", verified: "이 판은 표준 논리 추론만으로 풀 수 있음을 검증했습니다.", fallback: "첫 클릭은 안전하지만 제한된 생성 횟수 안에 무추측 검증을 마치지 못한 판입니다.", row: "행", column: "열", hidden: "닫힌 칸", flagged: "깃발 표시", mine: "지뢰", empty: "빈 칸", number: "주변 지뢰", daily: "📅 오늘의 도전", free: "자유 플레이", beginner: "초급 10×10", intermediate: "중급 16×16", expert: "고급 30×16", streak: "연속", doneToday: "오늘 완료 ✓" },
    en: { title: "Minesweeper", subtitle: "Logic Sweep", mines: "Mines", time: "Time", over: "BOOM! Game Over", win: "All safe cells cleared!", reset: "New Game", dig: "Dig", flag: "Flag", best: "Best Time", hint: "Press an open number again to clear around matching flags · Mobile: flag mode · PC: right-click", pending: "The first click is always safe; the board is generated around it.", verified: "This board was verified solvable using standard logical deductions only.", fallback: "The first click is safe, but no-guess verification did not finish within the generation limit.", row: "row", column: "column", hidden: "hidden cell", flagged: "flagged", mine: "mine", empty: "empty", number: "adjacent mines", daily: "📅 Daily Challenge", free: "Free Play", beginner: "Beginner 10×10", intermediate: "Intermediate 16×16", expert: "Expert 30×16", streak: "Streak", doneToday: "Done today ✓" },
    ja: { title: "マインスイーパー", subtitle: "Logic Sweep", mines: "残り地雷", time: "時間", over: "ドカン！ゲーム終了", win: "安全なマスをすべて開きました！", reset: "新しいゲーム", dig: "掘る", flag: "旗", best: "最短記録", hint: "開いた数字を再度押すと、旗の数が合う場合に周囲を一括で開きます · モバイル: 旗モード · PC: 右クリック", pending: "最初のクリックは必ず安全で、その位置に合わせて盤面を生成します。", verified: "この盤面は標準的な論理推論だけで解けることを検証済みです。", fallback: "最初のクリックは安全ですが、生成上限内に推測不要の検証を完了できませんでした。", row: "行", column: "列", hidden: "閉じたマス", flagged: "旗付き", mine: "地雷", empty: "空白", number: "周囲の地雷", daily: "📅 デイリー挑戦", free: "フリープレイ", beginner: "初級 10×10", intermediate: "中級 16×16", expert: "上級 30×16", streak: "連続", doneToday: "本日クリア ✓" },
    zh: { title: "扫雷", subtitle: "Logic Sweep", mines: "剩余地雷", time: "时间", over: "爆炸！游戏结束", win: "已打开所有安全格！", reset: "新游戏", dig: "挖开", flag: "插旗", best: "最快记录", hint: "再次按已打开的数字，旗帜数匹配时可一次打开周围 · 手机: 插旗模式 · 电脑: 右键", pending: "首次点击始终安全，棋盘会围绕该位置生成。", verified: "此棋盘已验证可仅用标准逻辑推理完成。", fallback: "首次点击安全，但在生成次数上限内未完成无猜测验证。", row: "行", column: "列", hidden: "未打开", flagged: "已插旗", mine: "地雷", empty: "空格", number: "相邻地雷", daily: "📅 每日挑战", free: "自由模式", beginner: "初级 10×10", intermediate: "中级 16×16", expert: "高级 30×16", streak: "连续", doneToday: "今日已完成 ✓" },
    fr: { title: "Démineur", subtitle: "Logic Sweep", mines: "Mines", time: "Temps", over: "BOUM ! Partie terminée", win: "Toutes les cases sûres sont ouvertes !", reset: "Nouvelle partie", dig: "Creuser", flag: "Drapeau", best: "Meilleur temps", hint: "Réactivez un nombre ouvert pour dégager autour des drapeaux correspondants · Mobile : drapeau · PC : clic droit", pending: "Le premier clic est toujours sûr ; la grille est générée autour de lui.", verified: "Cette grille a été vérifiée comme résoluble uniquement par déductions logiques standard.", fallback: "Le premier clic est sûr, mais la vérification sans conjecture n'a pas abouti dans la limite de génération.", row: "ligne", column: "colonne", hidden: "case fermée", flagged: "drapeau", mine: "mine", empty: "vide", number: "mines voisines", daily: "📅 Défi du jour", free: "Partie libre", beginner: "Débutant 10×10", intermediate: "Intermédiaire 16×16", expert: "Expert 30×16", streak: "Série", doneToday: "Fini aujourd'hui ✓" },
    es: { title: "Buscaminas", subtitle: "Logic Sweep", mines: "Minas", time: "Tiempo", over: "¡BUM! Fin del juego", win: "¡Abriste todas las casillas seguras!", reset: "Nueva partida", dig: "Cavar", flag: "Bandera", best: "Mejor tiempo", hint: "Pulsa de nuevo un número abierto para despejar alrededor de las banderas coincidentes · Móvil: bandera · PC: clic derecho", pending: "El primer clic siempre es seguro; el tablero se genera a su alrededor.", verified: "Se verificó que este tablero puede resolverse solo con deducciones lógicas estándar.", fallback: "El primer clic es seguro, pero la verificación sin adivinar no terminó dentro del límite de generación.", row: "fila", column: "columna", hidden: "casilla cerrada", flagged: "con bandera", mine: "mina", empty: "vacía", number: "minas adyacentes", daily: "📅 Reto diario", free: "Juego libre", beginner: "Principiante 10×10", intermediate: "Intermedio 16×16", expert: "Experto 30×16", streak: "Racha", doneToday: "Hecho hoy ✓" },
} as const;

const HINT_COPY = {
    ko: { action: "논리 힌트", none: "현재 공개된 숫자와 깃발만으로 확정할 수 있는 수가 없습니다. 깃발을 다시 확인해 보세요.", assisted: "힌트 사용 기록", safe: "이 숫자 주변의 남은 지뢰가 0개이므로 강조된 칸은 안전합니다.", mine: "남은 닫힌 칸 수와 지뢰 수가 같으므로 강조된 칸은 지뢰입니다.", subsetSafe: "두 숫자의 후보 집합을 비교하면 차이 칸에는 지뢰가 없으므로 안전합니다.", subsetMine: "두 숫자의 후보 집합을 비교하면 차이 칸은 모두 지뢰입니다.", candidates: "후보 칸" },
    en: { action: "Logic hint", none: "The visible clues and your flags do not prove a move yet. Check the flags and continue.", assisted: "Assisted record", safe: "This clue has no mines left, so the highlighted cells are safe.", mine: "The remaining hidden cells equal the remaining mines, so the highlighted cells are mines.", subsetSafe: "Comparing the two clue sets proves that the difference contains no mines.", subsetMine: "Comparing the two clue sets proves that every cell in the difference is a mine.", candidates: "candidate cells" },
    ja: { action: "論理ヒント", none: "公開された数字と旗だけでは確定できる手がありません。旗を確認して続けてください。", assisted: "ヒント使用記録", safe: "この数字の周囲に残る地雷は0個なので、強調マスは安全です。", mine: "閉じたマス数と残り地雷数が同じなので、強調マスは地雷です。", subsetSafe: "2つの数字の候補集合を比べると、差分のマスに地雷はありません。", subsetMine: "2つの数字の候補集合を比べると、差分のマスはすべて地雷です。", candidates: "候補マス" },
    zh: { action: "逻辑提示", none: "仅凭已公开数字和当前旗帜还无法确定下一步。请检查旗帜后继续。", assisted: "已使用提示的记录", safe: "该数字周围剩余地雷为0，因此高亮格安全。", mine: "剩余隐藏格数等于剩余地雷数，因此高亮格都是地雷。", subsetSafe: "比较两个数字的候选集合可知，差集格不含地雷。", subsetMine: "比较两个数字的候选集合可知，差集格全部是地雷。", candidates: "候选格" },
    fr: { action: "Indice logique", none: "Les indices visibles et vos drapeaux ne prouvent encore aucun coup. Vérifiez les drapeaux et continuez.", assisted: "Record avec indice", safe: "Il ne reste aucune mine autour de cet indice : les cases surlignées sont sûres.", mine: "Le nombre de cases fermées égale celui des mines restantes : les cases surlignées sont des mines.", subsetSafe: "La comparaison des deux ensembles prouve que leur différence ne contient aucune mine.", subsetMine: "La comparaison des deux ensembles prouve que chaque case de la différence est une mine.", candidates: "cases candidates" },
    es: { action: "Pista lógica", none: "Las pistas visibles y tus banderas todavía no demuestran una jugada. Revisa las banderas y continúa.", assisted: "Récord con pista", safe: "No quedan minas alrededor de esta pista, así que las casillas resaltadas son seguras.", mine: "Las casillas ocultas restantes igualan las minas restantes, así que las resaltadas son minas.", subsetSafe: "Al comparar los dos conjuntos, la diferencia no contiene minas.", subsetMine: "Al comparar los dos conjuntos, todas las casillas de la diferencia son minas.", candidates: "casillas candidatas" },
} as const;

const M3_COPY = {
    ko: { overview: "전체판 보기", closeOverview: "전체판 닫기", overviewHelp: "색은 공개·깃발·닫힘 상태만 나타내며, 실제 플레이는 아래 44px 판에서 계속합니다.", longPress: "모바일에서는 칸을 길게 누르면 깃발을 놓습니다.", boardState: "판 상태", revealed: "공개", closed: "닫힘", flags: "깃발", safeProgress: "안전 칸 진행", correctFlags: "정확한 깃발", wrongFlags: "잘못된 깃발", newBest: "새 최단 기록!", nextGoal: "다음 목표", assistedResult: "힌트를 사용한 기록으로 별도 집계됩니다." },
    en: { overview: "Board overview", closeOverview: "Close overview", overviewHelp: "Colors show only revealed, flagged, and hidden states. Keep playing on the 44px board below.", longPress: "On mobile, press and hold a cell to place a flag.", boardState: "Board status", revealed: "revealed", closed: "hidden", flags: "flags", safeProgress: "Safe-cell progress", correctFlags: "Correct flags", wrongFlags: "Wrong flags", newBest: "New best time!", nextGoal: "Next goal", assistedResult: "This result is tracked separately as an assisted run." },
    ja: { overview: "全体盤を見る", closeOverview: "全体盤を閉じる", overviewHelp: "色は公開・旗・未公開の状態だけを示します。プレイは下の44px盤で続けます。", longPress: "モバイルではマスを長押しすると旗を置けます。", boardState: "盤面状態", revealed: "公開", closed: "未公開", flags: "旗", safeProgress: "安全マス進行", correctFlags: "正しい旗", wrongFlags: "誤った旗", newBest: "新記録！", nextGoal: "次の目標", assistedResult: "ヒント使用記録として別に集計されます。" },
    zh: { overview: "查看全盘", closeOverview: "关闭全盘", overviewHelp: "颜色仅表示已开、旗帜和隐藏状态；请继续在下方44px棋盘操作。", longPress: "在手机上长按格子可放置旗帜。", boardState: "棋盘状态", revealed: "已开", closed: "隐藏", flags: "旗帜", safeProgress: "安全格进度", correctFlags: "正确旗帜", wrongFlags: "错误旗帜", newBest: "新的最快记录！", nextGoal: "下一目标", assistedResult: "该成绩将作为使用提示的记录单独统计。" },
    fr: { overview: "Vue d’ensemble", closeOverview: "Fermer l’aperçu", overviewHelp: "Les couleurs indiquent seulement les cases révélées, marquées et cachées. Jouez sur la grille de 44 px ci-dessous.", longPress: "Sur mobile, maintenez une case pour poser un drapeau.", boardState: "État de la grille", revealed: "révélées", closed: "cachées", flags: "drapeaux", safeProgress: "Progression sûre", correctFlags: "Drapeaux corrects", wrongFlags: "Drapeaux erronés", newBest: "Nouveau meilleur temps !", nextGoal: "Prochain objectif", assistedResult: "Ce résultat est compté séparément comme partie assistée." },
    es: { overview: "Vista del tablero", closeOverview: "Cerrar vista", overviewHelp: "Los colores solo muestran casillas abiertas, marcadas y ocultas. Sigue jugando en el tablero de 44 px inferior.", longPress: "En móvil, mantén pulsada una casilla para colocar una bandera.", boardState: "Estado del tablero", revealed: "abiertas", closed: "ocultas", flags: "banderas", safeProgress: "Progreso seguro", correctFlags: "Banderas correctas", wrongFlags: "Banderas erróneas", newBest: "¡Nuevo mejor tiempo!", nextGoal: "Siguiente objetivo", assistedResult: "Este resultado se registra por separado como partida asistida." },
} as const;

const ONBOARD_COPY = {
    ko: { progress: "조작 배우기", reveal: "칸을 탭하면 팝니다. 첫 탭은 항상 안전합니다.", flagTouch: "지뢰로 의심되는 닫힌 칸을 길게 눌러 깃발을 놓아 보세요.", flagMouse: "지뢰로 의심되는 닫힌 칸을 우클릭해 깃발을 놓아 보세요.", chord: "숫자 주변 깃발 수가 그 숫자와 같아지면, 숫자를 다시 탭해 남은 주변 칸을 한꺼번에 여세요." },
    en: { progress: "Learn the controls", reveal: "Tap a cell to dig. Your first tap is always safe.", flagTouch: "Press and hold a hidden cell you suspect to place a flag.", flagMouse: "Right-click a hidden cell you suspect to place a flag.", chord: "When the flags around a number match it, tap that number again to open the rest around it at once." },
    ja: { progress: "操作を学ぶ", reveal: "マスをタップすると掘れます。最初のタップは必ず安全です。", flagTouch: "地雷が疑わしい閉じたマスを長押しして旗を置いてみましょう。", flagMouse: "地雷が疑わしい閉じたマスを右クリックして旗を置いてみましょう。", chord: "数字の周囲の旗がその数字と同じになったら、数字を再度タップして残りの周囲を一括で開きます。" },
    zh: { progress: "学习操作", reveal: "点按格子即可挖开。第一次点按始终安全。", flagTouch: "长按可疑的未开格子来插旗。", flagMouse: "右键点击可疑的未开格子来插旗。", chord: "当数字周围的旗帜数与该数字相同时，再次点按该数字即可一次打开剩余相邻格。" },
    fr: { progress: "Apprendre les commandes", reveal: "Touchez une case pour creuser. Le premier contact est toujours sûr.", flagTouch: "Maintenez une case fermée suspecte pour poser un drapeau.", flagMouse: "Faites un clic droit sur une case fermée suspecte pour poser un drapeau.", chord: "Quand les drapeaux autour d'un nombre lui correspondent, touchez ce nombre à nouveau pour ouvrir le reste d'un coup." },
    es: { progress: "Aprende los controles", reveal: "Toca una casilla para cavar. El primer toque siempre es seguro.", flagTouch: "Mantén pulsada una casilla oculta sospechosa para colocar una bandera.", flagMouse: "Haz clic derecho en una casilla oculta sospechosa para colocar una bandera.", chord: "Cuando las banderas alrededor de un número coincidan con él, toca ese número de nuevo para abrir el resto de una vez." },
} as const;

// Classic minesweeper number colors mapped to design tokens
const NUM_COLORS: Record<number, string> = {
    1: 'text-chart-2',
    2: 'text-primary',
    3: 'text-destructive',
    4: 'text-chart-4',
    5: 'text-chart-5',
    6: 'text-chart-1',
    7: 'text-foreground',
    8: 'text-muted-foreground',
};

type Mode = 'daily' | MinesweeperDifficultyId;

const Minesweeper: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const t = COPY[(locale as keyof typeof COPY)] ?? COPY.en;
    const ht = HINT_COPY[(locale as keyof typeof HINT_COPY)] ?? HINT_COPY.en;
    const m3 = M3_COPY[(locale as keyof typeof M3_COPY)] ?? M3_COPY.en;
    const ob = ONBOARD_COPY[(locale as keyof typeof ONBOARD_COPY)] ?? ONBOARD_COPY.en;

    const [mode, setMode] = useState<Mode>('daily');
    const difficultyId: MinesweeperDifficultyId = mode === 'daily' ? DAILY_DIFFICULTY_ID : mode;
    const { width, height, mineCount } = MINESWEEPER_DIFFICULTIES[difficultyId];

    const [board, setBoard] = useState<MinesweeperBoard>(() => createEmptyBoard(width, height));
    const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
    const [timer, setTimer] = useState(0);
    const [flagMode, setFlagMode] = useState(false);
    const [firstClick, setFirstClick] = useState(true);
    const [hasStarted, setHasStarted] = useState(false);
    const [bestTime, setBestTime] = useState<number | null>(null);
    const [activeCell, setActiveCell] = useState(0);
    const [generationStrategy, setGenerationStrategy] = useState<'pending' | 'verified' | 'safe-fallback'>('pending');
    const [streak, setStreak] = useState<DailyStreak | null>(null);
    const [dailyDate, setDailyDate] = useState(() => todayKey());
    const [hydrated, setHydrated] = useState(false);
    const [assist, setAssist] = useState<'none' | 'hint'>('none');
    const [currentHint, setCurrentHint] = useState<MinesweeperHint | null>(null);
    const [hintUnavailable, setHintUnavailable] = useState(false);
    const [overviewOpen, setOverviewOpen] = useState(false);
    const [isNewBest, setIsNewBest] = useState(false);
    const [onboarding, setOnboarding] = useState<MinesweeperOnboarding>(() => freshMinesweeperOnboarding());
    const [coarsePointer, setCoarsePointer] = useState(false);
    const generationSeed = useRef(createGenerationSeed());
    const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const recordedRef = useRef(false);
    const startedAtRef = useRef<number | null>(null);
    const longPressTimerRef = useRef<number | null>(null);
    const longPressTriggeredRef = useRef(false);

    const recordConditions = useCallback((): BestConditions => ({
        seed: mode === 'daily' ? `daily-${dailyDate}` : `free-${generationSeed.current}`,
        difficulty: difficultyId,
        assist,
    }), [assist, dailyDate, difficultyId, mode]);

    const initBoard = useCallback((next: Mode) => {
        const id = next === 'daily' ? DAILY_DIFFICULTY_ID : next;
        const dims = MINESWEEPER_DIFFICULTIES[id];
        setMode(next);
        setFlagMode(false);
        setActiveCell(0);
        setTimer(0);
        setHasStarted(false);
        startedAtRef.current = null;
        recordedRef.current = false;
        setAssist('none');
        setCurrentHint(null);
        setHintUnavailable(false);
        setOverviewOpen(false);
        setIsNewBest(false);
        clearMinesweeperSave();
        if (next === 'daily') {
            const daily = generateDailyBoard();
            setBoard(daily.board);
            setGenerationStrategy(daily.strategy);
            setFirstClick(false);
            setDailyDate(todayKey());
            generationSeed.current = daily.seed;
        } else {
            setBoard(createEmptyBoard(dims.width, dims.height));
            setGenerationStrategy('pending');
            setFirstClick(true);
            generationSeed.current = createGenerationSeed();
        }
        setStatus('playing');
        const conditions: BestConditions = {
            seed: next === 'daily' ? `daily-${todayKey()}` : `free-${generationSeed.current}`,
            difficulty: id,
            assist: 'none',
        };
        setBestTime(getBestForConditions(bestKeyFor(id), conditions)?.value ?? null);
    }, []);

    useEffect(() => {
        const today = todayKey();
        const nowEpochMs = Date.now();
        const saved = loadMinesweeperSave(today, nowEpochMs);
        if (saved) {
            const restoredElapsed = saved.hasStarted
                ? restoredElapsedMilliseconds(saved.elapsedMs, saved.savedAtEpochMs, nowEpochMs)
                : 0;
            setMode(saved.mode);
            setBoard(saved.board);
            setStatus('playing');
            setTimer(Math.floor(restoredElapsed / 1000));
            setFlagMode(saved.flagMode);
            setFirstClick(saved.firstClick);
            setHasStarted(saved.hasStarted);
            setActiveCell(saved.activeCell);
            setGenerationStrategy(saved.generationStrategy);
            setDailyDate(saved.dailyDate);
            setAssist(saved.assist);
            generationSeed.current = saved.generationSeed;
            startedAtRef.current = saved.hasStarted ? performance.now() - restoredElapsed : null;
            const restoredDifficulty = saved.mode === 'daily' ? DAILY_DIFFICULTY_ID : saved.mode;
            setBestTime(getBestForConditions(bestKeyFor(restoredDifficulty), {
                seed: saved.mode === 'daily' ? `daily-${saved.dailyDate}` : `free-${saved.generationSeed}`,
                difficulty: restoredDifficulty,
                assist: saved.assist,
            })?.value ?? null);
        } else {
            initBoard('daily');
        }
        setStreak(getDailyStreak(DAILY_GAME_ID, today, previousDayKey(today)));
        // One-time migration from the pre-unification per-game key (beginner best time)
        try {
            if (!getBest('minesweeper')) {
                const legacy = Number(localStorage.getItem(LEGACY_BEST_KEY));
                if (Number.isFinite(legacy) && legacy > 0) recordBest('minesweeper', legacy, 'seconds', undefined, { trackPlay: false });
            }
        } catch { /* ignore */ }
        setOnboarding(loadMinesweeperOnboarding());
        setHydrated(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (typeof window.matchMedia !== 'function') return;
        const media = window.matchMedia('(pointer: coarse)');
        const sync = () => setCoarsePointer(media.matches);
        sync();
        media.addEventListener('change', sync);
        return () => media.removeEventListener('change', sync);
    }, []);

    useEffect(() => {
        if (hydrated) storeMinesweeperOnboarding(onboarding);
    }, [hydrated, onboarding]);

    const advanceOnboarding = useCallback((milestone: MinesweeperOnboardingMilestone) => {
        setOnboarding((prev) => advanceMinesweeperOnboarding(prev, milestone));
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        if (status !== 'playing') {
            clearMinesweeperSave();
            return;
        }
        const nowPerformance = performance.now();
        storeMinesweeperSave({
            board,
            mode,
            dailyDate,
            generationSeed: generationSeed.current,
            generationStrategy,
            firstClick,
            hasStarted,
            elapsedMs: hasStarted ? Math.round(elapsedGameMilliseconds(startedAtRef.current, nowPerformance)) : 0,
            savedAtEpochMs: Date.now(),
            flagMode,
            activeCell,
            assist,
        });
    }, [activeCell, assist, board, dailyDate, firstClick, flagMode, generationStrategy, hasStarted, hydrated, mode, status]);

    useEffect(() => {
        if (status !== 'playing' || !hasStarted) return;
        const updateTimer = () => setTimer(displayedGameSeconds(startedAtRef.current, performance.now()));
        updateTimer();
        const interval = setInterval(updateTimer, 250);
        return () => clearInterval(interval);
    }, [status, hasStarted]);

    const applyReveal = (result: RevealResult) => {
        if (!result.changed) return;
        setCurrentHint(null);
        setHintUnavailable(false);
        setBoard(result.board);
        setStatus(result.status);
        const firstTerminal = result.status !== 'playing' && !recordedRef.current;
        if (firstTerminal) {
            recordedRef.current = true;
            recordAchievementEvent('minesweeper', 'played');
        }
        if (result.status === 'won' && firstTerminal) {
            const elapsed = recordedGameSeconds(startedAtRef.current, performance.now());
            setTimer(elapsed);
            const previousBest = bestTime;
            const isNewBest = previousBest === null || elapsed < previousBest;
            const nextBest = recordBestForConditions(bestKeyFor(difficultyId), elapsed, 'seconds', recordConditions()).value;
            if (isNewBest) recordAchievementEvent('minesweeper', 'personal-best');
            setIsNewBest(isNewBest);
            setBestTime(nextBest);
            if (mode === 'daily') {
                const today = todayKey();
                setStreak(recordDailyWin(DAILY_GAME_ID, today, previousDayKey(today)));
            }
        }
    };

    const reveal = (x: number, y: number) => {
        if (status !== 'playing' || board[y]?.[x]?.isFlagged) return;
        if (mode === 'daily' && dailyDate !== todayKey()) { initBoard('daily'); return; }
        if (!hasStarted) {
            startedAtRef.current = performance.now();
            setHasStarted(true);
        }

        // Free play: first click is always safe — build and verify the board around it.
        let base = board;
        if (firstClick) {
            const dims = MINESWEEPER_DIFFICULTIES[difficultyId];
            const generated = createNoGuessMinesweeperBoard(dims, x, y, generationSeed.current);
            base = generated.board;
            for (const cell of board.flat()) if (cell.isFlagged) base[cell.y][cell.x].isFlagged = true;
            setGenerationStrategy(generated.strategy);
            setFirstClick(false);
        }
        const wasRevealed = base[y][x].isRevealed;
        const result = wasRevealed ? chordMinesweeperCell(base, x, y) : revealMinesweeperCell(base, x, y);
        if (result.changed) advanceOnboarding(wasRevealed ? 'chorded' : 'revealed');
        applyReveal(result);
    };

    const toggleFlag = (x: number, y: number) => {
        if (status !== 'playing' || board[y]?.[x]?.isRevealed) return;
        setCurrentHint(null);
        setHintUnavailable(false);
        const next = toggleMinesweeperFlag(board, x, y, mineCount);
        if (!board[y][x].isFlagged && next[y]?.[x]?.isFlagged) advanceOnboarding('flagged');
        setBoard(next);
    };

    const requestHint = () => {
        if (status !== 'playing' || firstClick) {
            setCurrentHint(null);
            setHintUnavailable(true);
            return;
        }
        const nextHint = findMinesweeperHint(board);
        setCurrentHint(nextHint);
        setHintUnavailable(nextHint === null);
        if (!nextHint) return;
        setAssist('hint');
        if (!hasStarted) {
            startedAtRef.current = performance.now();
            setHasStarted(true);
        }
        setBestTime(getBestForConditions(bestKeyFor(difficultyId), {
            seed: mode === 'daily' ? `daily-${dailyDate}` : `free-${generationSeed.current}`,
            difficulty: difficultyId,
            assist: 'hint',
        })?.value ?? null);
    };

    const handleCellClick = (x: number, y: number) => {
        if (longPressTriggeredRef.current) {
            longPressTriggeredRef.current = false;
            return;
        }
        // Flag mode only makes sense on hidden cells; a tap on an open number is
        // always the chord intent, so don't swallow it while flag mode is on.
        if (flagMode && !board[y]?.[x]?.isRevealed) toggleFlag(x, y);
        else reveal(x, y);
    };

    const clearLongPress = () => {
        if (longPressTimerRef.current !== null) window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
    };

    const startLongPress = (event: React.PointerEvent, x: number, y: number) => {
        if (event.pointerType !== 'touch' && event.pointerType !== 'pen' || status !== 'playing') return;
        clearLongPress();
        longPressTriggeredRef.current = false;
        longPressTimerRef.current = window.setTimeout(() => {
            longPressTriggeredRef.current = true;
            setActiveCell(y * width + x);
            toggleFlag(x, y);
            longPressTimerRef.current = null;
        }, 450);
    };

    useEffect(() => () => clearLongPress(), []);

    const handleContextMenu = (e: React.MouseEvent, x: number, y: number) => {
        e.preventDefault();
        toggleFlag(x, y);
    };

    const flaggedCount = board.flat().filter((c) => c.isFlagged).length;

    const handleGridKeyDown = (event: React.KeyboardEvent, index: number) => {
        const row = Math.floor(index / width);
        const column = index % width;
        let next = index;
        if (event.key === 'ArrowUp') next = Math.max(0, row - 1) * width + column;
        else if (event.key === 'ArrowDown') next = Math.min(height - 1, row + 1) * width + column;
        else if (event.key === 'ArrowLeft') next = row * width + Math.max(0, column - 1);
        else if (event.key === 'ArrowRight') next = row * width + Math.min(width - 1, column + 1);
        else if (event.key === 'Home') next = row * width;
        else if (event.key === 'End') next = row * width + width - 1;
        else return;
        event.preventDefault();
        setActiveCell(next);
        cellRefs.current[next]?.focus();
    };

    const solvedToday = streak?.lastWinDate === todayKey();
    const cellSize = width > 20 ? '2.75rem' : width > 12 ? '2.25rem' : '2.75rem';
    const hintTargets = new Set(currentHint?.targets.map(({ x, y }) => `${x}:${y}`) ?? []);
    const hintClues = new Set(currentHint?.clues.map(({ x, y }) => `${x}:${y}`) ?? []);
    const hintMessage = currentHint
        ? currentHint.kind === 'safe' ? ht.safe
            : currentHint.kind === 'mine' ? ht.mine
                : currentHint.conclusion === 'safe' ? ht.subsetSafe : ht.subsetMine
        : hintUnavailable ? ht.none : null;
    const onboardingStep = hydrated ? nextMinesweeperOnboardingStep(onboarding) : null;
    const onboardingText = onboardingStep === 'reveal' ? ob.reveal
        : onboardingStep === 'flag' ? (coarsePointer ? ob.flagTouch : ob.flagMouse)
            : onboardingStep === 'chord' ? ob.chord : null;
    const onboardingIndex = onboardingStep === 'reveal' ? 1 : onboardingStep === 'flag' ? 2 : 3;
    const visibleRevealed = board.flat().filter((cell) => cell.isRevealed).length;
    const visibleHidden = board.flat().filter((cell) => !cell.isRevealed && !cell.isFlagged).length;
    const resultSummary = status === 'playing' ? null : summarizeMinesweeperResult(board);

    return (
        <GameContainer title={t.title} subtitle={t.subtitle} resetLabel={t.reset} onReset={() => initBoard(mode)}>
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
                <button onClick={() => initBoard('daily')} aria-pressed={mode === 'daily'}
                    className={`min-h-11 px-3 py-2 rounded-lg text-xs font-bold border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${mode === 'daily' ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                    {t.daily}{solvedToday ? ' ✓' : ''}
                </button>
                {(['beginner', 'intermediate', 'expert'] as const).map((id) => (
                    <button key={id} onClick={() => initBoard(id)} aria-pressed={mode === id}
                        className={`min-h-11 px-3 py-2 rounded-lg text-xs font-bold border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${mode === id ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                        {t[id]}
                    </button>
                ))}
            </div>

            {mode === 'daily' && streak && streak.played > 0 && (
                <p className="mb-3 text-center text-[11px] font-bold text-muted-foreground">🔥 {t.streak} {streak.currentStreak} · {t.best} {streak.maxStreak}</p>
            )}

            {difficultyId === 'expert' && (
                <div className="mb-3 flex flex-col items-center gap-2">
                    <button type="button" onClick={() => setOverviewOpen((open) => !open)} aria-expanded={overviewOpen} aria-controls="minesweeper-overview"
                        className="min-h-11 rounded-xl border border-border bg-background px-4 py-2 text-xs font-black hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                        {overviewOpen ? m3.closeOverview : m3.overview}
                    </button>
                    {overviewOpen && (
                        <div id="minesweeper-overview" className="w-full max-w-sm rounded-xl border border-border bg-muted/30 p-3">
                            <p className="mb-2 text-center text-[10px] font-medium text-muted-foreground">{m3.overviewHelp}</p>
                            <div className="grid gap-px overflow-hidden rounded-md bg-border" style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }} aria-hidden="true">
                                {board.flat().map((cell) => <span key={`overview-${cell.x}-${cell.y}`} className={`aspect-square ${cell.isRevealed ? 'bg-background' : cell.isFlagged ? 'bg-chart-2' : 'bg-primary/35'}`} />)}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex justify-between items-center mb-4 gap-2">
                <div className="px-3 py-1.5 bg-muted rounded-lg text-xs font-black text-muted-foreground" aria-label={t.mines}>🚩 {mineCount - flaggedCount}</div>
                <button
                    onClick={() => setFlagMode((f) => !f)}
                    aria-pressed={flagMode}
                    aria-label={flagMode ? t.flag : t.dig}
                    className={`min-h-11 px-4 py-2 rounded-full text-xs font-black border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                        flagMode
                            ? 'bg-chart-2/15 text-chart-2 border-chart-2/40'
                            : 'bg-muted text-muted-foreground border-border'
                    }`}
                >
                    {flagMode ? `🚩 ${t.flag}` : `⛏️ ${t.dig}`}
                </button>
                <div className="px-3 py-1.5 bg-muted rounded-lg text-xs font-black text-muted-foreground" aria-label={t.time}>⏱️ {timer}s</div>
            </div>

            <p className="mb-3 text-center text-[11px] font-medium text-muted-foreground" role="status" aria-live="polite">
                {generationStrategy === 'pending' ? t.pending : generationStrategy === 'verified' ? t.verified : t.fallback}
            </p>
            <p className="sr-only" role="status" aria-live="polite">
                {m3.boardState}: {m3.revealed} {visibleRevealed}, {m3.closed} {visibleHidden}, {m3.flags} {flaggedCount}.
            </p>

            <div className="mb-3 flex flex-col items-center gap-2">
                <button type="button" onClick={requestHint} disabled={status !== 'playing'}
                    className="min-h-11 rounded-xl border border-border bg-background px-4 py-2 text-xs font-black text-foreground hover:bg-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                    💡 {ht.action}
                </button>
                {assist === 'hint' && <span className="text-[10px] font-bold text-muted-foreground">{ht.assisted}</span>}
                {hintMessage && (
                    <p id="minesweeper-hint" className="max-w-xl rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-center text-xs font-semibold text-foreground" role="status" aria-live="polite">
                        {hintMessage}{currentHint ? ` · ${ht.candidates}: ${currentHint.targets.length}` : ''}
                    </p>
                )}
            </div>

            <div className="overflow-x-auto pb-1">
                <div className="grid gap-1 bg-muted/30 p-2 rounded-xl border border-border w-max mx-auto" style={{ gridTemplateColumns: `repeat(${width}, ${cellSize})` }} role="grid" aria-label={t.title} aria-rowcount={height} aria-colcount={width}>
                    {board.map((row, y) => (
                        <div key={`row-${y}`} role="row" className="contents">
                            {row.map((cell, x) => {
                                const index = y * width + x;
                                const state = cell.isRevealed
                                    ? cell.isMine ? t.mine : cell.neighborMines > 0 ? `${t.number} ${cell.neighborMines}` : t.empty
                                    : cell.isFlagged ? t.flagged : t.hidden;
                                return (
                                    <button
                                        key={`${x}-${y}`}
                                        ref={(node) => { cellRefs.current[index] = node; }}
                                        type="button"
                                        role="gridcell"
                                        onClick={() => { setActiveCell(index); handleCellClick(cell.x, cell.y); }}
                                        onPointerDown={(event) => startLongPress(event, cell.x, cell.y)}
                                        onPointerUp={clearLongPress}
                                        onPointerCancel={clearLongPress}
                                        onPointerLeave={clearLongPress}
                                        onContextMenu={(e) => handleContextMenu(e, cell.x, cell.y)}
                                        onFocus={() => setActiveCell(index)}
                                        onKeyDown={(event) => handleGridKeyDown(event, index)}
                                        disabled={status !== 'playing'}
                                        tabIndex={activeCell === index ? 0 : -1}
                                        aria-rowindex={y + 1}
                                        aria-colindex={x + 1}
                                        aria-label={`${t.row} ${y + 1}, ${t.column} ${x + 1}: ${state}`}
                                        aria-describedby={hintTargets.has(`${x}:${y}`) || hintClues.has(`${x}:${y}`) ? 'minesweeper-hint' : undefined}
                                        style={{ height: cellSize, width: cellSize }}
                                        className={`rounded-md flex items-center justify-center font-black text-sm transition-colors motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
                                            cell.isRevealed
                                                ? cell.isMine ? 'bg-destructive text-destructive-foreground' : 'bg-background border border-border'
                                                : 'bg-primary/20 hover:bg-primary/30 active:scale-95 border-b-2 border-primary/40'
                                        } ${hintTargets.has(`${x}:${y}`) ? 'ring-4 ring-chart-2 ring-offset-1' : ''} ${hintClues.has(`${x}:${y}`) ? 'ring-4 ring-primary ring-offset-1' : ''}`}
                                    >
                                        {cell.isRevealed
                                            ? cell.isMine ? <img src={MINESWEEPER_SPRITES.mine} alt="" draggable={false} className="h-[70%] w-[70%] object-contain pointer-events-none" /> : (cell.neighborMines > 0
                                                ? <span className={NUM_COLORS[cell.neighborMines] ?? 'text-primary'}>{cell.neighborMines}</span>
                                                : '')
                                            : cell.isFlagged ? <img src={MINESWEEPER_SPRITES.flag} alt="" draggable={false} className="h-[70%] w-[70%] object-contain pointer-events-none" /> : ''}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {status !== 'playing' ? (
                <div className="mt-6 text-center animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none" role="status" aria-live="polite">
                    <p className={`text-lg font-black ${status === 'won' ? 'text-primary' : 'text-destructive'}`}>
                        {status === 'won' ? t.win : t.over}
                    </p>
                    {resultSummary && (
                        <dl className="mx-auto mt-3 grid max-w-md grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                            <div className="rounded-xl bg-muted p-2"><dt className="text-muted-foreground">{m3.safeProgress}</dt><dd className="font-black">{resultSummary.safeRevealed}/{resultSummary.safeTotal} · {resultSummary.progressPercent}%</dd></div>
                            <div className="rounded-xl bg-muted p-2"><dt className="text-muted-foreground">{m3.correctFlags}</dt><dd className="font-black">{resultSummary.correctFlags}/{resultSummary.flags}</dd></div>
                            <div className="rounded-xl bg-muted p-2"><dt className="text-muted-foreground">{m3.wrongFlags}</dt><dd className="font-black">{resultSummary.incorrectFlags}</dd></div>
                        </dl>
                    )}
                    {status === 'won' && bestTime !== null && (
                        <p className="text-xs text-muted-foreground mt-2">{isNewBest ? m3.newBest : `${t.best}: ${bestTime}s`} · {m3.nextGoal}: {Math.max(1, bestTime - 1)}s</p>
                    )}
                    {assist === 'hint' && <p className="mt-1 text-[10px] font-bold text-muted-foreground">{m3.assistedResult}</p>}
                    <button
                        onClick={() => initBoard(mode)}
                        className="mt-4 min-h-11 px-8 py-2 bg-primary text-primary-foreground rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity"
                    >
                        {t.reset}
                    </button>
                </div>
            ) : onboardingText ? (
                <p role="status" aria-live="polite" className="mx-auto mt-4 max-w-md rounded-xl border border-chart-2/40 bg-chart-2/10 px-3 py-2 text-center text-xs font-bold text-foreground">
                    🎓 {ob.progress} {onboardingIndex}/3 · {onboardingText}
                </p>
            ) : (
                <p className="mt-4 text-center text-[10px] text-muted-foreground font-medium">{t.hint} · {m3.longPress}</p>
            )}
        </GameContainer>
    );
};

export default Minesweeper;

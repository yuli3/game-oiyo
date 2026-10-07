import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { dayIndex, minutesUntilNextDaily, mulberry32, previousDayKey, todayKey } from '../../lib/games/daily';
import { getDailyStreak, recordDailyWin, type DailyStreak } from '../../lib/games/records';
import { explainTentsHint, generateTents, generateUniqueTents, validateTents, type Pos, type TentsHint, type TentsPuzzle, type TentsValidation } from '../../lib/games/tents';
import {
    DAILY_BOARD,
    FREE_BOARD,
    clearTentsSave,
    loadTentsSave,
    puzzleForTentsSave,
    storeTentsSave,
    type CellMark,
    type TentsMode,
} from '../../lib/games/tents-save';
import {
    CHAOS_SECONDS,
    addChaosAugment,
    chaosBoard,
    chaosEffects,
    chaosElapsedSec,
    chaosNeighborVerdict,
    chaosOffer,
    chaosShareLine,
    chaosShareUrl,
    hintAriaCount,
    visibleHint,
    type ChaosAugmentId,
} from '../../lib/games/tents-chaos';
import { TENTS_SPRITES } from '../../lib/games/sprites';
import { tentsAnalyticsPayload, type TentsAnalyticsEvent } from '../../lib/games/tents-analytics';

// ─── Tents & Trees — logic puzzle with generated boards ─────────────────────
// Every tree pairs with one tent on an orthogonally adjacent cell; tents never
// touch (diagonals included); row/column counts must match the hints. Boards
// are generated with a guaranteed solution (see lib/games/tents.ts). The
// hardcoded single board of the original version is gone.

const DAILY_GAME_ID = 'tents-and-trees';

function generateDailyTents() {
    return generateUniqueTents(DAILY_BOARD.size, DAILY_BOARD.pairs, mulberry32(0x74656e ^ Math.imul(dayIndex() + 1, 2654435761)));
}

function emptyMarksFor(size: number): CellMark[][] {
    return Array.from({ length: size }, () => Array(size).fill('empty' as CellMark));
}

interface InitialGame {
    mode: TentsMode;
    puzzle: TentsPuzzle;
    marks: CellMark[][];
    seed: number;
    dailyDate: string;
    resumed: boolean;
    chaosAugment: ChaosAugmentId | null;
    chaosStartedAt: number | null;
    chaosDeadline: number | null;
    chaosFlashlightUsed: boolean;
}

function blankChaos(): Pick<InitialGame, 'chaosAugment' | 'chaosStartedAt' | 'chaosDeadline' | 'chaosFlashlightUsed'> {
    return { chaosAugment: null, chaosStartedAt: null, chaosDeadline: null, chaosFlashlightUsed: false };
}

/** Restores an in-progress save if one matches today, otherwise starts a fresh daily puzzle. */
function initialGame(): InitialGame {
    const today = todayKey();
    const saved = loadTentsSave(today);
    if (saved) {
        const puzzle = puzzleForTentsSave(saved.mode, saved.dailyDate, saved.seed);
        return {
            mode: saved.mode,
            puzzle,
            marks: saved.marks,
            seed: saved.seed,
            dailyDate: saved.dailyDate,
            resumed: true,
            chaosAugment: saved.chaosAugment ?? null,
            chaosStartedAt: saved.chaosStartedAtEpochMs ?? null,
            chaosDeadline: saved.chaosDeadlineMs ?? null,
            chaosFlashlightUsed: saved.chaosFlashlightUsed ?? false,
        };
    }
    const { puzzle } = generateDailyTents();
    return { mode: 'daily', puzzle, marks: emptyMarksFor(puzzle.size), seed: 0, dailyDate: today, resumed: false, ...blankChaos() };
}

function tentsOf(marks: CellMark[][]): Pos[] {
    const tents: Pos[] = [];
    for (let r = 0; r < marks.length; r += 1) {
        for (let c = 0; c < marks[r].length; c += 1) if (marks[r][c] === 'tent') tents.push([r, c]);
    }
    return tents;
}

const COPY = {
    ko: { title: '텐트와 나무', desc: '나무마다 텐트를 하나씩 설치하세요!', note: '텐트는 나무의 상하좌우에 놓이며, 텐트끼리는 대각선을 포함해 이웃할 수 없어요. 행·열 숫자는 그 줄의 텐트 수예요.', daily: '📅 오늘의 퍼즐', free: '자유 모드 5×5', chaos: '카오스', win: '캠핑 준비 완료!', next: '다음 퍼즐', errAdjacent: '텐트끼리 붙어 있어요', errOrphan: '나무 옆이 아닌 텐트가 있어요', errCount: '행·열 숫자를 초과했어요', streak: '연속', best: '최고', doneToday: '오늘 완료 ✓', sound: '소리' },
    en: { title: 'Tents & Trees', desc: 'Each tree needs exactly one tent!', note: 'Tents go orthogonally next to a tree and never touch another tent, even diagonally. Row/column numbers count the tents in that line.', daily: '📅 Daily Puzzle', free: 'Free play 5×5', chaos: 'Chaos', win: 'Camping Ready!', next: 'Next puzzle', errAdjacent: 'Two tents are touching', errOrphan: 'A tent is not next to any tree', errCount: 'A row/column count is exceeded', streak: 'Streak', best: 'Best', doneToday: 'Done today ✓', sound: 'Sound' },
    ja: { title: 'テントと木', desc: '木ごとにテントを1つずつ設置しましょう！', note: 'テントは木の上下左右に置き、テント同士は斜めも含め隣接できません。行・列の数字はその列のテント数です。', daily: '📅 今日のパズル', free: 'フリー 5×5', chaos: 'カオス', win: 'キャンプ準備完了！', next: '次のパズル', errAdjacent: 'テント同士が隣接しています', errOrphan: '木の隣にないテントがあります', errCount: '行・列の数字を超えています', streak: '連続', best: '最高', doneToday: '本日クリア ✓', sound: '音' },
    zh: { title: '帐篷与树', desc: '每棵树旁放一顶帐篷！', note: '帐篷放在树的上下左右，帐篷之间（含对角）不能相邻。行列数字表示该行列的帐篷数。', daily: '📅 每日谜题', free: '自由模式 5×5', chaos: '混沌', win: '露营准备就绪！', next: '下一题', errAdjacent: '有帐篷相邻了', errOrphan: '有帐篷不在树旁', errCount: '超过了行列数字', streak: '连续', best: '最佳', doneToday: '今日已完成 ✓', sound: '声音' },
    fr: { title: 'Tentes et arbres', desc: "Chaque arbre a besoin d'une tente !", note: "Les tentes se placent à côté d'un arbre (jamais en diagonale d'une autre tente). Les nombres comptent les tentes de chaque ligne/colonne.", daily: '📅 Puzzle du jour', free: 'Libre 5×5', chaos: 'Chaos', win: 'Prêt à camper !', next: 'Puzzle suivant', errAdjacent: 'Deux tentes se touchent', errOrphan: "Une tente n'est près d'aucun arbre", errCount: 'Un compteur de ligne/colonne est dépassé', streak: 'Série', best: 'Record', doneToday: "Fini aujourd'hui ✓", sound: 'Son' },
    es: { title: 'Tiendas y árboles', desc: '¡Cada árbol necesita una tienda!', note: 'Las tiendas van junto a un árbol (arriba/abajo/izquierda/derecha) y nunca se tocan entre sí, ni en diagonal. Los números cuentan las tiendas de cada fila/columna.', daily: '📅 Puzle diario', free: 'Libre 5×5', chaos: 'Caos', win: '¡Listos para acampar!', next: 'Siguiente puzle', errAdjacent: 'Dos tiendas se tocan', errOrphan: 'Hay una tienda sin árbol al lado', errCount: 'Se superó un número de fila/columna', streak: 'Racha', best: 'Récord', doneToday: 'Hecho hoy ✓', sound: 'Sonido' },
} as const;

const NEXT_DAILY_COPY = {
    ko: (m: number) => `다음 퍼즐까지 ${Math.floor(m / 60)}시간 ${m % 60}분`,
    en: (m: number) => `Next puzzle in ${Math.floor(m / 60)}h ${m % 60}m`,
    ja: (m: number) => `次のパズルまで ${Math.floor(m / 60)}時間${m % 60}分`,
    zh: (m: number) => `距下一题 ${Math.floor(m / 60)}小时${m % 60}分`,
    fr: (m: number) => `Prochain puzzle dans ${Math.floor(m / 60)} h ${m % 60} min`,
    es: (m: number) => `Próximo puzle en ${Math.floor(m / 60)} h ${m % 60} min`,
} as const;

const TENTS_HINT: Record<keyof typeof COPY, Record<TentsHint['reason'], string>> = {
    ko: { adjacent: '붙어 있는 텐트를 확인하세요.', orphan: '나무 옆이 아닌 텐트를 확인하세요.', count: '행·열 숫자를 초과한 텐트를 확인하세요.', pairing: '나무와 텐트가 1:1로 짝이 맞는지 확인하세요.' },
    en: { adjacent: 'Check the tents that are touching.', orphan: 'Check the tent that is not beside a tree.', count: 'Check tents that exceed a row or column count.', pairing: 'Check that every tree has exactly one tent.' },
    ja: { adjacent: '隣り合うテントを確認しましょう。', orphan: '木の隣にないテントを確認しましょう。', count: '行・列の数字を超えたテントを確認しましょう。', pairing: '木とテントが1対1か確認しましょう。' },
    zh: { adjacent: '检查相邻的帐篷。', orphan: '检查不在树旁的帐篷。', count: '检查超过行列数字的帐篷。', pairing: '检查每棵树是否正好配一顶帐篷。' },
    fr: { adjacent: 'Vérifiez les tentes qui se touchent.', orphan: 'Vérifiez la tente éloignée de tout arbre.', count: 'Vérifiez les tentes qui dépassent un compteur.', pairing: 'Vérifiez qu’arbre et tente vont par paires.' },
    es: { adjacent: 'Revisa las tiendas que se tocan.', orphan: 'Revisa la tienda que no está junto a un árbol.', count: 'Revisa las tiendas que superan un recuento.', pairing: 'Comprueba que cada árbol tenga una tienda.' },
};
const HINT_LABEL: Record<keyof typeof COPY, string> = { ko: '힌트', en: 'Hint', ja: 'ヒント', zh: '提示', fr: 'Indice', es: 'Pista' };

const A11Y_COPY = {
    ko: { subtitle: '텐트 배치 논리 퍼즐', reset: '다시 시작', row: '행', column: '열', rowHint: '행 텐트 수', columnHint: '열 텐트 수', tree: '나무', empty: '빈 칸', tent: '텐트', grass: '잔디 표시' },
    en: { subtitle: 'Tent placement logic puzzle', reset: 'Reset', row: 'Row', column: 'Column', rowHint: 'Row tent count', columnHint: 'Column tent count', tree: 'Tree', empty: 'Empty cell', tent: 'Tent', grass: 'Grass mark' },
    ja: { subtitle: 'テント配置論理パズル', reset: 'やり直す', row: '行', column: '列', rowHint: '行のテント数', columnHint: '列のテント数', tree: '木', empty: '空きマス', tent: 'テント', grass: '草印' },
    zh: { subtitle: '帐篷配置逻辑谜题', reset: '重新开始', row: '行', column: '列', rowHint: '行帐篷数', columnHint: '列帐篷数', tree: '树', empty: '空格', tent: '帐篷', grass: '草地标记' },
    fr: { subtitle: 'Puzzle logique de placement', reset: 'Recommencer', row: 'Ligne', column: 'Colonne', rowHint: 'Tentes de la ligne', columnHint: 'Tentes de la colonne', tree: 'Arbre', empty: 'Case vide', tent: 'Tente', grass: 'Marque herbe' },
    es: { subtitle: 'Puzle lógico de colocación', reset: 'Reiniciar', row: 'Fila', column: 'Columna', rowHint: 'Tiendas de la fila', columnHint: 'Tiendas de la columna', tree: 'Árbol', empty: 'Casilla vacía', tent: 'Tienda', grass: 'Marca de hierba' },
} as const;

const CHAOS_COPY = {
    ko: {
        draft: '오늘의 규칙', timeUp: '시간이 끝났어요', hidden: '숨김', bannedCell: '금지된 칸',
        errBanned: '금지된 칸에 텐트가 있어요', copyShare: '기록 복사', copied: '복사했어요',
        flashlight: '손전등 켜기', flashlightHint: '확인할 칸을 누르세요', shareLabel: '텐트 카오스',
        legal: '놓을 수 있어요', illegal: '놓을 수 없어요', remain: (s: number) => `남은 시간 ${s}초`,
        rules: {
            fog: { name: '안개 캠프', effect: '행과 열 힌트의 절반이 숨겨져요.' },
            hourglass: { name: '모래시계', effect: '고른 뒤 90초 안에 풀어야 해요.' },
            flashlight: { name: '손전등', effect: '이웃 칸을 놓을 수 있는지 한 번 보여 줘요.' },
            banned: { name: '금지구역', effect: '텐트를 놓을 수 없는 칸이 세 곳 있어요.' },
            trailhead: { name: '이정표', effect: '정답 텐트 하나가 고정돼 있어요.' },
            safeGrass: { name: '안전한 풀', effect: '텐트가 아닌 풀 한 칸이 고정돼 있어요.' },
        },
    },
    en: {
        draft: "Today's rule", timeUp: 'Time is up', hidden: 'hidden', bannedCell: 'Blocked cell',
        errBanned: 'A tent is on a blocked cell', copyShare: 'Copy result', copied: 'Copied',
        flashlight: 'Use flashlight', flashlightHint: 'Choose a cell to check', shareLabel: 'Tents Chaos',
        legal: 'Can place a tent', illegal: 'Cannot place a tent', remain: (s: number) => `${s}s left`,
        rules: {
            fog: { name: 'Fog camp', effect: 'Half of the row and column hints are hidden.' },
            hourglass: { name: 'Hourglass', effect: 'Solve within 90 seconds of picking.' },
            flashlight: { name: 'Flashlight', effect: 'Show once whether the neighboring cells are legal.' },
            banned: { name: 'No-camp zone', effect: 'Three cells cannot hold a tent.' },
            trailhead: { name: 'Trail marker', effect: 'One solution tent is placed and locked.' },
            safeGrass: { name: 'Safe grass', effect: 'One non-tent grass cell is locked.' },
        },
    },
    ja: {
        draft: '今日のルール', timeUp: '時間が終わりました', hidden: '非表示', bannedCell: '禁止マス',
        errBanned: '禁止マスにテントがあります', copyShare: '記録をコピー', copied: 'コピーしました',
        flashlight: 'ライトを使う', flashlightHint: '確認するマスを押してください', shareLabel: 'テントカオス',
        legal: '置けます', illegal: '置けません', remain: (s: number) => `残り${s}秒`,
        rules: {
            fog: { name: '霧のキャンプ', effect: '行と列のヒントの半分が隠れます。' },
            hourglass: { name: '砂時計', effect: '選んでから90秒以内に解きます。' },
            flashlight: { name: '懐中電灯', effect: '隣のマスに置けるかを一度だけ示します。' },
            banned: { name: '禁止区域', effect: 'テントを置けないマスが3つあります。' },
            trailhead: { name: '道しるべ', effect: '正解のテントが1つ固定されています。' },
            safeGrass: { name: '安全な草', effect: 'テントではない草マスが1つ固定されています。' },
        },
    },
    zh: {
        draft: '今日规则', timeUp: '时间到了', hidden: '已隐藏', bannedCell: '禁区',
        errBanned: '帐篷放在了禁区上', copyShare: '复制成绩', copied: '已复制',
        flashlight: '打开手电', flashlightHint: '请点要查看的格子', shareLabel: '帐篷混沌',
        legal: '可以放置', illegal: '不能放置', remain: (s: number) => `剩余${s}秒`,
        rules: {
            fog: { name: '迷雾营地', effect: '一半的行列提示会隐藏。' },
            hourglass: { name: '沙漏', effect: '选好后要在90秒内解开。' },
            flashlight: { name: '手电筒', effect: '只显示一次周围格子能不能放。' },
            banned: { name: '禁区', effect: '有三格不能放帐篷。' },
            trailhead: { name: '路标', effect: '一顶正确答案的帐篷已固定。' },
            safeGrass: { name: '安全草地', effect: '一格不是帐篷的草地已固定。' },
        },
    },
    fr: {
        draft: 'Règle du jour', timeUp: 'Le temps est écoulé', hidden: 'masqué', bannedCell: 'Case interdite',
        errBanned: 'Une tente est sur une case interdite', copyShare: 'Copier le résultat', copied: 'Copié',
        flashlight: 'Allumer la lampe', flashlightHint: 'Choisissez une case à vérifier', shareLabel: 'Chaos des tentes',
        legal: 'Placement possible', illegal: 'Placement impossible', remain: (s: number) => `${s} s restantes`,
        rules: {
            fog: { name: 'Camp de brume', effect: 'La moitié des indices de ligne et de colonne est cachée.' },
            hourglass: { name: 'Sablier', effect: 'Vous avez 90 secondes après le choix.' },
            flashlight: { name: 'Lampe', effect: 'Montre une fois si les cases voisines sont jouables.' },
            banned: { name: 'Zone interdite', effect: 'Trois cases refusent les tentes.' },
            trailhead: { name: 'Balise', effect: 'Une tente de la solution est déjà posée et verrouillée.' },
            safeGrass: { name: 'Herbe sûre', effect: 'Une case de gazon sans tente est verrouillée.' },
        },
    },
    es: {
        draft: 'Regla de hoy', timeUp: 'Se acabó el tiempo', hidden: 'oculto', bannedCell: 'Casilla prohibida',
        errBanned: 'Hay una tienda en una casilla prohibida', copyShare: 'Copiar marca', copied: 'Copiado',
        flashlight: 'Encender la linterna', flashlightHint: 'Elige una casilla para comprobar', shareLabel: 'Caos de tiendas',
        legal: 'Se puede colocar', illegal: 'No se puede colocar', remain: (s: number) => `${s} s restantes`,
        rules: {
            fog: { name: 'Campamento de niebla', effect: 'Se oculta la mitad de las pistas de fila y columna.' },
            hourglass: { name: 'Reloj de arena', effect: 'Hay que resolverlo en 90 segundos tras elegirlo.' },
            flashlight: { name: 'Linterna', effect: 'Muestra una vez si las casillas vecinas valen.' },
            banned: { name: 'Zona prohibida', effect: 'Hay tres casillas donde no puede haber tienda.' },
            trailhead: { name: 'Hito', effect: 'Una tienda de la solución queda fija.' },
            safeGrass: { name: 'Hierba segura', effect: 'Una casilla de hierba sin tienda queda fija.' },
        },
    },
} as const;

const TentsAndTrees: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const localeKey = (locale in COPY ? locale : 'en') as keyof typeof COPY;
    const t = COPY[localeKey];
    const chaosCopy = CHAOS_COPY[localeKey];
    const a11y = A11Y_COPY[locale as keyof typeof A11Y_COPY] ?? A11Y_COPY.en;
    const nextDailyCopy = NEXT_DAILY_COPY[locale as keyof typeof NEXT_DAILY_COPY] ?? NEXT_DAILY_COPY.en;

    const [initial] = useState(initialGame);
    const [mode, setMode] = useState<TentsMode>(initial.mode);
    const [puzzle, setPuzzle] = useState<TentsPuzzle>(initial.puzzle);
    const [marks, setMarks] = useState<CellMark[][]>(initial.marks);
    const [seed, setSeed] = useState(initial.seed);
    const [validation, setValidation] = useState<TentsValidation>({ ok: true, complete: false, error: null });
    const [streak, setStreak] = useState<DailyStreak | null>(null);
    const [dailyDate, setDailyDate] = useState(initial.dailyDate);
    const [nextMinutes, setNextMinutes] = useState(() => minutesUntilNextDaily());
    const [activeCell, setActiveCell] = useState(0);
    const [chaosDay, setChaosDay] = useState(() => dayIndex());
    const [chaosAugment, setChaosAugment] = useState<ChaosAugmentId | null>(initial.chaosAugment);
    const [chaosStartedAt, setChaosStartedAt] = useState<number | null>(initial.chaosStartedAt);
    const [chaosDeadline, setChaosDeadline] = useState<number | null>(initial.chaosDeadline);
    const [chaosFailed, setChaosFailed] = useState(false);
    const [flashlightArmed, setFlashlightArmed] = useState(false);
    const [flashlightUsed, setFlashlightUsed] = useState(initial.chaosFlashlightUsed);
    const [flashlightMarks, setFlashlightMarks] = useState<Record<string, 'legal' | 'illegal'> | null>(null);
    const [draftFocus, setDraftFocus] = useState(0);
    const [clock, setClock] = useState(() => Date.now());
    const [copied, setCopied] = useState(false);
    const cellRefs = useRef<Array<HTMLButtonElement | HTMLDivElement | null>>([]);
    const draftRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const startedRef = useRef(initial.resumed);
    const chaosPack = mode === 'chaos' ? { offer: chaosOffer(chaosDay), effects: chaosEffects(chaosDay) } : null;

    const track = useCallback((event: TentsAnalyticsEvent, eventMode: TentsMode) => {
        const analytics = window as Window & { gtag?: (...args: unknown[]) => void };
        analytics.gtag?.('event', event, tentsAnalyticsPayload({ mode: eventMode, locale }));
    }, [locale]);

    const [muted, setMuted] = useState(false);
    const [hint, setHint] = useState<TentsHint | null>(null);
    const mutedRef = useRef(false);
    useEffect(() => { mutedRef.current = muted; }, [muted]);
    const audioRef = useRef<AudioContext | null>(null);
    const tone = useCallback((frequency: number, duration = 0.05) => {
        if (mutedRef.current || typeof window === 'undefined') return;
        const context = audioRef.current ?? new AudioContext();
        audioRef.current = context;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.05, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + duration);
    }, []);
    useEffect(() => () => { void audioRef.current?.close(); }, []);

    useEffect(() => {
        const today = todayKey();
        setStreak(getDailyStreak(DAILY_GAME_ID, today, previousDayKey(today)));
        if (initial.resumed) track('game_resume', initial.mode);
    }, [initial.mode, initial.resumed, track]);

    useEffect(() => {
        const update = () => setNextMinutes(minutesUntilNextDaily());
        update();
        const timer = window.setInterval(update, 60_000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        if (mode !== 'chaos' || chaosAugment !== 'hourglass' || chaosDeadline == null || validation.complete || chaosFailed) return;
        const tick = () => {
            const now = Date.now();
            if (now >= chaosDeadline) {
                setChaosFailed(true);
                clearTentsSave();
                return;
            }
            setClock(now);
        };
        tick();
        const timer = window.setInterval(tick, 1000);
        return () => window.clearInterval(timer);
    }, [mode, chaosAugment, chaosDeadline, validation.complete, chaosFailed]);

    const newPuzzle = useCallback((nextMode: TentsMode) => {
        clearTentsSave();
        const today = todayKey();
        const day = dayIndex();
        setChaosAugment(null);
        setChaosStartedAt(null);
        setChaosDeadline(null);
        setChaosFailed(false);
        setFlashlightArmed(false);
        setFlashlightUsed(false);
        setFlashlightMarks(null);
        setCopied(false);
        setDraftFocus(0);
        setChaosDay(day);
        setDailyDate(today);
        setValidation({ ok: true, complete: false, error: null });
        setHint(null);
        setActiveCell(0);
        startedRef.current = false;
        if (nextMode === 'daily') {
            const { puzzle: p } = generateDailyTents();
            setMode('daily');
            setSeed(0);
            setPuzzle(p);
            setMarks(emptyMarksFor(p.size));
        } else if (nextMode === 'chaos') {
            const { puzzle: p } = chaosBoard(day);
            setMode('chaos');
            setSeed(0);
            setPuzzle(p);
            setMarks(emptyMarksFor(p.size));
        } else {
            const freshSeed = Math.floor(Math.random() * 0xffffffff);
            const { puzzle: p } = generateTents(FREE_BOARD.size, FREE_BOARD.pairs, mulberry32(freshSeed));
            setMode('free');
            setSeed(freshSeed);
            setPuzzle(p);
            setMarks(emptyMarksFor(p.size));
        }
    }, []);

    const isTree = (r: number, c: number) => puzzle.trees.some(([tr, tc]) => tr === r && tc === c);
    const bannedNow = mode === 'chaos' && chaosAugment === 'banned' && chaosPack ? chaosPack.effects.banned : [];
    const bannedKeys = new Set(bannedNow.map(([r, c]) => `${r}:${c}`));
    const lockedKey = mode === 'chaos' && chaosPack && chaosAugment === 'trailhead'
        ? chaosPack.effects.trailhead.join(':')
        : mode === 'chaos' && chaosPack && chaosAugment === 'safeGrass'
            ? chaosPack.effects.safeGrass.join(':')
            : null;
    const fogRows = mode === 'chaos' && chaosAugment === 'fog' && chaosPack ? chaosPack.effects.fogRows : [];
    const fogCols = mode === 'chaos' && chaosAugment === 'fog' && chaosPack ? chaosPack.effects.fogCols : [];
    const playLocked = validation.complete || chaosFailed || (mode === 'chaos' && !chaosAugment);
    // The first paint can be a few milliseconds after the pick, and ceil() would show 91. The fail time stays 90s. 2026-09-29
    const remainSec = chaosDeadline == null ? 0 : Math.max(0, Math.min(CHAOS_SECONDS, Math.ceil((chaosDeadline - Math.max(clock, Date.now())) / 1000)));

    const remember = (nextMarks: CellMark[][], flashlight = flashlightUsed) => {
        if (mode === 'chaos' && chaosAugment && chaosStartedAt != null) {
            storeTentsSave({
                mode: 'chaos',
                dailyDate,
                seed: 0,
                marks: nextMarks,
                savedAtEpochMs: Date.now(),
                chaosAugment,
                chaosStartedAtEpochMs: chaosStartedAt,
                ...(chaosDeadline != null ? { chaosDeadlineMs: chaosDeadline } : {}),
                ...(flashlight ? { chaosFlashlightUsed: true } : {}),
            });
            return;
        }
        storeTentsSave({ mode, dailyDate, seed, marks: nextMarks, savedAtEpochMs: Date.now() });
    };

    const pickChaos = (id: ChaosAugmentId) => {
        if (mode !== 'chaos' || chaosAugment || !chaosPack) return;
        const added = addChaosAugment([], id);
        if (!added.ok) return;
        const picked = added.active[0];
        const next = emptyMarksFor(puzzle.size);
        if (picked === 'trailhead') {
            const [r, c] = chaosPack.effects.trailhead;
            next[r][c] = 'tent';
        }
        if (picked === 'safeGrass') {
            const [r, c] = chaosPack.effects.safeGrass;
            next[r][c] = 'grass';
        }
        const started = Date.now();
        const deadline = picked === 'hourglass' ? started + CHAOS_SECONDS * 1000 : null;
        setChaosAugment(picked);
        setChaosStartedAt(started);
        setChaosDeadline(deadline);
        setChaosFailed(false);
        setFlashlightArmed(false);
        setFlashlightUsed(false);
        setFlashlightMarks(null);
        setCopied(false);
        setMarks(next);
        startedRef.current = true;
        track('game_start', 'chaos');
        const rules = picked === 'banned' ? { banned: chaosPack.effects.banned } : undefined;
        setValidation(validateTents(tentsOf(next), puzzle, rules));
        storeTentsSave({
            mode: 'chaos',
            dailyDate,
            seed: 0,
            marks: next,
            savedAtEpochMs: started,
            chaosAugment: picked,
            chaosStartedAtEpochMs: started,
            ...(deadline != null ? { chaosDeadlineMs: deadline } : {}),
        });
    };

    const handleCellClick = (r: number, c: number) => {
        if (playLocked || isTree(r, c)) return;
        if ((mode === 'daily' || mode === 'chaos') && dailyDate !== todayKey()) {
            newPuzzle(mode);
            return;
        }
        if (bannedKeys.has(`${r}:${c}`) || lockedKey === `${r}:${c}`) return;
        if (mode === 'chaos' && chaosAugment === 'hourglass' && chaosDeadline != null && Date.now() >= chaosDeadline) {
            setChaosFailed(true);
            clearTentsSave();
            return;
        }
        if (flashlightArmed && !flashlightUsed && chaosPack) {
            const placed = tentsOf(marks);
            const nextMarks: Record<string, 'legal' | 'illegal'> = {};
            for (let dr = -1; dr <= 1; dr += 1) {
                for (let dc = -1; dc <= 1; dc += 1) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr < 0 || nc < 0 || nr >= puzzle.size || nc >= puzzle.size) continue;
                    nextMarks[`${nr}:${nc}`] = chaosNeighborVerdict([nr, nc], puzzle, placed, bannedNow);
                }
            }
            setFlashlightMarks(nextMarks);
            setFlashlightArmed(false);
            setFlashlightUsed(true);
            remember(marks, true);
            return;
        }
        if (mode !== 'chaos' && !startedRef.current) {
            startedRef.current = true;
            track('game_start', mode);
        }
        const next = marks.map((row) => [...row]);
        const cycle: CellMark[] = ['empty', 'tent', 'grass'];
        next[r][c] = cycle[(cycle.indexOf(next[r][c]) + 1) % 3];
        setMarks(next);
        tone(420, 0.04);

        const rules = chaosAugment === 'banned' ? { banned: bannedNow } : undefined;
        const v = validateTents(tentsOf(next), puzzle, rules);
        setValidation(v);
        if (v.complete) {
            track('game_complete', mode);
            clearTentsSave();
            tone(880, 0.1);
            window.setTimeout(() => tone(1100, 0.16), 90);
            if (mode === 'daily') {
                const today = todayKey();
                setStreak(recordDailyWin(DAILY_GAME_ID, today, previousDayKey(today)));
            }
        } else {
            if (v.error) tone(180, 0.08);
            remember(next);
        }
    };

    const copyShare = () => {
        if (!chaosAugment || chaosStartedAt == null) return;
        const line = chaosShareLine(
            chaosCopy.shareLabel,
            chaosCopy.rules[chaosAugment].name,
            chaosElapsedSec(chaosStartedAt, Date.now()),
            chaosShareUrl(localeKey),
        );
        const done = () => setCopied(true);
        const fallback = () => {
            const area = document.createElement('textarea');
            area.value = line;
            area.setAttribute('readonly', '');
            area.style.position = 'fixed';
            area.style.left = '-9999px';
            document.body.appendChild(area);
            area.select();
            try {
                if (document.execCommand('copy')) done();
            } catch {
                /* the browser blocked the clipboard */
            }
            area.remove();
        };
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(line).then(done, fallback);
        else fallback();
    };

    const moveDraft = (event: React.KeyboardEvent, index: number) => {
        if (!chaosPack) return;
        const last = chaosPack.offer.length - 1;
        let next = index;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = index === last ? 0 : index + 1;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = index === 0 ? last : index - 1;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = last;
        else return;
        event.preventDefault();
        setDraftFocus(next);
        draftRefs.current[next]?.focus();
    };

    const solvedToday = streak?.lastWinDate === todayKey();
    const { size } = puzzle;

    const handleGridKeyDown = (event: React.KeyboardEvent, index: number) => {
        const row = Math.floor(index / size);
        const column = index % size;
        let next = index;
        if (event.key === 'ArrowUp') next = Math.max(0, row - 1) * size + column;
        else if (event.key === 'ArrowDown') next = Math.min(size - 1, row + 1) * size + column;
        else if (event.key === 'ArrowLeft') next = row * size + Math.max(0, column - 1);
        else if (event.key === 'ArrowRight') next = row * size + Math.min(size - 1, column + 1);
        else if (event.key === 'Home') next = row * size;
        else if (event.key === 'End') next = row * size + size - 1;
        else return;
        event.preventDefault();
        setActiveCell(next);
        cellRefs.current[next]?.focus();
    };

    return (
        <GameContainer title={t.title} subtitle={a11y.subtitle} resetLabel={a11y.reset} onReset={() => newPuzzle(mode)}>
            <div className="flex flex-col items-center">
                <p className="text-sm font-medium text-muted-foreground mb-2 text-center leading-relaxed">{t.desc}</p>
                <p className="text-xs text-muted-foreground/80 mb-4 text-center max-w-xs leading-relaxed">{t.note}</p>

                <div className="mb-4 inline-flex flex-wrap justify-center gap-1">
                    {(['daily', 'free', 'chaos'] as const).map((m) => (
                        <button key={m} onClick={() => {
                            if (m !== mode) track('mode_change', m);
                            newPuzzle(m);
                        }}
                            aria-pressed={mode === m}
                            className={`min-h-11 px-3 py-2 rounded-lg text-xs font-bold border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${mode === m ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                            {t[m]}
                        </button>
                    ))}
                    <button type="button" onClick={() => {
                        track('hint_used', mode);
                        const tents: Pos[] = [];
                        for (let rr = 0; rr < puzzle.size; rr++) for (let cc = 0; cc < puzzle.size; cc++) if (marks[rr][cc] === 'tent') tents.push([rr, cc]);
                        setHint(explainTentsHint(tents, puzzle));
                    }} disabled={playLocked} className="min-h-11 rounded-lg border border-border px-3 text-xs font-bold text-muted-foreground hover:bg-muted disabled:opacity-40">
                        {HINT_LABEL[locale as keyof typeof HINT_LABEL] ?? HINT_LABEL.en}
                    </button>
                    <button
                        type="button"
                        onClick={() => setMuted((value) => !value)}
                        aria-pressed={muted}
                        className="min-h-11 min-w-11 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted"
                    >
                        <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
                        <span className="sr-only">{t.sound}</span>
                    </button>
                </div>

                {mode === 'daily' && streak && (streak.played > 0 || solvedToday) && (
                    <p className="mb-3 text-center text-xs font-bold text-muted-foreground">
                        🔥 {t.streak} {streak.currentStreak} · {t.best} {streak.maxStreak}
                        {solvedToday && <span className="ml-2 text-success">{t.doneToday}</span>}
                    </p>
                )}
                {mode === 'daily' && solvedToday && (
                    <p className="mb-3 text-center text-xs font-bold text-muted-foreground">
                        {nextDailyCopy(nextMinutes)}
                    </p>
                )}

                <div className="bg-muted/30 p-1 sm:p-3 rounded-2xl sm:rounded-3xl border border-border shadow-inner w-full max-w-sm overflow-x-auto">
                    <div className="grid gap-0.5 sm:gap-1" role="grid" aria-label={t.title} aria-rowcount={size + 1} aria-colcount={size + 1}
                        style={{ gridTemplateColumns: `1.5rem repeat(${size}, minmax(2rem, 1fr))` }}>
                        <div role="row" aria-rowindex={1} className="contents">
                        <div role="columnheader" aria-rowindex={1} aria-colindex={1} aria-label={`${a11y.row} / ${a11y.column}`} />
                            {puzzle.colHints.map((h, i) => {
                                const hidden = fogCols.includes(i);
                                return (
                                <div key={`ch-${i}`} role="columnheader" aria-colindex={i + 2} aria-label={`${a11y.column} ${i + 1}, ${a11y.columnHint} ${hintAriaCount(h, hidden, chaosCopy.hidden)}`}
                                    className="flex items-center justify-center text-sm font-black text-primary">{visibleHint(h, hidden)}</div>
                                );
                            })}
                        </div>
                        {marks.map((row, r) => (
                            <div key={`r-${r}`} role="row" aria-rowindex={r + 2} className="contents">
                                <div role="rowheader" aria-colindex={1} aria-label={`${a11y.row} ${r + 1}, ${a11y.rowHint} ${hintAriaCount(puzzle.rowHints[r], fogRows.includes(r), chaosCopy.hidden)}`}
                                    className="flex items-center justify-center text-sm font-black text-primary">{visibleHint(puzzle.rowHints[r], fogRows.includes(r))}</div>
                                {row.map((mark, c) => {
                                    const tree = isTree(r, c);
                                    const index = r * size + c;
                                    const position = `${a11y.row} ${r + 1}, ${a11y.column} ${c + 1}`;
                                    // 2rem floor: the 6×6 daily board has to fit a 320–360px phone without scrolling its hints away.
                                    const common = 'min-h-8 min-w-8 aspect-square rounded-lg flex items-center justify-center transition-all motion-reduce:transition-none motion-reduce:transform-none border border-border/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset';
                                    if (tree) {
                                        return (
                                            <div key={`${r}-${c}`} ref={(node) => { cellRefs.current[index] = node; }} role="gridcell"
                                                tabIndex={activeCell === index ? 0 : -1} aria-rowindex={r + 2} aria-colindex={c + 2}
                                                aria-label={`${position}: ${a11y.tree}`} onFocus={() => setActiveCell(index)}
                                                onKeyDown={(event) => handleGridKeyDown(event, index)}
                                                className={`${common} bg-emerald-100 text-emerald-700 cursor-default`}>
                                                <img src={TENTS_SPRITES.tree} alt="" draggable={false} className="h-7 w-7 object-contain pointer-events-none" aria-hidden="true" />
                                            </div>
                                        );
                                    }
                                    if (bannedKeys.has(`${r}:${c}`)) {
                                        return (
                                            <div key={`${r}-${c}`} ref={(node) => { cellRefs.current[index] = node; }} role="gridcell"
                                                tabIndex={activeCell === index ? 0 : -1} aria-rowindex={r + 2} aria-colindex={c + 2}
                                                aria-label={`${position}: ${chaosCopy.bannedCell}`} onFocus={() => setActiveCell(index)}
                                                onKeyDown={(event) => handleGridKeyDown(event, index)}
                                                className={`${common} bg-stone-300/80 text-stone-700 cursor-default`}>
                                                <span aria-hidden="true">✕</span>
                                            </div>
                                        );
                                    }
                                    const verdict = flashlightMarks?.[`${r}:${c}`];
                                    const verdictLabel = verdict === 'legal' ? `, ${chaosCopy.legal}` : verdict === 'illegal' ? `, ${chaosCopy.illegal}` : '';
                                    return (
                                        <button
                                            key={`${r}-${c}`}
                                            ref={(node) => { cellRefs.current[index] = node; }} type="button" role="gridcell"
                                            onClick={() => { setActiveCell(index); handleCellClick(r, c); }} aria-disabled={playLocked || lockedKey === `${r}:${c}`}
                                            tabIndex={activeCell === index ? 0 : -1} aria-rowindex={r + 2} aria-colindex={c + 2}
                                            aria-label={`${position}: ${mark === 'tent' ? a11y.tent : mark === 'grass' ? a11y.grass : a11y.empty}${verdictLabel}`}
                                            onFocus={() => setActiveCell(index)} onKeyDown={(event) => handleGridKeyDown(event, index)}
                                            className={`${common} ${
                                                mark === 'tent' ? 'bg-rose-100 text-rose-700 shadow-md -translate-y-0.5' :
                                                mark === 'grass' ? 'bg-muted/50 text-muted-foreground/30' : 'bg-background hover:bg-muted/20 active:scale-95'
                                            } ${verdict === 'legal' ? 'ring-2 ring-emerald-600' : ''} ${verdict === 'illegal' ? 'ring-2 ring-stone-500' : ''} ${hint?.cells.some(([hr, hc]) => hr === r && hc === c) ? 'ring-4 ring-amber-400' : ''}`}
                                        >
                                            {mark === 'tent' && <img src={TENTS_SPRITES.tent} alt="" draggable={false} className="h-7 w-7 object-contain pointer-events-none" aria-hidden="true" />}
                                            {mark === 'grass' && <img src={TENTS_SPRITES.grass} alt="" draggable={false} className="h-6 w-6 object-contain pointer-events-none opacity-80" aria-hidden="true" />}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {mode === 'chaos' && !chaosAugment && chaosPack && (
                    <div role="group" aria-label={chaosCopy.draft} className="mt-4 flex w-full max-w-sm flex-col gap-2">
                        {chaosPack.offer.map((id, index) => (
                            <button
                                key={id}
                                type="button"
                                ref={(node) => { draftRefs.current[index] = node; }}
                                aria-pressed={false}
                                tabIndex={draftFocus === index ? 0 : -1}
                                onClick={() => pickChaos(id)}
                                onKeyDown={(event) => moveDraft(event, index)}
                                className="min-h-11 w-full rounded-xl border border-border bg-card px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                <span className="block text-sm font-black text-foreground">{chaosCopy.rules[id].name}</span>
                                <span className="block text-xs leading-relaxed text-muted-foreground">{chaosCopy.rules[id].effect}</span>
                            </button>
                        ))}
                    </div>
                )}
                {mode === 'chaos' && chaosAugment && (
                    <div className="mt-4 w-full max-w-sm rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-center">
                        <p className="text-sm font-black text-primary">{chaosCopy.rules[chaosAugment].name}</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">{chaosCopy.rules[chaosAugment].effect}</p>
                        {chaosAugment === 'hourglass' && !validation.complete && !chaosFailed && chaosDeadline != null && (
                            <p className="mt-1 text-xs font-bold text-foreground">{chaosCopy.remain(remainSec)}</p>
                        )}
                        {chaosAugment === 'flashlight' && !flashlightUsed && !validation.complete && !chaosFailed && (
                            <button
                                type="button"
                                aria-pressed={flashlightArmed}
                                onClick={() => setFlashlightArmed(true)}
                                className="mt-2 min-h-11 rounded-lg border border-border bg-card px-3 text-xs font-bold text-foreground"
                            >
                                {flashlightArmed ? chaosCopy.flashlightHint : chaosCopy.flashlight}
                            </button>
                        )}
                    </div>
                )}

                <div className="mt-4 min-h-[2rem] text-center" role="status" aria-live="polite">
                    {validation.complete ? (
                        <div className="animate-fade-up motion-reduce:animate-none">
                            <p className="text-xl font-black text-success mb-3">🎉 {t.win}</p>
                            {mode === 'free' && (
                                <button onClick={() => { track('play_again', 'free'); newPuzzle('free'); }} className="px-8 py-2.5 bg-primary text-primary-foreground rounded-full font-bold shadow-lg">
                                    {t.next}
                                </button>
                            )}
                            {mode === 'chaos' && chaosAugment && (
                                <button type="button" onClick={copyShare} className="px-8 py-2.5 bg-primary text-primary-foreground rounded-full font-bold shadow-lg">
                                    {copied ? chaosCopy.copied : chaosCopy.copyShare}
                                </button>
                            )}
                        </div>
                    ) : chaosFailed ? (
                        <p className="text-xs font-bold text-destructive">{chaosCopy.timeUp}</p>
                    ) : validation.error ? (
                        <p className="text-xs font-bold text-destructive">
                            {validation.error === 'adjacent' ? t.errAdjacent : validation.error === 'orphan' ? t.errOrphan : validation.error === 'banned' ? chaosCopy.errBanned : t.errCount}
                        </p>
                    ) : hint ? (
                        <p className="text-xs font-bold text-primary">{(TENTS_HINT[locale as keyof typeof TENTS_HINT] ?? TENTS_HINT.en)[hint.reason]}</p>
                    ) : null}
                </div>
            </div>
        </GameContainer>
    );
};

export default TentsAndTrees;

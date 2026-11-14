import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, QrCode, Share2 } from 'lucide-react';
import { GameContainer } from '../ui/game/GamePrimitives';
import { usePrefersReducedMotion } from '../../lib/games/reduced-motion';
import { getBestForConditions, recordBestForConditions, type BestConditions, type ConditionalBestRecord } from '../../lib/games/records';
import { addBonusTube, createWaterSort, generateWaterSortPuzzle, isWaterSortDeadEnd, moveWaterSort, pouredLayerCount, undoWaterSort, waterSortHint, type WaterSortDifficulty, type WaterSortMove, type WaterSortState } from '../../lib/games/water-sort';
import { clearWaterSortSave, loadWaterSortSave, storeWaterSortSave, type WaterSortAssist } from '../../lib/games/water-sort-save';
import {
    createShareCardCanvas,
    copyShareCardToClipboard,
    downloadShareCard,
} from '../../lib/games/share-card';
import { useArcadePortal } from '../../lib/games/arcade-portal';
import type { Locale } from '../../lib/i18n';
import { CORE_CUES, createCuePlayer, type CoreCue, type CuePlayer } from '../../lib/games/game-audio';
import { createHaptics } from '../../lib/games/haptics';
import { celebrate } from '../../lib/games/celebration';
import { WATER_SORT_SPRITES, WATER_SORT_UI_SPRITES } from '../../lib/games/sprites';
import { buildChallengeUrl } from '../../lib/games/seed-challenge';
import { generateChallengeQrSvg } from '../../lib/games/challenge-qr';
import { getColorblindMode, getColorblindSymbol, type ColorblindMode } from '../../lib/games/accessibility';
import {
    getSharedAudioContext,
    playComboSfx,
    MobileHapticsPro,
    useGameJuicePro,
} from '../../lib/games/engine-suite-unified';

const COLORS = ['#ef4444', '#2563eb', '#059669', '#d97706', '#7c3aed'];
const PATTERNS = [
    'repeating-linear-gradient(135deg, transparent 0 7px, rgba(255,255,255,.32) 7px 10px)',
    'radial-gradient(circle at 25% 50%, rgba(255,255,255,.4) 0 2px, transparent 3px)',
    'repeating-linear-gradient(90deg, transparent 0 8px, rgba(255,255,255,.3) 8px 11px)',
    'repeating-linear-gradient(0deg, transparent 0 7px, rgba(255,255,255,.3) 7px 9px)',
    'linear-gradient(45deg, transparent 35%, rgba(255,255,255,.3) 35% 50%, transparent 50% 85%, rgba(255,255,255,.3) 85%)',
];
const COPY = {
    ko: { title: '워터 소트', subtitle: '색을 읽고, 흐름을 설계하세요', desc: '같은 색의 물을 한 시험관에 정렬하세요.', reset: '새 판', win: '정제 완료!', tube: (i: number, n: number, layers: string) => `시험관 ${i}, 물 ${n}칸, 색상 ${layers || '없음'}`, selected: '선택됨', playAgain: '새 판 시작', undo: '되돌리기', hint: '힌트', bonusTube: '+1 시험관', hintMove: (a: number, b: number) => `${a}번 → ${b}번 시험관`, deadEnd: '가능한 이동이 없어요. 되돌리거나 새 판을 시작하세요.', moves: '이동', time: '시간', best: '동일 조건 최고', efficiency: '기준 효율', next: '다음 목표', soundOn: '소리 켜짐', soundOff: '소리 꺼짐', easy: '쉬움', medium: '보통', hard: '어려움', seconds: '초' },
    en: { title: 'Water Sort', subtitle: 'Read the colors. Engineer the flow.', desc: 'Unify each color in its own tube.', reset: 'New board', win: 'Purification complete!', tube: (i: number, n: number, layers: string) => `Tube ${i}, ${n} water layers, colors ${layers || 'empty'}`, selected: 'selected', playAgain: 'New board', undo: 'Undo', hint: 'Hint', bonusTube: '+1 Tube', hintMove: (a: number, b: number) => `Tube ${a} → ${b}`, deadEnd: 'No legal moves remain. Undo or start a new board.', moves: 'Moves', time: 'Time', best: 'Same-condition best', efficiency: 'Baseline efficiency', next: 'Next target', soundOn: 'Sound on', soundOff: 'Sound off', easy: 'Easy', medium: 'Medium', hard: 'Hard', seconds: 'sec' },
    ja: { title: 'ウォーターソート', subtitle: '色を読み、流れを設計しよう', desc: '同じ色の水を一つの試験管にまとめましょう。', reset: '新しい盤面', win: '精製完了！', tube: (i: number, n: number, layers: string) => `試験管 ${i}、水 ${n} 層、色 ${layers || 'なし'}`, selected: '選択中', playAgain: '新しい盤面', undo: '元に戻す', hint: 'ヒント', bonusTube: '+1 試験管', hintMove: (a: number, b: number) => `試験管 ${a} → ${b}`, deadEnd: '動かせる手がありません。元に戻すか新しい盤面を始めてください。', moves: '手数', time: '時間', best: '同条件ベスト', efficiency: '基準効率', next: '次の目標', soundOn: 'サウンドオン', soundOff: 'サウンドオフ', easy: '初級', medium: '中級', hard: '上級', seconds: '秒' },
    zh: { title: '倒水排序', subtitle: '辨认颜色，设计流向', desc: '把每种颜色的水集中到一支试管中。', reset: '新棋盘', win: '提纯完成！', tube: (i: number, n: number, layers: string) => `试管 ${i}，${n} 层水，颜色 ${layers || '空'}`, selected: '已选择', playAgain: '新棋盘', undo: '撤销', hint: '提示', bonusTube: '+1 试管', hintMove: (a: number, b: number) => `试管 ${a} → ${b}`, deadEnd: '没有可行移动。请撤销或开始新棋盘。', moves: '步数', time: '时间', best: '同条件最佳', efficiency: '基准效率', next: '下一目标', soundOn: '声音开启', soundOff: '声音关闭', easy: '简单', medium: '普通', hard: '困难', seconds: '秒' },
    fr: { title: 'Water Sort', subtitle: 'Lisez les couleurs. Maîtrisez le flux.', desc: 'Réunissez chaque couleur dans son propre tube.', reset: 'Nouveau plateau', win: 'Purification terminée !', tube: (i: number, n: number, layers: string) => `Tube ${i}, ${n} couches, couleurs ${layers || 'vide'}`, selected: 'sélectionné', playAgain: 'Nouveau plateau', undo: 'Annuler', hint: 'Indice', bonusTube: '+1 Tube', hintMove: (a: number, b: number) => `Tube ${a} → ${b}`, deadEnd: 'Aucun coup légal. Annulez ou lancez un nouveau plateau.', moves: 'Coups', time: 'Temps', best: 'Meilleur à conditions égales', efficiency: 'Efficacité de référence', next: 'Prochain objectif', soundOn: 'Son activé', soundOff: 'Son coupé', easy: 'Facile', medium: 'Moyen', hard: 'Difficile', seconds: 's' },
    es: { title: 'Water Sort', subtitle: 'Lee los colores. Diseña el flujo.', desc: 'Reúne cada color en su propio tubo.', reset: 'Nuevo tablero', win: '¡Purificación completa!', tube: (i: number, n: number, layers: string) => `Tubo ${i}, ${n} capas, colores ${layers || 'vacío'}`, selected: 'seleccionado', playAgain: 'Nuevo tablero', undo: 'Deshacer', hint: 'Pista', bonusTube: '+1 Tubo', hintMove: (a: number, b: number) => `Tubo ${a} → ${b}`, deadEnd: 'No quedan movimientos legales. Deshaz o inicia un tablero nuevo.', moves: 'Movimientos', time: 'Tiempo', best: 'Mejor en iguales condiciones', efficiency: 'Eficiencia de referencia', next: 'Próximo objetivo', soundOn: 'Sonido activado', soundOff: 'Sonido desactivado', easy: 'Fácil', medium: 'Medio', hard: 'Difícil', seconds: 's' },
} as const;

const WaterSort: React.FC<{ locale?: string }> = ({ locale = 'ko' }) => {
    const loc = locale as Locale;
    const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({
        locale: loc,
    });
    const { shakeCssVars, addTrauma } = useGameJuicePro();
    const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
    const reducedMotion = usePrefersReducedMotion();
    const [game, setGame] = useState<WaterSortState | null>(null);
    const [difficulty, setDifficulty] = useState<WaterSortDifficulty>('medium');
    const [selectedTube, setSelectedTube] = useState<number | null>(null);
    const [focusedTube, setFocusedTube] = useState(0);
    const [undo, setUndo] = useState<WaterSortState[]>([]);
    const [hint, setHint] = useState<WaterSortMove | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [assist, setAssist] = useState<WaterSortAssist>('none');
    const [muted, setMuted] = useState(false);
    const [best, setBest] = useState<ConditionalBestRecord | null>(null);
    const [lastPour, setLastPour] = useState<{ to: number; count: number } | null>(null);
    const [pouringAnim, setPouringAnim] = useState<{
        from: number;
        to: number;
        color: number;
        dx: number;
        dy: number;
        dir: 1 | -1;
    } | null>(null);
    const [dragState, setDragState] = useState<{
        index: number;
        pointerId: number;
        startX: number;
        startY: number;
        dx: number;
        dy: number;
        active: boolean;
    } | null>(null);
    const [dragOverTube, setDragOverTube] = useState<number | null>(null);
    const [showQrModal, setShowQrModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const [shareCardCopied, setShareCardCopied] = useState(false);
    const [colorblind, setColorblind] = useState<ColorblindMode>(getColorblindMode);

    useEffect(() => {
        const onCb = (e: Event) => {
            setColorblind((e as CustomEvent<ColorblindMode>).detail ?? getColorblindMode());
        };
        window.addEventListener('oiyo:colorblind-changed', onCb);
        return () => window.removeEventListener('oiyo:colorblind-changed', onCb);
    }, []);

    const playPourTone = useCallback((fillLevel: number) => {
        if (muted) return;
        try {
            const ctx = getSharedAudioContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const freq = 380 + fillLevel * 90;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq + 30, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.06, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
            osc.connect(gain).connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.12);
            playComboSfx(ctx, 'gem', fillLevel);
        } catch {}
    }, [muted]);
    const cuesRef = useRef<CuePlayer<CoreCue> | null>(null);
    const hapticsRef = useRef(createHaptics());
    const recordedSeedRef = useRef<number | null>(null);
    const tubeRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const boardWrapRef = useRef<HTMLDivElement | null>(null);
    const fluidCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<Array<{
        x: number;
        y: number;
        vx: number;
        vy: number;
        r: number;
        color: string;
        alpha: number;
        life: number;
        maxLife: number;
        kind: 'drop' | 'bubble' | 'spark';
    }>>([]);
    const activeStreamRef = useRef<{
        sx: number;
        sy: number;
        ex: number;
        ey: number;
        color: string;
        start: number;
        duration: number;
    } | null>(null);

    const cue = useCallback((kind: CoreCue) => {
        if (muted || reducedMotion) return;
        try {
            cuesRef.current ??= createCuePlayer({ cues: CORE_CUES });
            void cuesRef.current.play(kind);
        } catch {
            /* optional feedback */
        }
    }, [muted, reducedMotion]);

    const startGame = useCallback((nextDifficulty: WaterSortDifficulty) => {
        clearWaterSortSave();
        const seed = typeof crypto !== 'undefined' && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : Date.now() >>> 0;
        setGame(createWaterSort(seed, nextDifficulty)); setDifficulty(nextDifficulty); setSelectedTube(null); setFocusedTube(0);
        setUndo([]); setHint(null); setElapsedSeconds(0); setAssist('none'); setBest(null); setLastPour(null); recordedSeedRef.current = null;
    }, []);

    useEffect(() => {
        const saved = loadWaterSortSave();
        if (saved) { setGame(saved.state); setDifficulty(saved.state.difficulty); setUndo(saved.undo); setElapsedSeconds(saved.elapsedSeconds); setAssist(saved.assist); }
        else startGame('medium');
    }, [startGame]);

    useEffect(() => {
        if (!game) return;
        if (game.status === 'solved') clearWaterSortSave();
        else storeWaterSortSave(game, undo, elapsedSeconds, assist);
    }, [game, undo, elapsedSeconds, assist]);

    useEffect(() => {
        if (!game || game.status === 'solved') return;
        const timer = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
        return () => window.clearInterval(timer);
    }, [game?.seed, game?.status]);

    useEffect(() => {
        if (!game || game.status !== 'solved' || recordedSeedRef.current === game.seed) return;
        recordedSeedRef.current = game.seed;
        const conditions: BestConditions = { seed: String(game.seed), difficulty: game.difficulty, assist };
        setBest(recordBestForConditions('water-sort', elapsedSeconds, 'seconds', conditions, `${game.moves} moves`));
        cue('win');
        hapticsRef.current.fire('win');
        if (containerRef.current) celebrate(containerRef.current, { preset: 'shards' });
    }, [game, elapsedSeconds, assist, cue, containerRef]);

    useEffect(() => {
        if (reducedMotion) return;
        let rafId = 0;
        let lastTime = performance.now();

        const renderFrame = (now: number) => {
            const dt = Math.min(0.05, (now - lastTime) / 1000);
            lastTime = now;

            const canvas = fluidCanvasRef.current;
            const wrap = boardWrapRef.current;
            if (canvas && wrap) {
                const rect = wrap.getBoundingClientRect();
                const dpr = Math.min(2, window.devicePixelRatio || 1);
                const targetW = Math.max(1, Math.round(rect.width * dpr));
                const targetH = Math.max(1, Math.round(rect.height * dpr));
                if (canvas.width !== targetW || canvas.height !== targetH) {
                    canvas.width = targetW;
                    canvas.height = targetH;
                }
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                    ctx.clearRect(0, 0, rect.width, rect.height);

                    const stream = activeStreamRef.current;
                    if (stream) {
                        const progress = (now - stream.start) / stream.duration;
                        if (progress >= 1) {
                            activeStreamRef.current = null;
                        } else {
                            const headT = Math.min(1, progress / 0.35);
                            const tailT = progress > 0.7 ? (progress - 0.7) / 0.3 : 0;
                            const midX = (stream.sx + stream.ex) * 0.5;
                            const midY = Math.min(stream.sy, stream.ey) + 18;

                            const quadAt = (t: number) => {
                                const inv = 1 - t;
                                return {
                                    x: inv * inv * stream.sx + 2 * inv * t * midX + t * t * stream.ex,
                                    y: inv * inv * stream.sy + 2 * inv * t * midY + t * t * stream.ey,
                                };
                            };

                            const steps = 14;
                            ctx.save();
                            ctx.lineCap = 'round';
                            ctx.strokeStyle = stream.color;
                            ctx.lineWidth = Math.max(3, 8 * (1 - progress * 0.35));
                            ctx.globalAlpha = 0.92;
                            ctx.beginPath();
                            for (let s = 0; s <= steps; s++) {
                                const t = tailT + (headT - tailT) * (s / steps);
                                const pt = quadAt(t);
                                if (s === 0) ctx.moveTo(pt.x, pt.y);
                                else ctx.lineTo(pt.x, pt.y);
                            }
                            ctx.stroke();

                            ctx.strokeStyle = 'rgba(255,255,255,0.45)';
                            ctx.lineWidth = 2;
                            ctx.stroke();
                            ctx.restore();
                        }
                    }

                    const nextParticles: typeof particlesRef.current = [];
                    for (const p of particlesRef.current) {
                        p.life += dt;
                        if (p.life >= p.maxLife) continue;
                        if (p.kind === 'drop') {
                            p.vy += 680 * dt;
                        } else if (p.kind === 'bubble') {
                            p.vy -= 120 * dt;
                            p.vx += Math.sin(p.life * 16) * 20 * dt;
                        } else {
                            p.vx *= 0.94;
                            p.vy *= 0.94;
                        }
                        p.x += p.vx * dt;
                        p.y += p.vy * dt;
                        const fade = 1 - p.life / p.maxLife;
                        ctx.save();
                        ctx.globalAlpha = p.alpha * fade;
                        ctx.fillStyle = p.color;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.r * (p.kind === 'spark' ? fade + 0.3 : 1), 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                        nextParticles.push(p);
                    }
                    particlesRef.current = nextParticles;
                }
            }

            if (activeStreamRef.current || particlesRef.current.length > 0) {
                rafId = window.requestAnimationFrame(renderFrame);
            } else {
                rafId = 0;
            }
        };

        const kickoff = () => {
            if (!rafId && (activeStreamRef.current || particlesRef.current.length > 0)) {
                lastTime = performance.now();
                rafId = window.requestAnimationFrame(renderFrame);
            }
        };

        const interval = window.setInterval(kickoff, 32);
        return () => {
            window.clearInterval(interval);
            if (rafId) window.cancelAnimationFrame(rafId);
        };
    }, [reducedMotion]);

    const executeMove = (fromIndex: number, toIndex: number) => {
        if (!game || game.status === 'solved' || fromIndex === toIndex) return;
        const next = moveWaterSort(game, { from: fromIndex, to: toIndex });
        if (next !== game) {
            const topColor = game.tubes[fromIndex][game.tubes[fromIndex].length - 1];
            const colorHex = COLORS[topColor] ?? '#3b82f6';
            const fromEl = tubeRefs.current[fromIndex];
            const toEl = tubeRefs.current[toIndex];
            const wrapEl = boardWrapRef.current;

            let dx = 0;
            let dy = -20;
            const dir: 1 | -1 = fromIndex <= toIndex ? 1 : -1;

            if (fromEl && toEl && wrapEl && !reducedMotion) {
                const wrapRect = wrapEl.getBoundingClientRect();
                const fromRect = fromEl.getBoundingClientRect();
                const toRect = toEl.getBoundingClientRect();

                const sideOffset = dir === 1 ? -toRect.width * 0.55 : toRect.width * 0.55;
                dx = (toRect.left + toRect.width / 2 + sideOffset) - (fromRect.left + fromRect.width / 2);
                dy = (toRect.top - 26) - fromRect.top;

                const sx = (toRect.left - wrapRect.left) + toRect.width / 2 + (dir === 1 ? -10 : 10);
                const sy = (toRect.top - wrapRect.top) - 8;
                const fillRatio = Math.max(0.15, Math.min(0.95, next.tubes[toIndex].length / 4));
                const ex = (toRect.left - wrapRect.left) + toRect.width / 2;
                const ey = (toRect.top - wrapRect.top) + toRect.height * (1 - fillRatio * 0.82);

                activeStreamRef.current = {
                    sx,
                    sy,
                    ex,
                    ey,
                    color: colorHex,
                    start: performance.now(),
                    duration: 360,
                };

                for (let k = 0; k < 12; k++) {
                    const angle = -Math.PI * 0.85 + Math.random() * Math.PI * 0.7;
                    const speed = 70 + Math.random() * 140;
                    particlesRef.current.push({
                        x: ex + (Math.random() - 0.5) * 10,
                        y: ey,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed - 40,
                        r: 2 + Math.random() * 2.6,
                        color: k % 3 === 0 ? '#ffffff' : colorHex,
                        alpha: 0.9,
                        life: 0,
                        maxLife: 0.35 + Math.random() * 0.25,
                        kind: 'drop',
                    });
                }
                for (let b = 0; b < 5; b++) {
                    particlesRef.current.push({
                        x: ex + (Math.random() - 0.5) * 18,
                        y: ey + 10 + Math.random() * 18,
                        vx: (Math.random() - 0.5) * 18,
                        vy: -25 - Math.random() * 30,
                        r: 1.5 + Math.random() * 2,
                        color: '#ffffff',
                        alpha: 0.7,
                        life: 0,
                        maxLife: 0.4 + Math.random() * 0.25,
                        kind: 'bubble',
                    });
                }
            }

            setPouringAnim({ from: fromIndex, to: toIndex, color: topColor, dx, dy, dir });
            setTimeout(() => setPouringAnim(null), 380);

            setUndo((history) => [...history.slice(-49), game]);
            setLastPour({ to: toIndex, count: pouredLayerCount(game.tubes, next.tubes, toIndex) });
            setGame(next);
            cue('combo');
            playPourTone(next.tubes[toIndex].length);
            MobileHapticsPro.impact();

            const isCompleted = next.tubes[toIndex].length === 4 && next.tubes[toIndex].every((c) => c === next.tubes[toIndex][0]);
            if (isCompleted) {
                addTrauma(0.25);
                MobileHapticsPro.heavy();
                if (toEl && wrapEl && !reducedMotion) {
                    const wrapRect = wrapEl.getBoundingClientRect();
                    const toRect = toEl.getBoundingClientRect();
                    const cx = toRect.left - wrapRect.left + toRect.width / 2;
                    const cy = toRect.top - wrapRect.top + toRect.height * 0.35;
                    for (let sp = 0; sp < 18; sp++) {
                        const a = (Math.PI * 2 * sp) / 18;
                        const spd = 90 + Math.random() * 120;
                        particlesRef.current.push({
                            x: cx,
                            y: cy,
                            vx: Math.cos(a) * spd,
                            vy: Math.sin(a) * spd,
                            r: 2.5 + Math.random() * 2,
                            color: sp % 2 === 0 ? '#fde047' : colorHex,
                            alpha: 1,
                            life: 0,
                            maxLife: 0.45 + Math.random() * 0.25,
                            kind: 'spark',
                        });
                    }
                }
            } else {
                addTrauma(0.08);
            }
        } else {
            cue('fail');
            MobileHapticsPro.light();
        }
        setHint(null);
        setSelectedTube(null);
        setDragOverTube(null);
    };

    const wasDraggedRef = useRef(false);

    const findTubeAtPoint = (clientX: number, clientY: number, excludeIndex: number): number | null => {
        for (let idx = 0; idx < tubeRefs.current.length; idx++) {
            if (idx === excludeIndex) continue;
            const el = tubeRefs.current[idx];
            if (!el) continue;
            const r = el.getBoundingClientRect();
            const pad = 10;
            if (clientX >= r.left - pad && clientX <= r.right + pad && clientY >= r.top - pad && clientY <= r.bottom + pad) {
                return idx;
            }
        }
        return null;
    };

    const handleTubePointerDown = (e: React.PointerEvent<HTMLButtonElement>, index: number) => {
        if (!game || game.status === 'solved' || game.tubes[index].length === 0) return;
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        wasDraggedRef.current = false;
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragState({
            index,
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            dx: 0,
            dy: 0,
            active: false,
        });
    };

    const handleTubePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (!dragState || dragState.pointerId !== e.pointerId) return;
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        const distSq = dx * dx + dy * dy;
        const isActive = dragState.active || distSq > 64;
        if (isActive && !dragState.active) {
            wasDraggedRef.current = true;
            setSelectedTube(dragState.index);
            MobileHapticsPro.selection();
        }
        if (isActive) {
            setDragState({ ...dragState, dx, dy, active: true });
            const hit = findTubeAtPoint(e.clientX, e.clientY, dragState.index);
            if (hit !== dragOverTube) setDragOverTube(hit);
        }
    };

    const handleTubePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (!dragState || dragState.pointerId !== e.pointerId) return;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
        if (dragState.active) {
            const target = findTubeAtPoint(e.clientX, e.clientY, dragState.index);
            const fromIndex = dragState.index;
            setDragState(null);
            setDragOverTube(null);
            if (target !== null) {
                executeMove(fromIndex, target);
            } else {
                setSelectedTube(null);
            }
        } else {
            setDragState(null);
        }
    };

    const handleTubeClick = (index: number) => {
        if (wasDraggedRef.current) {
            wasDraggedRef.current = false;
            return;
        }
        if (!game || game.status === 'solved') return;
        if (selectedTube === null) {
            if (game.tubes[index].length > 0) {
                setSelectedTube(index);
                cue('tap');
                MobileHapticsPro.selection();
            } else {
                cue('fail');
                MobileHapticsPro.light();
            }
            return;
        }
        if (selectedTube === index) {
            setSelectedTube(null);
            cue('tap');
            MobileHapticsPro.light();
            return;
        }
        executeMove(selectedTube, index);
    };

    const undoMove = () => {
        if (!game) return;
        const next = undoWaterSort(game);
        if (next !== game) {
            setGame(next);
            setUndo((history) => history.slice(0, -1));
            setSelectedTube(null); setHint(null); setLastPour(null);
            setAssist((value) => value === 'hint' ? value : 'undo');
            cue('tap');
            hapticsRef.current.fire('tap');
        }
    };
    const showHint = () => {
        if (!game) return;
        const nextHint = waterSortHint(game.tubes); setHint(nextHint); setSelectedTube(nextHint?.from ?? null); setAssist('hint');
        cue('tap');
        hapticsRef.current.fire('tap');
    };
    const handleAddBonusTube = () => {
        if (!game || game.status === 'solved' || game.hasBonusTube) return;
        setGame((current) => current ? addBonusTube(current) : null);
        setAssist('hint');
        cue('combo');
        hapticsRef.current.fire('combo');
    };
    const focusTube = (next: number) => {
        const normalized = Math.max(0, Math.min((game?.tubes.length ?? 1) - 1, next)); setFocusedTube(normalized); tubeRefs.current[normalized]?.focus();
    };

    const tubes = game?.tubes ?? [];
    const isWon = game?.status === 'solved';
    const deadEnd = game ? isWaterSortDeadEnd(game) : false;
    const baseline = game ? generateWaterSortPuzzle(game.seed, game.difficulty).solution.length : 1;
    const efficiency = game ? Math.min(100, Math.round((baseline / Math.max(1, game.moves)) * 100)) : 0;
    const existingBest = game ? getBestForConditions('water-sort', { seed: String(game.seed), difficulty: game.difficulty, assist }) : null;
    const displayedBest = best ?? existingBest;

    const challengeUrl = game ? buildChallengeUrl({
        baseUrl: typeof window !== "undefined" ? window.location.origin : "https://game.oiyo.net",
        locale,
        slug: "water-sort",
        seed: game.seed,
        score: game.moves,
    }) : '';

    const handleCopyChallenge = async () => {
        if (!challengeUrl) return;
        try {
            await navigator.clipboard.writeText(challengeUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {}
    };

    const handleShareCard = useCallback(async () => {
        if (!game) return;
        try {
            const canvas = createShareCardCanvas({
                title: t.title,
                subtitle: 'WATER SORT PUZZLE',
                score: Math.round(efficiency * 10),
                durationSeconds: elapsedSeconds,
                slug: 'water-sort',
                qrUrl: typeof window !== 'undefined' ? window.location.href : undefined,
                customStats: [
                    { label: 'MOVES', value: game.moves },
                    { label: 'EFFICIENCY', value: `${efficiency}%` },
                ],
            });
            const success = await copyShareCardToClipboard(canvas);
            if (success) {
                setShareCardCopied(true);
                setTimeout(() => setShareCardCopied(false), 2500);
            } else {
                downloadShareCard(canvas, `oiyo-watersort-${elapsedSeconds}s.png`);
                setShareCardCopied(true);
                setTimeout(() => setShareCardCopied(false), 2500);
            }
        } catch {
            // fallback
        }
    }, [elapsedSeconds, efficiency, game, t.title]);

    return (
        <div
            ref={containerRef}
            data-game-surface
            style={{
                '--shake-x': shakeCssVars['--shake-x'] ?? '0px',
                '--shake-y': shakeCssVars['--shake-y'] ?? '0px',
                '--shake-rot': shakeCssVars['--shake-rot'] ?? '0deg',
            } as React.CSSProperties}
            className={`${isImmersive ? "fixed inset-0 z-50 w-screen h-dvh bg-background p-4 sm:p-6 overflow-y-auto flex flex-col items-center justify-center m-0 select-none" : "relative"} transform translate-x-(--shake-x) translate-y-(--shake-y) rotate-(--shake-rot)`}
        >
            <GameContainer title={t.title} subtitle={t.subtitle} onReset={() => startGame(difficulty)}>
                <div className="mb-3 overflow-hidden rounded-xl border border-border bg-muted">
                    <img src={WATER_SORT_SPRITES.keyart} alt={t.title} className="h-32 w-full object-cover sm:h-44" />
                </div>
                <div className="flex flex-col items-center">
                    <p className="mb-5 text-center text-sm font-medium text-muted-foreground">{t.desc}</p>
                    <div className="mb-4 flex flex-wrap justify-center gap-2 items-center" aria-label="Difficulty">
                        {(['easy', 'medium', 'hard'] as const).map((level) => <button key={level} type="button" aria-pressed={difficulty === level} onClick={() => startGame(level)} className={`min-h-11 rounded-full border px-4 text-xs font-black ${difficulty === level ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>{t[level]}</button>)}
                        <button type="button" aria-pressed={!muted} onClick={() => setMuted((value) => !value)} className="min-h-11 rounded-full border border-border px-4 text-xs font-bold">{muted ? t.soundOff : t.soundOn}</button>
                        <button
                            type="button"
                            onClick={togglePortal}
                            aria-pressed={isImmersive}
                            aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
                            title={isImmersive ? portalLabels.exit : portalLabels.enter}
                            className="min-h-11 px-3 py-2 rounded-full border border-border bg-background shadow-xs text-xs font-bold text-foreground hover:bg-muted transition-colors flex items-center gap-1"
                        >
                            <span>{isImmersive ? '✕' : '⛶'}</span>
                            <span className="hidden sm:inline">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
                        </button>
                    </div>
                    {game && <div className="mb-4 flex gap-5 text-xs font-black text-muted-foreground"><span>{t.moves}: {game.moves}</span><span>{t.time}: {elapsedSeconds} {t.seconds}</span></div>}
                    <div className="mb-6 flex flex-wrap justify-center gap-2">
                        <button type="button" onClick={undoMove} disabled={undo.length === 0} className="min-h-11 rounded-lg border border-border px-4 text-xs font-bold disabled:opacity-40">{t.undo}</button>
                        <button type="button" onClick={showHint} disabled={!game || isWon || deadEnd} className="min-h-11 rounded-lg border border-border px-4 text-xs font-bold disabled:opacity-40">{t.hint}</button>
                        <button type="button" onClick={handleAddBonusTube} disabled={!game || isWon || Boolean(game?.hasBonusTube)} className="min-h-11 rounded-lg border border-border px-4 text-xs font-bold disabled:opacity-40">{t.bonusTube}</button>
                    </div>
                    {hint && <p className="mb-5 text-xs font-bold text-primary" role="status">{t.hintMove(hint.from + 1, hint.to + 1)}</p>}
                    {deadEnd && <p className="mb-5 max-w-sm text-center text-xs font-bold text-destructive" role="alert">{t.deadEnd}</p>}
                    <div ref={boardWrapRef} className="relative mb-8 w-full flex justify-center">
                        <canvas
                            ref={fluidCanvasRef}
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 z-40 h-full w-full"
                        />
                        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8 sm:gap-4 justify-items-center" role="group" aria-label={t.title}>
                            {tubes.map((tube, i) => {
                                const isCompleted = tube.length === 4 && tube.every((c) => c === tube[0]);
                                const isPouringSource = pouringAnim?.from === i;
                                const isDraggingThis = dragState?.active && dragState.index === i;
                                const isDragTarget = dragOverTube === i;

                                let tubeTx = '0px';
                                let tubeTy = '0px';
                                let tubeRot = '0deg';
                                let tubeScale = '1';
                                if (isDraggingThis && dragState) {
                                    const tilt = Math.max(-22, Math.min(22, dragState.dx * 0.14));
                                    tubeTx = `${dragState.dx}px`;
                                    tubeTy = `${dragState.dy - 14}px`;
                                    tubeRot = `${tilt}deg`;
                                    tubeScale = '1.06';
                                } else if (isPouringSource && pouringAnim) {
                                    tubeTx = `${pouringAnim.dx}px`;
                                    tubeTy = `${pouringAnim.dy}px`;
                                    tubeRot = `${pouringAnim.dir * 42}deg`;
                                } else if (isDragTarget) {
                                    tubeTy = '-8px';
                                    tubeScale = '1.05';
                                } else if (selectedTube === i) {
                                    tubeTy = reducedMotion ? '0px' : '-12px';
                                }

                                return (
                                    <button
                                        type="button"
                                        key={i}
                                        ref={(element) => { tubeRefs.current[i] = element; }}
                                        tabIndex={focusedTube === i ? 0 : -1}
                                        onFocus={() => setFocusedTube(i)}
                                        onKeyDown={(event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); focusTube(i + 1); } if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); focusTube(i - 1); } if (event.key === 'Home') { event.preventDefault(); focusTube(0); } if (event.key === 'End') { event.preventDefault(); focusTube(tubes.length - 1); } }}
                                        onPointerDown={(e) => handleTubePointerDown(e, i)}
                                        onPointerMove={handleTubePointerMove}
                                        onPointerUp={handleTubePointerUp}
                                        onPointerCancel={handleTubePointerUp}
                                        onClick={() => handleTubeClick(i)}
                                        aria-pressed={selectedTube === i}
                                        aria-label={`${t.tube(i + 1, tube.length, tube.map((color) => String(color + 1)).join('-'))}${selectedTube === i ? `, ${t.selected}` : ''}${isCompleted ? ', 완료' : ''}`}
                                        style={{
                                            '--tube-tx': tubeTx,
                                            '--tube-ty': tubeTy,
                                            '--tube-rot': tubeRot,
                                            '--tube-scale': tubeScale,
                                        } as React.CSSProperties}
                                        className={`relative h-32 w-12 touch-none select-none cursor-grab active:cursor-grabbing overflow-hidden rounded-b-3xl border-4 ${isCompleted ? 'border-primary ring-2 ring-primary/40 shadow-md shadow-primary/20' : 'border-muted'} sm:h-40 sm:w-14 ${!reducedMotion && !isDraggingThis ? 'transition-all duration-300' : ''} focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary focus-visible:ring-offset-4 translate-x-(--tube-tx) translate-y-(--tube-ty) rotate-(--tube-rot) scale-(--tube-scale) ${isDragTarget ? 'border-primary ring-2 ring-primary' : ''} ${selectedTube === i && !isDraggingThis && !isPouringSource ? 'ring-4 ring-primary ring-offset-4' : (!reducedMotion && !isDraggingThis && !isPouringSource ? 'hover:-translate-y-1' : '')} ${isDraggingThis || isPouringSource ? 'z-30 shadow-xl' : ''}`}
                                    >
                                        <span className="pointer-events-none absolute inset-y-2 left-1 z-20 w-1 rounded-full bg-white/30" aria-hidden="true" />
                                        {isCompleted && (
                                            <span className="pointer-events-none absolute top-1 right-1 z-20 size-2.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
                                        )}
                                        <span className="absolute inset-0 flex flex-col-reverse">{tube.map((color, idx) => {
                                            const poured = Boolean(lastPour && lastPour.to === i && lastPour.count > 0 && idx >= tube.length - lastPour.count);
                                            const isTop = idx === tube.length - 1;
                                            return (
                                                <span
                                                    key={idx}
                                                    style={{
                                                        '--layer-bg': COLORS[color],
                                                        '--layer-img': PATTERNS[color],
                                                        '--layer-size': color === 1 ? '12px 12px' : 'auto',
                                                    } as React.CSSProperties}
                                                    className={`h-1/4 w-full relative flex items-center justify-center border-t border-white/25 bg-(--layer-bg) bg-(image:--layer-img) bg-(length:--layer-size) ${isTop ? 'rounded-t-sm shadow-xs' : ''} ${poured && !reducedMotion ? 'oiyo-pour' : ''}`}
                                                >
                                                    {isTop && (
                                                        <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-white/35" aria-hidden="true" />
                                                    )}
                                                    {colorblind !== 'none' && (
                                                        <span className="text-xs font-black text-white drop-shadow-xs select-none">
                                                            {getColorblindSymbol(color)}
                                                        </span>
                                                    )}
                                                </span>
                                            );
                                        })}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    {isWon && game && <div className={`w-full max-w-md rounded-3xl border border-primary/30 bg-primary/5 p-6 text-center ${!reducedMotion ? 'animate-in zoom-in-95' : ''}`} role="status">
                        <div className="flex justify-center mb-3">
                            <img src={WATER_SORT_UI_SPRITES.trophy} alt="Purification Trophy" className="size-16 object-contain animate-bounce drop-shadow" />
                        </div>
                        <h4 className="mb-4 text-2xl font-black text-primary">{t.win}</h4>
                        <div className="mb-5 grid grid-cols-2 gap-3 text-sm"><p><strong>{t.moves}</strong><br />{game.moves}</p><p><strong>{t.time}</strong><br />{elapsedSeconds} {t.seconds}</p><p><strong>{t.efficiency}</strong><br />{efficiency}%</p><p><strong>{t.best}</strong><br />{displayedBest?.value ?? elapsedSeconds} {t.seconds}</p></div>
                        <p className="mb-5 text-xs font-bold text-muted-foreground">{t.next}: {Math.max(0, (displayedBest?.value ?? elapsedSeconds) - 1)} {t.seconds}</p>
                        <div className="mb-5 flex flex-wrap justify-center gap-2">
                            <button
                                type="button"
                                onClick={handleShareCard}
                                className="min-h-11 px-4 py-2 rounded-xl border border-primary/40 bg-primary/10 shadow-xs text-xs font-bold text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5"
                            >
                                {shareCardCopied ? <Check className="size-4 text-success" /> : <span>🖼️</span>}
                                <span>{shareCardCopied ? '카드 복사됨!' : '카드 공유 2.0'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleCopyChallenge}
                                className="min-h-11 px-4 py-2 rounded-xl border border-border bg-background shadow-xs text-xs font-bold text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                            >
                                {copied ? <Check className="size-4 text-success" /> : <Share2 className="size-4" />}
                                <span>{copied ? '링크 복사됨!' : '챌린지 공유'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowQrModal(true)}
                                className="min-h-11 px-4 py-2 rounded-xl border border-border bg-background shadow-xs text-xs font-bold text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                            >
                                <QrCode className="size-4" />
                                <span>QR 코드</span>
                            </button>
                        </div>
                        <button type="button" onClick={() => startGame(difficulty)} className="min-h-12 rounded-full bg-primary px-10 font-bold text-primary-foreground shadow-lg">{t.playAgain}</button>
                    </div>}
                </div>
            </GameContainer>
            {showQrModal && challengeUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
                    onClick={() => setShowQrModal(false)}
                >
                    <div
                        className="w-full max-w-xs rounded-2xl border border-border bg-card p-5 text-center shadow-2xl space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-base font-bold text-foreground">모바일로 챌린지 열기</h3>
                        <p className="text-xs text-muted-foreground">스마트폰 카메라로 QR 코드를 스캔하세요.</p>
                        <div
                            className="mx-auto flex size-52 items-center justify-center rounded-xl bg-white p-2 shadow-inner"
                            dangerouslySetInnerHTML={{
                                __html: generateChallengeQrSvg(challengeUrl, { size: 200 }),
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowQrModal(false)}
                            className="w-full min-h-11 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WaterSort;

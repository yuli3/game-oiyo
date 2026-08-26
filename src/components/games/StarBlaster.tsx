import { useCallback, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import type { Locale } from "../../lib/i18n";
import { getBest, recordAchievementEvent, recordBest } from "../../lib/games/records";
import { loadReplayEnvelope, saveReplayEnvelope, verifyReplayEnvelope, type ReplayInput } from "../../lib/games/replay";
import { frameDeltaSeconds } from "../../lib/games/time-contracts";
import { createStarBlasterReplay, replayStarBlaster, starBlasterGhostTrack, type StarBlasterReplayAction } from "../../lib/games/star-blaster-replay";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import {
  STAR_BLASTER_HEIGHT as H,
  STAR_BLASTER_STEP_SECONDS,
  STAR_BLASTER_WIDTH as W,
  chooseStarBlasterUpgrade,
  createStarBlasterState,
  stepStarBlaster,
  type StarBlasterUpgradeId,
  type StarBlasterState,
} from "../../lib/games/star-blaster";
import { STAR_BLASTER_SPRITES } from "../../lib/games/sprites";

type BlasterArt = Record<keyof typeof STAR_BLASTER_SPRITES, HTMLImageElement>;

function loadBlasterArt(): BlasterArt | null {
  if (typeof Image === "undefined") return null;
  const art = {} as BlasterArt;
  for (const [key, src] of Object.entries(STAR_BLASTER_SPRITES)) {
    const image = new Image();
    image.src = src;
    art[key as keyof BlasterArt] = image;
  }
  return art;
}

function paintSprite(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  if (!image?.complete || image.naturalWidth === 0) return false;
  ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
  return true;
}

const GAME_KEY = "star-blaster";
const MAX_STEPS_PER_FRAME = 8;

type Phase = "menu" | "playing" | "victory" | "over";
interface Particle { x: number; y: number; vx: number; vy: number; life: number; hue: number }
interface Debrief { kills: number; damageTaken: number; weaponBest: number; lastHit: { cause: "collision" | "escaped"; kind: string } | null }
type BindableAction = "left" | "right" | "pause";
type KeyBindings = Record<BindableAction, string>;
interface PerformanceReadout { fps: number; entities: number; quality: "high" | "balanced" }

const SETTINGS_KEY = "oiyo:star-blaster:settings:v1";
const DEFAULT_BINDINGS: KeyBindings = { left: "ArrowLeft", right: "ArrowRight", pause: "KeyP" };

function loadBindings(): KeyBindings {
  if (typeof localStorage === "undefined") return DEFAULT_BINDINGS;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object") return DEFAULT_BINDINGS;
    const candidate = parsed as Partial<KeyBindings>;
    if ([candidate.left, candidate.right, candidate.pause].every((value) => typeof value === "string" && value.length > 0)) {
      return { left: candidate.left!, right: candidate.right!, pause: candidate.pause! };
    }
  } catch { /* user-editable storage falls back safely */ }
  return DEFAULT_BINDINGS;
}

function keyLabel(code: string): string {
  return code.replace(/^Key/, "").replace(/^Arrow/, "");
}

type I18n = {
  title: string; subtitle: string; tapStart: string; controls: string;
  score: string; best: string; wave: string; lives: string;
  gameOver: string; restart: string; newBest: string; pause: string; resume: string;
  weapon: string; upgrade: string; choose: string;
  upgradeNames: Record<StarBlasterUpgradeId, string>;
  upgradeDescriptions: Record<StarBlasterUpgradeId, string>;
};

const T: Record<Locale, I18n> = {
  ko: { title: "스타 블래스터", subtitle: "드래그로 조준, 자동 발사 — 웨이브를 버텨라", tapStart: "탭하여 시작", controls: "손가락·마우스 또는 ← → 키로 우주선을 좌우로 움직이세요. 발사는 자동입니다.", score: "점수", best: "최고", wave: "웨이브", lives: "생명", gameOver: "게임 오버", restart: "다시 하기", newBest: "🎉 신기록!", pause: "일시정지", resume: "계속하기", weapon: "무기", upgrade: "웨이브 돌파", choose: "강화 선택", upgradeNames: { "pulse-overdrive": "펄스 오버드라이브", "scatter-array": "스캐터 어레이", "arc-coil": "아크 코일", "hull-repair": "선체 수리", "score-multiplier": "전술 배율" }, upgradeDescriptions: { "pulse-overdrive": "직선 펄스의 연사력과 관통력을 높입니다.", "scatter-array": "세 방향으로 퍼지는 근거리 화망으로 전환합니다.", "arc-coil": "명중 시 가까운 적에게 연쇄되는 전격탄으로 전환합니다.", "hull-repair": "생명을 1 회복합니다.", "score-multiplier": "격추 점수 배율을 영구히 1단계 높입니다." } },
  en: { title: "Star Blaster", subtitle: "Drag to aim, auto-fire — survive the waves", tapStart: "Tap to start", controls: "Move the ship left or right with touch, mouse, or the ← → keys. Firing is automatic.", score: "Score", best: "Best", wave: "Wave", lives: "Lives", gameOver: "Game Over", restart: "Play again", newBest: "🎉 New best!", pause: "Pause", resume: "Resume", weapon: "Weapon", upgrade: "Wave cleared", choose: "Choose upgrade", upgradeNames: { "pulse-overdrive": "Pulse Overdrive", "scatter-array": "Scatter Array", "arc-coil": "Arc Coil", "hull-repair": "Hull Repair", "score-multiplier": "Tactical Multiplier" }, upgradeDescriptions: { "pulse-overdrive": "Boost the straight pulse cannon's fire rate and power.", "scatter-array": "Switch to a close-range three-way spread.", "arc-coil": "Switch to bolts that chain into a nearby enemy.", "hull-repair": "Restore one life.", "score-multiplier": "Permanently raise kill-score multiplier by one tier." } },
  ja: { title: "スターブラスター", subtitle: "ドラッグで狙い、自動発射 — ウェーブを耐えろ", tapStart: "タップで開始", controls: "タッチ、マウス、または← →キーで宇宙船を左右に動かします。発射は自動です。", score: "スコア", best: "ベスト", wave: "ウェーブ", lives: "残機", gameOver: "ゲームオーバー", restart: "もう一度", newBest: "🎉 新記録！", pause: "一時停止", resume: "再開", weapon: "武器", upgrade: "ウェーブ突破", choose: "強化を選択", upgradeNames: { "pulse-overdrive": "パルス・オーバードライブ", "scatter-array": "スキャッター・アレイ", "arc-coil": "アーク・コイル", "hull-repair": "船体修理", "score-multiplier": "戦術倍率" }, upgradeDescriptions: { "pulse-overdrive": "直線パルス砲の連射力と威力を強化します。", "scatter-array": "近距離向けの3方向拡散射撃に切り替えます。", "arc-coil": "命中時に近くの敵へ連鎖する電撃弾に切り替えます。", "hull-repair": "残機を1回復します。", "score-multiplier": "撃破スコア倍率を永続的に1段階上げます。" } },
  fr: { title: "Star Blaster", subtitle: "Visez en glissant, tir auto — survivez aux vagues", tapStart: "Touchez pour commencer", controls: "Déplacez le vaisseau à gauche ou à droite au toucher, à la souris ou avec les touches ← →. Le tir est automatique.", score: "Score", best: "Record", wave: "Vague", lives: "Vies", gameOver: "Game Over", restart: "Rejouer", newBest: "🎉 Nouveau record !", pause: "Pause", resume: "Reprendre", weapon: "Arme", upgrade: "Vague terminée", choose: "Choisir une amélioration", upgradeNames: { "pulse-overdrive": "Surcharge pulsée", "scatter-array": "Réseau dispersé", "arc-coil": "Bobine d'arc", "hull-repair": "Réparation de coque", "score-multiplier": "Multiplicateur tactique" }, upgradeDescriptions: { "pulse-overdrive": "Augmente la cadence et la puissance du canon pulsé.", "scatter-array": "Passe à un tir rapproché dans trois directions.", "arc-coil": "Passe à des tirs qui ricochent vers un ennemi proche.", "hull-repair": "Restaure une vie.", "score-multiplier": "Augmente durablement le multiplicateur de score." } },
  es: { title: "Star Blaster", subtitle: "Apunta arrastrando, disparo auto — sobrevive a las oleadas", tapStart: "Toca para empezar", controls: "Mueve la nave a izquierda o derecha con el dedo, el ratón o las teclas ← →. El disparo es automático.", score: "Puntos", best: "Récord", wave: "Oleada", lives: "Vidas", gameOver: "Fin del juego", restart: "Jugar de nuevo", newBest: "🎉 ¡Nuevo récord!", pause: "Pausa", resume: "Continuar", weapon: "Arma", upgrade: "Oleada superada", choose: "Elige una mejora", upgradeNames: { "pulse-overdrive": "Sobrecarga de pulso", "scatter-array": "Matriz dispersa", "arc-coil": "Bobina de arco", "hull-repair": "Reparar casco", "score-multiplier": "Multiplicador táctico" }, upgradeDescriptions: { "pulse-overdrive": "Aumenta la cadencia y potencia del cañón de pulso.", "scatter-array": "Cambia a una descarga cercana de tres direcciones.", "arc-coil": "Cambia a rayos que saltan a un enemigo cercano.", "hull-repair": "Recupera una vida.", "score-multiplier": "Aumenta de forma permanente el multiplicador de puntos." } },
  zh: { title: "星际爆破", subtitle: "拖动瞄准，自动开火 — 挺过一波波敌人", tapStart: "点击开始", controls: "使用触控、鼠标或 ← → 键左右移动飞船。飞船会自动开火。", score: "得分", best: "最佳", wave: "波次", lives: "生命", gameOver: "游戏结束", restart: "再玩一次", newBest: "🎉 新纪录！", pause: "暂停", resume: "继续", weapon: "武器", upgrade: "波次完成", choose: "选择强化", upgradeNames: { "pulse-overdrive": "脉冲超频", "scatter-array": "散射阵列", "arc-coil": "电弧线圈", "hull-repair": "修复船体", "score-multiplier": "战术倍率" }, upgradeDescriptions: { "pulse-overdrive": "提高直线脉冲炮的射速与威力。", "scatter-array": "切换为近距离三向散射火力。", "arc-coil": "切换为命中后连锁附近敌人的电弧弹。", "hull-repair": "恢复一条生命。", "score-multiplier": "永久提升一级击落得分倍率。" } },
};

const RESULT_T: Record<Locale, { victory: string; boss: string; kills: string; damage: string; weaponBest: string; lastHit: string; collision: string; escaped: string; sameSector: string; newSector: string; ghost: string; soundOn: string; soundOff: string }> = {
  ko: { victory: "헬릭스 코어 격파", boss: "보스", kills: "격추", damage: "피해", weaponBest: "무기 최고", lastHit: "마지막 피격", collision: "적과 충돌", escaped: "적을 놓침", sameSector: "같은 구역 재도전", newSector: "새 구역", ghost: "PB 고스트", soundOn: "사운드 켜짐", soundOff: "사운드 꺼짐" },
  en: { victory: "Helix Core Destroyed", boss: "Boss", kills: "Kills", damage: "Damage", weaponBest: "Weapon best", lastHit: "Last hit", collision: "Enemy collision", escaped: "Enemy escaped", sameSector: "Retry same sector", newSector: "New sector", ghost: "PB ghost", soundOn: "Sound on", soundOff: "Sound off" },
  ja: { victory: "ヘリックスコア撃破", boss: "ボス", kills: "撃破", damage: "被害", weaponBest: "武器ベスト", lastHit: "最後の被弾", collision: "敵と衝突", escaped: "敵を逃した", sameSector: "同じ宙域で再挑戦", newSector: "新しい宙域", ghost: "PBゴースト", soundOn: "サウンドオン", soundOff: "サウンドオフ" },
  fr: { victory: "Noyau Helix détruit", boss: "Boss", kills: "Éliminations", damage: "Dégâts", weaponBest: "Record d'arme", lastHit: "Dernier impact", collision: "Collision ennemie", escaped: "Ennemi échappé", sameSector: "Rejouer ce secteur", newSector: "Nouveau secteur", ghost: "Fantôme PB", soundOn: "Son activé", soundOff: "Son coupé" },
  es: { victory: "Núcleo Helix destruido", boss: "Jefe", kills: "Bajas", damage: "Daño", weaponBest: "Récord de arma", lastHit: "Último impacto", collision: "Colisión enemiga", escaped: "Enemigo escapado", sameSector: "Reintentar sector", newSector: "Nuevo sector", ghost: "Fantasma PB", soundOn: "Sonido activado", soundOff: "Sonido desactivado" },
  zh: { victory: "螺旋核心已摧毁", boss: "首领", kills: "击落", damage: "受损", weaponBest: "武器最佳", lastHit: "最后受击", collision: "与敌人相撞", escaped: "敌人漏过", sameSector: "重试同一区域", newSector: "新区域", ghost: "PB幽灵", soundOn: "声音开启", soundOff: "声音关闭" },
};

const CONTROL_T: Record<Locale, { controls: string; left: string; right: string; pause: string; pressKey: string; gamepad: string; performance: string; high: string; balanced: string; reset: string }> = {
  ko: { controls: "조작 설정", left: "왼쪽", right: "오른쪽", pause: "일시정지", pressKey: "키를 누르세요", gamepad: "게임패드", performance: "성능", high: "높음", balanced: "균형", reset: "기본값" },
  en: { controls: "Controls", left: "Left", right: "Right", pause: "Pause", pressKey: "Press a key", gamepad: "Gamepad", performance: "Performance", high: "High", balanced: "Balanced", reset: "Defaults" },
  ja: { controls: "操作設定", left: "左", right: "右", pause: "一時停止", pressKey: "キーを押す", gamepad: "ゲームパッド", performance: "性能", high: "高", balanced: "バランス", reset: "初期値" },
  fr: { controls: "Commandes", left: "Gauche", right: "Droite", pause: "Pause", pressKey: "Appuyez sur une touche", gamepad: "Manette", performance: "Performance", high: "Élevée", balanced: "Équilibrée", reset: "Défaut" },
  es: { controls: "Controles", left: "Izquierda", right: "Derecha", pause: "Pausa", pressKey: "Pulsa una tecla", gamepad: "Mando", performance: "Rendimiento", high: "Alto", balanced: "Equilibrado", reset: "Predeterminado" },
  zh: { controls: "控制设置", left: "左移", right: "右移", pause: "暂停", pressKey: "按下按键", gamepad: "手柄", performance: "性能", high: "高", balanced: "均衡", reset: "默认" },
};

interface Props { locale: Locale }

function drawGame(
  ctx: CanvasRenderingContext2D,
  state: StarBlasterState,
  particles: Particle[],
  renderTime: number,
  reducedMotion: boolean,
  ghostX?: number,
  art?: BlasterArt | null,
) {
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  for (let i = 0; i < 30; i += 1) {
    const y = (i * 53 + (reducedMotion ? 0 : renderTime / 18)) % H;
    ctx.fillRect((i * 71) % W, y, 1.5, 1.5);
  }

  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillStyle = `hsl(${particle.hue} 90% 60%)`;
    ctx.fillRect(particle.x - 1.5, particle.y - 1.5, 3, 3);
  }
  ctx.globalAlpha = 1;

  for (const bullet of state.bullets) {
    if (!paintSprite(ctx, art?.bolt, bullet.x, bullet.y - 4, 10, 18)) {
      ctx.fillStyle = bullet.weapon === "arc" ? "#67e8f9" : bullet.weapon === "scatter" ? "#fb923c" : "#c4b5fd";
      ctx.fillRect(bullet.x - 1.5, bullet.y - 8, 3, 10);
    }
  }

  for (const enemy of state.enemies) {
    const sprite = enemy.kind === "warden" ? art?.warden : art?.drone;
    const painted = paintSprite(ctx, sprite, enemy.x, enemy.y, enemy.radius * 2.4, enemy.radius * 2.4);
    if (!painted) {
      ctx.beginPath();
      ctx.fillStyle = `hsl(${enemy.hue} 70% 55%)`;
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      if (enemy.kind === "swooper") {
        ctx.strokeStyle = "rgba(255,255,255,.75)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (enemy.kind === "warden") {
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 3;
        ctx.strokeRect(enemy.x - enemy.radius * 0.72, enemy.y - enemy.radius * 0.72, enemy.radius * 1.44, enemy.radius * 1.44);
      }
    }
    if (enemy.maxHp > 1) {
      ctx.fillStyle = "rgba(0,0,0,.55)";
      ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 7, enemy.radius * 2, 3);
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 7, enemy.radius * 2 * (enemy.hp / enemy.maxHp), 3);
    }
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(enemy.x - enemy.radius * 0.4, enemy.y - 2, enemy.radius * 0.8, 3);
  }

  if (state.boss) {
    const boss = state.boss;
    const colors = ["#a78bfa", "#f472b6", "#fb7185"];
    if (!paintSprite(ctx, art?.boss, boss.x, boss.y, 84, 84)) {
      ctx.save();
      ctx.translate(boss.x, boss.y);
      ctx.rotate(reducedMotion ? 0 : renderTime / 900);
      ctx.strokeStyle = colors[boss.phase - 1];
      ctx.lineWidth = 7;
      ctx.beginPath();
      for (let point = 0; point < 6; point += 1) {
        const angle = point * Math.PI / 3;
        const x = Math.cos(angle) * 34;
        const y = Math.sin(angle) * 34;
        if (point === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = "rgba(139,92,246,.35)";
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "rgba(0,0,0,.65)";
    ctx.fillRect(40, 14, W - 80, 8);
    ctx.fillStyle = colors[boss.phase - 1];
    ctx.fillRect(40, 14, (W - 80) * (boss.hp / boss.maxHp), 8);
  }

  const shipY = H - 44;
  if (Number.isFinite(ghostX)) {
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ghostX!, shipY - 16);
    ctx.lineTo(ghostX! - 14, shipY + 12);
    ctx.lineTo(ghostX! + 14, shipY + 12);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  if (!paintSprite(ctx, art?.ship, state.shipX, shipY, 40, 44)) {
    ctx.fillStyle = "#8b5cf6";
    ctx.beginPath();
    ctx.moveTo(state.shipX, shipY - 16);
    ctx.lineTo(state.shipX - 14, shipY + 12);
    ctx.lineTo(state.shipX + 14, shipY + 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c4b5fd";
    ctx.fillRect(state.shipX - 3, shipY - 6, 6, 10);
  }
}

const StarBlaster: React.FC<Props> = ({ locale }) => {
  const t = T[locale] ?? T.en;
  const resultT = RESULT_T[locale] ?? RESULT_T.en;
  const controlT = CONTROL_T[locale] ?? CONTROL_T.en;
  const [phase, setPhase] = useState<Phase>("menu");
  const [paused, setPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [lives, setLives] = useState(3);
  const [best, setBest] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [upgradeOptions, setUpgradeOptions] = useState<StarBlasterUpgradeId[]>([]);
  const [weapon, setWeapon] = useState("pulse");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [debrief, setDebrief] = useState<Debrief>({ kills: 0, damageTaken: 0, weaponBest: 0, lastHit: null });
  const [bindings, setBindings] = useState<KeyBindings>(DEFAULT_BINDINGS);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [captureAction, setCaptureAction] = useState<BindableAction | null>(null);
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const [gamepadUpgradeIndex, setGamepadUpgradeIndex] = useState(0);
  const [performanceReadout, setPerformance] = useState<PerformanceReadout>({ fps: 60, entities: 0, quality: "high" });
  const reducedMotion = usePrefersReducedMotion();

  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const artRef = useRef<BlasterArt | null>(null);
  if (artRef.current === null) artRef.current = loadBlasterArt();
  const simulationRef = useRef<StarBlasterState | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const targetXRef = useRef(W / 2);
  const rafRef = useRef<number | undefined>(undefined);
  const previousFrameRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;
  const gamepadButtonsRef = useRef<boolean[]>([]);
  const gamepadUpgradeIndexRef = useRef(0);
  gamepadUpgradeIndexRef.current = gamepadUpgradeIndex;
  const frameSamplesRef = useRef<number[]>([]);
  const lastPerformanceUpdateRef = useRef(0);
  const qualityRef = useRef<PerformanceReadout["quality"]>("high");
  const soundEnabledRef = useRef(true);
  const lastHitRef = useRef<Debrief["lastHit"]>(null);
  const lastSeedRef = useRef<number | null>(null);
  const replayInputsRef = useRef<ReplayInput<StarBlasterReplayAction>[]>([]);
  const lastReplayTargetRef = useRef<number | null>(null);
  const ghostTrackRef = useRef<number[]>([]);
  soundEnabledRef.current = soundEnabled;
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const phaseRef = useRef<Phase>("menu");
  phaseRef.current = phase;

  useEffect(() => {
    setBest(getBest(GAME_KEY)?.value ?? 0);
    setBindings(loadBindings());
  }, []);

  const playTone = useCallback((frequency: number, duration = 0.06, type: OscillatorType = "sine", volume = 0.035) => {
    const audio = audioRef.current;
    if (!audio || !soundEnabledRef.current) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  }, []);

  const finish = useCallback((finalState: StarBlasterState, won = false) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = undefined;
    const finalScore = finalState.score;
    const previous = getBest(GAME_KEY);
    const beat = !previous || finalScore > previous.value;
    if (beat && finalScore > 0) {
      try {
        const replay = createStarBlasterReplay(finalState, replayInputsRef.current);
        if (verifyReplayEnvelope(replay, replayStarBlaster)) saveReplayEnvelope(replay);
      } catch { /* incomplete or drifting replays never replace the PB ghost */ }
    }
    const saved = recordBest(GAME_KEY, finalScore, "score", undefined, { trackPlay: false });
    recordAchievementEvent(GAME_KEY, "played");
    if (beat && finalScore > 0) recordAchievementEvent(GAME_KEY, "personal-best");
    setBest(saved.value);
    setIsNewBest(beat && finalScore > 0);
    const weaponKey = `${GAME_KEY}:${finalState.weapon}`;
    const weaponRecord = recordBest(weaponKey, finalScore, "score", undefined, { trackPlay: false });
    setDebrief({ kills: finalState.stats.kills, damageTaken: finalState.stats.damageTaken, weaponBest: weaponRecord.value, lastHit: lastHitRef.current });
    if (beat && finalScore > 0 && !reducedMotionRef.current) {
      confetti({ particleCount: 100, spread: 75, origin: { y: 0.6 } });
    }
    if (won) {
      playTone(523, 0.18, "triangle", 0.055);
      window.setTimeout(() => playTone(659, 0.2, "triangle", 0.055), 100);
      window.setTimeout(() => playTone(784, 0.28, "triangle", 0.055), 200);
    }
    setPhase(won ? "victory" : "over");
  }, [playTone]);

  const loop = useCallback((now: number) => {
    const state = simulationRef.current;
    const canvas = canvasRef.current;
    if (!state || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!pausedRef.current) {
      accumulatorRef.current += frameDeltaSeconds(previousFrameRef.current, now);
      let steps = 0;
      while (accumulatorRef.current >= STAR_BLASTER_STEP_SECONDS && steps < MAX_STEPS_PER_FRAME) {
        const replayTarget = Math.round(targetXRef.current * 2) / 2;
        if (lastReplayTargetRef.current !== replayTarget) {
          replayInputsRef.current.push({ tick: state.tick, input: { type: "target", value: replayTarget } });
          lastReplayTargetRef.current = replayTarget;
        }
        stepStarBlaster(state, { targetX: replayTarget });
        accumulatorRef.current -= STAR_BLASTER_STEP_SECONDS;
        steps += 1;
        for (const event of state.events) {
          if (event.type === "shot" && state.tick % 3 === 0) playTone(state.weapon === "arc" ? 760 : state.weapon === "scatter" ? 220 : 440, 0.035, "square", 0.012);
          if (event.type === "enemy-hit" || event.type === "boss-hit") playTone(event.type === "boss-hit" ? 110 : 160, 0.04, "sawtooth", 0.018);
          if (event.type === "player-hit") {
            playTone(72, 0.18, "sawtooth", 0.06);
            if (event.hitCause) lastHitRef.current = { cause: event.hitCause, kind: event.enemyKind ?? "enemy" };
          }
          if (event.type === "boss-start" || event.type === "boss-phase") playTone(event.type === "boss-start" ? 92 : 138, 0.35, "sawtooth", 0.06);
          if (event.type !== "enemy-destroyed" && event.type !== "player-hit") continue;
          const count = reducedMotionRef.current ? 0 : qualityRef.current === "balanced" ? (event.type === "player-hit" ? 6 : 4) : event.type === "player-hit" ? 12 : 8;
          for (let index = 0; index < count; index += 1) {
            const angle = (index / Math.max(1, count)) * Math.PI * 2;
            particlesRef.current.push({
              x: event.x ?? state.shipX,
              y: event.y ?? H - 44,
              vx: Math.cos(angle) * (event.type === "player-hit" ? 3 : 2.4),
              vy: Math.sin(angle) * (event.type === "player-hit" ? 3 : 2.4),
              life: 1,
              hue: event.hue ?? 0,
            });
          }
        }
        const particleCap = window.matchMedia("(pointer: coarse)").matches ? 120 : 300;
        if (particlesRef.current.length > particleCap) particlesRef.current.splice(0, particlesRef.current.length - particleCap);
      }
      if (steps === MAX_STEPS_PER_FRAME) accumulatorRef.current = 0;

      if (reducedMotionRef.current) {
        particlesRef.current = [];
      } else {
        particlesRef.current = particlesRef.current.filter((particle) => {
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.vy += 0.04;
          particle.life -= 0.03;
          return particle.life > 0;
        });
      }
      if (state.tick % 6 === 0) {
        setScore((current) => current === state.score ? current : state.score);
        setLives((current) => current === state.lives ? current : state.lives);
        setWave((current) => current === state.wave ? current : state.wave);
        setWeapon((current) => current === state.weapon ? current : state.weapon);
      }
    }

    if (previousFrameRef.current !== null) {
      const frameMs = now - previousFrameRef.current;
      if (frameMs > 0 && frameMs < 250) frameSamplesRef.current.push(frameMs);
      if (frameSamplesRef.current.length > 120) frameSamplesRef.current.shift();
      if (now - lastPerformanceUpdateRef.current >= 1_000 && frameSamplesRef.current.length > 0) {
        const average = frameSamplesRef.current.reduce((sum, value) => sum + value, 0) / frameSamplesRef.current.length;
        const fps = Math.round(1_000 / average);
        const quality = fps < 50 ? "balanced" : "high";
        qualityRef.current = quality;
        setPerformance({ fps, entities: state.enemies.length + state.bullets.length, quality });
        lastPerformanceUpdateRef.current = now;
      }
    }

    previousFrameRef.current = now;
    drawGame(ctx, state, particlesRef.current, now, reducedMotionRef.current, ghostTrackRef.current[state.tick], artRef.current);
    if (state.phase === "upgrade") {
      setUpgradeOptions((current) => current.length ? current : [...state.pendingUpgrades]);
    } else if (state.phase === "over") {
      finish(state);
      return;
    } else if (state.phase === "victory") {
      finish(state, true);
      return;
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [finish, playTone]);

  const begin = useCallback((seedOverride?: number) => {
    if (!audioRef.current) audioRef.current = new AudioContext();
    if (audioRef.current.state === "suspended") void audioRef.current.resume();
    const seed = seedOverride ?? ((Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0);
    lastSeedRef.current = seed;
    const state = createStarBlasterState(seed);
    replayInputsRef.current = [];
    lastReplayTargetRef.current = null;
    ghostTrackRef.current = [];
    const prior = loadReplayEnvelope<StarBlasterReplayAction>(GAME_KEY);
    if (prior?.seed === seed) {
      try { if (verifyReplayEnvelope(prior, replayStarBlaster)) ghostTrackRef.current = starBlasterGhostTrack(prior); } catch { ghostTrackRef.current = []; }
    }
    simulationRef.current = state;
    particlesRef.current = [];
    targetXRef.current = W / 2;
    previousFrameRef.current = null;
    accumulatorRef.current = 0;
    setScore(0);
    setLives(3);
    setWave(1);
    setPaused(false);
    setIsNewBest(false);
    setUpgradeOptions([]);
    setWeapon("pulse");
    setPerformance({ fps: 60, entities: 0, quality: "high" });
    qualityRef.current = "high";
    frameSamplesRef.current = [];
    lastHitRef.current = null;
    setDebrief({ kills: 0, damageTaken: 0, weaponBest: getBest(`${GAME_KEY}:pulse`)?.value ?? 0, lastHit: null });
    setPhase("playing");
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    void audioRef.current?.close();
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      previousFrameRef.current = null;
      accumulatorRef.current = 0;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const steer = useCallback((clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !simulationRef.current) return;
    const rect = canvas.getBoundingClientRect();
    targetXRef.current = ((clientX - rect.left) / rect.width) * W;
  }, []);

  const steerByKeyboard = useCallback((direction: -1 | 1) => {
    if (!simulationRef.current || phaseRef.current !== "playing") return;
    targetXRef.current = Math.max(18, Math.min(W - 18, targetXRef.current + direction * 24));
  }, []);

  const togglePause = useCallback(() => {
    setPaused((current) => {
      previousFrameRef.current = null;
      accumulatorRef.current = 0;
      return !current;
    });
  }, []);

  const chooseUpgrade = useCallback((upgrade: StarBlasterUpgradeId) => {
    const state = simulationRef.current;
    if (!state || !chooseStarBlasterUpgrade(state, upgrade)) return;
    replayInputsRef.current.push({ tick: state.tick, input: { type: "upgrade", value: upgrade } });
    setUpgradeOptions([]);
    setWave(state.wave);
    setLives(state.lives);
    setWeapon(state.weapon);
    previousFrameRef.current = null;
    accumulatorRef.current = 0;
    playTone(520, 0.12, "triangle", 0.05);
  }, [playTone]);

  useEffect(() => {
    if (upgradeOptions.length === 0) return;
    const onUpgradeKey = (event: KeyboardEvent) => {
      const index = Number(event.key) - 1;
      const upgrade = upgradeOptions[index];
      if (!upgrade) return;
      event.preventDefault();
      chooseUpgrade(upgrade);
    };
    window.addEventListener("keydown", onUpgradeKey);
    return () => window.removeEventListener("keydown", onUpgradeKey);
  }, [chooseUpgrade, upgradeOptions]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (captureAction) {
        event.preventDefault();
        if (event.code === "Escape") {
          setCaptureAction(null);
          return;
        }
        setBindings((current) => {
          const next = { ...current };
          const duplicate = (Object.keys(next) as BindableAction[]).find((action) => action !== captureAction && next[action] === event.code);
          if (duplicate) next[duplicate] = current[captureAction];
          next[captureAction] = event.code;
          try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* best effort */ }
          return next;
        });
        setCaptureAction(null);
        return;
      }
      if ((event.target as HTMLElement | null)?.closest("button, input, textarea, select")) return;
      const current = bindingsRef.current;
      if ([current.left, current.right, current.pause, "Escape", "Enter"].includes(event.code)) event.preventDefault();
      if (phaseRef.current === "playing" && event.code === current.left) steerByKeyboard(-1);
      if (phaseRef.current === "playing" && event.code === current.right) steerByKeyboard(1);
      if (phaseRef.current === "playing" && (event.code === current.pause || event.code === "Escape")) togglePause();
      if ((phaseRef.current === "over" || phaseRef.current === "victory") && event.code === "Enter") begin(lastSeedRef.current ?? undefined);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [begin, captureAction, steerByKeyboard, togglePause]);

  useEffect(() => {
    const poll = window.setInterval(() => {
      const pad = navigator.getGamepads?.().find((candidate) => candidate?.connected) ?? null;
      setGamepadConnected(Boolean(pad));
      if (!pad) {
        gamepadButtonsRef.current = [];
        return;
      }
      const pressed = pad.buttons.map((button) => button.pressed);
      const previous = gamepadButtonsRef.current;
      const edge = (index: number) => Boolean(pressed[index] && !previous[index]);
      const axis = Math.abs(pad.axes[0] ?? 0) >= 0.2 ? pad.axes[0] : 0;
      const direction = pressed[14] ? -1 : pressed[15] ? 1 : axis;
      if (phaseRef.current === "playing" && direction) steerByKeyboard(direction < 0 ? -1 : 1);
      if (phaseRef.current === "playing" && edge(9)) togglePause();

      const state = simulationRef.current;
      if (state?.phase === "upgrade" && upgradeOptions.length > 0) {
        let nextIndex = gamepadUpgradeIndexRef.current;
        if (edge(14) || edge(12)) nextIndex = (nextIndex + upgradeOptions.length - 1) % upgradeOptions.length;
        if (edge(15) || edge(13)) nextIndex = (nextIndex + 1) % upgradeOptions.length;
        if (nextIndex !== gamepadUpgradeIndexRef.current) setGamepadUpgradeIndex(nextIndex);
        if (edge(0)) chooseUpgrade(upgradeOptions[nextIndex]);
      } else if ((phaseRef.current === "over" || phaseRef.current === "victory") && edge(0)) {
        begin(lastSeedRef.current ?? undefined);
      }
      gamepadButtonsRef.current = pressed;
    }, 50);
    return () => window.clearInterval(poll);
  }, [begin, chooseUpgrade, steerByKeyboard, togglePause, upgradeOptions]);

  return (
    <div className="not-prose my-10 mx-auto max-w-md rounded-3xl border border-border bg-card p-4 text-card-foreground shadow-sm select-none">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black uppercase tracking-widest text-primary">{t.title}</div>
          <div className="text-[11px] text-muted-foreground">{t.subtitle}</div>
        </div>
        <div className="text-right text-xs font-bold">
          <div>{t.score}: <b className="text-primary">{score}</b></div>
          <div className="text-muted-foreground">{t.best}: {best}</div>
        </div>
        <button
          type="button"
          onClick={() => setSoundEnabled((current) => !current)}
          className="min-h-11 min-w-11 rounded-full border border-border text-base"
          aria-label={soundEnabled ? resultT.soundOn : resultT.soundOff}
          aria-pressed={soundEnabled}
        >
          {soundEnabled ? "🔊" : "🔇"}
        </button>
      </div>

      <div className="relative mx-auto" style={{ maxWidth: `${W}px` }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full rounded-2xl border border-border touch-none [cursor:none] bg-[#0b1020]"
          style={{ aspectRatio: `${W} / ${H}` }}
          tabIndex={0}
          role="application"
          aria-label={`${t.title}. ${t.controls}`}
          onPointerMove={(event) => phaseRef.current === "playing" && steer(event.clientX)}
          onPointerDown={(event) => phaseRef.current === "playing" && steer(event.clientX)}
        />

        {phase === "playing" && (
          <>
            <div className="pointer-events-none absolute left-2 top-2 flex gap-2 text-[11px] font-bold text-white/90">
              <span>{t.wave} {wave}</span>
              {simulationRef.current?.phase === "boss" && <span className="text-pink-300">{resultT.boss} {simulationRef.current.boss?.phase}/3</span>}
              <span>{t.weapon}: {weapon.toUpperCase()}</span>
              {ghostTrackRef.current.length > 0 && <span className="text-amber-300">◇ {resultT.ghost}</span>}
              <span aria-label={`${t.lives}: ${lives}`}>{"❤️".repeat(Math.max(0, lives))}</span>
            </div>
            {!paused && upgradeOptions.length === 0 && (
              <button
                type="button"
                onClick={togglePause}
                className="absolute right-2 top-2 min-h-11 min-w-11 rounded-full bg-black/60 px-3 text-xs font-bold text-white"
                aria-label={t.pause}
              >
                Ⅱ
              </button>
            )}
          </>
        )}

        {(phase !== "playing" || paused || upgradeOptions.length > 0) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-black/55 px-6 text-center backdrop-blur-sm">
            {phase === "over" && (
              <>
                {isNewBest && <div className="text-sm font-black text-violet-300">{t.newBest}</div>}
                <div className="text-xl font-black text-white">{t.gameOver}</div>
                <div className="text-sm text-white/80">{t.score}: <b>{score}</b> · {t.best}: {best}</div>
              </>
            )}
            {phase === "victory" && (
              <>
                {isNewBest && <div className="text-sm font-black text-amber-300">{t.newBest}</div>}
                <div className="text-2xl font-black text-white">🏆 {resultT.victory}</div>
                <div className="text-sm text-white/80">{t.score}: <b>{score}</b> · {t.best}: {best}</div>
              </>
            )}
            {(phase === "over" || phase === "victory") && (
              <div className="grid w-full grid-cols-3 gap-2 text-xs text-white/75" aria-label="Run debrief">
                <div className="rounded-lg bg-white/10 p-2"><b className="block text-white">{debrief.kills}</b>{resultT.kills}</div>
                <div className="rounded-lg bg-white/10 p-2"><b className="block text-white">{debrief.damageTaken}</b>{resultT.damage}</div>
                <div className="rounded-lg bg-white/10 p-2"><b className="block text-white">{debrief.weaponBest}</b>{resultT.weaponBest}</div>
                {debrief.lastHit && (
                  <div className="col-span-3 rounded-lg bg-rose-500/15 p-2 text-left">
                    <b className="text-white">{resultT.lastHit}:</b>{" "}
                    {debrief.lastHit.cause === "collision" ? resultT.collision : resultT.escaped} · {debrief.lastHit.kind}
                  </div>
                )}
              </div>
            )}
            {phase === "menu" && (
              <>
                <div className="text-4xl" aria-hidden="true">🚀</div>
                <p className="max-w-xs text-xs leading-relaxed text-white/80">{t.controls}</p>
              </>
            )}
            {upgradeOptions.length > 0 ? (
              <div className="w-full space-y-2" role="group" aria-label={t.choose}>
                <div className="text-lg font-black text-white">{t.upgrade} · {t.choose}</div>
                {upgradeOptions.map((upgrade, index) => (
                  <button
                    key={upgrade}
                    type="button"
                    onClick={() => chooseUpgrade(upgrade)}
                    className={`block min-h-14 w-full rounded-xl border px-3 py-2 text-left text-white hover:bg-white/20 ${gamepadConnected && gamepadUpgradeIndex === index ? "border-amber-300 bg-white/20" : "border-white/20 bg-white/10"}`}
                  >
                    <b>{index + 1}. {t.upgradeNames[upgrade]}</b>
                    <span className="block text-[11px] text-white/75">{t.upgradeDescriptions[upgrade]}</span>
                  </button>
                ))}
              </div>
            ) : phase === "over" || phase === "victory" ? (
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => begin(lastSeedRef.current ?? undefined)}
                  className="min-h-11 rounded-full bg-violet-500 px-6 py-2.5 font-bold text-white hover:bg-violet-600"
                >
                  {resultT.sameSector}
                </button>
                <button
                  type="button"
                  onClick={() => begin()}
                  className="min-h-11 rounded-full border border-white/30 bg-white/10 px-6 py-2.5 font-bold text-white hover:bg-white/20"
                >
                  {resultT.newSector}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => paused ? togglePause() : begin()}
                className="min-h-11 rounded-full bg-violet-500 px-8 py-2.5 font-bold text-white transition-colors hover:bg-violet-600"
              >
                {paused ? t.resume : t.tapStart}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span aria-live="polite">
          {controlT.performance}: {performanceReadout.fps} FPS · {performanceReadout.entities} entities · {performanceReadout.quality === "high" ? controlT.high : controlT.balanced}
        </span>
        <span>{controlT.gamepad}: {gamepadConnected ? "●" : "○"}</span>
        <button
          type="button"
          onClick={() => {
            setControlsOpen((current) => !current);
            if (phaseRef.current === "playing") setPaused(true);
          }}
          className="min-h-11 rounded-full border border-border px-4 font-bold text-foreground"
          aria-expanded={controlsOpen}
        >
          ⚙ {controlT.controls}
        </button>
      </div>

      {controlsOpen && (
        <div className="mt-3 rounded-2xl border border-border bg-muted/40 p-3" aria-label={controlT.controls}>
          <div className="grid grid-cols-3 gap-2">
            {(["left", "right", "pause"] as BindableAction[]).map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => setCaptureAction(action)}
                className="min-h-14 rounded-xl border border-border bg-background px-2 text-xs font-bold"
              >
                <span className="block text-muted-foreground">{controlT[action]}</span>
                {captureAction === action ? controlT.pressKey : keyLabel(bindings[action])}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setBindings(DEFAULT_BINDINGS);
              try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_BINDINGS)); } catch { /* best effort */ }
            }}
            className="mt-2 min-h-11 rounded-full px-4 text-xs font-bold text-primary"
          >
            {controlT.reset}
          </button>
        </div>
      )}

      <div className="sr-only" aria-live="polite">
        {phase === "playing" ? `${t.wave} ${wave}. ${t.score} ${score}. ${t.lives} ${lives}.` : ""}
      </div>
    </div>
  );
};

export default StarBlaster;

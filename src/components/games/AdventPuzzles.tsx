import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { CalendarDays, Lightbulb, Maximize2, Minimize2, RotateCcw, Share2, Undo2, Volume2, VolumeX } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { ZEN_MUSICBOX_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { createBurstField, type BurstField } from "../../lib/games/juice";
import { useRunRecord } from "../../lib/games/use-run-record";
import { markStageCleared } from "../../lib/games/stage-progress";
import { getDailyStreak, recordDailyWin } from "../../lib/games/records";
import { minutesUntilNextDaily, mulberry32, previousDayKey, todayKey } from "../../lib/games/daily";
import { normalizeGameLocale } from "../../lib/games/game-text";
import {
  ADVENT_SLUG, DAY_COUNT, E, N, PROGRESS_KEY, S, SORT_CAP, W as WEST, buildShareText, canPour, garlandHint, garlandSolved, kindForDay,
  lightsHint, lightsSolved, litCells, mergeResult, parseProgress, pour, pressLights, puzzleForDay, pushTrail, rotateCell, slideHint,
  slideSolved, slideTile, sortHint, sortSolved, starsFor, suggestedDay, totalStars, unlockedThrough,
  type DayResult, type Kind, type Progress, type Puzzle,
} from "../../lib/games/advent-puzzles";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

type Copy = {
  month: string; door: string; kinds: Record<Kind, string>; help: Record<Kind, string>; moves: string; par: string; hint: string; undo: string;
  reset: string; calendar: string; share: string; copied: string; next: string; missed: string; locked: string; preview: string; nextIn: string;
  solved: string; stars: string; streak: string; shareHead: string; shareLine: string; tag: string; stuck: string; full: string; exitFull: string;
  mute: string; unmute: string; allDone: string; open: string; pick: string;
};

const COPY: Record<L, Copy> = {
  ko: {
    month: "12월", door: "{0}일", moves: "{0}수", par: "목표 {0}수", hint: "힌트", undo: "되돌리기", reset: "처음부터", calendar: "달력",
    kinds: { lights: "촛불 켜기", slide: "겨울 그림 맞추기", garland: "전구 줄 잇기", sort: "방울 정리" },
    help: {
      lights: "초를 누르면 그 초와 위·아래·왼쪽·오른쪽 초가 함께 켜지거나 꺼집니다. 모든 초를 켜세요.",
      slide: "빈칸 옆 조각을 눌러 밀어서 겨울 그림을 완성하세요. 조각 구석의 작은 숫자 순서대로 맞추면 됩니다.",
      garland: "칸을 누르면 전선이 90도 돌아갑니다. 맨 위 별에서 전기가 흘러 모든 전구가 켜지도록 이으세요.",
      sort: "병을 눌러 고른 뒤 다른 병을 누르면 맨 위 방울이 옮겨집니다. 같은 색 위나 빈 병에만 놓을 수 있어요. 병마다 한 색 4개씩 모으세요.",
    },
    share: "결과 공유", copied: "복사했어요!", next: "다음 문 열기", missed: "놓친 문 열기", locked: "12월 {0}일에 열려요",
    preview: "12월 1일부터 하루에 한 칸씩 열려요. 지금은 1일 문을 미리 열어 볼 수 있어요.", nextIn: "다음 문까지 {0}시간 {1}분",
    solved: "{0}일 문 완성!", stars: "별 {0}/{1}", streak: "연속 {0}일", shareHead: "🎄 OIYO 어드벤트 퍼즐 12월 {0}일", shareLine: "{0}수 · 힌트 {1}",
    tag: "#OIYO어드벤트", stuck: "더 갈 수 없어요. 되돌리거나 처음부터 해 보세요.", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
    allDone: "25개 문을 모두 열었어요. 메리 크리스마스!", open: "{0}일 문 열기", pick: "문을 눌러 오늘의 퍼즐을 여세요",
  },
  en: {
    month: "December", door: "Dec {0}", moves: "{0} moves", par: "Par {0}", hint: "Hint", undo: "Undo", reset: "Restart", calendar: "Calendar",
    kinds: { lights: "Light the Candles", slide: "Winter Picture Slide", garland: "Connect the Lights", sort: "Ornament Sort" },
    help: {
      lights: "Tap a candle to toggle it and the candles above, below, left and right of it. Light every candle.",
      slide: "Tap a tile next to the gap to slide it and rebuild the winter picture. The small numbers in the corners show the order.",
      garland: "Tap a square to turn its wire 90°. Connect everything so power flows from the star at the top and every bulb lights up.",
      sort: "Tap a jar, then another jar, to move the top ornaments. They can only go on the same colour or into an empty jar. Fill each jar with four of one colour.",
    },
    share: "Share result", copied: "Copied!", next: "Open next door", missed: "Open a missed door", locked: "Opens on 12/{0}",
    preview: "From 1 December one door opens each day. For now you can peek behind door 1.", nextIn: "Next door in {0}h {1}m",
    solved: "Door {0} done!", stars: "Stars {0}/{1}", streak: "{0}-day streak", shareHead: "🎄 OIYO Advent Puzzle · Dec {0}", shareLine: "{0} moves · {1} hints",
    tag: "#OIYOAdvent", stuck: "No moves left. Undo or restart.", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
    allDone: "All 25 doors are open. Merry Christmas!", open: "Open door {0}", pick: "Tap a door to open today's puzzle",
  },
  ja: {
    month: "12月", door: "{0}日", moves: "{0}手", par: "目標{0}手", hint: "ヒント", undo: "戻す", reset: "最初から", calendar: "カレンダー",
    kinds: { lights: "ろうそく点灯", slide: "冬の絵スライド", garland: "電飾つなぎ", sort: "オーナメント仕分け" },
    help: {
      lights: "ろうそくを押すと、そのろうそくと上下左右のろうそくが一緒に点いたり消えたりします。全部点けましょう。",
      slide: "空きマスの隣のピースを押して動かし、冬の絵を完成させましょう。角の小さな数字の順に並べます。",
      garland: "マスを押すと電線が90度回ります。一番上の星から電気が流れ、全部の電球が点くようにつなぎましょう。",
      sort: "瓶を押して選び、別の瓶を押すと一番上の玉が移ります。同じ色の上か空の瓶にだけ置けます。各瓶に同じ色を4つ集めましょう。",
    },
    share: "結果をシェア", copied: "コピーしました！", next: "次の扉を開ける", missed: "開け忘れた扉へ", locked: "12月{0}日に開きます",
    preview: "12月1日から1日に1つずつ扉が開きます。今は1日の扉だけ先に開けられます。", nextIn: "次の扉まで{0}時間{1}分",
    solved: "{0}日の扉クリア！", stars: "星 {0}/{1}", streak: "{0}日連続", shareHead: "🎄 OIYOアドベント・パズル 12月{0}日", shareLine: "{0}手・ヒント{1}",
    tag: "#OIYOアドベント", stuck: "もう動かせません。戻すか最初からどうぞ。", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
    allDone: "25の扉をすべて開けました。メリークリスマス！", open: "{0}日の扉を開ける", pick: "扉を押して今日のパズルを開けましょう",
  },
  zh: {
    month: "12月", door: "{0}日", moves: "{0}步", par: "目标{0}步", hint: "提示", undo: "撤销", reset: "重来", calendar: "日历",
    kinds: { lights: "点亮蜡烛", slide: "冬日拼图滑块", garland: "连接彩灯", sort: "彩球分类" },
    help: {
      lights: "点一支蜡烛，它和上下左右的蜡烛会一起点亮或熄灭。把所有蜡烛都点亮。",
      slide: "点空格旁边的拼块把它滑过去，拼出冬日图画。拼块角上的小数字就是顺序。",
      garland: "点一格，电线转90度。把线路接通，让电从顶上的星星流出，点亮所有灯泡。",
      sort: "先点一个瓶子，再点另一个，最上面的彩球就会移过去。只能放在同色球上或空瓶里。让每个瓶子装满4个同色彩球。",
    },
    share: "分享结果", copied: "已复制！", next: "打开下一扇门", missed: "打开错过的门", locked: "12月{0}日开放",
    preview: "从12月1日起每天开一扇门。现在可以先打开1日的门试玩。", nextIn: "距下一扇门还有{0}小时{1}分",
    solved: "{0}日之门完成！", stars: "星星 {0}/{1}", streak: "连续{0}天", shareHead: "🎄 OIYO降临节谜题 12月{0}日", shareLine: "{0}步 · 提示{1}次",
    tag: "#OIYO降临节", stuck: "无路可走了，撤销或重来吧。", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
    allDone: "25扇门全部打开了。圣诞快乐！", open: "打开{0}日的门", pick: "点一扇门，打开今天的谜题",
  },
  fr: {
    month: "Décembre", door: "{0} déc.", moves: "{0} coups", par: "Objectif {0}", hint: "Indice", undo: "Annuler", reset: "Recommencer", calendar: "Calendrier",
    kinds: { lights: "Allumer les bougies", slide: "Taquin d'hiver", garland: "Guirlande à relier", sort: "Tri des boules" },
    help: {
      lights: "Touchez une bougie : elle et ses voisines du haut, du bas, de gauche et de droite s'allument ou s'éteignent. Allumez-les toutes.",
      slide: "Touchez une pièce à côté du trou pour la glisser et reformer l'image d'hiver. Les petits chiffres dans les coins donnent l'ordre.",
      garland: "Touchez une case pour tourner son fil de 90°. Reliez tout pour que le courant parte de l'étoile en haut et allume chaque ampoule.",
      sort: "Touchez un bocal puis un autre pour déplacer les boules du dessus. Elles vont seulement sur la même couleur ou dans un bocal vide. Remplissez chaque bocal de quatre boules d'une couleur.",
    },
    share: "Partager", copied: "Copié !", next: "Ouvrir la porte suivante", missed: "Ouvrir une porte manquée", locked: "S'ouvre le {0} déc.",
    preview: "Dès le 1er décembre, une porte s'ouvre chaque jour. Vous pouvez déjà jeter un œil derrière la porte 1.", nextIn: "Prochaine porte dans {0} h {1} min",
    solved: "Porte du {0} réussie !", stars: "Étoiles {0}/{1}", streak: "{0} jours d'affilée", shareHead: "🎄 OIYO Calendrier de l'Avent · {0} déc.", shareLine: "{0} coups · {1} indices",
    tag: "#OIYOAvent", stuck: "Plus aucun coup possible. Annulez ou recommencez.", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
    allDone: "Les 25 portes sont ouvertes. Joyeux Noël !", open: "Ouvrir la porte du {0}", pick: "Touchez une porte pour ouvrir l'énigme du jour",
  },
  es: {
    month: "Diciembre", door: "{0} dic.", moves: "{0} movs.", par: "Objetivo {0}", hint: "Pista", undo: "Deshacer", reset: "Reiniciar", calendar: "Calendario",
    kinds: { lights: "Enciende las velas", slide: "Deslizante de invierno", garland: "Conecta la guirnalda", sort: "Ordena las bolas" },
    help: {
      lights: "Toca una vela: ella y las de arriba, abajo, izquierda y derecha se encienden o se apagan. Enciéndelas todas.",
      slide: "Toca una pieza junto al hueco para deslizarla y rehacer la imagen de invierno. Los números pequeños de las esquinas marcan el orden.",
      garland: "Toca una casilla para girar su cable 90°. Conéctalo todo para que la corriente salga de la estrella de arriba y se enciendan todas las bombillas.",
      sort: "Toca un frasco y luego otro para mover las bolas de arriba. Solo pueden ir sobre el mismo color o a un frasco vacío. Llena cada frasco con cuatro bolas de un color.",
    },
    share: "Compartir", copied: "¡Copiado!", next: "Abrir la siguiente puerta", missed: "Abrir una puerta pendiente", locked: "Se abre el {0} de dic.",
    preview: "Desde el 1 de diciembre se abre una puerta cada día. Ya puedes asomarte a la puerta 1.", nextIn: "Siguiente puerta en {0} h {1} min",
    solved: "¡Puerta del {0} resuelta!", stars: "Estrellas {0}/{1}", streak: "Racha de {0} días", shareHead: "🎄 OIYO Calendario de Adviento · {0} dic.", shareLine: "{0} movs. · {1} pistas",
    tag: "#OIYOAdviento", stuck: "No quedan movimientos. Deshaz o reinicia.", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
    allDone: "Las 25 puertas están abiertas. ¡Feliz Navidad!", open: "Abrir la puerta del {0}", pick: "Toca una puerta para abrir el puzle de hoy",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:advent-puzzles:muted";
const CW = 360;
const CAL_H = 470;
const PLAY_H = 380;
const BOARD = 320;
const BX = 20;
const BY = 30;
const DOOR_W = 60;
const DOOR_H = 66;
const DOOR_GAP = 8;
const DOOR_X0 = 14;
const DOOR_Y0 = 92;
const DOOR_COLORS = ["#b3262e", "#1f6b45", "#c9962b", "#2a4d8f"];
const ORNAMENTS = ["#e03131", "#2f9e44", "#f0b429", "#1c7ed6", "#ae3ec9", "#f76707", "#e9ecef"];
const BULBS = ["#ff6b6b", "#ffd43b", "#69db7c", "#4dabf7", "#f783ac", "#ffa94d"];

type PlayState =
  | { kind: "lights"; cells: boolean[]; odd: boolean[] }
  | { kind: "slide"; tiles: readonly number[]; trail: number[] }
  | { kind: "garland"; masks: number[] }
  | { kind: "sort"; jars: number[][]; sel: number };

function initState(p: Puzzle): PlayState {
  if (p.kind === "lights") return { kind: "lights", cells: p.start.slice(), odd: Array(p.n * p.n).fill(false) };
  if (p.kind === "slide") return { kind: "slide", tiles: p.start.slice(), trail: p.trail.slice() };
  if (p.kind === "garland") return { kind: "garland", masks: p.start.slice() };
  return { kind: "sort", jars: p.start.map((j) => j.slice()), sel: -1 };
}

function isSolved(p: Puzzle, s: PlayState): boolean {
  if (p.kind === "lights" && s.kind === "lights") return lightsSolved(s.cells);
  if (p.kind === "slide" && s.kind === "slide") return slideSolved(s.tiles);
  if (p.kind === "garland" && s.kind === "garland") return garlandSolved(p, s.masks);
  if (p.kind === "sort" && s.kind === "sort") return sortSolved(s.jars);
  return false;
}

/** Jar rectangles for the sort board, laid out in up to two rows. */
function jarLayout(count: number): Array<{ x: number; y: number; w: number; h: number }> {
  const perRow = count > 6 ? Math.ceil(count / 2) : count;
  const rows = Math.ceil(count / perRow);
  const w = 46;
  const h = SORT_CAP * 30 + 18;
  const out: Array<{ x: number; y: number; w: number; h: number }> = [];
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / perRow);
    const inRow = Math.min(perRow, count - r * perRow);
    const gap = (BOARD - inRow * w) / (inRow + 1);
    const c = i - r * perRow;
    const y = rows === 1 ? BY + 110 : BY + 34 + r * (h + 30);
    out.push({ x: BX + gap + c * (w + gap), y, w, h });
  }
  return out;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * 0.45 : r;
    if (k) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** The winter picture behind the slide tiles, varied per door. */
function paintScene(day: number): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = BOARD * 2;
  cv.height = BOARD * 2;
  const ctx = cv.getContext("2d") as CanvasRenderingContext2D;
  ctx.scale(2, 2);
  const rng = mulberry32(day * 101 + 7);
  const sky = ctx.createLinearGradient(0, 0, 0, BOARD);
  const tops = ["#0b1a40", "#2b1748", "#0d2a3a", "#1d1f4d"];
  sky.addColorStop(0, tops[day % tops.length]);
  sky.addColorStop(1, "#46609a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, BOARD, BOARD);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.4 + rng() * 0.6})`;
    ctx.fillRect(rng() * BOARD, rng() * BOARD * 0.55, 1.6, 1.6);
  }
  const mirror = day % 2 === 0;
  const mx = (x: number) => (mirror ? BOARD - x : x);
  ctx.fillStyle = "#fff6d5";
  ctx.beginPath();
  ctx.arc(mx(262), 56, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = tops[day % tops.length];
  ctx.beginPath();
  ctx.arc(mx(252), 50, 22, 0, Math.PI * 2);
  ctx.fill();
  // hills
  ctx.fillStyle = "#dfe8f5";
  ctx.beginPath();
  ctx.moveTo(0, 230);
  ctx.quadraticCurveTo(110, 200, 200, 228);
  ctx.quadraticCurveTo(270, 245, BOARD, 220);
  ctx.lineTo(BOARD, BOARD);
  ctx.lineTo(0, BOARD);
  ctx.fill();
  ctx.fillStyle = "#f8fbff";
  ctx.beginPath();
  ctx.moveTo(0, 268);
  ctx.quadraticCurveTo(160, 240, BOARD, 270);
  ctx.lineTo(BOARD, BOARD);
  ctx.lineTo(0, BOARD);
  ctx.fill();
  // house
  const hx = mx(70) - 40;
  ctx.fillStyle = "#7a3b2e";
  ctx.fillRect(hx, 178, 80, 64);
  ctx.fillStyle = "#3d2a4a";
  ctx.beginPath();
  ctx.moveTo(hx - 10, 182);
  ctx.lineTo(hx + 40, 140);
  ctx.lineTo(hx + 90, 182);
  ctx.fill();
  ctx.fillStyle = "#f8fbff";
  ctx.fillRect(hx - 10, 176, 100, 8);
  ctx.fillStyle = "#ffd76a";
  ctx.fillRect(hx + 12, 196, 20, 18);
  ctx.fillRect(hx + 50, 196, 18, 18);
  ctx.fillStyle = "#4a2a20";
  ctx.fillRect(hx + 36, 214, 14, 28);
  // tree
  const tx = mx(220);
  ctx.fillStyle = "#5b3a24";
  ctx.fillRect(tx - 7, 236, 14, 22);
  const greens = ["#1e6b3a", "#238a46", "#2fa157"];
  for (let k = 0; k < 3; k++) {
    ctx.fillStyle = greens[k];
    ctx.beginPath();
    ctx.moveTo(tx, 110 + k * 36);
    ctx.lineTo(tx - 34 - k * 12, 172 + k * 34);
    ctx.lineTo(tx + 34 + k * 12, 172 + k * 34);
    ctx.fill();
  }
  ctx.fillStyle = "#ffd43b";
  star(ctx, tx, 108, 13);
  ctx.fill();
  for (let i = 0; i < 14; i++) {
    const yy = 140 + rng() * 96;
    const spread = ((yy - 110) / 130) * 50;
    ctx.fillStyle = BULBS[i % BULBS.length];
    ctx.beginPath();
    ctx.arc(tx + (rng() * 2 - 1) * spread * 0.8, yy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // snowman
  const sx = mirror ? 150 : 160;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(sx, 272, 24, 0, Math.PI * 2);
  ctx.arc(sx, 236, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#222";
  ctx.fillRect(sx - 13, 212, 26, 5);
  ctx.fillRect(sx - 8, 194, 16, 18);
  ctx.beginPath();
  ctx.arc(sx - 6, 232, 2, 0, Math.PI * 2);
  ctx.arc(sx + 6, 232, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f76707";
  ctx.beginPath();
  ctx.moveTo(sx, 238);
  ctx.lineTo(sx + 14, 241);
  ctx.lineTo(sx, 243);
  ctx.fill();
  ctx.fillStyle = "#c92a2a";
  ctx.fillRect(sx - 15, 248, 30, 6);
  return cv;
}

function drawOrnament(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: number): void {
  ctx.fillStyle = "#c9a227";
  ctx.fillRect(x - 4, y - r - 4, 8, 5);
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.25, ORNAMENTS[color]);
  g.addColorStop(1, ORNAMENTS[color]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  // a mark per colour so the jars read without colour vision
  ctx.strokeStyle = color === 6 ? "rgba(60,60,60,.65)" : "rgba(255,255,255,.8)";
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = 2;
  const m = r * 0.45;
  ctx.beginPath();
  switch (color) {
    case 0: star(ctx, x, y + 1, m); ctx.fill(); break;
    case 1: ctx.moveTo(x - r * 0.8, y); ctx.lineTo(x + r * 0.8, y); ctx.stroke(); break;
    case 2: ctx.arc(x, y + 1, m * 0.5, 0, Math.PI * 2); ctx.fill(); break;
    case 3: ctx.moveTo(x - m, y - m); ctx.lineTo(x + m, y + m); ctx.moveTo(x + m, y - m); ctx.lineTo(x - m, y + m); ctx.stroke(); break;
    case 4: ctx.arc(x, y + 1, m, 0, Math.PI * 2); ctx.stroke(); break;
    case 5: ctx.moveTo(x, y - m); ctx.lineTo(x + m, y + 1); ctx.lineTo(x, y + m + 2); ctx.lineTo(x - m, y + 1); ctx.closePath(); ctx.fill(); break;
    default: ctx.moveTo(x - m, y + m); ctx.lineTo(x, y - m); ctx.lineTo(x + m, y + m); ctx.closePath(); ctx.stroke();
  }
}

type Flake = { x: number; y: number; r: number; v: number; d: number };

export default function AdventPuzzles({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [now, setNow] = useState<Date | null>(null);
  const [progress, setProgress] = useState<Progress>({});
  const [view, setView] = useState<"calendar" | "play">("calendar");
  const [day, setDay] = useState(1);
  const [ps, setPs] = useState<PlayState | null>(null);
  const [history, setHistory] = useState<PlayState[]>([]);
  const [moves, setMoves] = useState(0);
  const [hints, setHints] = useState(0);
  const [won, setWon] = useState<DayResult | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const bursts = useRef<BurstField | null>(null);
  const scene = useRef<{ day: number; canvas: HTMLCanvasElement } | null>(null);
  const anim = useRef<{ cell: number; from?: number; until: number; kind: "slide" | "spin" | "flash" | "shake" } | null>(null);
  const wonAt = useRef<number | null>(null);

  const puzzle = useMemo(() => puzzleForDay(day), [day]);
  const unlocked = now ? unlockedThrough(now) : 0;
  const inDecember = now ? now.getMonth() === 11 : false;
  const solvedSet = useMemo(() => new Set(Object.keys(progress).map(Number)), [progress]);
  const stars = totalStars(progress);

  useRunRecord(ADVENT_SLUG, won !== null, won ? 1000 + won.stars * 300 + day * 20 - hints * 50 : 0);

  useEffect(() => {
    const d = new Date();
    setNow(d);
    let saved: Progress = {};
    try {
      saved = parseProgress(localStorage.getItem(PROGRESS_KEY));
    } catch {
      saved = {};
    }
    setProgress(saved);
    setDay(suggestedDay(unlockedThrough(d), new Set(Object.keys(saved).map(Number))));
    const key = todayKey(d);
    setStreak(getDailyStreak(ADVENT_SLUG, key, previousDayKey(key)).currentStreak);
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: ZEN_MUSICBOX_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    bursts.current = createBurstField(160);
    const tick = window.setInterval(() => setNow(new Date()), 30_000);
    return () => {
      window.clearInterval(tick);
      cues.current?.close();
    };
  }, []);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const openDay = useCallback((d: number) => {
    setDay(d);
    setPs(initState(puzzleForDay(d)));
    setHistory([]);
    setMoves(0);
    setHints(0);
    setWon(null);
    setNote(null);
    setCopied(false);
    wonAt.current = null;
    anim.current = null;
    setView("play");
  }, []);

  const finish = (usedMoves: number, usedHints: number) => {
    const result: DayResult = { stars: starsFor(usedMoves, puzzle.par, usedHints), moves: usedMoves };
    setWon(result);
    wonAt.current = performance.now();
    sfx("win");
    const merged = mergeResult(progress, day, result);
    setProgress(merged);
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(merged));
    } catch {
      /* private mode: progress lives for this visit only */
    }
    markStageCleared(ADVENT_SLUG, day - 1, DAY_COUNT);
    if (now && inDecember && now.getDate() === day) {
      const key = todayKey(now);
      setStreak(recordDailyWin(ADVENT_SLUG, key, previousDayKey(key)).currentStreak);
    }
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) bursts.current?.emit("stardust", CW / 2, BY + BOARD / 2, ["#ffd43b", "#ffffff", "#ff6b6b", "#69db7c"]);
  };

  const commit = (next: PlayState, viaHint = false) => {
    if (!ps || won) return;
    setHistory((h) => [...h, ps]);
    setPs(next);
    setNote(null);
    const m = moves + 1;
    const hc = hints + (viaHint ? 1 : 0);
    setMoves(m);
    if (viaHint) setHints(hc);
    if (isSolved(puzzle, next)) finish(m, hc);
    else sfx("place");
  };

  const undo = () => {
    if (!history.length || won) return;
    setPs(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setNote(null);
    sfx("tap");
  };

  const restart = () => openDay(day);

  const toLogical = (e: ReactPointerEvent<HTMLCanvasElement>, height: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * CW, y: ((e.clientY - rect.top) / rect.height) * height };
  };

  const doorAt = (x: number, y: number): number => {
    const col = Math.floor((x - DOOR_X0) / (DOOR_W + DOOR_GAP));
    const row = Math.floor((y - DOOR_Y0) / (DOOR_H + DOOR_GAP));
    if (col < 0 || col > 4 || row < 0 || row > 4) return -1;
    const lx = x - DOOR_X0 - col * (DOOR_W + DOOR_GAP);
    const ly = y - DOOR_Y0 - row * (DOOR_H + DOOR_GAP);
    if (lx > DOOR_W || ly > DOOR_H) return -1;
    return row * 5 + col + 1;
  };

  const tryOpen = (d: number) => {
    if (d < 1) return;
    if (d > unlocked) {
      setNote(fill(c.locked, d));
      anim.current = { cell: d, until: performance.now() + 400, kind: "shake" };
      sfx("fail");
      return;
    }
    sfx("success");
    openDay(d);
  };

  const onPointer = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (view === "calendar") {
      const { x, y } = toLogical(e, CAL_H);
      tryOpen(doorAt(x, y));
      return;
    }
    if (!ps || won) return;
    const { x, y } = toLogical(e, PLAY_H);
    const bx = x - BX;
    const by = y - BY;
    if (ps.kind === "lights" && puzzle.kind === "lights") {
      const s = BOARD / puzzle.n;
      const cx = Math.floor(bx / s);
      const cy = Math.floor(by / s);
      if (cx < 0 || cy < 0 || cx >= puzzle.n || cy >= puzzle.n) return;
      const i = cy * puzzle.n + cx;
      const odd = ps.odd.slice();
      odd[i] = !odd[i];
      commit({ kind: "lights", cells: pressLights(puzzle.n, ps.cells, i), odd });
    } else if (ps.kind === "slide" && puzzle.kind === "slide") {
      const s = BOARD / puzzle.n;
      const cx = Math.floor(bx / s);
      const cy = Math.floor(by / s);
      if (cx < 0 || cy < 0 || cx >= puzzle.n || cy >= puzzle.n) return;
      const pos = cy * puzzle.n + cx;
      const next = slideTile(puzzle.n, ps.tiles, pos);
      if (next === ps.tiles) {
        sfx("tap");
        return;
      }
      const gap = ps.tiles.indexOf(puzzle.n * puzzle.n - 1);
      anim.current = { cell: gap, from: pos, until: performance.now() + 120, kind: "slide" };
      commit({ kind: "slide", tiles: next, trail: pushTrail(ps.trail, pos) });
    } else if (ps.kind === "garland" && puzzle.kind === "garland") {
      const s = BOARD / puzzle.w;
      const cx = Math.floor(bx / s);
      const cy = Math.floor(by / s);
      if (cx < 0 || cy < 0 || cx >= puzzle.w || cy >= puzzle.h) return;
      const i = cy * puzzle.w + cx;
      anim.current = { cell: i, until: performance.now() + 140, kind: "spin" };
      commit({ kind: "garland", masks: rotateCell(ps.masks, i) });
    } else if (ps.kind === "sort") {
      const jars = jarLayout(ps.jars.length);
      const hit = jars.findIndex((j) => x >= j.x - 6 && x <= j.x + j.w + 6 && y >= j.y - 40 && y <= j.y + j.h + 6);
      if (hit < 0) {
        setPs({ ...ps, sel: -1 });
        return;
      }
      if (ps.sel < 0 || ps.sel === hit) {
        setPs({ ...ps, sel: ps.sel === hit || !ps.jars[hit].length ? -1 : hit });
        sfx("tap");
        return;
      }
      if (canPour(ps.jars, ps.sel, hit)) {
        commit({ kind: "sort", jars: pour(ps.jars, ps.sel, hit), sel: -1 });
      } else {
        setPs({ ...ps, sel: ps.jars[hit].length ? hit : -1 });
        sfx("fail");
      }
    }
  };

  const giveHint = () => {
    if (!ps || won) return;
    if (ps.kind === "lights" && puzzle.kind === "lights") {
      const i = lightsHint(puzzle, ps.odd);
      if (i < 0) return;
      const odd = ps.odd.slice();
      odd[i] = !odd[i];
      anim.current = { cell: i, until: performance.now() + 700, kind: "flash" };
      commit({ kind: "lights", cells: pressLights(puzzle.n, ps.cells, i), odd }, true);
    } else if (ps.kind === "slide" && puzzle.kind === "slide") {
      const pos = slideHint(ps.trail);
      if (pos < 0) return;
      const gap = ps.tiles.indexOf(puzzle.n * puzzle.n - 1);
      anim.current = { cell: gap, from: pos, until: performance.now() + 160, kind: "slide" };
      commit({ kind: "slide", tiles: slideTile(puzzle.n, ps.tiles, pos), trail: pushTrail(ps.trail, pos) }, true);
    } else if (ps.kind === "garland" && puzzle.kind === "garland") {
      const i = garlandHint(puzzle, ps.masks);
      if (i < 0) return;
      anim.current = { cell: i, until: performance.now() + 500, kind: "flash" };
      commit({ kind: "garland", masks: rotateCell(ps.masks, i) }, true);
    } else if (ps.kind === "sort") {
      const mv = sortHint(ps.jars);
      if (!mv) {
        setNote(c.stuck);
        sfx("fail");
        return;
      }
      anim.current = { cell: mv[1], until: performance.now() + 600, kind: "flash" };
      commit({ kind: "sort", jars: pour(ps.jars, mv[0], mv[1]), sel: -1 }, true);
    }
  };

  // Shared state for the draw loop, refreshed every render.
  const drawRef = useRef({ view, ps, puzzle, day, progress, unlocked, won });
  drawRef.current = { view, ps, puzzle, day, progress, unlocked, won };

  useEffect(() => {
    const flakes: Flake[] = [];
    const rng = mulberry32(1225);
    for (let i = 0; i < 70; i++) flakes.push({ x: rng() * CW, y: rng() * CAL_H, r: 0.8 + rng() * 2, v: 12 + rng() * 26, d: rng() * 6 });
    let raf = 0;
    let last = performance.now();
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const loop = (t: number) => {
      const dt = Math.min(64, t - last);
      last = t;
      const cv = canvasRef.current;
      const ctx = cv?.getContext("2d");
      const st = drawRef.current;
      const H = st.view === "calendar" ? CAL_H : PLAY_H;
      if (cv && ctx) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        if (cv.width !== Math.round(CW * dpr) || cv.height !== Math.round(H * dpr)) {
          cv.width = Math.round(CW * dpr);
          cv.height = Math.round(H * dpr);
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, "#081230");
        sky.addColorStop(1, "#1c2d5e");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, CW, H);
        if (st.view === "calendar") drawCalendar(ctx, st, t);
        else drawPlay(ctx, st, t);
        // snow on top
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        for (const f of flakes) {
          if (!reduce) {
            f.y += (f.v * dt) / 1000;
            f.x += Math.sin(t / 1000 + f.d) * 0.15;
            if (f.y > H) {
              f.y = -4;
              f.x = (f.x + 97) % CW;
            }
          }
          ctx.beginPath();
          ctx.arc(f.x, f.y % H, f.r, 0, Math.PI * 2);
          ctx.fill();
        }
        const bf = bursts.current;
        if (bf) {
          bf.step(dt);
          bf.forEach((p, k) => {
            ctx.globalAlpha = 1 - k;
            ctx.fillStyle = p.color;
            if (p.shape === "star") {
              star(ctx, p.x, p.y, p.size);
              ctx.fill();
            } else {
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
              ctx.fill();
            }
          });
          ctx.globalAlpha = 1;
        }
      }
      raf = requestAnimationFrame(loop);
    };

    const drawCalendar = (ctx: CanvasRenderingContext2D, st: typeof drawRef.current, t: number) => {
      // moon + title
      ctx.fillStyle = "#fff4c2";
      ctx.beginPath();
      ctx.arc(318, 40, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#081230";
      ctx.beginPath();
      ctx.arc(311, 35, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 30px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(c.month, 18, 50);
      ctx.font = "600 13px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,.75)";
      ctx.fillText("OIYO ADVENT · 1–25", 20, 72);
      // wooden board
      ctx.fillStyle = "#3b2418";
      roundRect(ctx, 6, DOOR_Y0 - 10, CW - 12, 5 * DOOR_H + 4 * DOOR_GAP + 20, 14);
      ctx.fill();
      const sh = anim.current && anim.current.kind === "shake" && t < anim.current.until ? anim.current.cell : -1;
      for (let d = 1; d <= DAY_COUNT; d++) {
        const r = Math.floor((d - 1) / 5);
        const col = (d - 1) % 5;
        let x = DOOR_X0 + col * (DOOR_W + DOOR_GAP);
        const y = DOOR_Y0 + r * (DOOR_H + DOOR_GAP);
        if (sh === d) x += Math.sin(t / 25) * 3;
        const res = st.progress[d];
        const open = d <= st.unlocked;
        const today = open && d === st.unlocked && !res;
        if (today) {
          ctx.save();
          ctx.shadowColor = "#ffd43b";
          ctx.shadowBlur = 12 + Math.sin(t / 300) * 6;
          ctx.fillStyle = "#ffd43b";
          roundRect(ctx, x - 2, y - 2, DOOR_W + 4, DOOR_H + 4, 10);
          ctx.fill();
          ctx.restore();
        }
        if (res) {
          ctx.fillStyle = "#13203f";
          roundRect(ctx, x, y, DOOR_W, DOOR_H, 8);
          ctx.fill();
          ctx.fillStyle = "#fff4c2";
          ctx.font = "700 12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(String(d), x + DOOR_W / 2, y + 16);
          const kind = kindForDay(d);
          const icx = x + DOOR_W / 2;
          const icy = y + 34;
          if (kind === "lights") {
            ctx.fillStyle = "#fff3d6";
            ctx.fillRect(icx - 5, icy - 4, 10, 16);
            ctx.fillStyle = "#ffa94d";
            ctx.beginPath();
            ctx.ellipse(icx, icy - 9, 4, 7, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (kind === "slide") {
            ctx.fillStyle = "#4dabf7";
            ctx.fillRect(icx - 11, icy - 9, 10, 10);
            ctx.fillRect(icx + 1, icy - 9, 10, 10);
            ctx.fillRect(icx - 11, icy + 3, 10, 10);
          } else if (kind === "garland") {
            ctx.fillStyle = "#ffd43b";
            star(ctx, icx, icy + 1, 11);
            ctx.fill();
          } else drawOrnament(ctx, icx, icy + 3, 9, d % 6);
          ctx.fillStyle = "#ffd43b";
          ctx.font = "700 11px sans-serif";
          ctx.fillText("★".repeat(res.stars) + "☆".repeat(3 - res.stars), icx, y + DOOR_H - 7);
        } else {
          const g = ctx.createLinearGradient(x, y, x + DOOR_W, y + DOOR_H);
          const base = open ? DOOR_COLORS[d % 4] : "#4a3428";
          g.addColorStop(0, base);
          g.addColorStop(1, open ? "#00000055" : "#2a1c15");
          ctx.fillStyle = base;
          roundRect(ctx, x, y, DOOR_W, DOOR_H, 8);
          ctx.fill();
          ctx.fillStyle = g;
          ctx.fill();
          if (open) {
            ctx.fillStyle = "rgba(255,236,170,.85)";
            ctx.fillRect(x + DOOR_W / 2 - 3, y, 6, DOOR_H);
            ctx.fillRect(x, y + DOOR_H / 2 - 3, DOOR_W, 6);
            ctx.fillStyle = "#ffe08a";
            ctx.beginPath();
            ctx.ellipse(x + DOOR_W / 2 - 7, y + DOOR_H / 2 - 4, 7, 4, -0.5, 0, Math.PI * 2);
            ctx.ellipse(x + DOOR_W / 2 + 7, y + DOOR_H / 2 - 4, 7, 4, 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = open ? "#ffffff" : "rgba(255,255,255,.35)";
          ctx.font = "800 22px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.save();
          ctx.shadowColor = "rgba(0,0,0,.5)";
          ctx.shadowBlur = 3;
          ctx.fillText(String(d), x + DOOR_W / 2, y + 20);
          ctx.restore();
          ctx.textBaseline = "alphabetic";
          if (!open) {
            ctx.strokeStyle = "rgba(255,255,255,.35)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x + DOOR_W / 2, y + 44, 5, Math.PI, 0);
            ctx.stroke();
            ctx.fillStyle = "rgba(255,255,255,.35)";
            ctx.fillRect(x + DOOR_W / 2 - 7, y + 44, 14, 10);
          }
          ctx.fillStyle = "rgba(255,255,255,.18)";
          ctx.beginPath();
          ctx.arc(x + DOOR_W - 9, y + DOOR_H / 2 + 14, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const drawPlay = (ctx: CanvasRenderingContext2D, st: typeof drawRef.current, t: number) => {
      const p = st.puzzle;
      const s = st.ps;
      if (!s) return;
      const glow = st.won ? Math.min(1, (t - (wonAt.current ?? t)) / 900) : 0;
      ctx.fillStyle = "rgba(255,255,255,.06)";
      roundRect(ctx, BX - 8, BY - 8, BOARD + 16, BOARD + 16, 14);
      ctx.fill();
      const a = anim.current && t < anim.current.until ? anim.current : null;
      if (p.kind === "lights" && s.kind === "lights") {
        const cs = BOARD / p.n;
        for (let i = 0; i < p.n * p.n; i++) {
          const x = BX + (i % p.n) * cs + cs / 2;
          const y = BY + Math.floor(i / p.n) * cs + cs / 2;
          const lit = s.cells[i];
          const hR = cs * 0.18;
          const top = y - cs * 0.12;
          if (lit) {
            const halo = ctx.createRadialGradient(x, top - cs * 0.1, 2, x, top - cs * 0.1, cs * 0.55);
            halo.addColorStop(0, "rgba(255,214,120,.55)");
            halo.addColorStop(1, "rgba(255,214,120,0)");
            ctx.fillStyle = halo;
            ctx.fillRect(x - cs / 2, y - cs / 2, cs, cs);
          }
          ctx.fillStyle = "#8b5e34";
          ctx.beginPath();
          ctx.ellipse(x, y + cs * 0.33, cs * 0.3, cs * 0.08, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = lit ? "#fff3d6" : "#c9c2b4";
          roundRect(ctx, x - hR, top, hR * 2, cs * 0.44, 4);
          ctx.fill();
          ctx.strokeStyle = "#3a2a1a";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, top);
          ctx.lineTo(x, top - 5);
          ctx.stroke();
          if (lit) {
            const fl = 1 + Math.sin(t / 120 + i) * 0.08;
            ctx.fillStyle = "#ffa94d";
            ctx.beginPath();
            ctx.ellipse(x, top - cs * 0.12, cs * 0.07 * fl, cs * 0.13 * fl, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#fff9db";
            ctx.beginPath();
            ctx.ellipse(x, top - cs * 0.09, cs * 0.03, cs * 0.06, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          if (a && a.kind === "flash" && a.cell === i) {
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 3;
            roundRect(ctx, x - cs / 2 + 3, y - cs / 2 + 3, cs - 6, cs - 6, 8);
            ctx.stroke();
          }
        }
      } else if (p.kind === "slide" && s.kind === "slide") {
        if (!scene.current || scene.current.day !== st.day) scene.current = { day: st.day, canvas: paintScene(st.day) };
        const img = scene.current.canvas;
        const n = p.n;
        const cs = BOARD / n;
        const blank = n * n - 1;
        for (let pos = 0; pos < n * n; pos++) {
          const tile = s.tiles[pos];
          if (tile === blank && !st.won) continue;
          let x = BX + (pos % n) * cs;
          let y = BY + Math.floor(pos / n) * cs;
          if (a && a.kind === "slide" && a.cell === pos && a.from !== undefined) {
            const k = 1 - Math.max(0, (a.until - t) / 140);
            const fx = BX + (a.from % n) * cs;
            const fy = BY + Math.floor(a.from / n) * cs;
            x = fx + (x - fx) * k;
            y = fy + (y - fy) * k;
          }
          const sx = (tile % n) * cs * 2;
          const sy = Math.floor(tile / n) * cs * 2;
          ctx.drawImage(img, sx, sy, cs * 2, cs * 2, x + 1, y + 1, cs - 2, cs - 2);
          if (!st.won) {
            ctx.strokeStyle = "rgba(255,255,255,.55)";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 1.5, y + 1.5, cs - 3, cs - 3);
            ctx.fillStyle = "rgba(8,18,48,.7)";
            roundRect(ctx, x + 4, y + 4, 20, 16, 4);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "700 11px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(String(tile + 1), x + 14, y + 12.5);
            ctx.textBaseline = "alphabetic";
          }
        }
        if (st.won) {
          ctx.fillStyle = `rgba(255,240,200,${0.15 * glow})`;
          ctx.fillRect(BX, BY, BOARD, BOARD);
        }
      } else if (p.kind === "garland" && s.kind === "garland") {
        const lit = litCells(p, s.masks);
        const cs = BOARD / p.w;
        for (let i = 0; i < s.masks.length; i++) {
          const cx = BX + (i % p.w) * cs + cs / 2;
          const cy = BY + Math.floor(i / p.w) * cs + cs / 2;
          const on = lit.has(i);
          ctx.fillStyle = "rgba(255,255,255,.04)";
          ctx.fillRect(cx - cs / 2 + 1, cy - cs / 2 + 1, cs - 2, cs - 2);
          ctx.save();
          ctx.translate(cx, cy);
          if (a && a.kind === "spin" && a.cell === i) ctx.rotate(-(Math.PI / 2) * Math.max(0, (a.until - t) / 140));
          ctx.strokeStyle = on ? "#9ff5c4" : "#4f7d67";
          ctx.lineWidth = Math.max(3, cs * 0.1);
          ctx.lineCap = "round";
          const m = s.masks[i];
          const half = cs / 2;
          ctx.beginPath();
          if (m & N) { ctx.moveTo(0, 0); ctx.lineTo(0, -half); }
          if (m & S) { ctx.moveTo(0, 0); ctx.lineTo(0, half); }
          if (m & E) { ctx.moveTo(0, 0); ctx.lineTo(half, 0); }
          if (m & WEST) { ctx.moveTo(0, 0); ctx.lineTo(-half, 0); }
          ctx.stroke();
          ctx.restore();
          if (i === p.source) {
            ctx.save();
            ctx.shadowColor = "#ffd43b";
            ctx.shadowBlur = 14;
            ctx.fillStyle = "#ffd43b";
            star(ctx, cx, cy, cs * 0.3);
            ctx.fill();
            ctx.restore();
          } else {
            const col = BULBS[i % BULBS.length];
            if (on) {
              const halo = ctx.createRadialGradient(cx, cy, 1, cx, cy, cs * 0.45);
              halo.addColorStop(0, col + "aa");
              halo.addColorStop(1, col + "00");
              ctx.fillStyle = halo;
              ctx.beginPath();
              ctx.arc(cx, cy, cs * 0.45, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = on ? col : "#5c6785";
            ctx.beginPath();
            ctx.ellipse(cx, cy, cs * 0.13, cs * 0.17, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#adb5bd";
            ctx.fillRect(cx - cs * 0.07, cy - cs * 0.24, cs * 0.14, cs * 0.08);
          }
          if (a && a.kind === "flash" && a.cell === i) {
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 3;
            ctx.strokeRect(cx - cs / 2 + 3, cy - cs / 2 + 3, cs - 6, cs - 6);
          }
        }
      } else if (s.kind === "sort") {
        const jars = jarLayout(s.jars.length);
        const r = 13;
        jars.forEach((j, k) => {
          const done = s.jars[k].length === SORT_CAP && s.jars[k].every((v) => v === s.jars[k][0]);
          ctx.fillStyle = done ? "rgba(255,236,170,.2)" : "rgba(220,235,255,.12)";
          roundRect(ctx, j.x, j.y, j.w, j.h, 12);
          ctx.fill();
          ctx.strokeStyle = s.sel === k ? "#ffd43b" : a && a.kind === "flash" && a.cell === k ? "#ffffff" : "rgba(220,235,255,.55)";
          ctx.lineWidth = s.sel === k ? 3 : 2;
          ctx.stroke();
          ctx.fillStyle = "rgba(220,235,255,.35)";
          ctx.fillRect(j.x - 3, j.y - 4, j.w + 6, 6);
          const balls = s.jars[k];
          const top = balls[balls.length - 1];
          let lift = 0;
          if (s.sel === k) for (let q = balls.length - 1; q >= 0 && balls[q] === top; q--) lift++;
          balls.forEach((b, q) => {
            const lifted = s.sel === k && q >= balls.length - lift;
            const y = j.y + j.h - 9 - r - q * 30 - (lifted ? 40 + Math.sin(t / 200) * 2 : 0);
            drawOrnament(ctx, j.x + j.w / 2, y, r, b);
          });
          if (done) {
            ctx.fillStyle = "#ffd43b";
            star(ctx, j.x + j.w / 2, j.y - 16, 7);
            ctx.fill();
          }
        });
      }
      if (st.won) {
        ctx.fillStyle = `rgba(8,18,48,${0.35 * glow})`;
        ctx.fillRect(0, BY + BOARD + 10, CW, PLAY_H);
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [c.month]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const share = async () => {
    if (!won) return;
    const text = buildShareText({ head: c.shareHead, line: c.shareLine, tag: c.tag }, day, won, hints, progress, unlocked);
    const url = window.location.origin + window.location.pathname;
    try {
      if (navigator.share) {
        await navigator.share({ text, url });
        return;
      }
    } catch {
      /* fall back to copying */
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const minutes = now ? minutesUntilNextDaily(now) : 0;
  const nextOpen = day + 1 <= unlocked && !solvedSet.has(day + 1) ? day + 1 : -1;
  const missed = (() => {
    for (let d = 1; d <= unlocked; d++) if (!solvedSet.has(d) && d !== day) return d;
    return -1;
  })();
  const allDone = solvedSet.size >= DAY_COUNT;

  return (
    <div
      ref={containerRef}
      data-game="advent-puzzles"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {view === "play" ? (
          <>
            <Badge variant="secondary">{fill(c.door, day)}</Badge>
            <Badge variant="outline">{c.kinds[puzzle.kind]}</Badge>
            <Badge variant="outline">{fill(c.moves, moves)} · {fill(c.par, puzzle.par)}</Badge>
          </>
        ) : (
          <>
            <Badge variant="secondary">{fill(c.stars, stars, DAY_COUNT * 3)}</Badge>
            {streak > 0 ? <Badge variant="outline">{fill(c.streak, streak)}</Badge> : null}
          </>
        )}
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={CW}
        height={view === "calendar" ? CAL_H : PLAY_H}
        onPointerDown={onPointer}
        className="mx-auto block w-full max-w-sm touch-none select-none rounded-xl border border-border"
        aria-label={view === "calendar" ? c.pick : c.help[puzzle.kind]}
      />

      {note ? <p className="text-center text-sm font-medium text-warning" role="status">{note}</p> : null}

      {view === "calendar" ? (
        <>
          <ul className="sr-only">
            {Array.from({ length: DAY_COUNT }, (_, i) => i + 1).map((d) => (
              <li key={d}>
                <button type="button" onClick={() => tryOpen(d)} disabled={d > unlocked}>
                  {fill(c.open, d)} {progress[d] ? `★${progress[d].stars}` : d > unlocked ? fill(c.locked, d) : ""}
                </button>
              </li>
            ))}
          </ul>
          {now && !inDecember && unlocked === 1 ? <p className="text-center text-sm text-muted-foreground">{c.preview}</p> : null}
          {allDone ? <p className="text-center text-base font-bold" role="status">{c.allDone}</p> : null}
          {unlocked > 0 ? (
            <Button className="min-h-12 w-full" onClick={() => tryOpen(suggestedDay(unlocked, solvedSet))}>
              <span>{fill(c.open, suggestedDay(unlocked, solvedSet))}</span>
            </Button>
          ) : null}
          <p className="text-xs text-muted-foreground">{c.pick}</p>
        </>
      ) : won ? (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-center" role="status">
          <p className="text-lg font-bold">{fill(c.solved, day)}</p>
          <p className="text-xl text-warning" aria-label={`${won.stars}/3`}>{"★".repeat(won.stars)}{"☆".repeat(3 - won.stars)}</p>
          <p className="text-sm text-muted-foreground">{fill(c.moves, won.moves)} · {fill(c.par, puzzle.par)}</p>
          <Button className="min-h-12 w-full" onClick={share}>
            <Share2 className="size-4" />
            <span>{copied ? c.copied : c.share}</span>
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="min-h-12" onClick={() => setView("calendar")}>
              <CalendarDays className="size-4" />
              <span>{c.calendar}</span>
            </Button>
            {nextOpen > 0 ? (
              <Button variant="secondary" className="min-h-12" onClick={() => openDay(nextOpen)}>
                <span>{c.next}</span>
              </Button>
            ) : missed > 0 ? (
              <Button variant="secondary" className="min-h-12" onClick={() => openDay(missed)}>
                <span>{c.missed}</span>
              </Button>
            ) : (
              <Button variant="outline" className="min-h-12" onClick={restart}>
                <RotateCcw className="size-4" />
                <span>{c.reset}</span>
              </Button>
            )}
          </div>
          {inDecember && unlocked < DAY_COUNT && nextOpen < 0 && missed < 0 ? (
            <p className="text-sm text-muted-foreground">{fill(c.nextIn, Math.floor(minutes / 60), minutes % 60)}</p>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" className="min-h-12" onClick={giveHint}>
            <Lightbulb className="size-4" />
            <span>{c.hint}</span>
          </Button>
          <Button variant="outline" className="min-h-12" onClick={undo} disabled={!history.length}>
            <Undo2 className="size-4" />
            <span>{c.undo}</span>
          </Button>
          <Button variant="outline" className="min-h-12" onClick={restart}>
            <RotateCcw className="size-4" />
            <span>{c.reset}</span>
          </Button>
          <Button variant="ghost" className="col-span-3 min-h-11" onClick={() => setView("calendar")}>
            <CalendarDays className="size-4" />
            <span>{c.calendar}</span>
          </Button>
        </div>
      )}
      {view === "play" ? <p className="text-xs text-muted-foreground">{c.help[puzzle.kind]}</p> : null}
    </div>
  );
}

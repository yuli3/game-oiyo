// Monster Interview v2 (2026-11-23): a hiring desk on a canvas. Monsters walk
// in, the paper on the desk is their resume, and the player drags the HIRE or
// REJECT stamp onto it (or swipes the resume right/left, or taps a stamp).
// Hook (game design lens): funny clips (rejected monsters get launched out the
// window, hires dance off) + one-more-day. Logic lives in lib/games/monster-interview.

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { CORE_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { recordResult } from "../../lib/games/records";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import {
  GAME_ID, STAGE_COUNT, STRIKES, begin, judge, newDesk, stamp, stars,
  type Candidate, type Color, type DeskState, type Element, type Reason, type Rule, type Traits, type Verdict,
} from "../../lib/games/monster-interview";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";
const MUTE_KEY = "oiyo:monster-interview:muted";

interface Copy {
  day: string; score: string; combo: string; strikes: string; rules: string; forgery: string;
  start: string; next: string; retry: string; won: string; lost: string; hint: string;
  hire: string; reject: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
  reason: Record<Reason, string>; good: string; queue: string;
  colors: Record<Color, string>; elements: Record<Element, string>;
  rule: (r: Rule, c: Copy) => string;
}

const fill = (s: string, ...v: (string | number)[]) => v.reduce<string>((acc, x, i) => acc.replace(`{${i}}`, String(x)), s);

const COPY: Record<L, Copy> = {
  ko: {
    day: "{0}일차", score: "점수 {0}", combo: "연속 {0}", strikes: "경고", rules: "오늘의 채용 조건", forgery: "서류와 실물이 다르면 거절",
    start: "출근하기", next: "다음 날 출근", retry: "다시 하기", won: "오늘 면접 끝! 사장님이 만족했어요", lost: "경고 3번… 오늘은 해고예요",
    hint: "도장을 이력서 위로 끌어 찍거나, 이력서를 오른쪽(채용)·왼쪽(거절)으로 밀어요. 도장을 눌러도 돼요. 키보드는 ←/→.",
    hire: "채용", reject: "거절", stages: "날짜 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
    reason: { fits: "조건에 맞는 지원자였어요", rule: "조건에 안 맞았어요", forged: "서류 위조였어요!", timeout: "시간 초과! 지원자가 화났어요" },
    good: "좋아요!", queue: "대기 {0}명",
    colors: { red: "빨강", green: "초록", blue: "파랑", purple: "보라" },
    elements: { fire: "불", water: "물", ghost: "유령", plain: "무속성" },
    rule: (r, c) => {
      switch (r.kind) {
        case "eyesAtLeast": return `눈 ${r.n}개 이상`;
        case "eyesAtMost": return `눈 ${r.n}개 이하`;
        case "hornsNone": return "뿔 없음";
        case "hornsSome": return "뿔 있음";
        case "colorIs": return `${c.colors[r.color]}만 채용`;
        case "colorNot": return `${c.colors[r.color]} 몬스터 거절`;
        case "elementIs": return `${c.elements[r.element]} 속성만`;
        case "elementNot": return `${c.elements[r.element]} 속성 거절`;
      }
    },
  },
  en: {
    day: "Day {0}", score: "Score {0}", combo: "Streak {0}", strikes: "Strikes", rules: "Today's hiring rules", forgery: "Reject if the resume doesn't match",
    start: "Clock in", next: "Next day", retry: "Try again", won: "Interviews done! The boss is pleased", lost: "Three strikes… you're fired for today",
    hint: "Drag a stamp onto the resume, or swipe the resume right (hire) or left (reject). Tapping a stamp works too. Keyboard: ←/→.",
    hire: "Hire", reject: "Reject", stages: "Pick a day", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
    reason: { fits: "They met every rule", rule: "They broke a rule", forged: "Forged resume!", timeout: "Too slow! The candidate stormed off" },
    good: "Nice!", queue: "{0} waiting",
    colors: { red: "red", green: "green", blue: "blue", purple: "purple" },
    elements: { fire: "fire", water: "water", ghost: "ghost", plain: "plain" },
    rule: (r, c) => {
      const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
      switch (r.kind) {
        case "eyesAtLeast": return `${r.n}+ eyes`;
        case "eyesAtMost": return `${r.n} eyes or fewer`;
        case "hornsNone": return "No horns";
        case "hornsSome": return "Has horns";
        case "colorIs": return `${cap(c.colors[r.color])} only`;
        case "colorNot": return `No ${c.colors[r.color]}`;
        case "elementIs": return `${cap(c.elements[r.element])} type only`;
        case "elementNot": return `No ${c.elements[r.element]} type`;
      }
    },
  },
  ja: {
    day: "{0}日目", score: "スコア {0}", combo: "連続 {0}", strikes: "警告", rules: "今日の採用条件", forgery: "書類と本人が違えば不採用",
    start: "出勤する", next: "次の日へ", retry: "もう一度", won: "今日の面接終了！社長も満足です", lost: "警告3回…今日はクビです",
    hint: "はんこを履歴書までドラッグして押すか、履歴書を右（採用）・左（不採用）にスワイプ。はんこをタップしてもOK。キーボードは←/→。",
    hire: "採用", reject: "不採用", stages: "日を選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
    reason: { fits: "条件を満たす応募者でした", rule: "条件に合いませんでした", forged: "書類の偽造でした！", timeout: "時間切れ！応募者が怒って帰りました" },
    good: "いいね！", queue: "待ち {0}人",
    colors: { red: "赤", green: "緑", blue: "青", purple: "紫" },
    elements: { fire: "炎", water: "水", ghost: "幽霊", plain: "無" },
    rule: (r, c) => {
      switch (r.kind) {
        case "eyesAtLeast": return `目が${r.n}つ以上`;
        case "eyesAtMost": return `目が${r.n}つ以下`;
        case "hornsNone": return "角なし";
        case "hornsSome": return "角あり";
        case "colorIs": return `${c.colors[r.color]}だけ採用`;
        case "colorNot": return `${c.colors[r.color]}は不可`;
        case "elementIs": return `${c.elements[r.element]}属性だけ`;
        case "elementNot": return `${c.elements[r.element]}属性は不可`;
      }
    },
  },
  zh: {
    day: "第{0}天", score: "得分 {0}", combo: "连对 {0}", strikes: "警告", rules: "今日招聘条件", forgery: "简历和本人不符就拒绝",
    start: "上班", next: "下一天", retry: "再来一次", won: "今天的面试结束！老板很满意", lost: "三次警告……今天被解雇了",
    hint: "把印章拖到简历上盖章，或把简历向右（录用）、向左（拒绝）划。点印章也可以。键盘用 ←/→。",
    hire: "录用", reject: "拒绝", stages: "选择日期", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
    reason: { fits: "这位符合所有条件", rule: "不符合条件", forged: "简历是伪造的！", timeout: "超时！应聘者气走了" },
    good: "不错！", queue: "等候 {0}位",
    colors: { red: "红色", green: "绿色", blue: "蓝色", purple: "紫色" },
    elements: { fire: "火", water: "水", ghost: "幽灵", plain: "无" },
    rule: (r, c) => {
      switch (r.kind) {
        case "eyesAtLeast": return `眼睛${r.n}只以上`;
        case "eyesAtMost": return `眼睛${r.n}只以下`;
        case "hornsNone": return "没有角";
        case "hornsSome": return "有角";
        case "colorIs": return `只要${c.colors[r.color]}`;
        case "colorNot": return `不要${c.colors[r.color]}`;
        case "elementIs": return `只要${c.elements[r.element]}属性`;
        case "elementNot": return `不要${c.elements[r.element]}属性`;
      }
    },
  },
  fr: {
    day: "Jour {0}", score: "Score {0}", combo: "Série {0}", strikes: "Avertissements", rules: "Critères d'embauche du jour", forgery: "Refuser si le CV ne correspond pas",
    start: "Pointer", next: "Jour suivant", retry: "Réessayer", won: "Entretiens finis ! Le patron est ravi", lost: "Trois avertissements… renvoyé pour aujourd'hui",
    hint: "Glissez un tampon sur le CV, ou poussez le CV à droite (embaucher) ou à gauche (refuser). Toucher un tampon marche aussi. Clavier : ←/→.",
    hire: "Embaucher", reject: "Refuser", stages: "Choisir un jour", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
    reason: { fits: "Il remplissait tous les critères", rule: "Il ne remplissait pas un critère", forged: "CV falsifié !", timeout: "Trop lent ! Le candidat est parti fâché" },
    good: "Bien !", queue: "{0} en attente",
    colors: { red: "rouge", green: "vert", blue: "bleu", purple: "violet" },
    elements: { fire: "feu", water: "eau", ghost: "fantôme", plain: "neutre" },
    rule: (r, c) => {
      switch (r.kind) {
        case "eyesAtLeast": return `${r.n} yeux ou plus`;
        case "eyesAtMost": return `${r.n} yeux au plus`;
        case "hornsNone": return "Sans cornes";
        case "hornsSome": return "Avec cornes";
        case "colorIs": return `Seulement ${c.colors[r.color]}`;
        case "colorNot": return `Pas de ${c.colors[r.color]}`;
        case "elementIs": return `Type ${c.elements[r.element]} seulement`;
        case "elementNot": return `Pas de type ${c.elements[r.element]}`;
      }
    },
  },
  es: {
    day: "Día {0}", score: "Puntos {0}", combo: "Racha {0}", strikes: "Avisos", rules: "Requisitos de hoy", forgery: "Rechaza si el currículum no coincide",
    start: "Fichar", next: "Día siguiente", retry: "Reintentar", won: "¡Entrevistas listas! El jefe está contento", lost: "Tres avisos… despedido por hoy",
    hint: "Arrastra un sello al currículum, o desliza el currículum a la derecha (contratar) o a la izquierda (rechazar). Tocar un sello también vale. Teclado: ←/→.",
    hire: "Contratar", reject: "Rechazar", stages: "Elegir día", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
    reason: { fits: "Cumplía todos los requisitos", rule: "No cumplía un requisito", forged: "¡Currículum falso!", timeout: "¡Muy lento! El candidato se fue enfadado" },
    good: "¡Bien!", queue: "{0} esperando",
    colors: { red: "rojo", green: "verde", blue: "azul", purple: "morado" },
    elements: { fire: "fuego", water: "agua", ghost: "fantasma", plain: "neutro" },
    rule: (r, c) => {
      switch (r.kind) {
        case "eyesAtLeast": return `${r.n} ojos o más`;
        case "eyesAtMost": return `${r.n} ojos como máximo`;
        case "hornsNone": return "Sin cuernos";
        case "hornsSome": return "Con cuernos";
        case "colorIs": return `Solo ${c.colors[r.color]}`;
        case "colorNot": return `Nada de ${c.colors[r.color]}`;
        case "elementIs": return `Solo tipo ${c.elements[r.element]}`;
        case "elementNot": return `Nada de tipo ${c.elements[r.element]}`;
      }
    },
  },
};

// ---------- canvas drawing ----------
const W = 360;
const H = 540;
const DPR = 2;
const DESK_Y = 318;
const MON = { x: 180, y: 232 };
const PAPER = { x: 84, y: 344, w: 192, h: 116 };
const STAMP_R = 34;
const STAMPS: Record<Verdict, { x: number; y: number; ink: string; body: string }> = {
  hire: { x: 300, y: 494, ink: "#2f9e44", body: "#8ce99a" },
  reject: { x: 60, y: 494, ink: "#e03131", body: "#ffa8a8" },
};
const BODY: Record<Color, [string, string]> = {
  red: ["#ff8787", "#e03131"],
  green: ["#8ce99a", "#2f9e44"],
  blue: ["#74c0fc", "#1971c2"],
  purple: ["#d0bfff", "#7048e8"],
};

interface Spark { x: number; y: number; vx: number; vy: number; life: number; color: string; r: number }
interface Anim {
  phase: "enter" | "wait" | "out" | "idle";
  t: number; // seconds in phase
  cand: Candidate | null;
  verdict: Verdict | null;
  right: boolean;
  drag: { kind: "stamp"; which: Verdict; x: number; y: number; moved: number } | { kind: "paper"; dx: number; sx: number } | null;
  shake: number;
  flash: number;
  mark: Verdict | null; // ink on the paper
  elapsed: number; // ms used on current candidate
}

function drawElementBadge(ctx: CanvasRenderingContext2D, e: Element, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  if (e === "fire") {
    ctx.fillStyle = "#ff922b";
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.9, -s * 0.1, s * 0.5, s * 0.7); ctx.quadraticCurveTo(0, s, -s * 0.5, s * 0.7); ctx.quadraticCurveTo(-s * 0.9, -s * 0.1, 0, -s);
    ctx.fill();
    ctx.fillStyle = "#ffd43b";
    ctx.beginPath(); ctx.arc(0, s * 0.35, s * 0.35, 0, Math.PI * 2); ctx.fill();
  } else if (e === "water") {
    ctx.fillStyle = "#339af0";
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.85, s * 0.1, 0, s * 0.85); ctx.quadraticCurveTo(-s * 0.85, s * 0.1, 0, -s);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath(); ctx.arc(-s * 0.2, s * 0.15, s * 0.18, 0, Math.PI * 2); ctx.fill();
  } else if (e === "ghost") {
    ctx.fillStyle = "#e9ecef";
    ctx.strokeStyle = "#868e96";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -s * 0.2, s * 0.65, Math.PI, 0);
    ctx.lineTo(s * 0.65, s * 0.8);
    ctx.lineTo(s * 0.3, s * 0.55); ctx.lineTo(0, s * 0.8); ctx.lineTo(-s * 0.3, s * 0.55); ctx.lineTo(-s * 0.65, s * 0.8);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#343a40";
    ctx.beginPath(); ctx.arc(-s * 0.22, -s * 0.2, s * 0.1, 0, Math.PI * 2); ctx.arc(s * 0.22, -s * 0.2, s * 0.1, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.strokeStyle = "#868e96";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.35, 0); ctx.lineTo(s * 0.35, 0); ctx.stroke();
  }
  ctx.restore();
}

/** A monster drawn from its traits. `s` is the scale (1 = desk size). */
function drawMonster(ctx: CanvasRenderingContext2D, t: Traits, shape: number, x: number, y: number, s: number, time: number, mood: "idle" | "happy" | "sad" = "idle") {
  const [light, dark] = BODY[t.color];
  const bw = (shape === 2 ? 74 : shape === 1 ? 54 : 64) * s;
  const bh = (shape === 1 ? 86 : shape === 2 ? 62 : 72) * s;
  const bob = Math.sin(time * 3) * 2 * s;
  ctx.save();
  ctx.translate(x, y + bob);
  if (t.element === "ghost") ctx.globalAlpha *= 0.72;
  // element aura
  if (t.element === "fire") {
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k - 2) * 0.45;
      const fl = 1 + Math.sin(time * 9 + k * 1.7) * 0.18;
      ctx.fillStyle = k % 2 ? "rgba(255,146,43,0.75)" : "rgba(255,212,59,0.8)";
      ctx.beginPath();
      const bx = Math.cos(a) * bw * 0.55;
      const by = Math.sin(a) * bh * 0.55;
      ctx.moveTo(bx - 9 * s, by);
      ctx.quadraticCurveTo(bx + Math.cos(a) * 26 * s * fl, by + Math.sin(a) * 26 * s * fl, bx + 9 * s, by);
      ctx.fill();
    }
  }
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath(); ctx.ellipse(0, bh * 0.52, bw * 0.55, 7 * s, 0, 0, Math.PI * 2); ctx.fill();
  // horns
  const hornXs = t.horns === 1 ? [0] : t.horns === 2 ? [-bw * 0.28, bw * 0.28] : [];
  for (const hx of hornXs) {
    ctx.fillStyle = "#fff3bf";
    ctx.strokeStyle = "#e67700";
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(hx - 8 * s, -bh * 0.42);
    ctx.quadraticCurveTo(hx + (hx < 0 ? -10 : hx > 0 ? 10 : 0) * s, -bh * 0.62 - 12 * s, hx + (hx < 0 ? -4 : 4) * s, -bh * 0.5 - 22 * s);
    ctx.lineTo(hx + 8 * s, -bh * 0.42);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // body
  const g = ctx.createRadialGradient(-bw * 0.2, -bh * 0.25, 4 * s, 0, 0, bw * 0.75);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.25, light);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  if (t.element === "ghost") {
    ctx.arc(0, -bh * 0.05, bw / 2, Math.PI, 0);
    const steps = 5;
    ctx.lineTo(bw / 2, bh * 0.45);
    for (let k = steps; k >= 0; k--) {
      const px = -bw / 2 + (bw * k) / steps;
      ctx.lineTo(px, bh * 0.45 + (k % 2 ? -8 : 2) * s + Math.sin(time * 5 + k) * 2 * s);
    }
    ctx.closePath();
  } else {
    ctx.ellipse(0, 0, bw / 2, bh / 2, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  if (t.element === "water") {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath(); ctx.ellipse(-bw * 0.22, -bh * 0.22, bw * 0.12, bh * 0.07, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(51,154,240,0.8)";
    const drip = (time * 1.2) % 1;
    ctx.beginPath(); ctx.arc(bw * 0.3, bh * 0.2 + drip * 20 * s, 3.5 * s, 0, Math.PI * 2); ctx.fill();
  }
  // feet
  if (t.element !== "ghost") {
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.ellipse(-bw * 0.22, bh * 0.47, 9 * s, 5 * s, 0, 0, Math.PI * 2); ctx.ellipse(bw * 0.22, bh * 0.47, 9 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
  }
  // eyes
  const n = Math.max(1, Math.min(4, t.eyes));
  const er = (n >= 3 ? 7 : 9) * s;
  const span = Math.min(bw * 0.7, (n - 1) * er * 2.4);
  const blink = Math.sin(time * 1.3 + shape) > 0.985;
  for (let k = 0; k < n; k++) {
    const ex = n === 1 ? 0 : -span / 2 + (span * k) / (n - 1);
    const ey = -bh * 0.12 + (n === 4 && (k === 0 || k === 3) ? 4 * s : 0);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.ellipse(ex, ey, er, blink ? 1.5 * s : er, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();
    if (!blink) {
      ctx.fillStyle = "#212529";
      ctx.beginPath(); ctx.arc(ex + Math.sin(time * 0.8) * 2 * s, ey + 1.5 * s, er * 0.45, 0, Math.PI * 2); ctx.fill();
    }
  }
  // mouth
  ctx.strokeStyle = "#212529";
  ctx.lineWidth = 2.5 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  const my = bh * 0.2;
  if (mood === "happy") ctx.arc(0, my - 4 * s, 11 * s, 0.15 * Math.PI, 0.85 * Math.PI);
  else if (mood === "sad") ctx.arc(0, my + 8 * s, 10 * s, 1.2 * Math.PI, 1.8 * Math.PI);
  else { ctx.moveTo(-8 * s, my); ctx.quadraticCurveTo(0, my + 5 * s, 8 * s, my); }
  ctx.stroke();
  // tooth
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.moveTo(3 * s, my + (mood === "sad" ? 0 : 2 * s)); ctx.lineTo(7 * s, my + 1 * s); ctx.lineTo(5 * s, my + 7 * s); ctx.fill();
  // element badge on the belly
  drawElementBadge(ctx, t.element, 0, bh * 0.36, 6 * s);
  ctx.restore();
}

function drawEye(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#495057"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x, y, 7, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#212529"; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
}
function drawHorn(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#fff3bf"; ctx.strokeStyle = "#e67700"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x - 5, y + 6); ctx.lineTo(x + 1, y - 7); ctx.lineTo(x + 5, y + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
}

function drawPaper(ctx: CanvasRenderingContext2D, c: Candidate, x: number, y: number, rot: number, time: number, mark: Verdict | null) {
  ctx.save();
  ctx.translate(x + PAPER.w / 2, y + PAPER.h / 2);
  ctx.rotate(rot);
  ctx.translate(-PAPER.w / 2, -PAPER.h / 2);
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(4, 5, PAPER.w, PAPER.h);
  ctx.fillStyle = "#fffdf5";
  ctx.fillRect(0, 0, PAPER.w, PAPER.h);
  ctx.strokeStyle = "#ced4da"; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, PAPER.w - 1, PAPER.h - 1);
  // header stripe
  ctx.fillStyle = "#e9ecef"; ctx.fillRect(0, 0, PAPER.w, 14);
  ctx.fillStyle = "#adb5bd"; for (let k = 0; k < 4; k++) ctx.fillRect(8 + k * 22, 5, 16, 4);
  // photo
  ctx.fillStyle = "#f1f3f5"; ctx.fillRect(10, 22, 70, 84);
  ctx.strokeStyle = "#adb5bd"; ctx.strokeRect(10.5, 22.5, 69, 83);
  ctx.save(); ctx.beginPath(); ctx.rect(10, 22, 70, 84); ctx.clip();
  drawMonster(ctx, c.resume, c.shape, 45, 68, 0.55, time * 0.3);
  ctx.restore();
  // traits
  const r = c.resume;
  const tx = 92;
  for (let k = 0; k < r.eyes; k++) drawEye(ctx, tx + 8 + k * 17, 32);
  if (r.horns === 0) { ctx.strokeStyle = "#adb5bd"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx + 2, 56); ctx.lineTo(tx + 16, 56); ctx.stroke(); }
  for (let k = 0; k < r.horns; k++) drawHorn(ctx, tx + 8 + k * 16, 56);
  drawElementBadge(ctx, r.element, tx + 9, 80, 8);
  ctx.fillStyle = BODY[r.color][1];
  ctx.beginPath(); ctx.arc(tx + 40, 80, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = "#dee2e6"; ctx.fillRect(tx, 96, 84, 3); ctx.fillRect(tx, 102, 60, 3);
  if (mark) {
    const s = STAMPS[mark];
    ctx.save();
    ctx.translate(PAPER.w / 2 + 18, PAPER.h / 2);
    ctx.rotate(-0.25);
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = s.ink; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath();
    if (mark === "hire") { ctx.moveTo(-14, 0); ctx.lineTo(-3, 11); ctx.lineTo(16, -12); }
    else { ctx.moveTo(-12, -12); ctx.lineTo(12, 12); ctx.moveTo(12, -12); ctx.lineTo(-12, 12); }
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawStamp(ctx: CanvasRenderingContext2D, which: Verdict, x: number, y: number, lifted: boolean) {
  const s = STAMPS[which];
  ctx.save();
  ctx.translate(x, y - (lifted ? 10 : 0));
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath(); ctx.ellipse(0, STAMP_R * 0.75 + (lifted ? 10 : 0), STAMP_R * 0.85, 7, 0, 0, Math.PI * 2); ctx.fill();
  // handle
  ctx.fillStyle = "#8d5a2b";
  ctx.beginPath(); ctx.arc(0, -STAMP_R * 0.55, STAMP_R * 0.38, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-6, -STAMP_R * 0.45, 12, STAMP_R * 0.6);
  // pad
  ctx.fillStyle = s.body;
  ctx.strokeStyle = s.ink; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(0, STAMP_R * 0.3, STAMP_R, STAMP_R * 0.45, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = s.ink; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath();
  if (which === "hire") { ctx.moveTo(-10, STAMP_R * 0.3); ctx.lineTo(-2, STAMP_R * 0.3 + 8); ctx.lineTo(12, STAMP_R * 0.3 - 8); }
  else { ctx.moveTo(-8, STAMP_R * 0.3 - 7); ctx.lineTo(8, STAMP_R * 0.3 + 7); ctx.moveTo(8, STAMP_R * 0.3 - 7); ctx.lineTo(-8, STAMP_R * 0.3 + 7); }
  ctx.stroke();
  ctx.restore();
}

function drawRoom(ctx: CanvasRenderingContext2D, time: number, flash: number) {
  const wall = ctx.createLinearGradient(0, 0, 0, DESK_Y);
  wall.addColorStop(0, "#f8f0fc");
  wall.addColorStop(1, "#e5dbff");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, DESK_Y);
  // wallpaper dots
  ctx.fillStyle = "rgba(112,72,232,0.07)";
  for (let y = 18; y < DESK_Y; y += 28) for (let x = (y / 28) % 2 ? 14 : 0; x < W; x += 28) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
  // window (rejected monsters fly out here)
  ctx.fillStyle = "#a5d8ff"; ctx.fillRect(250, 34, 86, 70);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath(); ctx.ellipse(270 + ((time * 8) % 90), 58, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#845ef7"; ctx.lineWidth = 4; ctx.strokeRect(250, 34, 86, 70);
  ctx.beginPath(); ctx.moveTo(293, 34); ctx.lineTo(293, 104); ctx.stroke();
  // door
  ctx.fillStyle = "#b08968"; ctx.fillRect(14, 120, 58, DESK_Y - 120);
  ctx.fillStyle = "#ffd43b"; ctx.beginPath(); ctx.arc(62, 220, 4, 0, Math.PI * 2); ctx.fill();
  // HR poster
  ctx.fillStyle = "#fff9db"; ctx.fillRect(110, 30, 70, 54);
  ctx.strokeStyle = "#fab005"; ctx.lineWidth = 2; ctx.strokeRect(110, 30, 70, 54);
  ctx.fillStyle = "#fab005"; ctx.beginPath(); ctx.arc(145, 52, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#e67700"; ctx.fillRect(122, 70, 46, 4);
  // floor
  ctx.fillStyle = "#d0bfff"; ctx.fillRect(0, DESK_Y - 26, W, 26);
  // desk
  const desk = ctx.createLinearGradient(0, DESK_Y, 0, H);
  desk.addColorStop(0, "#c08552");
  desk.addColorStop(1, "#8d5a2b");
  ctx.fillStyle = desk;
  ctx.fillRect(0, DESK_Y, W, H - DESK_Y);
  ctx.fillStyle = "#e3a96b"; ctx.fillRect(0, DESK_Y, W, 8);
  if (flash > 0) {
    ctx.fillStyle = `rgba(224,49,49,${Math.min(0.35, flash)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

export default function MonsterInterview({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });
  const [desk, setDesk] = useState<DeskState>(() => newDesk(0));
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState<{ text: string; bad: boolean } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const deskRef = useRef(desk);
  deskRef.current = desk;
  const sparks = useRef<Spark[]>([]);
  const toastTimer = useRef<number | undefined>(undefined);
  const anim = useRef<Anim>({ phase: "idle", t: 0, cand: null, verdict: null, right: true, drag: null, shake: 0, flash: 0, mark: null, elapsed: 0 });
  const prevStatus = useRef(desk.status);

  useRunRecord(GAME_ID, desk.status === "won", desk.score);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const showToast = useCallback((text: string, bad: boolean) => {
    setToast({ text, bad });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1400);
  }, []);

  const load = useCallback((i: number) => {
    const d = newDesk(i);
    setDesk(d);
    sparks.current = [];
    anim.current = { phase: "idle", t: 0, cand: null, verdict: null, right: true, drag: null, shake: 0, flash: 0, mark: null, elapsed: 0 };
    setToast(null);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(GAME_ID, STAGE_COUNT);
    setCleared(done);
    load(nextOpenStage(done, STAGE_COUNT));
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: CORE_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => { cues.current?.close(); window.clearTimeout(toastTimer.current); };
  }, [load]);

  // win/loss edge → records + sounds
  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = desk.status;
    if (prev === desk.status) return;
    if (desk.status === "won") {
      setCleared(markStageCleared(GAME_ID, desk.stage.index, STAGE_COUNT));
      try { recordResult(GAME_ID, "w"); } catch { /* storage blocked */ }
      window.setTimeout(() => sfx("win"), 500);
    } else if (desk.status === "lost") {
      try { recordResult(GAME_ID, "l"); } catch { /* storage blocked */ }
      window.setTimeout(() => sfx("lose"), 500);
    }
  }, [desk.status, desk.stage.index, sfx]);

  const startDay = () => {
    const d = begin(deskRef.current);
    setDesk(d);
    anim.current = { ...anim.current, phase: "enter", t: 0, cand: d.stage.candidates[0] ?? null, mark: null, verdict: null, elapsed: 0 };
    sfx("tap");
  };

  const decide = useCallback((v: Verdict | "timeout") => {
    const a = anim.current;
    const d = deskRef.current;
    if (d.status !== "play" || a.phase !== "wait" || !a.cand) return;
    const left = d.stage.timeMs - a.elapsed;
    const next = stamp(d, v, left);
    const last = next.log[next.log.length - 1]!;
    const verdict: Verdict = v === "timeout" ? "reject" : v;
    a.phase = "out";
    a.t = 0;
    a.verdict = verdict;
    a.right = last.right;
    a.mark = v === "timeout" ? null : verdict;
    a.drag = null;
    a.shake = 0.25;
    const cx = PAPER.x + PAPER.w / 2;
    const cy = PAPER.y + PAPER.h / 2;
    const ink = STAMPS[verdict].ink;
    for (let k = 0; k < 16; k++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 160;
      sparks.current.push({ x: cx, y: cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 60, life: 0.7, color: last.right ? (k % 2 ? ink : "#ffd43b") : "#adb5bd", r: 2 + Math.random() * 3 });
    }
    if (last.right) {
      sfx(next.combo >= 3 && next.combo % 3 === 0 ? "combo" : "success");
      showToast(next.combo >= 3 ? `${c.good} ${fill(c.combo, next.combo)}` : c.good, false);
    } else {
      a.flash = 0.45;
      sfx("fail");
      showToast(c.reason[last.reason], true);
    }
    setDesk(next);
  }, [c, sfx, showToast]);

  // render + timer loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let time = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const a = anim.current;
      const d = deskRef.current;
      a.t += dt;
      a.shake = Math.max(0, a.shake - dt);
      a.flash = Math.max(0, a.flash - dt);
      // phases
      if (a.phase === "enter" && a.t >= 0.6) { a.phase = "wait"; a.t = 0; a.elapsed = 0; }
      if (a.phase === "wait" && d.status === "play" && !a.drag) {
        a.elapsed += dt * 1000;
        if (a.elapsed >= d.stage.timeMs) decide("timeout");
      }
      if (a.phase === "out" && a.t >= 0.95) {
        const cur = deskRef.current;
        if (cur.status === "play") {
          a.phase = "enter"; a.t = 0; a.cand = cur.stage.candidates[cur.at] ?? null; a.mark = null; a.verdict = null; a.elapsed = 0;
        } else {
          a.phase = "idle"; a.t = 0; a.cand = null;
        }
      }
      if (ctx && canvas) {
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        const sx = a.shake > 0 ? (Math.random() - 0.5) * 8 * a.shake * 4 : 0;
        const sy = a.shake > 0 ? (Math.random() - 0.5) * 6 * a.shake * 4 : 0;
        ctx.translate(sx, sy);
        drawRoom(ctx, time, a.flash);
        // queue silhouettes behind the door
        const waiting = d.status === "play" ? Math.max(0, d.stage.candidates.length - d.at - 1) : 0;
        for (let k = 0; k < Math.min(3, waiting); k++) {
          ctx.fillStyle = "rgba(73,80,87,0.25)";
          ctx.beginPath(); ctx.ellipse(-8 + k * 4, 258 - k * 3, 14, 22, 0, 0, Math.PI * 2); ctx.fill();
        }
        // the monster at the desk
        if (a.cand) {
          let mx = MON.x;
          let my = MON.y;
          let rot = 0;
          let sc = 1;
          let mood: "idle" | "happy" | "sad" = "idle";
          if (a.phase === "enter") {
            const k = Math.min(1, a.t / 0.6);
            const e = 1 - Math.pow(1 - k, 3);
            mx = -60 + (MON.x + 60) * e;
            my = MON.y - Math.abs(Math.sin(k * Math.PI * 3)) * 14;
          } else if (a.phase === "out") {
            const k = a.t;
            if (a.verdict === "hire") {
              mood = "happy";
              my = MON.y - Math.abs(Math.sin(k * Math.PI * 4)) * 26;
              mx = MON.x + Math.max(0, k - 0.3) * 420;
              rot = Math.sin(k * 20) * 0.15;
            } else {
              mood = "sad";
              // launched out of the window, spinning
              const kk = Math.max(0, k - 0.15);
              mx = MON.x + kk * 230;
              my = MON.y - kk * 380 + kk * kk * 120;
              rot = kk * 14;
              sc = Math.max(0.2, 1 - kk * 0.8);
            }
          } else if (a.phase === "wait" && a.elapsed > d.stage.timeMs * 0.7) {
            mx += Math.sin(time * 40) * 2; // impatient
          }
          ctx.save();
          ctx.translate(mx, my);
          ctx.rotate(rot);
          drawMonster(ctx, a.cand.monster, a.cand.shape, 0, 0, sc, time, mood);
          ctx.restore();
          // desk front covers the lower body
          ctx.fillStyle = "#c08552";
          ctx.fillRect(0, DESK_Y, W, 22);
          ctx.fillStyle = "#e3a96b"; ctx.fillRect(0, DESK_Y, W, 8);
          // fuse bar
          if (a.phase === "wait" && d.status === "play") {
            const left = Math.max(0, 1 - a.elapsed / d.stage.timeMs);
            ctx.fillStyle = "rgba(255,255,255,0.7)";
            ctx.fillRect(20, 12, W - 40, 10);
            ctx.fillStyle = left < 0.3 ? "#fa5252" : left < 0.6 ? "#fab005" : "#40c057";
            ctx.fillRect(20, 12, (W - 40) * left, 10);
            ctx.fillStyle = "#ffd43b";
            ctx.beginPath(); ctx.arc(20 + (W - 40) * left, 17, 5 + Math.sin(time * 30) * 1.5, 0, Math.PI * 2); ctx.fill();
          }
          // paper
          let px = PAPER.x;
          let py = PAPER.y;
          let prot = -0.03;
          if (a.phase === "enter") py = PAPER.y + (1 - Math.min(1, a.t / 0.6)) * 200;
          if (a.drag?.kind === "paper") { px += a.drag.dx; prot = a.drag.dx / 600; }
          if (a.phase === "out" && a.t > 0.35) {
            const k = (a.t - 0.35) / 0.6;
            px += (a.verdict === "hire" ? 1 : -1) * k * 320;
            prot += (a.verdict === "hire" ? 1 : -1) * k * 0.6;
          }
          drawPaper(ctx, a.cand, px, py, prot, time, a.mark);
          if (a.drag?.kind === "paper") {
            const which: Verdict | null = a.drag.dx > 40 ? "hire" : a.drag.dx < -40 ? "reject" : null;
            if (which) {
              ctx.fillStyle = STAMPS[which].ink;
              ctx.globalAlpha = Math.min(0.5, Math.abs(a.drag.dx) / 200);
              ctx.fillRect(which === "hire" ? W - 12 : 0, PAPER.y - 20, 12, PAPER.h + 40);
              ctx.globalAlpha = 1;
            }
          }
        } else {
          ctx.fillStyle = "#c08552"; ctx.fillRect(0, DESK_Y, W, 22);
          ctx.fillStyle = "#e3a96b"; ctx.fillRect(0, DESK_Y, W, 8);
        }
        // stamps
        for (const which of ["reject", "hire"] as const) {
          const dr = a.drag?.kind === "stamp" && a.drag.which === which ? a.drag : null;
          drawStamp(ctx, which, dr ? dr.x : STAMPS[which].x, dr ? dr.y : STAMPS[which].y, Boolean(dr));
        }
        // sparks
        sparks.current = sparks.current.filter((p) => p.life > 0);
        for (const p of sparks.current) {
          p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt;
          ctx.globalAlpha = Math.max(0, p.life / 0.7);
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [decide]);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const a = anim.current;
    if (deskRef.current.status !== "play" || a.phase !== "wait") return;
    const p = toField(e);
    for (const which of ["hire", "reject"] as const) {
      const s = STAMPS[which];
      if (Math.hypot(p.x - s.x, p.y - s.y) < STAMP_R + 12) {
        e.currentTarget.setPointerCapture(e.pointerId);
        a.drag = { kind: "stamp", which, x: p.x, y: p.y, moved: 0 };
        sfx("tap");
        return;
      }
    }
    if (p.x >= PAPER.x - 10 && p.x <= PAPER.x + PAPER.w + 10 && p.y >= PAPER.y - 10 && p.y <= PAPER.y + PAPER.h + 10) {
      e.currentTarget.setPointerCapture(e.pointerId);
      a.drag = { kind: "paper", dx: 0, sx: p.x };
    }
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const a = anim.current;
    if (!a.drag) return;
    const p = toField(e);
    if (a.drag.kind === "stamp") {
      a.drag.moved += Math.hypot(p.x - a.drag.x, p.y - a.drag.y);
      a.drag.x = p.x; a.drag.y = p.y;
    } else {
      a.drag.dx = p.x - a.drag.sx;
    }
  };
  const onUp = () => {
    const a = anim.current;
    const dr = a.drag;
    if (!dr) return;
    a.drag = null;
    if (dr.kind === "stamp") {
      const over = dr.x >= PAPER.x - 20 && dr.x <= PAPER.x + PAPER.w + 20 && dr.y >= PAPER.y - 30 && dr.y <= PAPER.y + PAPER.h + 20;
      if (over || dr.moved < 10) decide(dr.which);
    } else if (dr.dx > 70) decide("hire");
    else if (dr.dx < -70) decide("reject");
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (deskRef.current.status === "ready" && (e.key === "Enter" || e.key === " ")) { startDay(); e.preventDefault(); return; }
    if (e.key === "ArrowRight") { decide("hire"); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { decide("reject"); e.preventDefault(); }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const st = stars(desk);
  const waiting = Math.max(0, desk.stage.candidates.length - desk.at);

  return (
    <div
      ref={containerRef}
      data-game="monster-interview"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.day, desk.stage.index + 1)} / {STAGE_COUNT}</Badge>
        <Badge variant="outline">{fill(c.score, desk.score)}</Badge>
        <Badge variant="outline" aria-label={`${c.strikes} ${desk.strikes}/${STRIKES}`}>
          {Array.from({ length: STRIKES }, (_, i) => (i < desk.strikes ? "✖" : "○")).join(" ")}
        </Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted p-2">
        <p className="text-xs font-bold text-muted-foreground">{c.rules}</p>
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {desk.stage.rules.map((r) => (
            <li key={JSON.stringify(r)}><Badge>{c.rule(r, c)}</Badge></li>
          ))}
          {desk.stage.forgery ? <li><Badge variant="destructive">{c.forgery}</Badge></li> : null}
        </ul>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W * DPR}
          height={H * DPR}
          tabIndex={0}
          onKeyDown={onKey}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => { anim.current.drag = null; }}
          className="mx-auto block w-full max-w-md touch-none select-none rounded-xl border border-border"
          aria-label={c.hint}
        />
        {toast ? (
          <div className="pointer-events-none absolute inset-x-0 top-8 flex justify-center" aria-live="polite">
            <span className={toast.bad ? "rounded-full bg-destructive px-3 py-1 text-sm font-bold text-destructive-foreground shadow" : "rounded-full bg-background px-3 py-1 text-sm font-bold text-foreground shadow"}>{toast.text}</span>
          </div>
        ) : null}
        {desk.status === "ready" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/80 p-4 text-center">
            <p className="text-2xl font-black">{fill(c.day, desk.stage.index + 1)}</p>
            <p className="text-sm text-muted-foreground">{fill(c.queue, waiting)}</p>
            <Button className="min-h-12 min-w-40" onClick={startDay}>{c.start}</Button>
          </div>
        ) : null}
      </div>

      {desk.status === "won" || desk.status === "lost" ? (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-center" aria-live="polite">
          <p className="text-lg font-bold">{desk.status === "won" ? c.won : c.lost}</p>
          {desk.status === "won" ? <p className="text-xl text-warning" aria-label={`${st}/3`}>{"★".repeat(st)}{"☆".repeat(3 - st)}</p> : null}
          <p className="text-sm tabular-nums">{fill(c.score, desk.score)} · {fill(c.combo, desk.bestCombo)}</p>
          {desk.status === "won" ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => load(desk.stage.index)}><RotateCcw className="size-4" /><span>{c.retry}</span></Button>
              <Button className="min-h-12" onClick={() => load(desk.stage.index >= STAGE_COUNT - 1 ? 0 : desk.stage.index + 1)}>
                {desk.stage.index >= STAGE_COUNT - 1 ? finaleLabel(locale) : c.next}
              </Button>
            </div>
          ) : (
            <Button className="min-h-12 w-full" onClick={() => load(desk.stage.index)}><RotateCcw className="size-4" /><span>{c.retry}</span></Button>
          )}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">{c.hint}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={STAGE_COUNT} current={desk.stage.index} cleared={cleared} locale={locale} onSelect={load} />
        </div>
      </details>
    </div>
  );
}

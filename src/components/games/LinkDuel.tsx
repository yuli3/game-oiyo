import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Maximize2, Minimize2, Share2, Swords, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { CORE_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import {
  DUEL_LEAGUES,
  DUEL_SLUG,
  ROUNDS,
  cleanName,
  compareDuel,
  createMatch,
  decodeDuel,
  duelUrl,
  leagueCleared,
  leagueTarget,
  newSeed,
  scoreSequence,
  scoreStop,
  scoreTimed,
  stopPosition,
  totalScore,
  type Arrow,
  type DuelChallenge,
  type Round,
} from "../../lib/games/link-duel";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  title: string; league: string; target: string; round: string; total: string; start: string; intro: string;
  sum: string; stop: string; stopBtn: string; count: string; odd: string; seq: string; seqWatch: string;
  result: string; cleared: string; failed: string; again: string; next: string; share: string; copied: string;
  name: string; challenged: string; accept: string; youWin: string; youLose: string; draw: string; roundsLine: string;
  you: string; them: string; friend: string; leagues: string; full: string; exitFull: string; mute: string; unmute: string;
  shareText: string; newMatch: string;
}> = {
  ko: {
    title: "링크 대결", league: "{0}리그", target: "목표 {0}", round: "라운드 {0}/{1}", total: "합계 {0}", start: "대결 시작",
    intro: "작은 게임 10판을 하고 링크를 보내세요. 친구는 똑같은 10판을 하고 점수를 겨룹니다. 서버도 가입도 없어요.",
    sum: "합은?", stop: "노란 칸에서 멈추세요", stopBtn: "멈춰!", count: "점이 몇 개였나요?", odd: "색이 다른 하나를 누르세요", seq: "본 순서대로 누르세요", seqWatch: "순서를 기억하세요",
    result: "결과", cleared: "리그 통과!", failed: "목표에 못 미쳤어요", again: "같은 판 다시", next: "다음 리그", share: "대결 링크 보내기", copied: "링크를 복사했어요",
    name: "내 이름(선택)", challenged: "{0}님이 {1}점으로 도전했어요", accept: "도전 받기", youWin: "내가 이겼어요!", youLose: "졌어요", draw: "비겼어요", roundsLine: "라운드 {0}승 {1}패",
    you: "나", them: "상대", friend: "친구", leagues: "리그 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
    shareText: "링크 대결 {0}리그에서 {1}점! 같은 판으로 이겨 봐요", newMatch: "새 판",
  },
  en: {
    title: "Link Duel", league: "League {0}", target: "Goal {0}", round: "Round {0}/{1}", total: "Total {0}", start: "Start the duel",
    intro: "Play ten tiny rounds, then send the link. Your friend plays the exact same ten and you compare scores. No server, no sign-up.",
    sum: "What's the sum?", stop: "Stop on the yellow zone", stopBtn: "Stop!", count: "How many dots?", odd: "Tap the one that's a different shade", seq: "Repeat the order", seqWatch: "Remember the order",
    result: "Results", cleared: "League cleared!", failed: "Short of the goal", again: "Replay this set", next: "Next league", share: "Send duel link", copied: "Link copied",
    name: "Your name (optional)", challenged: "{0} challenged you with {1} points", accept: "Accept the duel", youWin: "You won!", youLose: "You lost", draw: "It's a draw", roundsLine: "Rounds won {0}, lost {1}",
    you: "You", them: "Rival", friend: "A friend", leagues: "Pick a league", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
    shareText: "I scored {1} in Link Duel league {0}. Beat me on the same rounds", newMatch: "New set",
  },
  ja: {
    title: "リンク対決", league: "リーグ{0}", target: "目標 {0}", round: "ラウンド {0}/{1}", total: "合計 {0}", start: "対決開始",
    intro: "小さなゲームを10回遊んでリンクを送ろう。友だちはまったく同じ10回で点数を競います。サーバーも登録も不要。",
    sum: "合計は？", stop: "黄色の所で止めて", stopBtn: "ストップ！", count: "点はいくつ？", odd: "色が違う1つを押して", seq: "見た順に押して", seqWatch: "順番を覚えて",
    result: "結果", cleared: "リーグ突破！", failed: "目標に届きませんでした", again: "同じセットをもう一度", next: "次のリーグ", share: "対決リンクを送る", copied: "リンクをコピーしました",
    name: "名前（任意）", challenged: "{0}さんが{1}点で挑戦してきました", accept: "挑戦を受ける", youWin: "あなたの勝ち！", youLose: "負けました", draw: "引き分け", roundsLine: "ラウンド {0}勝 {1}敗",
    you: "自分", them: "相手", friend: "友だち", leagues: "リーグを選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
    shareText: "リンク対決リーグ{0}で{1}点！同じセットで勝負して", newMatch: "新しいセット",
  },
  zh: {
    title: "链接对决", league: "第{0}联赛", target: "目标 {0}", round: "第{0}/{1}回合", total: "合计 {0}", start: "开始对决",
    intro: "玩10个小游戏，然后把链接发出去。朋友会玩完全相同的10回合来比分。无需服务器，无需注册。",
    sum: "和是多少？", stop: "停在黄色区域", stopBtn: "停！", count: "有几个点？", odd: "点出颜色不同的那一个", seq: "按看到的顺序点", seqWatch: "记住顺序",
    result: "结果", cleared: "联赛通过！", failed: "没达到目标", again: "重玩这一组", next: "下一联赛", share: "发送对决链接", copied: "已复制链接",
    name: "我的名字（可选）", challenged: "{0}以{1}分向你发起挑战", accept: "接受挑战", youWin: "你赢了！", youLose: "你输了", draw: "平局", roundsLine: "回合 {0}胜 {1}负",
    you: "我", them: "对手", friend: "朋友", leagues: "选择联赛", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
    shareText: "我在链接对决第{0}联赛拿了{1}分！用同一组来挑战我", newMatch: "新的一组",
  },
  fr: {
    title: "Duel par lien", league: "Ligue {0}", target: "Objectif {0}", round: "Manche {0}/{1}", total: "Total {0}", start: "Lancer le duel",
    intro: "Jouez dix mini-manches puis envoyez le lien. Votre ami joue exactement les mêmes dix et vous comparez. Sans serveur ni compte.",
    sum: "Quelle est la somme ?", stop: "Arrêtez sur la zone jaune", stopBtn: "Stop !", count: "Combien de points ?", odd: "Touchez la teinte différente", seq: "Refaites l'ordre", seqWatch: "Retenez l'ordre",
    result: "Résultats", cleared: "Ligue validée !", failed: "Objectif manqué", again: "Rejouer cette série", next: "Ligue suivante", share: "Envoyer le lien du duel", copied: "Lien copié",
    name: "Votre nom (facultatif)", challenged: "{0} vous défie avec {1} points", accept: "Relever le défi", youWin: "Vous avez gagné !", youLose: "Perdu", draw: "Égalité", roundsLine: "Manches gagnées {0}, perdues {1}",
    you: "Vous", them: "Rival", friend: "Un ami", leagues: "Choisir une ligue", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
    shareText: "{1} points en ligue {0} de Duel par lien. Battez-moi sur les mêmes manches", newMatch: "Nouvelle série",
  },
  es: {
    title: "Duelo por enlace", league: "Liga {0}", target: "Meta {0}", round: "Ronda {0}/{1}", total: "Total {0}", start: "Empezar el duelo",
    intro: "Juega diez minirondas y envía el enlace. Tu amigo juega exactamente las mismas diez y comparáis. Sin servidor ni registro.",
    sum: "¿Cuánto suman?", stop: "Para en la zona amarilla", stopBtn: "¡Para!", count: "¿Cuántos puntos?", odd: "Toca el de tono distinto", seq: "Repite el orden", seqWatch: "Recuerda el orden",
    result: "Resultados", cleared: "¡Liga superada!", failed: "No llegaste a la meta", again: "Repetir esta serie", next: "Siguiente liga", share: "Enviar enlace de duelo", copied: "Enlace copiado",
    name: "Tu nombre (opcional)", challenged: "{0} te reta con {1} puntos", accept: "Aceptar el reto", youWin: "¡Ganaste!", youLose: "Perdiste", draw: "Empate", roundsLine: "Rondas ganadas {0}, perdidas {1}",
    you: "Tú", them: "Rival", friend: "Un amigo", leagues: "Elegir liga", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
    shareText: "Saqué {1} en la liga {0} de Duelo por enlace. Gáname en las mismas rondas", newMatch: "Nueva serie",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:link-duel:muted";
const NAME_KEY = "oiyo:link-duel:name";
const SIZE = 360;
const ARROWS: { id: Arrow; Icon: typeof ArrowUp }[] = [
  { id: "up", Icon: ArrowUp },
  { id: "left", Icon: ArrowLeft },
  { id: "down", Icon: ArrowDown },
  { id: "right", Icon: ArrowRight },
];
const ARROW_GLYPH: Record<Arrow, string> = { up: "↑", down: "↓", left: "←", right: "→" };

type Phase = "lobby" | "play" | "done";
type Step = "show" | "answer" | "scored";

export default function LinkDuel({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [league, setLeague] = useState(0);
  const [seed, setSeed] = useState(1);
  const [cleared, setCleared] = useState<number[]>([]);
  const [challenge, setChallenge] = useState<DuelChallenge | null>(null);
  const [phase, setPhase] = useState<Phase>("lobby");
  const [roundIdx, setRoundIdx] = useState(0);
  const [step, setStep] = useState<Step>("show");
  const [scores, setScores] = useState<number[]>([]);
  const [lastScore, setLastScore] = useState(0);
  const [seqInput, setSeqInput] = useState<Arrow[]>([]);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startedAt = useRef(0);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);

  const match = useMemo(() => createMatch(league, seed), [league, seed]);
  const round: Round | undefined = match.rounds[roundIdx];
  const total = totalScore(scores);
  useRunRecord(DUEL_SLUG, phase === "done", total);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(DUEL_SLUG, DUEL_LEAGUES);
    setCleared(done);
    const incoming = decodeDuel(new URLSearchParams(window.location.search).get("duel"));
    if (incoming) {
      setChallenge(incoming);
      setLeague(incoming.league);
      setSeed(incoming.seed);
    } else {
      setLeague(nextOpenStage(done, DUEL_LEAGUES));
      setSeed(newSeed());
    }
    try { setName(localStorage.getItem(NAME_KEY) ?? ""); } catch { /* optional */ }
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: CORE_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, []);

  const beginRound = useCallback((i: number) => {
    setRoundIdx(i);
    setSeqInput([]);
    const r = match.rounds[i];
    const needsShow = r.kind === "count" || r.kind === "sequence";
    setStep(needsShow ? "show" : "answer");
    startedAt.current = performance.now();
  }, [match]);

  const startMatch = () => {
    setScores([]);
    setPhase("play");
    setCopied(false);
    beginRound(0);
    sfx("tap");
  };

  const finishRound = useCallback((score: number) => {
    setLastScore(score);
    setStep("scored");
    sfx(score >= 80 ? "success" : score > 0 ? "place" : "fail");
    const next = [...scores, score];
    setScores(next);
    window.setTimeout(() => {
      if (next.length >= ROUNDS) {
        setPhase("done");
        if (leagueCleared(league, next)) {
          setCleared(markStageCleared(DUEL_SLUG, league, DUEL_LEAGUES));
          sfx("win");
        } else sfx("lose");
      } else beginRound(next.length);
    }, 750);
  }, [scores, league, beginRound, sfx]);

  // "show" phases: count dots flash, sequences play one arrow at a time.
  useEffect(() => {
    if (phase !== "play" || step !== "show" || !round) return;
    const ms = round.kind === "count" ? round.showMs : round.kind === "sequence" ? round.showMs * round.arrows.length + 300 : 0;
    const t = window.setTimeout(() => {
      setStep("answer");
      startedAt.current = performance.now();
    }, ms);
    return () => window.clearTimeout(t);
  }, [phase, step, round]);

  // Canvas painter for the visual rounds.
  useEffect(() => {
    if (phase !== "play" || !round) return;
    let raf = 0;
    const paint = (now: number) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, SIZE, SIZE);
        const bg = ctx.createLinearGradient(0, 0, SIZE, SIZE);
        bg.addColorStop(0, "#1d2b53");
        bg.addColorStop(1, "#7e2553");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, SIZE, SIZE);
        const t = now - startedAt.current;
        if (round.kind === "sum") {
          ctx.fillStyle = "#fff1e8";
          ctx.font = "900 64px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`${round.a} + ${round.b}`, SIZE / 2, SIZE / 2);
        } else if (round.kind === "stop") {
          const y = SIZE / 2 - 22;
          ctx.fillStyle = "#29366f";
          ctx.fillRect(20, y, SIZE - 40, 44);
          ctx.fillStyle = "#ffcd75";
          ctx.fillRect(20 + (round.target - round.width / 2) * (SIZE - 40), y, round.width * (SIZE - 40), 44);
          const pos = step === "answer" ? stopPosition(round, t) : 0;
          ctx.fillStyle = "#fff";
          ctx.fillRect(16 + pos * (SIZE - 40), y - 10, 8, 64);
        } else if (round.kind === "count") {
          if (step === "show") {
            ctx.fillStyle = "#ffec27";
            for (const d of round.dots) {
              ctx.beginPath();
              ctx.arc(d.x * SIZE, d.y * SIZE, 14, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            ctx.fillStyle = "#fff1e8";
            ctx.font = "900 72px system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("?", SIZE / 2, SIZE / 2);
          }
        } else if (round.kind === "odd") {
          const cell = (SIZE - 20) / round.size;
          for (let i = 0; i < round.size * round.size; i++) {
            const l = i === round.index ? 52 + round.delta * 0.6 : 52;
            ctx.fillStyle = `hsl(${round.hue} 65% ${l}%)`;
            ctx.fillRect(10 + (i % round.size) * cell + 3, 10 + Math.floor(i / round.size) * cell + 3, cell - 6, cell - 6);
          }
        } else if (round.kind === "sequence") {
          ctx.fillStyle = "#fff1e8";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          if (step === "show") {
            const i = Math.floor(t / round.showMs);
            const glyph = round.arrows[i];
            ctx.font = "900 140px system-ui, sans-serif";
            if (glyph && t % round.showMs < round.showMs * 0.8) ctx.fillText(ARROW_GLYPH[glyph], SIZE / 2, SIZE / 2);
          } else {
            ctx.font = "900 48px system-ui, sans-serif";
            ctx.fillText(seqInput.map((a) => ARROW_GLYPH[a]).join(" ") || "…", SIZE / 2, SIZE / 2);
          }
        }
        if (step === "scored") {
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(0, 0, SIZE, SIZE);
          ctx.fillStyle = lastScore >= 80 ? "#00e436" : lastScore > 0 ? "#ffa300" : "#ff004d";
          ctx.font = "900 80px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`+${lastScore}`, SIZE / 2, SIZE / 2);
        }
      }
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [phase, round, step, seqInput, lastScore]);

  // Rounds with a time limit end on their own.
  useEffect(() => {
    if (phase !== "play" || step !== "answer" || !round || round.kind === "stop" || round.kind === "sequence") return;
    const t = window.setTimeout(() => finishRound(0), round.limitMs);
    return () => window.clearTimeout(t);
  }, [phase, step, round, finishRound]);

  const elapsed = () => performance.now() - startedAt.current;
  const answer = (value: number) => {
    if (step !== "answer" || !round) return;
    if (round.kind === "sum" || round.kind === "count") finishRound(scoreTimed(value === round.answer, elapsed(), round.limitMs));
  };
  const stopNow = () => {
    if (step !== "answer" || round?.kind !== "stop") return;
    finishRound(scoreStop(round, stopPosition(round, elapsed())));
  };
  const onCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!round || step !== "answer") return;
    if (round.kind === "stop") return stopNow();
    if (round.kind !== "odd") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * SIZE - 10;
    const y = ((e.clientY - rect.top) / rect.height) * SIZE - 10;
    const cell = (SIZE - 20) / round.size;
    const i = Math.floor(y / cell) * round.size + Math.floor(x / cell);
    finishRound(scoreTimed(i === round.index, elapsed(), round.limitMs));
  };
  const pressArrow = (a: Arrow) => {
    if (step !== "answer" || round?.kind !== "sequence") return;
    const next = [...seqInput, a];
    setSeqInput(next);
    sfx("tap");
    const wrong = next[next.length - 1] !== round.arrows[next.length - 1];
    if (wrong || next.length === round.arrows.length) finishRound(scoreSequence(round, next));
  };

  const share = async () => {
    const clean = cleanName(name);
    try { localStorage.setItem(NAME_KEY, clean); } catch { /* optional */ }
    const url = duelUrl(window.location.href, { league, seed, scores, name: clean });
    const text = fill(c.shareText, league + 1, total);
    try {
      if (navigator.share) {
        await navigator.share({ title: c.title, text, url });
        return;
      }
    } catch {
      /* fall back to copying */
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const pickLeague = (i: number) => {
    setChallenge(null);
    setLeague(i);
    setSeed(newSeed());
    setPhase("lobby");
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const duel = challenge && phase === "done" ? compareDuel(scores, challenge.scores) : null;
  const passed = phase === "done" && leagueCleared(league, scores);

  return (
    <div
      ref={containerRef}
      data-game="link-duel"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-3 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-xl space-y-3"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{fill(c.league, league + 1)} / {DUEL_LEAGUES}</Badge>
        <Badge variant="outline">{fill(c.target, leagueTarget(league))}</Badge>
        {phase === "play" && <Badge variant="outline">{fill(c.round, Math.min(ROUNDS, roundIdx + 1), ROUNDS)}</Badge>}
        {phase !== "lobby" && <Badge>{fill(c.total, total)}</Badge>}
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      {phase === "lobby" && (
        <Card>
          <CardContent>
            <div className="space-y-3">
              {challenge ? (
                <p className="flex items-center gap-2 text-lg font-bold">
                  <Swords className="size-5 text-primary" />
                  {fill(c.challenged, challenge.name || c.friend, totalScore(challenge.scores))}
                </p>
              ) : (
                <p className="text-sm leading-relaxed">{c.intro}</p>
              )}
              <Button size="lg" className="min-h-12 w-full" onClick={startMatch}>
                {challenge ? c.accept : c.start} · {fill(c.league, league + 1)}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {phase === "play" && round && (
        <div className="space-y-2">
          <p className="text-center text-base font-bold">
            {round.kind === "sum" ? c.sum : round.kind === "stop" ? c.stop : round.kind === "count" ? (step === "show" ? "…" : c.count) : round.kind === "odd" ? c.odd : step === "show" ? c.seqWatch : c.seq}
          </p>
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            onPointerDown={onCanvas}
            className="mx-auto aspect-square w-full max-w-sm touch-none select-none rounded-xl border border-border"
            aria-label={c.title}
          />
          {(round.kind === "sum" || round.kind === "count") && step === "answer" && (
            <div className="grid grid-cols-4 gap-2">
              {round.options.map((o) => (
                <Button key={o} size="lg" className="min-h-14" onClick={() => answer(o)}><span className="text-xl font-black tabular-nums">{o}</span></Button>
              ))}
            </div>
          )}
          {round.kind === "stop" && step === "answer" && (
            <Button size="lg" className="min-h-14 w-full" onClick={stopNow}><span className="text-xl font-black">{c.stopBtn}</span></Button>
          )}
          {round.kind === "sequence" && step === "answer" && (
            <div className="grid grid-cols-4 gap-2">
              {ARROWS.map(({ id, Icon }) => (
                <Button key={id} size="lg" variant="secondary" className="min-h-14" onClick={() => pressArrow(id)} aria-label={id}>
                  <Icon className="size-6" />
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {phase === "done" && (
        <Card>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold">{c.result} · {fill(c.total, total)}</h2>
                <Badge variant={passed ? "default" : "destructive"}>{passed ? c.cleared : c.failed}</Badge>
              </div>
              {duel && challenge && (
                <p className="text-xl font-black">
                  {duel.verdict === "win" ? c.youWin : duel.verdict === "lose" ? c.youLose : c.draw}{" "}
                  <span className="text-sm font-medium text-muted-foreground">{fill(c.roundsLine, duel.roundsWon, duel.roundsLost)}</span>
                </p>
              )}
              <ul className="space-y-1">
                {scores.map((sc, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs tabular-nums">
                    <span className="w-6 text-muted-foreground">{i + 1}</span>
                    <progress className="h-3 flex-1 accent-primary" value={sc} max={100} aria-label={`${c.you} ${sc}`} />
                    <span className="w-8 text-right">{sc}</span>
                    {challenge && (
                      <>
                        <progress className="h-3 flex-1 accent-destructive" value={challenge.scores[i]} max={100} aria-label={`${c.them} ${challenge.scores[i]}`} />
                        <span className="w-8 text-right">{challenge.scores[i]}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={c.name} aria-label={c.name} maxLength={12} className="min-h-12 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-base" />
                <Button className="min-h-12 shrink-0" onClick={share}>
                  <Share2 className="size-4" />
                  {c.share}
                </Button>
              </div>
              {copied && <p className="text-sm text-success">{c.copied}</p>}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="min-h-12" onClick={startMatch}>{c.again}</Button>
                {passed && league < DUEL_LEAGUES - 1 ? (
                  <Button className="min-h-12" onClick={() => pickLeague(league + 1)}>{c.next}</Button>
                ) : (
                  <Button variant="secondary" className="min-h-12" onClick={() => pickLeague(league)}>{c.newMatch}</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.leagues}</summary>
        <div className="pt-2">
          <StageBar count={DUEL_LEAGUES} current={league} cleared={cleared} locale={locale} onSelect={pickLeague} />
        </div>
      </details>
    </div>
  );
}

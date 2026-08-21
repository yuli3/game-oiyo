import React, { useCallback, useEffect, useRef, useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import type { Locale } from "../../lib/i18n";
import {
  tileFits, type Tile, type End, type AiLevel,
} from "../../lib/games/ai/dominoes";
import { clearDominoesSave, loadDominoesSave, storeDominoesSave } from "../../lib/games/dominoes-save";
import { cpuDominoes, createDominoes, dominoCpuReview, dominoEnds, dominoHasMove, dominoesAnalysis, drawDominoes, passDominoes, playDominoes, type DominoCpuReview, type DominoesState } from "../../lib/games/dominoes";
import { getRecord, recordResult, type GameRecord } from "../../lib/games/records";

const AI_DELAY = 800;
const extra: Record<Locale,{pause:string;resume:string;restored:string;paused:string;played:string;drawn:string;pips:string;sound:string}>={
  ko:{pause:"일시정지",resume:"계속",restored:"저장된 게임 복원",paused:"게임 일시정지",played:"놓은 패",drawn:"가져온 패",pips:"남은 점수",sound:"소리"},en:{pause:"Pause",resume:"Resume",restored:"Saved game restored",paused:"Game paused",played:"played",drawn:"drawn",pips:"pips",sound:"Sound"},ja:{pause:"一時停止",resume:"再開",restored:"保存ゲームを復元",paused:"ゲーム一時停止",played:"配置",drawn:"ドロー",pips:"残点",sound:"音"},zh:{pause:"暂停",resume:"继续",restored:"已恢复游戏",paused:"游戏已暂停",played:"出牌",drawn:"摸牌",pips:"剩余点数",sound:"声音"},fr:{pause:"Pause",resume:"Reprendre",restored:"Partie restaurée",paused:"Partie en pause",played:"posés",drawn:"piochés",pips:"points",sound:"Son"},es:{pause:"Pausa",resume:"Continuar",restored:"Partida restaurada",paused:"Partida en pausa",played:"jugadas",drawn:"robadas",pips:"puntos",sound:"Sonido"}
};

const AI_INFO:Record<Locale,{policy:string;level:Record<AiLevel,string>;review:string;reason:Record<DominoCpuReview['reason'],string>;draws:string}>={
 ko:{policy:'AI 정책',level:{1:'합법 수 결정적 변주',2:'높은 점수·더블 우선',3:'높은 점수·더블·다음 연결'},review:'AI 마지막 선택',reason:{variation:'합법 수 변주', 'heavy-pips':'남은 점수를 먼저 줄임',double:'놓기 어려운 더블을 먼저 처리',flexibility:'다음에도 연결할 수 있는 끝점 유지'},draws:'장 가져온 뒤'},
 en:{policy:'AI policy',level:{1:'deterministic legal variation',2:'high pips and doubles',3:'pips, doubles, future replies'},review:'Last AI choice',reason:{variation:'legal variation','heavy-pips':'reduced heavy remaining pips',double:'unloaded a difficult double',flexibility:'kept an end it can answer next'},draws:'draws first'},
 ja:{policy:'AI方針',level:{1:'合法手の決定的変化',2:'高い目・ダブル優先',3:'目・ダブル・次の接続'},review:'AIの最後の選択',reason:{variation:'合法手の変化','heavy-pips':'残りの目を先に減らす',double:'置きにくいダブルを処理',flexibility:'次もつなげる端を維持'},draws:'枚引いた後'},
 zh:{policy:'AI策略',level:{1:'合法着法的确定性变体',2:'高点数与对子优先',3:'点数、对子与后续连接'},review:'AI最后选择',reason:{variation:'合法着法变体','heavy-pips':'优先减少手中点数',double:'先处理难出的对子',flexibility:'保留下一步可连接的端点'},draws:'张后'},
 fr:{policy:'Politique IA',level:{1:'variation légale déterministe',2:'points forts et doubles',3:'points, doubles et réponse future'},review:'Dernier choix IA',reason:{variation:'variation légale','heavy-pips':'réduit les gros points restants',double:'joue un double difficile',flexibility:'garde une extrémité rejouable'},draws:'pioches avant'},
 es:{policy:'Política IA',level:{1:'variación legal determinista',2:'puntos altos y dobles',3:'puntos, dobles y respuesta futura'},review:'Última decisión IA',reason:{variation:'variación legal','heavy-pips':'reduce puntos altos restantes',double:'descarga un doble difícil',flexibility:'mantiene un extremo jugable'},draws:'robos antes'},
};

const i18n: Record<Locale, {
  title: string; you: string; cpu: string; turn: string; reset: string; draw: string; pass: string;
  boneyard: string; yourTiles: string; left: string; right: string; pickEnd: string;
  youWin: string; cpuWins: string; blockDraw: string; blocked: string; thinking: string;
  record: string; level1: string; level2: string; level3: string; start: string; noMove: string; tile: string;
}> = {
  ko: { title: "도미노", you: "나", cpu: "AI", turn: "차례", reset: "새 판", draw: "가져오기", pass: "패스", boneyard: "더미", yourTiles: "내 패", left: "◀ 왼쪽", right: "오른쪽 ▶", pickEnd: "어느 쪽에 놓을까요?", youWin: "당신의 승리!", cpuWins: "AI 승리", blockDraw: "무승부 (막힘)", blocked: "막힘 — 남은 패 점수로 승부", thinking: "AI가 생각 중…", record: "전적", level1: "견습생", level2: "숙련가", level3: "명인", start: "게임 시작", noMove: "놓을 패가 없습니다.", tile: "도미노 패" },
  en: { title: "Dominoes", you: "You", cpu: "AI", turn: "Turn", reset: "New Game", draw: "Draw", pass: "Pass", boneyard: "Boneyard", yourTiles: "Your tiles", left: "◀ Left", right: "Right ▶", pickEnd: "Which end?", youWin: "You win!", cpuWins: "AI wins", blockDraw: "Draw (blocked)", blocked: "Blocked — fewest pips wins", thinking: "AI is thinking…", record: "Record", level1: "Apprentice", level2: "Adept", level3: "Master", start: "Start Game", noMove: "No playable tile.", tile: "Domino tile" },
  ja: { title: "ドミノ", you: "あなた", cpu: "AI", turn: "手番", reset: "新しいゲーム", draw: "引く", pass: "パス", boneyard: "山札", yourTiles: "手札", left: "◀ 左", right: "右 ▶", pickEnd: "どちらに置く？", youWin: "あなたの勝ち！", cpuWins: "AIの勝ち", blockDraw: "引き分け（詰み）", blocked: "詰み — 手札の点数で勝負", thinking: "AIが思考中…", record: "戦績", level1: "見習い", level2: "熟練者", level3: "名人", start: "ゲーム開始", noMove: "置ける牌がありません。", tile: "ドミノ牌" },
  zh: { title: "多米诺骨牌", you: "你", cpu: "AI", turn: "回合", reset: "新对局", draw: "摸牌", pass: "过", boneyard: "牌堆", yourTiles: "你的牌", left: "◀ 左", right: "右 ▶", pickEnd: "放在哪一端？", youWin: "你赢了！", cpuWins: "AI 获胜", blockDraw: "平局（封盘）", blocked: "封盘 — 剩余点数少者胜", thinking: "AI 思考中…", record: "战绩", level1: "学徒", level2: "行家", level3: "大师", start: "开始游戏", noMove: "没有可出的牌。", tile: "多米诺牌" },
  fr: { title: "Dominos", you: "Vous", cpu: "IA", turn: "Tour", reset: "Nouvelle partie", draw: "Piocher", pass: "Passer", boneyard: "Pioche", yourTiles: "Vos dominos", left: "◀ Gauche", right: "Droite ▶", pickEnd: "Quel côté ?", youWin: "Vous gagnez !", cpuWins: "L'IA gagne", blockDraw: "Nul (bloqué)", blocked: "Bloqué — le moins de points gagne", thinking: "L'IA réfléchit…", record: "Bilan", level1: "Apprenti", level2: "Adepte", level3: "Maître", start: "Commencer", noMove: "Aucun domino jouable.", tile: "Domino" },
  es: { title: "Dominó", you: "Tú", cpu: "IA", turn: "Turno", reset: "Nueva partida", draw: "Robar", pass: "Pasar", boneyard: "Pozo", yourTiles: "Tus fichas", left: "◀ Izq.", right: "Der. ▶", pickEnd: "¿Qué extremo?", youWin: "¡Has ganado!", cpuWins: "Gana la IA", blockDraw: "Empate (cerrado)", blocked: "Cerrado — gana quien menos puntos tenga", thinking: "La IA está pensando…", record: "Historial", level1: "Aprendiz", level2: "Experto", level3: "Maestro", start: "Empezar", noMove: "Sin ficha jugable.", tile: "Ficha de dominó" },
};

function Pips({ n }: { n: number }) {
  const pos = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]][n];
  return (
    <div className="grid grid-cols-3 grid-rows-3 w-6 h-6 gap-0.5">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className={`rounded-full ${pos.includes(i) ? "bg-foreground" : "bg-transparent"}`} />
      ))}
    </div>
  );
}

const Dominoes: React.FC<{ locale?: Locale }> = ({ locale = "ko" }) => {
  const t = i18n[locale] ?? i18n.en;
  const x=extra[locale]??extra.en;
  const aiInfo=AI_INFO[locale]??AI_INFO.en;
  const reducedMotion = usePrefersReducedMotion();
  const [level, setLevel] = useState<AiLevel>(2);
  const [game, setGame] = useState<DominoesState | null>(null);
  const [paused, setPaused] = useState(false);
  const [restored, setRestored] = useState(false);
  const[muted,setMuted]=useState(false);const audio=useRef<AudioContext|null>(null);const tone=(hz:number)=>{if(muted)return;const c=audio.current??new AudioContext();audio.current=c;const o=c.createOscillator(),g=c.createGain();o.frequency.value=hz;g.gain.setValueAtTime(.04,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.07);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+.07)};
  const [pendingTile, setPendingTile] = useState<Tile | null>(null); // fits both ends → ask
  const [record, setRecord] = useState<GameRecord>({ w: 0, l: 0, d: 0 });
  const [lastCpuReview,setLastCpuReview]=useState<DominoCpuReview|null>(null);
  const recorded = useRef(false);

  useEffect(() => { setRecord(getRecord("dominoes")); const saved=loadDominoesSave(); if(saved){setGame(saved.state);setLevel(saved.level);setPaused(true);setRestored(true)} }, []);
  useEffect(()=>{if(game?.status==="playing")storeDominoesSave(game,level);else if(game)clearDominoesSave()},[game,level]);
  useEffect(()=>{const hidden=()=>{if(document.hidden)setPaused(true)};document.addEventListener("visibilitychange",hidden);return()=>document.removeEventListener("visibilitychange",hidden)},[]);
  useEffect(()=>()=>{void audio.current?.close()},[]);

  const ends = game ? dominoEnds(game) : { left: -1, right: -1 };

  const newGame = useCallback(() => {
    const seed = typeof crypto !== "undefined" ? crypto.getRandomValues(new Uint32Array(1))[0] : Date.now() >>> 0;
    setGame(createDominoes(seed)); setPendingTile(null); setPaused(false); setRestored(false); setLastCpuReview(null); clearDominoesSave(); recorded.current = false;
  }, []);

  const recordWinner = useCallback((w: DominoesState["winner"]) => {
    if (!w) return;
    if (!recorded.current) {
      recorded.current = true;
      const r = w === "you" ? "w" : w === "cpu" ? "l" : "d";
      setRecord(recordResult("dominoes", r as "w" | "l" | "d"));
    }
  }, []);

  const humanPlay = (tile: Tile, end: End) => {
    if (!game || paused) return; const next = playDominoes(game, tile.id, end); if (next === game) return;
    setGame(next); setPendingTile(null);tone(next.winner?660:320); if (next.winner) recordWinner(next.winner);
  };

  const clickHandTile = (tile: Tile) => {
    if (!game || paused || game.turn !== "you" || game.status === "over") return;
    const fitsL = tileFits(tile, ends.left);
    const fitsR = tileFits(tile, ends.right);
    if (fitsL && fitsR) setPendingTile(tile);         // ask which end
    else if (fitsL) humanPlay(tile, "left");
    else if (fitsR) humanPlay(tile, "right");
  };

  const humanHasMove = game ? dominoHasMove(game.player, ends) : false;

  const humanDrawOrPass = () => {
    if (!game || paused) return; const next = game.bone.length ? drawDominoes(game) : passDominoes(game); if (next === game) return; setGame(next);tone(game.bone.length?180:120); if (next.winner) recordWinner(next.winner);
  };

  // CPU turn.
  useEffect(() => {
    if (!game || paused || game.status === "over" || game.turn !== "cpu") return;
    const id = setTimeout(() => {
      setLastCpuReview(dominoCpuReview(game,level));
      const next = cpuDominoes(game, level); setGame(next);tone(next.winner?560:240); if (next.winner) recordWinner(next.winner);
    }, AI_DELAY);
    return () => clearTimeout(id);
  }, [game, level, recordWinner, paused]);

  if (!game) {
    return (
      <GameContainer title={t.title}>
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="flex gap-2">
            {([1, 2, 3] as AiLevel[]).map((lv) => (
              <button type="button" key={lv} onClick={() => setLevel(lv)} aria-pressed={level === lv}
                className={`px-3 py-1.5 rounded-md text-sm font-bold border ${level === lv ? "bg-primary text-primary-foreground border-primary" : "border-gray-300 text-gray-600"}`}>
                {lv === 1 ? t.level1 : lv === 2 ? t.level2 : t.level3}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{aiInfo.policy}: {aiInfo.level[level]}</p>
          <button type="button" onClick={newGame} className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold">{t.start}</button>
          <p className="text-xs text-gray-400">{t.record}: {record.w}W {record.l}L {record.d}D</p>
        </div>
      </GameContainer>
    );
  }
  const analysis=dominoesAnalysis(game);

  return (
    <GameContainer title={t.title} subtitle={`${t.cpu}: ${game.cpu.length} · ${t.boneyard}: ${game.bone.length}`} onReset={newGame}>
      {/* Turn / status */}
      <div className="flex justify-between items-center mb-4">
        <div className={`px-4 py-2 rounded-2xl border ${game.turn === "you" && game.status === "playing" ? "bg-primary/10 border-primary" : "bg-muted border-transparent opacity-50"}`}>
          <span className="text-xs font-black uppercase tracking-widest">
            {game.winner ? "—" : game.turn === "you" ? `${t.you} ${t.turn}` : t.thinking}
          </span>
        </div>
        <div className="text-[10px] font-bold text-muted-foreground uppercase">{t.record}: {record.w}/{record.l}/{record.d}</div>
      </div>
      <p className="mb-3 text-center text-[11px] font-medium text-muted-foreground">{aiInfo.policy}: {aiInfo.level[level]}</p>
      {game.history.length>0&&game.status==="playing"&&<div className="mb-3 flex justify-center"><button type="button" onClick={()=>{setPaused(v=>!v);setRestored(false)}} className="min-h-11 px-4 rounded-xl border border-border font-bold text-sm">{paused?"▶":"Ⅱ"} {paused?x.resume:x.pause}</button></div>}
      <div className="mb-3 flex justify-center"><button type="button" onClick={()=>setMuted(v=>!v)} aria-pressed={muted} className="min-h-11 px-4 rounded-xl border border-border font-bold text-sm">{muted?'🔇':'🔊'} {x.sound}</button></div>
      {(paused||restored)&&<p className="mb-3 text-center text-xs font-bold text-muted-foreground" role="status">{restored?`${x.restored} · `:""}{x.paused}</p>}

      {/* Board */}
      <div className="h-40 bg-muted/40 rounded-3xl border border-border flex items-center p-4 overflow-x-auto gap-1 shadow-inner mb-6">
        {game.board.map((d) => (
          <div key={d.id} className="flex flex-shrink-0 bg-card border border-border rounded-md shadow-sm divide-x divide-border">
            <div className="p-1"><Pips n={d.a} /></div>
            <div className="p-1"><Pips n={d.b} /></div>
          </div>
        ))}
      </div>

      {/* Pending end-choice */}
      {pendingTile && (
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-xs font-bold text-muted-foreground">{t.pickEnd}</span>
          <button type="button" onClick={() => humanPlay(pendingTile, "left")} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-bold">{t.left}</button>
          <button type="button" onClick={() => humanPlay(pendingTile, "right")} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-bold">{t.right}</button>
        </div>
      )}

      {/* Hand */}
      <div className="space-y-3">
        <p className="text-[10px] font-black text-muted-foreground uppercase text-center tracking-widest">{t.yourTiles}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {game.player.map((d) => {
            const playable = game.turn === "you" && game.status === "playing" && (tileFits(d, ends.left) || tileFits(d, ends.right));
            return (
              <button type="button" key={d.id} data-domino-tile={d.id} onPointerUp={() => clickHandTile(d)} onKeyDown={(event)=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;event.preventDefault();const playableTiles=game.player.filter(tile=>tileFits(tile,ends.left)||tileFits(tile,ends.right));const index=playableTiles.findIndex(tile=>tile.id===d.id);const target=event.key==="Home"?0:event.key==="End"?playableTiles.length-1:event.key==="ArrowLeft"?Math.max(0,index-1):Math.min(playableTiles.length-1,index+1);document.querySelector<HTMLElement>(`[data-domino-tile="${playableTiles[target]?.id}"]`)?.focus()}} style={{touchAction:"manipulation"}} disabled={!playable} aria-disabled={!playable} aria-pressed={pendingTile?.id === d.id} aria-label={`${t.tile}: ${d.a}-${d.b}`}
                className={`min-w-11 min-h-11 bg-card border-2 rounded-lg shadow-sm flex flex-col divide-y divide-border ${!reducedMotion ? "transition-all" : ""} ${
                  playable ? `border-primary ${!reducedMotion ? "hover:-translate-y-1 active:scale-95" : ""}` : "border-border opacity-60"
                } ${pendingTile?.id === d.id ? "ring-2 ring-primary" : ""}`}>
                <div className="p-2 sm:p-3"><Pips n={d.a} /></div>
                <div className="p-2 sm:p-3"><Pips n={d.b} /></div>
              </button>
            );
          })}
        </div>
        {/* Draw / pass */}
        {game.turn === "you" && game.status === "playing" && !humanHasMove && (
          <div className="flex flex-col items-center gap-1">
            <button type="button" onClick={humanDrawOrPass} className="px-5 py-2 rounded-lg bg-amber-500 text-white font-bold">
              {game.bone.length > 0 ? `${t.draw} (${game.bone.length})` : t.pass}
            </button>
            <span className="text-[10px] text-muted-foreground">{t.noMove}</span>
          </div>
        )}
      </div>

      {game.winner && (
        <div className={`absolute inset-0 z-20 bg-background/80 backdrop-blur-md rounded-4xl flex flex-col items-center justify-center ${!reducedMotion ? "animate-in fade-in zoom-in-95" : ""}`}>
          <h4 className="text-3xl font-black text-primary mb-2">
            {game.winner === "you" ? `🎉 ${t.youWin}` : game.winner === "cpu" ? t.cpuWins : t.blockDraw}
          </h4>
          <p className="text-xs text-muted-foreground mb-4">{t.record}: {record.w}W {record.l}L {record.d}D</p>
          <p className="text-xs text-muted-foreground mb-4">{analysis.plays} {x.played} · {analysis.draws} {x.drawn} · {analysis.yourPips}–{analysis.cpuPips} {x.pips}</p>
          {game.winner==='cpu'&&lastCpuReview&&<div className="mb-4 max-w-xs rounded-2xl border border-amber-300/60 bg-amber-50 p-3 text-left text-xs text-stone-800"><p className="font-black text-amber-900">{aiInfo.review} · {lastCpuReview.tile.a}-{lastCpuReview.tile.b} · {lastCpuReview.end==='left'?t.left:t.right}</p><p className="mt-1">{lastCpuReview.draws>0?`${lastCpuReview.draws} ${aiInfo.draws} · `:''}{aiInfo.reason[lastCpuReview.reason]}</p><p className="mt-1 text-[10px] text-stone-500">{aiInfo.policy}: {aiInfo.level[level]}</p></div>}
          <button type="button" onClick={newGame} className="px-10 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg">{t.reset}</button>
        </div>
      )}
    </GameContainer>
  );
};

export default Dominoes;

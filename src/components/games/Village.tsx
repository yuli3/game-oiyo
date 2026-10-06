import { useEffect, useRef, useState } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";
import {
  BUILDINGS,
  BUILDING_IDS,
  COMMAND_IDS,
  EVENT_CHOICES,
  VILLAGE_AP,
  VILLAGE_BEST_KEY,
  VILLAGE_SAVE_KEY,
  canBuild,
  canChoose,
  canCommand,
  chooseEvent,
  command,
  createVillage,
  endMonth,
  parseVillageCode,
  parseVillageSave,
  serializeVillage,
  villageDone,
  villageGrade,
  villageHousing,
  villageMonth,
  villageSafety,
  villageSaveCode,
  villageScore,
  villageSeason,
  villageStorageCap,
  villageYear,
  type BuildingId,
  type CommandId,
  type Cost,
  type VillageState,
} from "../../lib/games/village";
import { VILLAGE_COPY } from "./VillageCopy";

const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];

function readBest(): number {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(VILLAGE_BEST_KEY) ?? "0");
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch { return 0; }
}

export default function Village({ locale = "ko" }: { locale?: Locale }) {
  const t = VILLAGE_COPY[locale] ?? VILLAGE_COPY.en;
  // The first render must match the server's, so the real village (a saved one or a fresh seed) arrives in the effect.
  const [state, setState] = useState<VillageState>(() => createVillage(1));
  const [ready, setReady] = useState(false);
  const [best, setBest] = useState(0);
  const [picking, setPicking] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef(0);

  useEffect(() => {
    setBest(readBest());
    setState(parseVillageSave(localStorage.getItem(VILLAGE_SAVE_KEY)) ?? createVillage(newSeed()));
    setReady(true);
    return () => window.clearTimeout(noticeTimer.current);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(VILLAGE_SAVE_KEY, serializeVillage(state)); } catch { /* storage is best-effort */ }
    if (villageDone(state)) {
      const score = villageScore(state);
      if (score > readBest()) {
        try { localStorage.setItem(VILLAGE_BEST_KEY, JSON.stringify(score)); } catch { /* storage is best-effort */ }
        setBest(score);
      }
    }
  }, [ready, state]);

  const say = (text: string) => {
    setNotice(text);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 2600);
  };

  const done = villageDone(state);
  const season = villageSeason(state.turn);
  const cap = villageStorageCap(state);
  const waiting = !state.eventDone && state.event !== null;

  const order = (id: CommandId) => {
    if (id === "build" && !state.project) { setPicking(true); return; }
    setState(command(state, id));
  };
  const build = (id: BuildingId) => {
    setState(command(state, "build", id));
    setPicking(false);
  };
  const restart = () => {
    if (!done && state.turn > 0 && !window.confirm(t.againConfirm)) return;
    setPicking(false);
    setState(createVillage(newSeed()));
  };
  const copyCode = async () => {
    const code = villageSaveCode(state);
    try { await navigator.clipboard.writeText(code); say(t.save.copied); }
    catch { setCodeInput(code); }
  };
  const loadCode = () => {
    const loaded = parseVillageCode(codeInput);
    if (!loaded) { say(t.save.bad); return; }
    setPicking(false);
    setState(loaded);
    setCodeInput("");
    say(t.save.loaded);
  };

  const costText = (cost: Cost) =>
    [cost.wood ? `${t.res.wood} ${cost.wood}` : "", cost.stone ? `${t.res.stone} ${cost.stone}` : "", cost.gold ? `${t.res.gold} ${cost.gold}` : ""].filter(Boolean).join(" · ");
  const btn = "min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-left text-sm font-bold text-foreground transition active:translate-y-px disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  const stat = (label: string, value: string) => (
    <div className="rounded-xl border border-border bg-card px-2 py-1.5 text-center">
      <div className="text-base font-black text-foreground">{value}</div>
      <div className="text-[10px] font-semibold text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <GameContainer title={t.title} subtitle={t.sub} resetLabel={t.again} onReset={restart}>
      <div className="mx-auto max-w-md" data-village-ready={ready ? "1" : "0"}>
        <p className="mb-3 rounded-xl bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">{t.trial}</p>

        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-lg font-black text-foreground">
            {done ? t.overTitle : `${fill(t.date, { y: villageYear(state.turn), m: villageMonth(state.turn) })} · ${t.seasons[season]}`}
          </p>
          {!done ? <p className="text-xs font-semibold text-muted-foreground">{fill(t.progress, { n: state.turn + 1 })}</p> : null}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {stat(t.res.food, `${state.food}/${cap}`)}
          {stat(t.res.wood, `${state.wood}/${cap}`)}
          {stat(t.res.stone, `${state.stone}/${cap}`)}
          {stat(t.res.gold, String(state.gold))}
          {stat(t.res.pop, `${state.pop}/${villageHousing(state)}`)}
          {stat(t.res.fatigue, String(state.fatigue))}
          {stat(t.res.safety, String(villageSafety(state)))}
          {stat(t.res.ap, done ? "–" : `${state.ap}/${VILLAGE_AP}`)}
        </div>

        <ul className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-muted-foreground">
          {BUILDING_IDS.map((id) => (
            <li key={id} className="rounded-full border border-border px-2 py-0.5">{t.building[id].name} {state.buildings[id]}/{BUILDINGS[id].max}</li>
          ))}
        </ul>
        {state.project ? (
          <p className="mt-2 text-xs font-bold text-primary">
            {fill(t.project, { name: t.building[state.project.id].name, p: state.project.progress, n: BUILDINGS[state.project.id].need })}
          </p>
        ) : null}

        <p className="mt-2 min-h-5 text-center text-xs font-bold text-primary" role="status" aria-live="polite">{notice}</p>

        {done ? (
          <section className="mt-2 rounded-2xl border border-border bg-card p-4 text-center">
            <p className="text-sm font-semibold text-muted-foreground">{t.score}</p>
            <p className="text-4xl font-black text-primary">{villageScore(state)}</p>
            <p className="mt-1 text-lg font-black text-foreground">{t.grades[villageGrade(villageScore(state))]}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.best} {Math.max(best, villageScore(state))}</p>
            <button type="button" onClick={restart} className="mt-3 min-h-11 rounded-full bg-primary px-6 text-sm font-black text-primary-foreground">{t.again}</button>
          </section>
        ) : null}

        {waiting && state.event ? (
          <section className="mt-2 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3" aria-label={t.eventTitle}>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">{t.eventTitle}</p>
            <p className="mt-0.5 text-base font-black text-amber-950">{t.events[state.event].title}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-amber-900">{t.events[state.event].text}</p>
            <div className="mt-2 grid gap-1.5">
              {Array.from({ length: EVENT_CHOICES[state.event] }, (_, choice) => (
                <button key={choice} type="button" disabled={!canChoose(state, choice)} onClick={() => setState(chooseEvent(state, choice))} className={`${btn} border-amber-300`}>
                  {t.events[state.event!].choices[choice]}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {!done ? (
          <section className="mt-3">
            <h4 className="mb-1.5 text-xs font-black uppercase tracking-widest text-muted-foreground">{t.commandsTitle}</h4>
            {picking && !state.project ? (
              <div className="grid gap-1.5 rounded-2xl border border-border bg-muted p-2">
                <p className="text-sm font-black text-foreground">{t.buildTitle}</p>
                {BUILDING_IDS.map((id) => (
                  <button key={id} type="button" disabled={!canCommand(state, "build", id)} onClick={() => build(id)} className={btn}>
                    <span className="flex items-baseline justify-between gap-2">
                      <span>{t.building[id].name} <span className="text-xs font-semibold text-muted-foreground">{state.buildings[id]}/{BUILDINGS[id].max}</span></span>
                      <span className="text-xs font-semibold text-muted-foreground">{costText(BUILDINGS[id].cost)}</span>
                    </span>
                    <span className="block text-xs font-medium text-muted-foreground">{t.building[id].hint}</span>
                  </button>
                ))}
                <button type="button" onClick={() => setPicking(false)} className={`${btn} text-center`}>{t.buildCancel}</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {COMMAND_IDS.map((id) => {
                  const enabled = id === "build" && !state.project
                    ? state.eventDone && state.ap > 0 && BUILDING_IDS.some((b) => canBuild(state, b))
                    : canCommand(state, id);
                  return (
                    <button key={id} type="button" disabled={!enabled} onClick={() => order(id)} className={btn}>
                      <span className="block">{t.cmd[id].name}</span>
                      <span className="block text-xs font-medium text-muted-foreground">{t.cmd[id].hint}</span>
                    </button>
                  );
                })}
                <button type="button" disabled={waiting} onClick={() => { setPicking(false); setState(endMonth(state)); }} className="min-h-11 rounded-xl bg-primary px-3 py-2 text-sm font-black text-primary-foreground disabled:opacity-40">
                  {t.endMonth}
                </button>
              </div>
            )}
            {waiting ? <p className="mt-1.5 text-xs text-muted-foreground">{t.needEvent}</p> : null}
          </section>
        ) : null}

        <section className="mt-4">
          <h4 className="mb-1 text-xs font-black uppercase tracking-widest text-muted-foreground">{t.reportTitle}</h4>
          {state.report.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t.reportEmpty}</p>
          ) : (
            <ul className="grid gap-0.5 text-sm text-foreground">
              {state.report.map((line, index) => (
                <li key={`${line.k}-${index}`}>
                  {fill(t.report[line.k] ?? line.k, { n: line.n ?? 0, name: line.id ? t.building[line.id as BuildingId]?.name ?? "" : "" })}
                </li>
              ))}
            </ul>
          )}
        </section>

        <details className="mt-4 rounded-xl border border-border bg-card p-3">
          <summary className="cursor-pointer text-sm font-black text-foreground">{t.save.title}</summary>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t.save.note}</p>
          <button type="button" onClick={copyCode} className={`${btn} mt-2 w-full text-center`}>{t.save.copy}</button>
          <textarea
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder={t.save.paste}
            aria-label={t.save.paste}
            rows={3}
            className="mt-2 w-full rounded-xl border border-border bg-background p-2 font-mono text-xs text-foreground"
          />
          <button type="button" onClick={loadCode} disabled={!codeInput.trim()} className={`${btn} mt-1 w-full text-center`}>{t.save.load}</button>
        </details>
      </div>
    </GameContainer>
  );
}

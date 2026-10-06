import { useEffect, useRef, useState, type ReactElement } from "react";
import { GameContainer } from "../ui/game/GamePrimitives";
import type { Locale } from "../../lib/i18n";
import {
  BUILDINGS,
  BUILDING_IDS,
  COMMAND_IDS,
  VILLAGE_BEST_KEY,
  VILLAGE_SAVE_KEY,
  assignVillager,
  autoAssign,
  canBuild,
  canChoose,
  canCommand,
  canPlace,
  chooseEvent,
  command,
  createVillage,
  endMonth,
  eventChoiceCount,
  eventChoiceInfo,
  parseVillageCode,
  parseVillageSave,
  serializeVillage,
  tileOutput,
  villageCount,
  villageDone,
  villageGrade,
  villageHousing,
  villageMaxAp,
  villageMonth,
  villagePop,
  villageSafety,
  villageSaveCode,
  villageScore,
  villageSeason,
  villageStorageCap,
  villageWorkerAt,
  villageYear,
  type BuildingId,
  type CommandId,
  type Cost,
  type ReportLine,
  type Terrain,
  type VillageState,
} from "../../lib/games/village";
import { VILLAGE_COPY, type VillageCopy } from "./VillageCopy";

const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];

function readBest(): number {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(VILLAGE_BEST_KEY) ?? "0");
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch { return 0; }
}

const TERRAIN_TONE: Record<Terrain, string> = {
  plain: "bg-[#ece8d4]",
  fertile: "bg-[#dfe7ae]",
  forest: "bg-[#a9c79a]",
  rock: "bg-[#bdb9ae]",
  water: "bg-[#a6cfe4]",
};

/** Drawn shapes, not emoji: the same on every phone, and they take the text colour. */
function BuildingIcon({ id }: { id: BuildingId }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const shapes: Record<BuildingId, ReactElement> = {
    field: <><path d="M4 8c3-2 5 2 8 0s5-2 8 0" /><path d="M4 13c3-2 5 2 8 0s5-2 8 0" /><path d="M4 18c3-2 5 2 8 0s5-2 8 0" /></>,
    house: <><path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" /><path d="M10.5 19v-5h3v5" /></>,
    storehouse: <><rect x="4" y="8" width="16" height="11" rx="1" /><path d="M4 8l8-4 8 4" /><path d="M9 19v-6h6v6" /></>,
    lumberCamp: <><circle cx="8" cy="15" r="3.2" /><circle cx="16" cy="15" r="3.2" /><circle cx="12" cy="9" r="3.2" /></>,
    quarry: <><path d="M3 19l6-11 4 6 3-4 5 9z" /><path d="M9 8l2 3" /></>,
    hut: <><path d="M3 19l9-14 9 14z" /><path d="M12 19v-6" /></>,
    kitchen: <><path d="M5 11h14v3a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6z" /><path d="M9 7c0-1.5 1.5-1.5 1.5-3M13.5 7c0-1.5 1.5-1.5 1.5-3" /></>,
    well: <><ellipse cx="12" cy="15" rx="6.5" ry="3" /><path d="M5.5 15v3c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3v-3" /><path d="M7 12V5h10v7" /></>,
    watchtower: <><path d="M8 20l1-11h6l1 11" /><path d="M7 9h10V5H7z" /><path d="M12 5V2l3 1.2-3 1.2" /></>,
    market: <><path d="M4 9l2-4h12l2 4" /><path d="M4 9c0 1.5 1.2 2.5 2.7 2.5S9.3 10.5 9.3 9c0 1.5 1.2 2.5 2.7 2.5s2.7-1 2.7-2.5c0 1.5 1.2 2.5 2.7 2.5S20 10.5 20 9" /><path d="M6 12v8h12v-8" /></>,
    smithy: <><path d="M4 9h13c1.7 0 3 .8 3 2h-6c0 2-1 3-2.5 3.500V17h3v2.500h-9V17h3v-2.500C6 14 5 12 4 9z" /></>,
    hall: <><path d="M3 9l9-5 9 5z" /><path d="M5 9v9M9.5 9v9M14.5 9v9M19 9v9" /><path d="M3 19.500h18" /></>,
  };
  return <svg viewBox="0 0 24 24" className="h-[62%] w-[62%]" aria-hidden="true" {...common}>{shapes[id]}</svg>;
}

function TerrainMark({ terrain }: { terrain: Terrain }) {
  if (terrain === "plain") return null;
  const marks: Record<Exclude<Terrain, "plain">, ReactElement> = {
    fertile: <><circle cx="7" cy="8" r="1.2" /><circle cx="16" cy="7" r="1.2" /><circle cx="11" cy="14" r="1.2" /><circle cx="18" cy="16" r="1.2" /><circle cx="6" cy="18" r="1.2" /></>,
    forest: <><path d="M8 4l4 7H4z" /><path d="M16 9l4 7h-8z" /><path d="M8 11v3M16 16v3" strokeWidth="1.6" stroke="currentColor" /></>,
    rock: <path d="M4 18l3-8 4-3 5 2 4 9z" />,
    water: <><path d="M3 9c3-2.5 5 2.5 8 0s5-2.5 8 0" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M5 15c3-2.5 5 2.5 8 0s5-2.5 8 0" fill="none" stroke="currentColor" strokeWidth="1.8" /></>,
  };
  const tone: Record<Exclude<Terrain, "plain">, string> = { fertile: "text-[#9aa85a]", forest: "text-[#4f7d48]", rock: "text-[#7d786c]", water: "text-[#4a8fb3]" };
  return <svg viewBox="0 0 24 24" className={`absolute inset-0 m-auto h-[70%] w-[70%] ${tone[terrain]}`} fill="currentColor" aria-hidden="true">{marks[terrain]}</svg>;
}

function lineText(t: VillageCopy, line: ReportLine): string {
  const template = t.report[line.k];
  if (!template) return "";
  const res = t.res as Record<string, string>;
  let name = "";
  if (line.k === "weather") name = t.weather[line.id as keyof VillageCopy["weather"]]?.name ?? "";
  else if (line.k === "left") name = t.names[line.n ?? 0] ?? "";
  else if (line.id && res[line.id]) name = res[line.id];
  else if (line.id) name = t.building[line.id as BuildingId]?.name ?? "";
  const plain = line.k === "made" || line.k === "tax" || line.k === "idle" || line.k === "progress";
  return fill(template, { name, n: plain ? (line.n ?? 0) : signed(line.n ?? 0) });
}

export default function Village({ locale = "ko" }: { locale?: Locale }) {
  const t = VILLAGE_COPY[locale] ?? VILLAGE_COPY.en;
  // The first render must match the server's, so the real village (a saved one or a fresh seed) arrives in the effect.
  const [state, setState] = useState<VillageState>(() => createVillage(1));
  const [ready, setReady] = useState(false);
  const [best, setBest] = useState(0);
  const [picking, setPicking] = useState(false);
  const [placing, setPlacing] = useState<BuildingId | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
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
  const res = t.res as Record<string, string>;

  const effectText = (effect: Record<string, number | undefined> | undefined) => {
    if (!effect) return "";
    const parts: string[] = [];
    for (const [key, value] of Object.entries(effect)) {
      if (!value) continue;
      if (key === "harvest") parts.push(fill(t.outcome.harvest, { n: signed(Math.round((value - 1) * 100)) }));
      else parts.push(`${res[key] ?? key} ${signed(value)}`);
    }
    return parts.join(", ");
  };
  const costText = (cost: Cost) => (["wood", "stone", "gold"] as const).filter((key) => cost[key]).map((key) => `${res[key]} ${cost[key]}`).join(" · ");

  const order = (id: CommandId) => {
    setPlacing(null);
    if (id === "build" && !state.project) { setPicking(true); return; }
    setState(command(state, id));
  };
  const tapTile = (tile: number) => {
    if (placing) {
      if (!canCommand(state, "build", placing, tile)) return;
      setState(command(state, "build", placing, tile));
      setPlacing(null);
      setSelected(tile);
      return;
    }
    setSelected(selected === tile ? null : tile);
  };
  const restart = () => {
    if (!done && state.turn > 0 && !window.confirm(t.againConfirm)) return;
    setPicking(false); setPlacing(null); setSelected(null);
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
    setPicking(false); setPlacing(null); setSelected(null);
    setState(loaded);
    setCodeInput("");
    say(t.save.loaded);
  };

  const btn = "min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-left text-sm font-bold text-foreground transition active:translate-y-px disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  const stat = (label: string, value: string) => (
    <div className="rounded-xl border border-border bg-card px-1 py-1.5 text-center">
      <div className="text-sm font-black text-foreground sm:text-base">{value}</div>
      <div className="text-[10px] font-semibold text-muted-foreground">{label}</div>
    </div>
  );

  const selectedBuilding = selected !== null ? state.built[selected] : null;
  const selectedWorker = selected !== null ? villageWorkerAt(state, selected) : -1;
  const selectedOutput = selected !== null ? tileOutput(state, selected) : null;
  const projectTile = state.project?.tile ?? -1;

  return (
    <GameContainer title={t.title} subtitle={t.sub} resetLabel={t.again} onReset={restart}>
      <div className="mx-auto max-w-md" data-village-ready={ready ? "1" : "0"}>
        <p className="mb-3 rounded-xl bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">{t.trial}</p>

        <div className="mb-1 flex items-baseline justify-between gap-2">
          <p className="text-lg font-black text-foreground">
            {done ? t.overTitle : `${fill(t.date, { y: villageYear(state.turn), m: villageMonth(state.turn) })} · ${t.seasons[season]}`}
          </p>
          {!done ? <p className="text-xs font-semibold text-muted-foreground">{fill(t.progress, { n: state.turn + 1 })}</p> : null}
        </div>
        <ul className="mb-2 grid gap-1 text-xs">
          <li className="rounded-lg border border-border bg-card px-2 py-1"><strong className="font-black text-foreground">{t.villageTrait[state.trait].name}</strong> <span className="text-muted-foreground">· {t.villageTrait[state.trait].hint}</span></li>
          {!done ? <li className="rounded-lg border border-border bg-card px-2 py-1"><strong className="font-black text-foreground">{t.weather[state.weather].name}</strong> <span className="text-muted-foreground">· {t.weather[state.weather].hint}</span></li> : null}
        </ul>

        <div className="grid grid-cols-4 gap-1.5">
          {stat(t.res.food, `${state.food}/${cap}`)}
          {stat(t.res.wood, `${state.wood}/${cap}`)}
          {stat(t.res.stone, `${state.stone}/${cap}`)}
          {stat(t.res.gold, String(state.gold))}
          {stat(t.res.pop, `${villagePop(state)}/${villageHousing(state)}`)}
          {stat(t.res.fatigue, String(state.fatigue))}
          {stat(t.res.safety, String(villageSafety(state)))}
          {stat(t.res.ap, done ? "–" : `${state.ap}/${villageMaxAp(state)}`)}
        </div>

        <p className="mt-2 min-h-5 text-center text-xs font-bold text-primary" role="status" aria-live="polite">
          {notice || (placing ? fill(t.placeHint, { name: t.building[placing].name }) : state.last.map((line) => lineText(t, line)).filter(Boolean).join(" · "))}
        </p>

        <div className="mt-1 grid grid-cols-6 gap-1" role="grid" aria-label={t.title}>
          {state.terrain.map((terrain, tile) => {
            const building = state.built[tile];
            const isProject = tile === projectTile;
            const valid = placing !== null && canPlace(state, placing, tile);
            const staffed = villageWorkerAt(state, tile) >= 0;
            const needsWorker = building !== null && BUILDINGS[building].job && !staffed;
            const label = building ? t.building[building].name : isProject ? t.building[state.project!.id].name : t.terrain[terrain];
            return (
              <button
                key={tile}
                type="button"
                role="gridcell"
                aria-label={`${Math.floor(tile / 6) + 1},${(tile % 6) + 1} ${label}`}
                aria-pressed={selected === tile}
                onClick={() => tapTile(tile)}
                className={`relative flex aspect-square items-center justify-center rounded-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${TERRAIN_TONE[terrain]} ${selected === tile ? "ring-2 ring-primary" : ""} ${placing ? (valid ? "ring-2 ring-amber-400" : "opacity-45") : ""}`}
              >
                {!building && !isProject ? <TerrainMark terrain={terrain} /> : null}
                {building ? <BuildingIcon id={building} /> : null}
                {isProject ? <span className="absolute inset-1 rounded-md border-2 border-dashed border-foreground/60" aria-hidden="true" /> : null}
                {building && staffed ? <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-primary" aria-hidden="true" /> : null}
                {needsWorker ? <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border border-foreground/70 bg-background" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
        {state.project ? (
          <p className="mt-1.5 text-xs font-bold text-primary">{fill(t.project, { name: t.building[state.project.id].name, p: state.project.progress, n: BUILDINGS[state.project.id].need })}</p>
        ) : null}

        {selected !== null && !placing ? (
          <section className="mt-2 rounded-xl border border-border bg-card p-3" aria-label={t.tile.title}>
            <p className="text-sm font-black text-foreground">
              {selectedBuilding ? t.building[selectedBuilding].name : t.terrain[state.terrain[selected]]}
              {selectedOutput ? <span className="ml-2 text-xs font-bold text-primary">{res[selectedOutput.res]} ≈ {Math.round(selectedOutput.amount)}</span> : null}
            </p>
            <p className="text-xs text-muted-foreground">{selectedBuilding ? t.building[selectedBuilding].hint : t.tile.empty}</p>
            {selectedBuilding && BUILDINGS[selectedBuilding].job ? (
              <label className="mt-2 block text-xs font-bold text-foreground">
                {t.tile.worker}
                <select
                  className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-2 text-sm"
                  value={selectedWorker}
                  disabled={done}
                  onChange={(e) => {
                    const index = Number(e.target.value);
                    setState(index < 0 ? assignVillager(state, selectedWorker, -1) : assignVillager(state, index, selected));
                  }}
                >
                  <option value={-1}>{t.tile.none}</option>
                  {state.villagers.map((v, index) => (
                    <option key={index} value={index}>{t.names[v.n]} · {t.trait[v.t].name}{v.at >= 0 && v.at !== selected ? ` (${t.building[state.built[v.at]!].name})` : ""}</option>
                  ))}
                </select>
                {selectedWorker < 0 ? <span className="mt-1 block font-medium text-muted-foreground">{t.tile.noWorker}</span> : null}
              </label>
            ) : null}
          </section>
        ) : null}

        {done ? (
          <section className="mt-3 rounded-2xl border border-border bg-card p-4 text-center">
            <p className="text-sm font-semibold text-muted-foreground">{t.score}</p>
            <p className="text-4xl font-black text-primary">{villageScore(state)}</p>
            <p className="mt-1 text-lg font-black text-foreground">{t.grades[villageGrade(villageScore(state))]}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.best} {Math.max(best, villageScore(state))}</p>
            <button type="button" onClick={restart} className="mt-3 min-h-11 rounded-full bg-primary px-6 text-sm font-black text-primary-foreground">{t.again}</button>
          </section>
        ) : null}

        {waiting && state.event ? (
          <section className="mt-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3" aria-label={t.eventTitle}>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">{t.eventTitle}</p>
            <p className="mt-0.5 text-base font-black text-amber-950">{t.events[state.event].title}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-amber-900">{t.events[state.event].text}</p>
            <div className="mt-2 grid gap-1.5">
              {Array.from({ length: eventChoiceCount(state.event) }, (_, choice) => {
                const info = eventChoiceInfo(state, state.event!, choice);
                const rule = info.odds !== undefined ? fill(t.outcome.odds, { n: Math.round(info.odds * 100) }) : info.safe !== undefined ? fill(t.outcome.safe, { n: info.safe }) : "";
                const good = effectText(info.good);
                const bad = info.bad ? `${t.outcome.otherwise}: ${effectText(info.bad)}` : "";
                const detail = [rule, good, bad].filter(Boolean).join(" · ");
                return (
                  <button key={choice} type="button" disabled={!canChoose(state, choice)} onClick={() => setState(chooseEvent(state, choice))} className={`${btn} border-amber-300`}>
                    <span className="block">{t.events[state.event!].choices[choice]}</span>
                    {detail ? <span className="block text-xs font-medium text-muted-foreground">{detail}</span> : null}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {!done ? (
          <section className="mt-3">
            <h4 className="mb-1.5 text-xs font-black uppercase tracking-widest text-muted-foreground">{t.commandsTitle}</h4>
            {placing ? (
              <button type="button" onClick={() => setPlacing(null)} className={`${btn} w-full text-center`}>{t.cancel}</button>
            ) : picking && !state.project ? (
              <div className="grid gap-1.5 rounded-2xl border border-border bg-muted p-2">
                <p className="text-sm font-black text-foreground">{t.buildTitle}</p>
                {BUILDING_IDS.map((id) => {
                  const near = BUILDINGS[id].near;
                  return (
                    <button key={id} type="button" disabled={!state.eventDone || state.ap <= 0 || !canBuild(state, id)} onClick={() => { setPicking(false); setSelected(null); setPlacing(id); }} className={btn}>
                      <span className="flex items-baseline justify-between gap-2">
                        <span>{t.building[id].name} <span className="text-xs font-semibold text-muted-foreground">{villageCount(state, id)}/{BUILDINGS[id].max}</span></span>
                        <span className="text-xs font-semibold text-muted-foreground">{costText(BUILDINGS[id].cost)}</span>
                      </span>
                      <span className="block text-xs font-medium text-muted-foreground">{t.building[id].hint}{near ? ` · ${near === "forest" ? t.nearForest : t.nearRock}` : ""}</span>
                    </button>
                  );
                })}
                <button type="button" onClick={() => setPicking(false)} className={`${btn} text-center`}>{t.cancel}</button>
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
                <button type="button" disabled={waiting} onClick={() => { setPicking(false); setState(endMonth(state)); }} className="col-span-2 min-h-11 rounded-xl bg-primary px-3 py-2 text-sm font-black text-primary-foreground disabled:opacity-40">
                  {t.endMonth}
                </button>
              </div>
            )}
            {waiting ? <p className="mt-1.5 text-xs text-muted-foreground">{t.needEvent}</p> : null}
          </section>
        ) : null}

        <section className="mt-4">
          <h4 className="mb-1 text-xs font-black uppercase tracking-widest text-muted-foreground">{t.peopleTitle} {villagePop(state)}/{villageHousing(state)}</h4>
          <ul className="grid gap-1 text-sm">
            {state.villagers.map((v, index) => (
              <li key={index} className="flex items-baseline justify-between gap-2 rounded-lg border border-border bg-card px-2 py-1">
                <span><strong className="font-black text-foreground">{t.names[v.n]}</strong> <span className="text-xs text-muted-foreground">{t.trait[v.t].name} · {t.trait[v.t].hint}</span></span>
                <span className={`shrink-0 text-xs font-bold ${v.at >= 0 ? "text-primary" : "text-muted-foreground"}`}>{v.at >= 0 ? t.building[state.built[v.at]!].name : t.idle}</span>
              </li>
            ))}
          </ul>
          {!done && state.villagers.some((v) => v.at < 0) ? (
            <button type="button" onClick={() => setState(autoAssign(state))} className={`${btn} mt-1.5 w-full text-center`}>{t.auto}</button>
          ) : null}
        </section>

        <section className="mt-4">
          <h4 className="mb-1 text-xs font-black uppercase tracking-widest text-muted-foreground">{t.reportTitle}</h4>
          {state.report.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t.reportEmpty}</p>
          ) : (
            <ul className="grid gap-0.5 text-sm text-foreground">
              {state.report.map((line, index) => <li key={`${line.k}-${index}`}>{lineText(t, line)}</li>)}
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

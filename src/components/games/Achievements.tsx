import React, { useEffect, useState } from "react";
import { buildAchievementSnapshot, evaluateAchievements, type AchievementCategory, type EvaluatedAchievement } from "../../lib/games/achievements";
import { dayIndex } from "../../lib/games/daily";
import { getAllBestAchievedAt, getAllBests, getAllConditionalBests, getAllLastPlayed, type BestRecord } from "../../lib/games/records";
import { gameDisplayName } from "../../lib/games/display-names";
import { Button } from "../ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "../ui/item";
import { Skeleton } from "../ui/skeleton";

type UILocale = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const CATEGORY_ORDER: AchievementCategory[] = ["milestone", "streak", "collection", "record"];

const CATEGORY_LABEL: Record<UILocale, Record<AchievementCategory, string>> = {
  ko: { milestone: "이정표", streak: "연속 기록", collection: "수집", record: "기록" },
  en: { milestone: "Milestones", streak: "Streaks", collection: "Collection", record: "Records" },
  ja: { milestone: "マイルストーン", streak: "連続記録", collection: "コレクション", record: "記録" },
  zh: { milestone: "里程碑", streak: "连续记录", collection: "收集", record: "纪录" },
  fr: { milestone: "Étapes", streak: "Séries", collection: "Collection", record: "Records" },
  es: { milestone: "Hitos", streak: "Rachas", collection: "Colección", record: "Récords" },
};

const ACHIEVEMENT_COPY: Record<string, Record<UILocale, { title: string; desc: string }>> = {
  "first-steps": {
    ko: { title: "첫 발걸음", desc: "아무 게임이나 1판을 끝까지 플레이하세요." },
    en: { title: "First Steps", desc: "Finish 1 game of any kind." },
    ja: { title: "はじめの一歩", desc: "どれか1つのゲームを1回プレイしましょう。" },
    zh: { title: "第一步", desc: "完成任意1局游戏。" },
    fr: { title: "Premiers pas", desc: "Terminez 1 partie, quel que soit le jeu." },
    es: { title: "Primeros pasos", desc: "Termina 1 partida de cualquier juego." },
  },
  "first-win": {
    ko: { title: "첫 승리", desc: "아무 게임에서나 1승을 거두세요." },
    en: { title: "First Win", desc: "Win 1 game of any kind." },
    ja: { title: "初勝利", desc: "どれか1つのゲームで勝利しましょう。" },
    zh: { title: "首胜", desc: "在任意游戏中赢得1场胜利。" },
    fr: { title: "Première victoire", desc: "Remportez 1 partie, quel que soit le jeu." },
    es: { title: "Primera victoria", desc: "Gana 1 partida de cualquier juego." },
  },
  veteran: {
    ko: { title: "베테랑", desc: "누적 50판을 플레이하세요." },
    en: { title: "Veteran", desc: "Play 50 games in total." },
    ja: { title: "ベテラン", desc: "合計50回プレイしましょう。" },
    zh: { title: "老兵", desc: "累计游玩50局。" },
    fr: { title: "Vétéran", desc: "Jouez 50 parties au total." },
    es: { title: "Veterano", desc: "Juega 50 partidas en total." },
  },
  centurion: {
    ko: { title: "백전노장", desc: "누적 100판을 플레이하세요." },
    en: { title: "Centurion", desc: "Play 100 games in total." },
    ja: { title: "百戦錬磨", desc: "合計100回プレイしましょう。" },
    zh: { title: "百战老将", desc: "累计游玩100局。" },
    fr: { title: "Centurion", desc: "Jouez 100 parties au total." },
    es: { title: "Centurión", desc: "Juega 100 partidas en total." },
  },
  grandmaster: {
    ko: { title: "그랜드마스터", desc: "누적 25승을 거두세요." },
    en: { title: "Grandmaster", desc: "Win 25 games in total." },
    ja: { title: "グランドマスター", desc: "合計25勝しましょう。" },
    zh: { title: "特级大师", desc: "累计赢得25场胜利。" },
    fr: { title: "Grand maître", desc: "Remportez 25 victoires au total." },
    es: { title: "Gran maestro", desc: "Gana 25 partidas en total." },
  },
  "streak-3": {
    ko: { title: "3일 연속", desc: "데일리 챌린지를 3일 연속 성공하세요." },
    en: { title: "3-Day Streak", desc: "Solve a Daily Challenge 3 days in a row." },
    ja: { title: "3日連続", desc: "デイリー挑戦を3日連続でクリアしましょう。" },
    zh: { title: "连续3天", desc: "连续3天完成每日挑战。" },
    fr: { title: "Série de 3 jours", desc: "Réussissez un défi du jour 3 jours de suite." },
    es: { title: "Racha de 3 días", desc: "Resuelve un reto diario 3 días seguidos." },
  },
  "streak-7": {
    ko: { title: "일주일 연속", desc: "데일리 챌린지를 7일 연속 성공하세요." },
    en: { title: "7-Day Streak", desc: "Solve a Daily Challenge 7 days in a row." },
    ja: { title: "1週間連続", desc: "デイリー挑戦を7日連続でクリアしましょう。" },
    zh: { title: "连续7天", desc: "连续7天完成每日挑战。" },
    fr: { title: "Série de 7 jours", desc: "Réussissez un défi du jour 7 jours de suite." },
    es: { title: "Racha de 7 días", desc: "Resuelve un reto diario 7 días seguidos." },
  },
  "streak-30": {
    ko: { title: "한 달 연속", desc: "데일리 챌린지를 30일 연속 성공하세요." },
    en: { title: "30-Day Streak", desc: "Solve a Daily Challenge 30 days in a row." },
    ja: { title: "1ヶ月連続", desc: "デイリー挑戦を30日連続でクリアしましょう。" },
    zh: { title: "连续30天", desc: "连续30天完成每日挑战。" },
    fr: { title: "Série de 30 jours", desc: "Réussissez un défi du jour 30 jours de suite." },
    es: { title: "Racha de 30 días", desc: "Resuelve un reto diario 30 días seguidos." },
  },
  "win-streak-5": {
    ko: { title: "5연승", desc: "한 게임에서 5연승을 거두세요." },
    en: { title: "5-Win Streak", desc: "Win 5 rounds in a row in one game." },
    ja: { title: "5連勝", desc: "1つのゲームで5連勝しましょう。" },
    zh: { title: "5连胜", desc: "在一个游戏中连胜5局。" },
    fr: { title: "Série de 5 victoires", desc: "Remportez 5 manches d'affilée dans un jeu." },
    es: { title: "Racha de 5 victorias", desc: "Gana 5 rondas seguidas en un juego." },
  },
  "win-streak-10": {
    ko: { title: "10연승", desc: "한 게임에서 10연승을 거두세요." },
    en: { title: "10-Win Streak", desc: "Win 10 rounds in a row in one game." },
    ja: { title: "10連勝", desc: "1つのゲームで10連勝しましょう。" },
    zh: { title: "10连胜", desc: "在一个游戏中连胜10局。" },
    fr: { title: "Série de 10 victoires", desc: "Remportez 10 manches d'affilée dans un jeu." },
    es: { title: "Racha de 10 victorias", desc: "Gana 10 rondas seguidas en un juego." },
  },
  explorer: {
    ko: { title: "탐험가", desc: "서로 다른 5개 게임을 플레이하세요." },
    en: { title: "Explorer", desc: "Play 5 different games." },
    ja: { title: "探検家", desc: "異なる5つのゲームをプレイしましょう。" },
    zh: { title: "探索者", desc: "游玩5款不同的游戏。" },
    fr: { title: "Explorateur", desc: "Jouez à 5 jeux différents." },
    es: { title: "Explorador", desc: "Juega 5 juegos diferentes." },
  },
  completionist: {
    ko: { title: "완주자", desc: "서로 다른 15개 게임을 플레이하세요." },
    en: { title: "Completionist", desc: "Play 15 different games." },
    ja: { title: "コンプリート", desc: "異なる15のゲームをプレイしましょう。" },
    zh: { title: "全能玩家", desc: "游玩15款不同的游戏。" },
    fr: { title: "Complétiste", desc: "Jouez à 15 jeux différents." },
    es: { title: "Completista", desc: "Juega 15 juegos diferentes." },
  },
  "arcade-atlas": {
    ko: { title: "아케이드 지도", desc: "서로 다른 40개 게임을 열어 보세요." },
    en: { title: "Arcade Atlas", desc: "Open 40 different games." },
    ja: { title: "アーケード地図", desc: "異なる40のゲームを開きましょう。" },
    zh: { title: "街机地图", desc: "打开40款不同的游戏。" },
    fr: { title: "Atlas de l'arcade", desc: "Ouvrez 40 jeux différents." },
    es: { title: "Atlas del arcade", desc: "Abre 40 juegos distintos." },
  },
  "record-holder": {
    ko: { title: "기록 보유자", desc: "어떤 게임에서든 최고 기록을 세우세요." },
    en: { title: "Record Holder", desc: "Set a personal best in any game." },
    ja: { title: "記録保持者", desc: "どれかのゲームで自己ベストを記録しましょう。" },
    zh: { title: "纪录保持者", desc: "在任意游戏中创造个人最佳纪录。" },
    fr: { title: "Détenteur de record", desc: "Établissez un record personnel dans un jeu." },
    es: { title: "Poseedor de récord", desc: "Establece tu mejor marca personal en un juego." },
  },
};

const COPY: Record<UILocale, { title: string; subtitle: string; unlocked: string; emptyTitle: string; empty: string; browseGames: string; loading: string; myRecords: string; bestLabel: string; recentLabel: string; today: string; yesterday: string; daysAgo: (n: number) => string; noRecords: string; noRecent: string }> = {
  ko: { title: "🏆 업적", subtitle: "이 브라우저에서 플레이한 기록을 바탕으로 잠금 해제됩니다", unlocked: "개 달성", emptyTitle: "첫 게임을 시작해 보세요", empty: "아직 아무 게임도 플레이하지 않았습니다. 게임을 플레이하면 여기에 진행 상황이 쌓입니다.", browseGames: "게임 둘러보기", loading: "업적 불러오는 중", myRecords: "내 기록", bestLabel: "최고 기록", recentLabel: "최근 플레이", today: "오늘", yesterday: "어제", daysAgo: (n) => `${n}일 전`, noRecords: "아직 최고 기록이 없습니다.", noRecent: "아직 플레이 기록이 없습니다." },
  en: { title: "🏆 Achievements", subtitle: "Unlocked from your play history in this browser", unlocked: "unlocked", emptyTitle: "Start your first game", empty: "No games played yet. Play any game and your progress will show up here.", browseGames: "Browse games", loading: "Loading achievements", myRecords: "My Records", bestLabel: "Personal Bests", recentLabel: "Recently Played", today: "Today", yesterday: "Yesterday", daysAgo: (n) => `${n}d ago`, noRecords: "No personal bests yet.", noRecent: "No recent activity yet." },
  ja: { title: "🏆 実績", subtitle: "このブラウザでのプレイ履歴に基づいて解除されます", unlocked: "個達成", emptyTitle: "最初のゲームを始めましょう", empty: "まだ何もプレイしていません。ゲームをプレイすると進捗がここに表示されます。", browseGames: "ゲームを見る", loading: "実績を読み込み中", myRecords: "自分の記録", bestLabel: "自己ベスト", recentLabel: "最近プレイ", today: "今日", yesterday: "昨日", daysAgo: (n) => `${n}日前`, noRecords: "まだ自己ベストはありません。", noRecent: "まだプレイ履歴がありません。" },
  zh: { title: "🏆 成就", subtitle: "根据你在此浏览器中的游玩记录解锁", unlocked: "个已达成", emptyTitle: "开始你的第一局游戏", empty: "还没有玩过任何游戏。开始游玩后，进度会显示在这里。", browseGames: "浏览游戏", loading: "正在加载成就", myRecords: "我的记录", bestLabel: "个人最佳", recentLabel: "最近游玩", today: "今天", yesterday: "昨天", daysAgo: (n) => `${n}天前`, noRecords: "还没有个人最佳纪录。", noRecent: "还没有游玩记录。" },
  fr: { title: "🏆 Succès", subtitle: "Débloqués à partir de votre historique de jeu dans ce navigateur", unlocked: "débloqués", emptyTitle: "Lancez votre première partie", empty: "Aucune partie jouée pour l'instant. Jouez à un jeu et votre progression apparaîtra ici.", browseGames: "Voir les jeux", loading: "Chargement des succès", myRecords: "Mes records", bestLabel: "Meilleurs scores", recentLabel: "Joués récemment", today: "Aujourd'hui", yesterday: "Hier", daysAgo: (n) => `il y a ${n} j`, noRecords: "Aucun record personnel pour l'instant.", noRecent: "Aucune activité récente." },
  es: { title: "🏆 Logros", subtitle: "Se desbloquean según tu historial de juego en este navegador", unlocked: "desbloqueados", emptyTitle: "Empieza tu primera partida", empty: "Aún no has jugado ninguna partida. Juega algo y tu progreso aparecerá aquí.", browseGames: "Ver juegos", loading: "Cargando logros", myRecords: "Mis récords", bestLabel: "Mejores marcas", recentLabel: "Jugado recientemente", today: "Hoy", yesterday: "Ayer", daysAgo: (n) => `hace ${n} d`, noRecords: "Aún no hay mejores marcas.", noRecent: "Aún no hay actividad reciente." },
};

function formatBest(record: BestRecord): string {
  if (record.unit === "seconds") return `${record.value}s`;
  return String(record.value);
}

function relativeDay(iso: string, t: (typeof COPY)[UILocale]): string {
  const diff = dayIndex(new Date()) - dayIndex(new Date(iso));
  if (diff <= 0) return t.today;
  if (diff === 1) return t.yesterday;
  return t.daysAgo(diff);
}

export function cohortTag(seed: string): string {
  const daily = seed.match(/^daily-(\d{4}-\d{2}-\d{2})$/);
  if (daily) return daily[1];
  if (seed === "classic-demo-v1") return "v1";
  return `#${seed.slice(-6)}`;
}

export function buildBestEntries(
  bests: Record<string, BestRecord>,
  bestAchievedAt: Record<string, string>,
  conditionalBests: ReturnType<typeof getAllConditionalBests>,
) {
  return [
    ...Object.entries(bests).map(([id, record]) => ({ key: `general:${id}`, game: id, record, achievedAt: bestAchievedAt[id] ?? null, cohort: null as string | null })),
    ...conditionalBests.map(({ key, game, record, achievedAt }) => ({ key: `conditional:${key}`, game, record, achievedAt, cohort: cohortTag(record.conditions.seed) })),
  ].sort((a, b) => {
    const ta = a.achievedAt, tb = b.achievedAt;
    if (ta && tb) return tb.localeCompare(ta);
    if (ta) return -1;
    if (tb) return 1;
    return a.key.localeCompare(b.key);
  }).slice(0, 10);
}

const Achievements: React.FC<{ locale?: UILocale }> = ({ locale = "ko" }) => {
  const t = COPY[locale] ?? COPY.en;
  const catLabel = CATEGORY_LABEL[locale] ?? CATEGORY_LABEL.en;
  const [dashboard, setDashboard] = useState<{
    evaluated: EvaluatedAchievement[];
    bests: Record<string, BestRecord>;
    conditionalBests: ReturnType<typeof getAllConditionalBests>;
    bestAchievedAt: Record<string, string>;
    recentlyPlayed: { id: string; at: string }[];
  } | null>(null);

  useEffect(() => {
    const lastPlayed = getAllLastPlayed();
    setDashboard({
      evaluated: evaluateAchievements(buildAchievementSnapshot()),
      bests: getAllBests(),
      conditionalBests: getAllConditionalBests(),
      bestAchievedAt: getAllBestAchievedAt(),
      recentlyPlayed: Object.entries(lastPlayed)
        .map(([id, at]) => ({ id, at }))
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 5),
    });
  }, []);

  if (!dashboard) return (
    <div className="not-prose mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6" aria-label={t.loading} aria-busy="true">
      <Skeleton className="mx-auto h-4 w-full max-w-48" />
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-36 w-full rounded-xl" />
    </div>
  );
  const { evaluated, bests, conditionalBests, bestAchievedAt, recentlyPlayed } = dashboard;

  const unlockedCount = evaluated.filter((a) => a.unlocked).length;
  const hasAnyProgress = evaluated.some((a) => a.progress > 0);
  const bestEntries = buildBestEntries(bests, bestAchievedAt, conditionalBests);

  return (
    <div className="not-prose flex flex-col gap-6 py-6 px-4 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-black">{t.title}</h1>
        <p className="mt-1 text-xs font-bold text-muted-foreground">{t.subtitle}</p>
        <p className="mt-3 text-3xl font-black text-primary">{unlockedCount}<span className="text-base text-muted-foreground"> / {evaluated.length} {t.unlocked}</span></p>
      </div>

      {!hasAnyProgress && (
        <Empty>
          <EmptyMedia aria-hidden="true">🎮</EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>{t.emptyTitle}</EmptyTitle>
            <EmptyDescription>{t.empty}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild className="min-h-11 px-5">
              <a href={`/${locale}/`}>{t.browseGames}</a>
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {hasAnyProgress && (
        <div>
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t.myRecords}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border p-3">
              <p className="mb-2 text-xs font-black text-foreground">{t.bestLabel}</p>
              {bestEntries.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">{t.noRecords}</p>
              ) : (
                <ItemGroup>
                  {bestEntries.map(({ key, game, record, cohort }) => (
                    <Item key={key} role="listitem" size="sm" variant="muted">
                      <ItemContent><ItemTitle className="truncate text-xs text-muted-foreground">{gameDisplayName(game, locale)}{cohort ? ` · ${cohort}` : ""}</ItemTitle></ItemContent>
                      <ItemActions className="text-xs font-black tabular-nums">{formatBest(record)}</ItemActions>
                    </Item>
                  ))}
                </ItemGroup>
              )}
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="mb-2 text-xs font-black text-foreground">{t.recentLabel}</p>
              {recentlyPlayed.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">{t.noRecent}</p>
              ) : (
                <ItemGroup>
                  {recentlyPlayed.map(({ id, at }) => (
                    <Item key={id} role="listitem" size="sm" variant="muted">
                      <ItemContent><ItemTitle className="truncate text-xs text-muted-foreground">{gameDisplayName(id, locale)}</ItemTitle></ItemContent>
                      <ItemActions className="text-xs font-bold text-muted-foreground">{relativeDay(at, t)}</ItemActions>
                    </Item>
                  ))}
                </ItemGroup>
              )}
            </div>
          </div>
        </div>
      )}

      {CATEGORY_ORDER.map((category) => {
        const items = evaluated.filter((a) => a.category === category);
        return (
          <div key={category}>
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{catLabel[category]}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {items.map((a) => {
                const copy = ACHIEVEMENT_COPY[a.id]?.[locale] ?? ACHIEVEMENT_COPY[a.id]?.en;
                const pct = a.target > 0 ? Math.round((a.progress / a.target) * 100) : 0;
                return (
                  <Item key={a.id} role="listitem" variant="outline" className={a.unlocked ? "border-primary/40 bg-primary/5" : undefined}>
                    <ItemMedia className={`text-2xl ${a.unlocked ? "" : "opacity-30 grayscale"}`} aria-hidden="true">{a.icon}</ItemMedia>
                    <ItemContent>
                      <ItemTitle className={a.unlocked ? "text-foreground" : "text-muted-foreground"}>{copy?.title}</ItemTitle>
                      <ItemDescription>{copy?.desc}</ItemDescription>
                      {!a.unlocked && (
                        <div
                          className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden"
                          role="progressbar"
                          aria-label={`${copy?.title}: ${a.progress} / ${a.target}`}
                          aria-valuemin={0}
                          aria-valuemax={a.target}
                          aria-valuenow={a.progress}
                        >
                          <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </ItemContent>
                  </Item>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Achievements;

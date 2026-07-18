import React, { useEffect, useState } from "react";
import { buildAchievementSnapshot, evaluateAchievements, type AchievementCategory, type EvaluatedAchievement } from "../../lib/games/achievements";

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
  "record-holder": {
    ko: { title: "기록 보유자", desc: "어떤 게임에서든 최고 기록을 세우세요." },
    en: { title: "Record Holder", desc: "Set a personal best in any game." },
    ja: { title: "記録保持者", desc: "どれかのゲームで自己ベストを記録しましょう。" },
    zh: { title: "纪录保持者", desc: "在任意游戏中创造个人最佳纪录。" },
    fr: { title: "Détenteur de record", desc: "Établissez un record personnel dans un jeu." },
    es: { title: "Poseedor de récord", desc: "Establece tu mejor marca personal en un juego." },
  },
};

const COPY: Record<UILocale, { title: string; subtitle: string; unlocked: string; empty: string }> = {
  ko: { title: "🏆 업적", subtitle: "이 브라우저에서 플레이한 기록을 바탕으로 잠금 해제됩니다", unlocked: "개 달성", empty: "아직 아무 게임도 플레이하지 않았습니다. 게임을 플레이하면 여기에 진행 상황이 쌓입니다." },
  en: { title: "🏆 Achievements", subtitle: "Unlocked from your play history in this browser", unlocked: "unlocked", empty: "No games played yet. Play any game and your progress will show up here." },
  ja: { title: "🏆 実績", subtitle: "このブラウザでのプレイ履歴に基づいて解除されます", unlocked: "個達成", empty: "まだ何もプレイしていません。ゲームをプレイすると進捗がここに表示されます。" },
  zh: { title: "🏆 成就", subtitle: "根据你在此浏览器中的游玩记录解锁", unlocked: "个已达成", empty: "还没有玩过任何游戏。开始游玩后，进度会显示在这里。" },
  fr: { title: "🏆 Succès", subtitle: "Débloqués à partir de votre historique de jeu dans ce navigateur", unlocked: "débloqués", empty: "Aucune partie jouée pour l'instant. Jouez à un jeu et votre progression apparaîtra ici." },
  es: { title: "🏆 Logros", subtitle: "Se desbloquean según tu historial de juego en este navegador", unlocked: "desbloqueados", empty: "Aún no has jugado ninguna partida. Juega algo y tu progreso aparecerá aquí." },
};

const Achievements: React.FC<{ locale?: UILocale }> = ({ locale = "ko" }) => {
  const t = COPY[locale] ?? COPY.en;
  const catLabel = CATEGORY_LABEL[locale] ?? CATEGORY_LABEL.en;
  const [evaluated, setEvaluated] = useState<EvaluatedAchievement[] | null>(null);

  useEffect(() => {
    setEvaluated(evaluateAchievements(buildAchievementSnapshot()));
  }, []);

  if (!evaluated) return null;

  const unlockedCount = evaluated.filter((a) => a.unlocked).length;
  const hasAnyProgress = evaluated.some((a) => a.progress > 0);

  return (
    <div className="not-prose flex flex-col gap-6 py-6 px-4 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-black">{t.title}</h1>
        <p className="mt-1 text-xs font-bold text-muted-foreground">{t.subtitle}</p>
        <p className="mt-3 text-3xl font-black text-primary">{unlockedCount}<span className="text-base text-muted-foreground"> / {evaluated.length} {t.unlocked}</span></p>
      </div>

      {!hasAnyProgress && (
        <p className="text-center text-sm text-muted-foreground">{t.empty}</p>
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
                  <div key={a.id} className={`rounded-xl border p-3 flex gap-3 items-start ${a.unlocked ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                    <span className={`text-2xl ${a.unlocked ? "" : "opacity-30 grayscale"}`} aria-hidden="true">{a.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-black ${a.unlocked ? "text-foreground" : "text-muted-foreground"}`}>{copy?.title}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">{copy?.desc}</p>
                      {!a.unlocked && (
                        <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
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

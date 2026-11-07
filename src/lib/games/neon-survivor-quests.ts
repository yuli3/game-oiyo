import type { Locale } from '../i18n';

export interface Quest {
  id: string;
  icon: string;
  title: Record<Locale, string>;
  desc: Record<Locale, string>;
  target: number;
  progress: number;
  rewardCrystals: number;
  completed: boolean;
  claimed: boolean;
}

export function createInitialQuests(): Quest[] {
  return [
    {
      id: 'scout_hunter',
      icon: '🎯',
      title: {
        ko: '드론 헌터',
        en: 'Drone Hunter',
        ja: 'ドローンハンター',
        zh: '无人机猎手',
        fr: 'Chasseur de drones',
        es: 'Cazador de drones',
      },
      desc: {
        ko: '폭주 드론 40기 격추',
        en: 'Destroy 40 hostile drones',
        ja: '暴走ドローンを40体撃破',
        zh: '击落40架失控无人机',
        fr: 'Détruisez 40 drones hostiles',
        es: 'Destruye 40 drones hostiles',
      },
      target: 40,
      progress: 0,
      rewardCrystals: 25,
      completed: false,
      claimed: false,
    },
    {
      id: 'survive_time',
      icon: '⏱️',
      title: {
        ko: '생존 작전',
        en: 'Survival Protocol',
        ja: '生存プロトコル',
        zh: '生存行动',
        fr: 'Protocole de survie',
        es: 'Protocolo de supervivencia',
      },
      desc: {
        ko: '전장에서 120초간 생존',
        en: 'Survive in the sector for 120 seconds',
        ja: '戦場で120秒間生き残る',
        zh: '在扇区战场中坚持生存120秒',
        fr: 'Survivez dans le secteur pendant 120 s',
        es: 'Sobrevive en el sector durante 120 s',
      },
      target: 120,
      progress: 0,
      rewardCrystals: 40,
      completed: false,
      claimed: false,
    },
    {
      id: 'weapon_evolution',
      icon: '👑',
      title: {
        ko: '초월 진화',
        en: 'Transcendent Evolution',
        ja: '超越進化',
        zh: '超绝终极进化',
        fr: 'Évolution Transcendante',
        es: 'Evolución Trascendente',
      },
      desc: {
        ko: '초진화 무기 1종 해금',
        en: 'Unlock 1 evolved weapon',
        ja: '超進化武器を1つアンロック',
        zh: '解锁1种终极进化武器',
        fr: 'Débloquez 1 arme évoluée',
        es: 'Desbloquea 1 arma evolucionada',
      },
      target: 1,
      progress: 0,
      rewardCrystals: 60,
      completed: false,
      claimed: false,
    },
    {
      id: 'boss_slayer',
      icon: '🏆',
      title: {
        ko: '기함 침몰',
        en: 'Flagship Down',
        ja: '旗艦撃沈',
        zh: '旗舰击沉',
        fr: 'Vaisseau amiral détruit',
        es: 'Buque insignia destruido',
      },
      desc: {
        ko: '보스 네온 드레드노트 격파',
        en: 'Defeat the Neon Dreadnought',
        ja: 'ボス「ネオンドレッドノート」を撃破',
        zh: '击破首领级霓虹无畏舰',
        fr: 'Détruisez le cuirassé Neon Dreadnought',
        es: 'Derrota al acorazado Neon Dreadnought',
      },
      target: 1,
      progress: 0,
      rewardCrystals: 100,
      completed: false,
      claimed: false,
    },
  ];
}

export function updateQuestsOnKill(quests: Quest[], count: number = 1): Quest[] {
  return quests.map((q) => {
    if (q.id === 'scout_hunter' && !q.completed) {
      const nextProgress = Math.min(q.target, q.progress + count);
      return {
        ...q,
        progress: nextProgress,
        completed: nextProgress >= q.target,
      };
    }
    return q;
  });
}

export function updateQuestsOnTime(quests: Quest[], survivalTime: number): Quest[] {
  return quests.map((q) => {
    if (q.id === 'survive_time' && !q.completed) {
      const nextProgress = Math.min(q.target, Math.floor(survivalTime));
      return {
        ...q,
        progress: nextProgress,
        completed: nextProgress >= q.target,
      };
    }
    return q;
  });
}

export function updateQuestsOnEvolution(quests: Quest[]): Quest[] {
  return quests.map((q) => {
    if (q.id === 'weapon_evolution' && !q.completed) {
      return {
        ...q,
        progress: 1,
        completed: true,
      };
    }
    return q;
  });
}

export function updateQuestsOnBossDefeat(quests: Quest[]): Quest[] {
  return quests.map((q) => {
    if (q.id === 'boss_slayer' && !q.completed) {
      return {
        ...q,
        progress: 1,
        completed: true,
      };
    }
    return q;
  });
}

import type { Locale } from '../i18n';

export interface LoreEntry {
  id: string;
  triggerTime: number; // in seconds
  sender: Record<Locale, string>;
  message: Record<Locale, string>;
  type: 'info' | 'warning' | 'alert' | 'critical';
}

export const SECTOR_ZERO_LORE: LoreEntry[] = [
  {
    id: 'intro_transmission',
    triggerTime: 1,
    sender: {
      ko: '오퍼레이터 아이리스',
      en: 'Operator Iris',
      ja: 'オペレーター・アイリス',
      zh: '指挥官 艾丽斯',
      fr: 'Opératrice Iris',
      es: 'Operadora Iris',
    },
    message: {
      ko: '네온 시티 섹터 0 진입 확인. 중앙 AI 코어가 폭주했습니다. 드론 포위망을 돌파하십시오.',
      en: 'Sector 0 reached. Central AI core is rogue. Break through the drone swarm.',
      ja: 'セクター0到達を確認。中央AIが暴走状態です。ドローンの包囲網を突破してください。',
      zh: '已确认进入0号扇区。中央AI核心暴走，请立即突围无人机包围网。',
      fr: 'Entrée dans le Secteur 0 confirmée. L’IA centrale est corrompue. Percée immédiate.',
      es: 'Llegada al Sector 0 confirmada. La IA central ha enloquecido. Rompan el cerco.',
    },
    type: 'info',
  },
  {
    id: 'swarm_density_up',
    triggerTime: 30,
    sender: {
      ko: '방어 시스템 경보',
      en: 'Defense System Alert',
      ja: '防衛システム警報',
      zh: '防御系统警报',
      fr: 'Alerte Système de Défense',
      es: 'Alerta del Sistema de Defensa',
    },
    message: {
      ko: '스워머 드론 고밀도 편대 접근! 에너지 쉴드 또는 광역 블래스터를 전개하십시오.',
      en: 'High-density Swarmer formation incoming! Deploy orbital shields or wide salvos.',
      ja: '高密度スウォーマー編隊が接近！エネルギーシールドか広域兵器を展開してください。',
      zh: '高密度群袭无人机正在逼近！请展开轨道护盾或大范围武器。',
      fr: 'Formation Swarmer haute densité détectée ! Déployez vos boucliers orbitaux.',
      es: '¡Formación de enjambres de alta densidad entrante! Desplieguen escudos orbitales.',
    },
    type: 'warning',
  },
  {
    id: 'boss_dreadnought',
    triggerTime: 60,
    sender: {
      ko: '위협 경고: 함급 식별',
      en: 'Threat Alert: Capital Ship',
      ja: '脅威警報：旗艦級識別',
      zh: '威胁警报：重型旗舰',
      fr: 'Alerte Menace : Cuirassé',
      es: 'Alerta de Amenaza: Acorazado',
    },
    message: {
      ko: '경고! 기함급 『네온 드레드노트』 출현! 중장갑과 강력한 충돌 궤도에 주의하십시오.',
      en: 'Warning! Capital ship "Neon Dreadnought" engaged! Beware heavy armor and ramming thrusts.',
      ja: '警告！旗艦級「ネオンドレッドノート」出現！重装甲と突進軌道に警戒してください。',
      zh: '警告！重型旗舰『霓虹无畏舰』现身！请小心其重装甲与冲撞轨道。',
      fr: 'Alerte ! Cuirassé "Neon Dreadnought" engagé ! Attention au blindage lourd.',
      es: '¡Alerta! ¡El acorazado "Neon Dreadnought" ha entrado en combate! Cuidado con su blindaje.',
    },
    type: 'alert',
  },
  {
    id: 'boss_void_titan',
    triggerTime: 180,
    sender: {
      ko: '특이점 붕괴 경보',
      en: 'Singularity Collapse Alert',
      ja: '特異点崩壊警報',
      zh: '引力奇点坍缩警报',
      fr: 'Alerte Effondrement de Singularité',
      es: 'Alerta de Colapso de Singularidad',
    },
    message: {
      ko: '최종 방어체 『보이드 타이탄』 강림! 모든 오버클럭 화력을 집중해 섬멸하십시오.',
      en: 'Ultimate defense unit "Void Titan" descended! Focus all overclocked firepower now.',
      ja: '最終防衛体「ヴォイドタイタン」降臨！全オーバークロック火力を集中してください。',
      zh: '终极防卫体『虚空泰坦』降临！请立刻集中全部超频火力予以歼灭。',
      fr: 'Unité ultime "Void Titan" descendue ! Concentrez toute la puissance de feu.',
      es: '¡La unidad definitiva "Void Titan" ha descendido! Concentren todo el fuego.',
    },
    type: 'critical',
  },
];

export function getTriggeredLore(survivalTime: number, triggeredIds: Set<string>): LoreEntry | null {
  for (const entry of SECTOR_ZERO_LORE) {
    if (survivalTime >= entry.triggerTime && !triggeredIds.has(entry.id)) {
      return entry;
    }
  }
  return null;
}

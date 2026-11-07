import type { Locale } from '../i18n';
import type { SwatBreachState } from './swat-breach';

export interface SwatQuest {
  id: string;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  target: number;
  current: number;
  rewardTokens: number;
  completed: boolean;
  claimed: boolean;
  check: (state: SwatBreachState) => number;
}

export const INITIAL_SWAT_QUESTS: SwatQuest[] = [
  {
    id: 'hostage_safe_rescue',
    title: {
      ko: '인질 무사 구출 작전',
      en: 'Hostage Safe Extraction',
      ja: '人質無傷救出作戦',
      zh: '人质安全营救行动',
      fr: 'Extraction Sécurisée des Otages',
      es: 'Extracción Segura de Rehenes',
    },
    description: {
      ko: '작전 지역 내 모든 인질을 사상자 없이 안전하게 구출하십시오.',
      en: 'Safely rescue all hostages across missions without casualties.',
      ja: '作戦エリア内の全人質を犠牲者ゼロで安全に救出せよ。',
      zh: '安全营救行动区域内的所有人质，确保零平民伤亡。',
      fr: 'Sauvez tous les otages des missions sans faire de victime.',
      es: 'Rescata a todos los rehenes sin bajas civiles.',
    },
    target: 1,
    current: 0,
    rewardTokens: 25,
    completed: false,
    claimed: false,
    check: (state) => state.hostages.filter((h) => h.rescued).length,
  },
  {
    id: 'flashbang_tactics',
    title: {
      ko: '전술 섬광탄 스턴 제압',
      en: 'Flashbang Stun Sweep',
      ja: '閃光弾戦術制圧',
      zh: '战术闪光震慑清剿',
      fr: 'Neutralisation sous Flashbang',
      es: 'Asalto con Granada Cegadora',
    },
    description: {
      ko: '섬광탄을 적중시켜 스턴 상태에 빠진 무장 용의자를 제압하십시오.',
      en: 'Neutralize armed suspects while they are stunned by flashbangs.',
      ja: '閃光弾を命中させ、スタン状態の武装容疑者を制圧せよ。',
      zh: '在武装歹徒被闪光弹震慑眩晕的状态下将其击倒制服。',
      fr: 'Neutralisez les suspects étourdis par vos grenades flash.',
      es: 'Neutraliza a los sospechosos mientras están aturdidos.',
    },
    target: 2,
    current: 0,
    rewardTokens: 35,
    completed: false,
    claimed: false,
    check: (state) => state.suspects.filter((s) => s.neutralized && s.stunTimer > 0).length,
  },
  {
    id: 'perfect_cqb',
    title: {
      ko: '노 데미지 퍼펙트 CQB',
      en: 'Flawless Zero-Damage CQB',
      ja: 'ノーダメージ完全CQB',
      zh: '无伤完美室内近战',
      fr: 'CQB Parfait Sans Dégât',
      es: 'CQB Perfecto Sin Daño',
    },
    description: {
      ko: '대원 피격 피해 0을 유지하며 모든 용의자를 소탕하십시오.',
      en: 'Neutralize all suspects while maintaining 100% squad health.',
      ja: '隊員の被弾ダメージ0を維持して全容疑者を掃討せよ。',
      zh: '保持全队100%健康生命值，完美消灭所有武装分子。',
      fr: 'Neutralisez tous les suspects sans subir aucun dégât.',
      es: 'Neutraliza a los sospechosos sin recibir daño de escuadrón.',
    },
    target: 200,
    current: 0,
    rewardTokens: 45,
    completed: false,
    claimed: false,
    check: (state) => {
      const allOpsFullHp = state.operators.every((op) => op.hp >= op.maxHp);
      const allSuspectsDown = state.suspects.every((s) => s.neutralized);
      return allOpsFullHp && allSuspectsDown ? 200 : 0;
    },
  },
  {
    id: 'speed_room_clear',
    title: {
      ko: '초고속 룸 클리어',
      en: 'Lightning Room Breach',
      ja: '電光石火ルームクリア',
      zh: '闪电破门极速清房',
      fr: 'Assaut Éclair de Pièce',
      es: 'Limpieza Relámpago de Sala',
    },
    description: {
      ko: '작전 실행 후 12초 이내에 룸을 완전 제압하고 승리하십시오.',
      en: 'Clear the operation and achieve victory within 12 seconds.',
      ja: '作戦実行後12秒以内に部屋を完全制圧して勝利せよ。',
      zh: '突入行动开始后12秒内彻底平定战场取得胜利。',
      fr: 'Prenez le contrôle total de la zone en moins de 12 secondes.',
      es: 'Consigue la victoria en menos de 12 segundos tras la entrada.',
    },
    target: 1,
    current: 0,
    rewardTokens: 50,
    completed: false,
    claimed: false,
    check: (state) => (state.phase === 'victory' && state.elapsedTime <= 12 ? 1 : 0),
  },
];

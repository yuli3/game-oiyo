import type { Locale } from '../i18n';

export interface SwatCommsLog {
  id: string;
  sender: Record<Locale, string>;
  message: Record<Locale, string>;
  type: 'info' | 'warning' | 'alert' | 'success';
}

export const SWAT_COMMS_LOGS: SwatCommsLog[] = [
  {
    id: 'planning_brief',
    sender: {
      ko: '본부 오퍼레이터 [발키리]',
      en: 'TOC Operator [Valkyrie]',
      ja: '作戦本部オペレーター [ワルキューレ]',
      zh: '战术行动中心 [女武神]',
      fr: 'Opératrice TOC [Valkyrie]',
      es: 'Operadora TOC [Valquiria]',
    },
    message: {
      ko: '알파·브라보 대원, 블루프린트 웨이포인트를 지정하고 문 앞 섬광탄 투척 지점을 설정하십시오.',
      en: 'Alpha and Bravo, plan your entry waypoints and designate room flashbang coordinates.',
      ja: 'アルファ・ブラボー隊員、進入ルートと閃光弾の投擲地点を指定してください。',
      zh: '阿尔法与布拉沃队员，请设定突入路径点并在门前标记闪光弹投掷坐标。',
      fr: 'Alpha et Bravo, planifiez vos points de passage et préparez vos grenades flash.',
      es: 'Alpha y Bravo, planificad los puntos de ruta y designad el lanzamiento cegador.',
    },
    type: 'info',
  },
  {
    id: 'breach_go',
    sender: {
      ko: '알파 리더 (방패)',
      en: 'Alpha Lead (Shield)',
      ja: 'アルファリーダー（盾）',
      zh: '阿尔法队长（盾牌）',
      fr: 'Chef Alpha (Bouclier)',
      es: 'Líder Alpha (Escudo)',
    },
    message: {
      ko: '도어 브리칭! 섬광탄 투하, 고 고 고! 시야를 확보하며 진입한다!',
      en: 'Breaching door! Flash out, go go go! Clearing corners and stacking up!',
      ja: 'ドア突破！閃光弾投下、ゴーゴーゴー！視界を確保して突入する！',
      zh: '破门！闪光弹投出，突入突入！肃清死角展开战术推进！',
      fr: 'Porte enfoncée ! Flash lancée, go go go ! Couvrez les angles !',
      es: '¡Puerta derribada! Granada fuera, ¡vamos vamos vamos! ¡Asegurando esquinas!',
    },
    type: 'alert',
  },
  {
    id: 'suspect_spotted',
    sender: {
      ko: '브라보-2 (돌격)',
      en: 'Bravo-2 (Assault)',
      ja: 'ブラボー2（突撃）',
      zh: '布拉沃-2（突击）',
      fr: 'Bravo-2 (Assaut)',
      es: 'Bravo-2 (Asalto)',
    },
    message: {
      ko: '무장 용의자 시야 포착! 섬광탄 스턴 확인, 즉시 제압 사격을 개시한다!',
      en: 'Armed suspect in sight! Target stunned by flashbang, engaging immediately!',
      ja: '武装容疑者を視認！スタン確認、直ちに制圧射撃を開始する！',
      zh: '目视发现持枪歹徒！确认目标处于眩晕状态，立即开火制服！',
      fr: 'Suspect armé en vue ! Cible étourdie, tir de neutralisation en cours !',
      es: '¡Sospechoso armado a la vista! Objetivo aturdido, ¡abriendo fuego de neutralización!',
    },
    type: 'warning',
  },
  {
    id: 'hostage_secure',
    sender: {
      ko: '알파 리더 (방패)',
      en: 'Alpha Lead (Shield)',
      ja: 'アルファリーダー（盾）',
      zh: '阿尔法队长（盾牌）',
      fr: 'Chef Alpha (Bouclier)',
      es: 'Líder Alpha (Escudo)',
    },
    message: {
      ko: '인질 확보 완료! 안심하세요, SWAT 대원들입니다. 즉시 탈출로로 호송합니다.',
      en: 'Hostage secured! Stay calm, SWAT is here. Escorting to extraction corridor.',
      ja: '人質確保完了！ご安心ください、SWATです。脱出路へ誘導します。',
      zh: '人质已安全解救！请保持冷静，特警在此，立即护送至撤离通道。',
      fr: 'Otage sécurisé ! Restez calme, le SWAT est là. Évacuation immédiate.',
      es: '¡Rehén asegurado! Mantengan la calma, es el SWAT. Escoltando a la salida.',
    },
    type: 'success',
  },
  {
    id: 'all_clear',
    sender: {
      ko: '본부 오퍼레이터 [발키리]',
      en: 'TOC Operator [Valkyrie]',
      ja: '作戦本部オペレーター [ワルキューレ]',
      zh: '战术行动中心 [女武神]',
      fr: 'Opératrice TOC [Valkyrie]',
      es: 'Operadora TOC [Valquiria]',
    },
    message: {
      ko: '올 클리어! 모든 용의자 제압 및 인질 구출 완료. 훌륭한 작전이었다, 대원들.',
      en: 'All clear! All suspects neutralized and hostages saved. Flawless execution, squad.',
      ja: 'オールクリア！全容疑者制圧および人質救出完了。見事な作戦だった、隊員諸君。',
      zh: '全区清空！所有歹徒均已制服，人质全员获救。战术行动完美无瑕，干得漂亮。',
      fr: 'Zone sécurisée ! Suspects neutralisés et otages sauvés. Mission accomplie avec brio.',
      es: '¡Zona despejada! Sospechosos neutralizados y rehenes a salvo. Trabajo impecable.',
    },
    type: 'success',
  },
];

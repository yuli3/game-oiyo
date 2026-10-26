import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type BorderInspectorState,
  CHECKPOINT_DATE,
  createInitialBorderState,
  type DiscrepancyType,
  getCurrentApplicant,
  type InspectFieldId,
  NATION_RULES,
  selectInspectField,
  stampApplicantDecision,
} from '../../lib/games/border-inspector';
import {
  loadArcadePassProgress,
  reportMissionProgress,
  saveArcadePassProgress,
} from '../../lib/games/arcade-pass';

interface BorderInspectorProps {
  lang?: string;
}

type LocaleCode = 'ko' | 'en' | 'ja' | 'zh' | 'es' | 'fr';

const COPY: Record<
  LocaleCode,
  {
    title: string;
    subtitle: string;
    applicantLabel: string;
    creditsLabel: string;
    citationsLabel: string;
    todayDateLabel: string;
    inspectPrompt: string;
    conflictAlert: string;
    verifiedAlert: string;
    passportTitle: string;
    permitTitle: string;
    rulebookTitle: string;
    nameField: string;
    nationField: string;
    cityField: string;
    idField: string;
    expiryField: string;
    purposeField: string;
    sealField: string;
    sealOfficial: string;
    sealForged: string;
    ruleCitiesLabel: string;
    ruleSealLabel: string;
    ruleExpiryLabel: string;
    approveBtn: string;
    denyBtn: string;
    newShiftBtn: string;
    citationNotice: string;
    shiftCompleteTitle: string;
    shiftCompleteDesc: string;
    firedTitle: string;
    firedDesc: string;
    nations: Record<string, string>;
    reasons: Record<DiscrepancyType | 'wrongful_denial', string>;
  }
> = {
  ko: {
    title: '페이퍼 플리즈 국경 심사',
    subtitle: '여권·입국 허가증·규칙서의 두 항목을 클릭해 위조/만료 불일치를 적발하고 스탬프를 날인하세요',
    applicantLabel: '심사 대상',
    creditsLabel: '보유 급여',
    citationsLabel: '경고장',
    todayDateLabel: '검문소 기준일 (클릭 대조)',
    inspectPrompt: '🔍 대조 모드: 서류·시계·규칙서에서 의심되는 두 항목을 차례로 클릭해 일치 여부를 검증하세요 (+15 보너스)',
    conflictAlert: '🚨 불일치 적발 완료! [거부 DENIED] 도장을 찍으면 추가 수당(+15₵)이 지급됩니다.',
    verifiedAlert: '✅ 두 항목 간 위조·불일치가 발견되지 않았습니다.',
    passportTitle: '여권 (PASSPORT)',
    permitTitle: '입국 허가증 (ENTRY PERMIT)',
    rulebookTitle: '입국부 공식 규칙서 (RULEBOOK)',
    nameField: '성명',
    nationField: '국적',
    cityField: '발급 도시',
    idField: '여권 번호',
    expiryField: '유효 만료일',
    purposeField: '방문 목적',
    sealField: '입국부 직인',
    sealOfficial: '★ 정식 아스토츠카 직인',
    sealForged: '✖ 위조 직인 (테두리 찌그러짐)',
    ruleCitiesLabel: '국가별 적법 발급 도시 (클릭 대조)',
    ruleSealLabel: '정식 직인 규격 (클릭 대조)',
    ruleExpiryLabel: '모든 서류 만료일은 1982-11-23 이후여야 함',
    approveBtn: '승인 스탬프 [APPROVED]',
    denyBtn: '거부 스탬프 [DENIED]',
    newShiftBtn: '새 근무 교대 시작',
    citationNotice: '입국부 프로토콜 위반 경고장 발부:',
    shiftCompleteTitle: '일일 국경 검문 근무 완수!',
    shiftCompleteDesc: '8명의 입국 심사 업무를 무사히 마치고 가족 부양 급여를 수령했습니다.',
    firedTitle: '경고 누적으로 해고됨',
    firedDesc: '입국부 보안 규정 위반이 4회 누적되어 검문소에서 해임되었습니다.',
    nations: {
      arstotzka: '아스토츠카 (Arstotzka)',
      kolechia: '콜레치아 (Kolechia)',
      obristan: '오브리스탄 (Obristan)',
    },
    reasons: {
      none: '이상 없음',
      wrongful_denial: '적법한 서류 소지자를 부당 거부함',
      expired_passport: '여권 유효기간 만료 미적발',
      expired_permit: '허가증 유효기간 만료 미적발',
      invalid_city: '존재하지 않는 위조 발급 도시 미적발',
      id_mismatch: '여권 번호와 허가증 번호 불일치 미적발',
      name_mismatch: '여권 성명과 허가증 성명 불일치 미적발',
      forged_seal: '입국 허가증 위조 직인 미적발',
    },
  },
  en: {
    title: 'Border Inspector Desk',
    subtitle: 'Cross-check two fields across Passport, Entry Permit, and Rulebook to spot discrepancies before stamping',
    applicantLabel: 'Applicant',
    creditsLabel: 'Credits',
    citationsLabel: 'Citations',
    todayDateLabel: 'Booth Date (Click to Inspect)',
    inspectPrompt: '🔍 Inspect Mode: Click any 2 fields across documents/clock/rules to link & verify (+15₵ bonus on discrepancy)',
    conflictAlert: '🚨 Discrepancy Confirmed! Stamp [DENIED] for a +15₵ detection bonus.',
    verifiedAlert: '✅ No conflict between the selected fields.',
    passportTitle: 'PASSPORT',
    permitTitle: 'ENTRY PERMIT',
    rulebookTitle: 'MINISTRY RULEBOOK',
    nameField: 'Full Name',
    nationField: 'Nation',
    cityField: 'Issuing City',
    idField: 'Passport No.',
    expiryField: 'Expires On',
    purposeField: 'Purpose',
    sealField: 'Ministry Seal',
    sealOfficial: '★ Official Ministry Seal',
    sealForged: '✖ Forged Seal (Warped Crest)',
    ruleCitiesLabel: 'Valid Issuing Cities (Click to Inspect)',
    ruleSealLabel: 'Authentic Seal Standard (Click to Inspect)',
    ruleExpiryLabel: 'All expiry dates must be on or after 1982-11-23',
    approveBtn: 'STAMP [APPROVED]',
    denyBtn: 'STAMP [DENIED]',
    newShiftBtn: 'New Shift',
    citationNotice: 'Ministry of Admission Citation:',
    shiftCompleteTitle: 'Daily Shift Complete!',
    shiftCompleteDesc: 'You processed all 8 border applicants and earned your daily salary.',
    firedTitle: 'Arrested for Negligence',
    firedDesc: 'You accumulated 4 Ministry Citations and were relieved of duty.',
    nations: {
      arstotzka: 'Arstotzka',
      kolechia: 'Kolechia',
      obristan: 'Obristan',
    },
    reasons: {
      none: 'Clear',
      wrongful_denial: 'Wrongfully denied a valid applicant',
      expired_passport: 'Failed to spot expired passport',
      expired_permit: 'Failed to spot expired permit',
      invalid_city: 'Invalid issuing city on passport',
      id_mismatch: 'Mismatched passport ID on permit',
      name_mismatch: 'Mismatched name on entry permit',
      forged_seal: 'Forged Ministry seal on permit',
    },
  },
  ja: {
    title: 'ペーパー・プリーズ 国境審査',
    subtitle: 'パスポート・入国許可証・規則書の2項目をクリック照合して偽造を見抜き、スタンプを押そう',
    applicantLabel: '審査対象',
    creditsLabel: '所持金',
    citationsLabel: '警告状',
    todayDateLabel: '検問所日付 (クリック照合)',
    inspectPrompt: '🔍 照合モード: 書類・日付・規則書から怪しい2項目をクリックして矛盾を検出 (+15₵ボーナス)',
    conflictAlert: '🚨 矛盾を検出！ [拒否 DENIED] スタンプで+15₵ボーナス獲得。',
    verifiedAlert: '✅ 選択した2項目に矛盾はありません。',
    passportTitle: 'パスポート (PASSPORT)',
    permitTitle: '入国許可証 (ENTRY PERMIT)',
    rulebookTitle: '入国省 公式規則書 (RULEBOOK)',
    nameField: '氏名',
    nationField: '国籍',
    cityField: '発行都市',
    idField: '旅券番号',
    expiryField: '有効期限',
    purposeField: '入国目的',
    sealField: '入国省公印',
    sealOfficial: '★ 正規公印',
    sealForged: '✖ 偽造公印 (刻印歪み)',
    ruleCitiesLabel: '国別の正規発行都市 (クリック照合)',
    ruleSealLabel: '正規公印規定 (クリック照合)',
    ruleExpiryLabel: '有効期限は1982-11-23以降であること',
    approveBtn: '承認スタンプ [APPROVED]',
    denyBtn: '拒否スタンプ [DENIED]',
    newShiftBtn: '新しいシフト',
    citationNotice: '入国省プロトコル違反警告:',
    shiftCompleteTitle: '本日の検問シフト完了！',
    shiftCompleteDesc: '全8名の入国審査を終え、本日の給与を受け取りました。',
    firedTitle: '警告累積により解雇',
    firedDesc: '違反警告が4回に達したため検問所から解任されました。',
    nations: {
      arstotzka: 'アルストツカ (Arstotzka)',
      kolechia: 'コレチア (Kolechia)',
      obristan: 'オブリスタン (Obristan)',
    },
    reasons: {
      none: '異常なし',
      wrongful_denial: '正規の申請者を不当に拒否',
      expired_passport: 'パスポート有効期限切れの見落とし',
      expired_permit: '許可証有効期限切れの見落とし',
      invalid_city: '偽造発行都市の見落とし',
      id_mismatch: '旅券番号不一致の見落とし',
      name_mismatch: '氏名不一致の見落とし',
      forged_seal: '偽造公印の見落とし',
    },
  },
  zh: {
    title: '请出示证件：边境审查',
    subtitle: '点击比对护照、入境许可证与规则书中的两项栏目，揪出伪造漏洞并盖下印章',
    applicantLabel: '申请人',
    creditsLabel: '薪资',
    citationsLabel: '罚单',
    todayDateLabel: '检查站日期 (点击比对)',
    inspectPrompt: '🔍 核查模式：依次点击证件、日历或规则书中的任意两项进行矛盾比对（+15₵奖金）',
    conflictAlert: '🚨 已锁定伪造矛盾！盖下 [拒绝 DENIED] 印章可获 +15₵ 奖金。',
    verifiedAlert: '✅ 所选两项核对无误。',
    passportTitle: '护照 (PASSPORT)',
    permitTitle: '入境许可证 (ENTRY PERMIT)',
    rulebookTitle: '入境部规则手册 (RULEBOOK)',
    nameField: '姓名',
    nationField: '国籍',
    cityField: '签发城市',
    idField: '护照编号',
    expiryField: '有效期限',
    purposeField: '入境目的',
    sealField: '入境部印章',
    sealOfficial: '★ 官方正品钢印',
    sealForged: '✖ 伪造假章 (边缘变形)',
    ruleCitiesLabel: '各国合法签发城市 (点击比对)',
    ruleSealLabel: '官方钢印规范 (点击比对)',
    ruleExpiryLabel: '所有证件有效期必须在 1982-11-23 当天或之后',
    approveBtn: '批准盖章 [APPROVED]',
    denyBtn: '拒绝盖章 [DENIED]',
    newShiftBtn: '开始新班次',
    citationNotice: '入境部违规警告罚单：',
    shiftCompleteTitle: '今日执勤圆满完成！',
    shiftCompleteDesc: '成功审查全部 8 名入境人员并领取了今日薪水。',
    firedTitle: '违规过多被捕解职',
    firedDesc: '累计收到 4 张入境部罚单，你已被解除边境检查官职务。',
    nations: {
      arstotzka: '阿什托兹卡 (Arstotzka)',
      kolechia: '科.雷奇亚 (Kolechia)',
      obristan: '奥布里斯坦 (Obristan)',
    },
    reasons: {
      none: '无异常',
      wrongful_denial: '错误拒绝了合规申请人',
      expired_passport: '未发现护照已过期',
      expired_permit: '未发现许可证已过期',
      invalid_city: '未发现虚构签发城市',
      id_mismatch: '未发现护照号不一致',
      name_mismatch: '未发现姓名不一致',
      forged_seal: '未发现伪造印章',
    },
  },
  es: {
    title: 'Border Inspector Desk',
    subtitle: 'Compara dos campos entre Pasaporte, Permiso y Reglamento para detectar falsificaciones antes de sellar',
    applicantLabel: 'Solicitante',
    creditsLabel: 'Créditos',
    citationsLabel: 'Amonestaciones',
    todayDateLabel: 'Fecha Actual (Clic para Inspeccionar)',
    inspectPrompt: '🔍 Modo Inspección: Haz clic en 2 campos para verificar discrepancias (+15₵ extra)',
    conflictAlert: '🚨 ¡Discrepancia Detectada! Sella [DENIED] para ganar +15₵ extra.',
    verifiedAlert: '✅ Sin conflicto entre los dos campos seleccionados.',
    passportTitle: 'PASAPORTE',
    permitTitle: 'PERMISO DE ENTRADA',
    rulebookTitle: 'REGLAMENTO OFICIAL',
    nameField: 'Nombre',
    nationField: 'Nación',
    cityField: 'Ciudad Emisora',
    idField: 'N.º Pasaporte',
    expiryField: 'Vencimiento',
    purposeField: 'Propósito',
    sealField: 'Sello Oficial',
    sealOfficial: '★ Sello Oficial Auténtico',
    sealForged: '✖ Sello Falsificado',
    ruleCitiesLabel: 'Ciudades Emisoras Válidas (Clic)',
    ruleSealLabel: 'Norma de Sello Oficial (Clic)',
    ruleExpiryLabel: 'Vencimiento debe ser igual o posterior a 1982-11-23',
    approveBtn: 'SELLAR [APPROVED]',
    denyBtn: 'SELLAR [DENIED]',
    newShiftBtn: 'Nuevo Turno',
    citationNotice: 'Amonestación del Ministerio:',
    shiftCompleteTitle: '¡Turno Completado!',
    shiftCompleteDesc: 'Procesaste a los 8 solicitantes y cobraste tu salario del día.',
    firedTitle: 'Despedido por Negligencia',
    firedDesc: 'Acumulaste 4 amonestaciones del Ministerio.',
    nations: {
      arstotzka: 'Arstotzka',
      kolechia: 'Kolechia',
      obristan: 'Obristan',
    },
    reasons: {
      none: 'Correcto',
      wrongful_denial: 'Denegación injusta a un solicitante válido',
      expired_passport: 'Pasaporte vencido no detectado',
      expired_permit: 'Permiso vencido no detectado',
      invalid_city: 'Ciudad emisora inválida',
      id_mismatch: 'Número de pasaporte no coincide',
      name_mismatch: 'Nombre no coincide en el permiso',
      forged_seal: 'Sello falsificado en el permiso',
    },
  },
  fr: {
    title: 'Border Inspector Desk',
    subtitle: 'Comparez deux champs entre Passeport, Permis et Règlement pour déceler les fraudes avant de tamponner',
    applicantLabel: 'Demandeur',
    creditsLabel: 'Crédits',
    citationsLabel: 'Blâmes',
    todayDateLabel: 'Date du Poste (Cliquer)',
    inspectPrompt: '🔍 Mode Inspection : Cliquez sur 2 champs pour vérifier les incohérences (+15₵ bonus)',
    conflictAlert: '🚨 Incohérence Confirmée ! Tamponnez [DENIED] pour +15₵ de prime.',
    verifiedAlert: '✅ Aucun conflit entre les deux champs sélectionnés.',
    passportTitle: 'PASSEPORT',
    permitTitle: 'PERMIS D’ENTRÉE',
    rulebookTitle: 'RÈGLEMENT DU MINISTÈRE',
    nameField: 'Nom Complet',
    nationField: 'Nation',
    cityField: 'Ville d’Émission',
    idField: 'N° Passeport',
    expiryField: 'Expiration',
    purposeField: 'Motif',
    sealField: 'Sceau Officiel',
    sealOfficial: '★ Sceau Officiel Authentique',
    sealForged: '✖ Sceau Contrefait',
    ruleCitiesLabel: 'Villes d’Émission Valides (Cliquer)',
    ruleSealLabel: 'Norme du Sceau Officiel (Cliquer)',
    ruleExpiryLabel: 'Expiration le ou après le 1982-11-23',
    approveBtn: 'TAMPONNER [APPROVED]',
    denyBtn: 'TAMPONNER [DENIED]',
    newShiftBtn: 'Nouveau Service',
    citationNotice: 'Avertissement du Ministère :',
    shiftCompleteTitle: 'Service Quotidien Terminé !',
    shiftCompleteDesc: 'Vous avez contrôlé les 8 voyageurs et perçu votre salaire.',
    firedTitle: 'Renvoyé pour Négligence',
    firedDesc: 'Vous avez cumulé 4 blâmes du Ministère.',
    nations: {
      arstotzka: 'Arstotzka',
      kolechia: 'Kolechia',
      obristan: 'Obristan',
    },
    reasons: {
      none: 'Conforme',
      wrongful_denial: 'Refus injustifié d’un voyageur en règle',
      expired_passport: 'Passeport expiré non détecté',
      expired_permit: 'Permis expiré non détecté',
      invalid_city: 'Ville d’émission invalide',
      id_mismatch: 'Numéro de passeport discordant',
      name_mismatch: 'Nom discordant sur le permis',
      forged_seal: 'Sceau contrefait sur le permis',
    },
  },
};

function resolveLocale(lang?: string): LocaleCode {
  const code = (lang || 'ko').slice(0, 2).toLowerCase() as LocaleCode;
  return COPY[code] ? code : 'ko';
}

export default function BorderInspector({ lang = 'ko' }: BorderInspectorProps) {
  const locale = resolveLocale(lang);
  const t = COPY[locale];

  const [state, setState] = useState<BorderInspectorState>(() => createInitialBorderState());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const applicant = getCurrentApplicant(state);

  const playSfx = useCallback((kind: 'stamp' | 'inspect' | 'buzzer') => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (kind === 'stamp') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
        gain.gain.setValueAtTime(0.24, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (kind === 'inspect') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(620, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.setValueAtTime(92, now + 0.12);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.29);
      }
    } catch {
      // Ignore audio errors
    }
  }, []);

  const handleFieldClick = (fieldId: InspectFieldId) => {
    playSfx('inspect');
    setState((prev) => selectInspectField(prev, fieldId));
  };

  const handleStamp = (decision: 'approved' | 'denied') => {
    playSfx('stamp');
    setState((prev) => {
      const next = stampApplicantDecision(prev, decision);
      if (next.citations > prev.citations) {
        setTimeout(() => playSfx('buzzer'), 120);
      }
      if (next.correctCount > prev.correctCount) {
        const dateKey = new Date().toISOString().slice(0, 10);
        const progress = loadArcadePassProgress(dateKey);
        saveArcadePassProgress(
          reportMissionProgress(progress, 'border-inspector', next.correctCount)
        );
      }
      return next;
    });
  };

  // Dystopian Checkpoint Booth Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Somber checkpoint booth concrete wall
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, h);

    // Waiting queue silhouettes on left
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(16, 20, 210, h - 40);
    for (let i = 0; i < 8; i++) {
      const done = i < state.currentIndex;
      const active = i === state.currentIndex;
      ctx.fillStyle = done ? '#334155' : active ? '#38bdf8' : '#64748b';
      ctx.beginPath();
      ctx.arc(40 + i * 23, 85, active ? 9 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(34 + i * 23, 96, 12, 24);
    }

    // Center Applicant Booth Window
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(250, 16, 240, h - 32);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.strokeRect(250, 16, 240, h - 32);

    // Applicant Procedural Portrait
    const seed = applicant.avatarSeed;
    const coatColors = ['#334155', '#3f3f46', '#1e3a8a', '#365314', '#7f1d1d'];
    ctx.fillStyle = coatColors[seed % coatColors.length];
    ctx.beginPath();
    ctx.roundRect(320, 96, 100, 58, 16);
    ctx.fill();

    // Head
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(370, 68, 26, 0, Math.PI * 2);
    ctx.fill();

    // Eyes & stern expression
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(358, 62, 6, 6);
    ctx.fillRect(376, 62, 6, 6);
    ctx.fillRect(362, 79, 16, 3);

    // Booth window security bars
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 2;
    for (let bx = 280; bx < 490; bx += 35) {
      ctx.beginPath();
      ctx.moveTo(bx, 16);
      ctx.lineTo(bx, h - 16);
      ctx.stroke();
    }

    // Right side Stamp Preview Badge
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(515, 20, 225, h - 40);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MINISTRY OF ADMISSION', 627, 46);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(applicant.fullName, 627, 74);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '12px monospace';
    ctx.fillText(`ID: ${applicant.passportId}`, 627, 96);

    if (state.stampMark) {
      ctx.save();
      ctx.translate(627, 128);
      ctx.rotate(-0.08);
      const isApp = state.stampMark.decision === 'approved';
      ctx.strokeStyle = isApp ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(-65, -16, 130, 32);
      ctx.fillStyle = isApp ? '#22c55e' : '#ef4444';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(isApp ? 'APPROVED' : 'DENIED', 0, 5);
      ctx.restore();
    }
  }, [applicant, state.currentIndex, state.stampMark]);

  const fieldBtnClass = (id: InspectFieldId) => {
    const selected = state.inspectSelection.includes(id);
    return `w-full rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${
      selected
        ? 'border-primary bg-primary text-primary-foreground font-bold shadow-xs'
        : 'border-border bg-background text-foreground hover:bg-accent'
    }`;
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">🛂 {t.title}</h2>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleFieldClick('clock_date')}
            className={`rounded-lg border px-2.5 py-1 transition ${
              state.inspectSelection.includes('clock_date')
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-secondary text-secondary-foreground hover:bg-accent'
            }`}
          >
            📅 {t.todayDateLabel}: {CHECKPOINT_DATE}
          </button>
          <span className="rounded-lg bg-secondary px-2.5 py-1 text-secondary-foreground">
            👤 {t.applicantLabel}: {state.currentIndex + 1}/{state.cases.length}
          </span>
          <span className="rounded-lg bg-secondary px-2.5 py-1 text-secondary-foreground">
            ₵ {t.creditsLabel}: {state.credits}
          </span>
          <span className="rounded-lg bg-secondary px-2.5 py-1 text-secondary-foreground">
            ⚠️ {t.citationsLabel}: {state.citations}/{state.maxCitations}
          </span>
          <button
            type="button"
            onClick={() => setState(createInitialBorderState())}
            className="rounded-lg border border-border bg-background px-3 py-1 text-xs font-semibold hover:bg-accent"
          >
            {t.newShiftBtn}
          </button>
        </div>
      </div>

      {/* Checkpoint Booth Canvas */}
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <canvas
          ref={canvasRef}
          width={760}
          height={165}
          className="block h-auto w-full"
        />
      </div>

      {/* Discrepancy Inspector Status Banner */}
      <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-xs font-medium">
        {state.lastInspectResult === 'conflict' ? (
          <span className="font-bold text-destructive">{t.conflictAlert}</span>
        ) : state.lastInspectResult === 'verified' ? (
          <span className="font-semibold text-foreground">{t.verifiedAlert}</span>
        ) : (
          <span className="text-muted-foreground">{t.inspectPrompt}</span>
        )}
      </div>

      {/* Citation Warning Slip if issued */}
      {state.lastCitationReason && (
        <div className="rounded-xl border border-destructive bg-destructive/10 px-3.5 py-2 text-xs font-semibold text-destructive">
          🖨️ {t.citationNotice} {t.reasons[state.lastCitationReason]}
        </div>
      )}

      {/* 3-Column Desk: Passport | Entry Permit | Ministry Rulebook */}
      {state.status === 'playing' ? (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {/* Document 1: Passport */}
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3.5">
              <div className="border-b border-border pb-1.5 text-xs font-bold tracking-wider">
                📕 {t.passportTitle}
              </div>
              <button
                type="button"
                onClick={() => handleFieldClick('passport_name')}
                className={fieldBtnClass('passport_name')}
              >
                <span className="text-muted-foreground">{t.nameField}: </span>
                <span className="font-mono font-bold">{applicant.fullName}</span>
              </button>
              <div className="rounded-lg border border-border bg-background/60 px-2.5 py-1.5 text-xs">
                <span className="text-muted-foreground">{t.nationField}: </span>
                <span className="font-semibold">{t.nations[applicant.nation]}</span>
              </div>
              <button
                type="button"
                onClick={() => handleFieldClick('passport_city')}
                className={fieldBtnClass('passport_city')}
              >
                <span className="text-muted-foreground">{t.cityField}: </span>
                <span className="font-mono font-bold">{applicant.issuingCity}</span>
              </button>
              <button
                type="button"
                onClick={() => handleFieldClick('passport_id')}
                className={fieldBtnClass('passport_id')}
              >
                <span className="text-muted-foreground">{t.idField}: </span>
                <span className="font-mono font-bold">{applicant.passportId}</span>
              </button>
              <button
                type="button"
                onClick={() => handleFieldClick('passport_expiry')}
                className={fieldBtnClass('passport_expiry')}
              >
                <span className="text-muted-foreground">{t.expiryField}: </span>
                <span className="font-mono font-bold">{applicant.passportExpiry}</span>
              </button>
            </div>

            {/* Document 2: Entry Permit */}
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3.5">
              <div className="border-b border-border pb-1.5 text-xs font-bold tracking-wider">
                📄 {t.permitTitle}
              </div>
              <button
                type="button"
                onClick={() => handleFieldClick('permit_name')}
                className={fieldBtnClass('permit_name')}
              >
                <span className="text-muted-foreground">{t.nameField}: </span>
                <span className="font-mono font-bold">{applicant.permitName}</span>
              </button>
              <button
                type="button"
                onClick={() => handleFieldClick('permit_id')}
                className={fieldBtnClass('permit_id')}
              >
                <span className="text-muted-foreground">{t.idField}: </span>
                <span className="font-mono font-bold">{applicant.permitPassportId}</span>
              </button>
              <div className="rounded-lg border border-border bg-background/60 px-2.5 py-1.5 text-xs">
                <span className="text-muted-foreground">{t.purposeField}: </span>
                <span className="font-mono uppercase">{applicant.purpose}</span>
              </div>
              <button
                type="button"
                onClick={() => handleFieldClick('permit_expiry')}
                className={fieldBtnClass('permit_expiry')}
              >
                <span className="text-muted-foreground">{t.expiryField}: </span>
                <span className="font-mono font-bold">{applicant.permitExpiry}</span>
              </button>
              <button
                type="button"
                onClick={() => handleFieldClick('permit_seal')}
                className={fieldBtnClass('permit_seal')}
              >
                <span className="text-muted-foreground">{t.sealField}: </span>
                <span className="font-bold">
                  {applicant.sealAuthentic ? t.sealOfficial : t.sealForged}
                </span>
              </button>
            </div>

            {/* Document 3: Official Rulebook */}
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3.5">
              <div className="border-b border-border pb-1.5 text-xs font-bold tracking-wider">
                📘 {t.rulebookTitle}
              </div>
              <div className="rounded-lg border border-border bg-background/60 p-2 text-xs text-muted-foreground">
                1. {t.ruleExpiryLabel}
              </div>
              <button
                type="button"
                onClick={() => handleFieldClick('rule_cities')}
                className={fieldBtnClass('rule_cities')}
              >
                <div className="font-bold">2. {t.ruleCitiesLabel}</div>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  {Object.values(NATION_RULES).map((nr) => (
                    <li key={nr.id}>
                      • {t.nations[nr.id]}: {nr.validCities.join(', ')}
                    </li>
                  ))}
                </ul>
              </button>
              <button
                type="button"
                onClick={() => handleFieldClick('rule_seal')}
                className={fieldBtnClass('rule_seal')}
              >
                <div className="font-bold">3. {t.ruleSealLabel}</div>
                <div className="mt-0.5 text-muted-foreground">{t.sealOfficial}</div>
              </button>
            </div>
          </div>

          {/* Stamp Bar */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleStamp('approved')}
              className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              ✅ {t.approveBtn}
            </button>
            <button
              type="button"
              onClick={() => handleStamp('denied')}
              className="rounded-xl bg-destructive px-4 py-3 text-sm font-bold text-destructive-foreground shadow-sm transition hover:opacity-90"
            >
              ⛔ {t.denyBtn}
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/40 p-6 text-center">
          <h3 className="text-xl font-bold">
            {state.status === 'shift_complete'
              ? `🎖️ ${t.shiftCompleteTitle}`
              : `🚨 ${t.firedTitle}`}
          </h3>
          <p className="text-sm text-muted-foreground">
            {state.status === 'shift_complete' ? t.shiftCompleteDesc : t.firedDesc}
          </p>
          <div className="text-sm font-bold">
            {t.creditsLabel}: {state.credits}₵ · {t.citationsLabel}: {state.citations}
          </div>
          <button
            type="button"
            onClick={() => setState(createInitialBorderState())}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-sm"
          >
            {t.newShiftBtn}
          </button>
        </div>
      )}
    </div>
  );
}

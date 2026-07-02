import React, { useState, useMemo } from 'react';

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh';

// ─── Heavenly Stems (天干) ────────────────────────────────────────────────────
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const STEM_NAMES: Record<Locale, string[]> = {
  ko: ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'],
  en: ['Jiǎ', 'Yǐ', 'Bǐng', 'Dīng', 'Wù', 'Jǐ', 'Gēng', 'Xīn', 'Rén', 'Guǐ'],
  ja: ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'],
  fr: ['Jiǎ', 'Yǐ', 'Bǐng', 'Dīng', 'Wù', 'Jǐ', 'Gēng', 'Xīn', 'Rén', 'Guǐ'],
  es: ['Jiǎ', 'Yǐ', 'Bǐng', 'Dīng', 'Wù', 'Jǐ', 'Gēng', 'Xīn', 'Rén', 'Guǐ'],
  zh: ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'],
};

// ─── Earthly Branches (地支) ──────────────────────────────────────────────────
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const BRANCH_ANIMALS: Record<Locale, string[]> = {
  ko: ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'],
  en: ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'],
  ja: ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'],
  fr: ['Rat', 'Bœuf', 'Tigre', 'Lapin', 'Dragon', 'Serpent', 'Cheval', 'Chèvre', 'Singe', 'Coq', 'Chien', 'Cochon'],
  es: ['Rata', 'Buey', 'Tigre', 'Conejo', 'Dragón', 'Serpiente', 'Caballo', 'Cabra', 'Mono', 'Gallo', 'Perro', 'Cerdo'],
  zh: ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'],
};
const BRANCH_EMOJIS = ['🐭', '🐄', '🐯', '🐰', '🐉', '🐍', '🐎', '🐑', '🐒', '🐓', '🐕', '🐷'];

// ─── Five Elements (오행) ──────────────────────────────────────────────────────
const STEM_ELEMENT = ['Wood', 'Wood', 'Fire', 'Fire', 'Earth', 'Earth', 'Metal', 'Metal', 'Water', 'Water'];
const BRANCH_ELEMENT = ['Water', 'Earth', 'Wood', 'Wood', 'Earth', 'Fire', 'Fire', 'Earth', 'Metal', 'Metal', 'Earth', 'Water'];
const ELEMENTS: Record<string, Record<Locale, string>> = {
  Wood: { ko: '목(木)', en: 'Wood 木', ja: '木', fr: 'Bois 木', es: 'Madera 木', zh: '木', },
  Fire: { ko: '화(火)', en: 'Fire 火', ja: '火', fr: 'Feu 火', es: 'Fuego 火', zh: '火', },
  Earth: { ko: '토(土)', en: 'Earth 土', ja: '土', fr: 'Terre 土', es: 'Tierra 土', zh: '土', },
  Metal: { ko: '금(金)', en: 'Metal 金', ja: '金', fr: 'Métal 金', es: 'Metal 金', zh: '金', },
  Water: { ko: '수(水)', en: 'Water 水', ja: '水', fr: 'Eau 水', es: 'Agua 水', zh: '水', },
};
const ELEMENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Wood: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  Fire: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  Earth: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  Metal: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300' },
  Water: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
};
const ELEMENT_EMOJIS: Record<string, string> = {
  Wood: '🌿', Fire: '🔥', Earth: '🌍', Metal: '⚙️', Water: '💧',
};

// ─── Personality traits per element ───────────────────────────────────────────
const ELEMENT_TRAITS: Record<string, Record<Locale, { strengths: string[]; weaknesses: string[]; career: string }>> = {
  Wood: {
    ko: { strengths: ['성장 지향적', '창의적', '인도주의적', '유연함'], weaknesses: ['우유부단', '지나친 이상주의', '고집'], career: '교육, 의료, 환경, 창작' },
    en: { strengths: ['Growth-oriented', 'Creative', 'Humanitarian', 'Flexible'], weaknesses: ['Indecisive', 'Over-idealistic', 'Stubborn'], career: 'Education, healthcare, environment, arts' },
    ja: { strengths: ['成長志向', '創造的', '人道主義的', '柔軟'], weaknesses: ['優柔不断', '過度な理想主義', '頑固'], career: '教育、医療、環境、創作' },
    fr: { strengths: ['Orienté croissance', 'Créatif', 'Humaniste', 'Flexible'], weaknesses: ['Indécis', 'Trop idéaliste', 'Têtu'], career: 'Éducation, santé, environnement, arts' },
    es: { strengths: ['Orientado al crecimiento', 'Creativo', 'Humanitario', 'Flexible'], weaknesses: ['Indeciso', 'Demasiado idealista', 'Terco'], career: 'Educación, salud, medio ambiente, artes' },
    zh: { strengths: ['成长导向', '创造力强', '人道主义', '灵活'], weaknesses: ['优柔寡断', '过度理想化', '固执'], career: '教育、医疗、环境、创作' },
  },
  Fire: {
    ko: { strengths: ['열정적', '카리스마', '직관력', '리더십'], weaknesses: ['성급함', '충동적', '과도한 자신감'], career: '연예, 마케팅, 정치, 스포츠' },
    en: { strengths: ['Passionate', 'Charismatic', 'Intuitive', 'Leadership'], weaknesses: ['Impatient', 'Impulsive', 'Overconfident'], career: 'Entertainment, marketing, politics, sports' },
    ja: { strengths: ['情熱的', 'カリスマ', '直感力', 'リーダーシップ'], weaknesses: ['急ぎ過ぎ', '衝動的', '過信'], career: '芸能、マーケティング、政治、スポーツ' },
    fr: { strengths: ['Passionné(e)', 'Charismatique', 'Intuitif(ve)', 'Leadership'], weaknesses: ['Impatient(e)', 'Impulsif(ve)', 'Trop confiant(e)'], career: 'Divertissement, marketing, politique, sport' },
    es: { strengths: ['Apasionado/a', 'Carismático/a', 'Intuitivo/a', 'Liderazgo'], weaknesses: ['Impaciente', 'Impulsivo/a', 'Demasiado confiado/a'], career: 'Entretenimiento, marketing, política, deporte' },
    zh: { strengths: ['热情', '魅力', '直觉力', '领导力'], weaknesses: ['急躁', '冲动', '过度自信'], career: '娱乐、营销、政治、体育' },
  },
  Earth: {
    ko: { strengths: ['안정적', '신뢰할 수 있는', '실용적', '인내심'], weaknesses: ['보수적', '변화 거부', '느린 결정'], career: '부동산, 금융, 농업, 행정' },
    en: { strengths: ['Stable', 'Trustworthy', 'Practical', 'Patient'], weaknesses: ['Conservative', 'Resistant to change', 'Slow to decide'], career: 'Real estate, finance, agriculture, administration' },
    ja: { strengths: ['安定的', '信頼できる', '実用的', '忍耐強い'], weaknesses: ['保守的', '変化への抵抗', '決断が遅い'], career: '不動産、金融、農業、行政' },
    fr: { strengths: ['Stable', 'Fiable', 'Pratique', 'Patient(e)'], weaknesses: ['Conservateur(trice)', 'Résistance au changement', 'Lent(e) à décider'], career: 'Immobilier, finance, agriculture, administration' },
    es: { strengths: ['Estable', 'Confiable', 'Práctico/a', 'Paciente'], weaknesses: ['Conservador/a', 'Resistente al cambio', 'Lento/a para decidir'], career: 'Inmobiliario, finanzas, agricultura, administración' },
    zh: { strengths: ['稳定', '值得信赖', '务实', '有耐心'], weaknesses: ['保守', '抗拒变化', '决策缓慢'], career: '房地产、金融、农业、行政' },
  },
  Metal: {
    ko: { strengths: ['결단력', '정의감', '체계적', '강한 의지'], weaknesses: ['완고함', '비타협적', '지나친 비판'], career: '법조계, 군/경찰, 금융, 엔지니어링' },
    en: { strengths: ['Decisive', 'Strong sense of justice', 'Systematic', 'Strong will'], weaknesses: ['Stubborn', 'Uncompromising', 'Overly critical'], career: 'Law, military/police, finance, engineering' },
    ja: { strengths: ['決断力', '正義感', '体系的', '強い意志'], weaknesses: ['頑固', '非妥協的', '過度な批判'], career: '法曹界、軍・警察、金融、エンジニアリング' },
    fr: { strengths: ['Décidé(e)', 'Sens de la justice', 'Systématique', 'Volonté forte'], weaknesses: ['Têtu(e)', 'Intransigeant(e)', 'Trop critique'], career: 'Droit, armée/police, finance, ingénierie' },
    es: { strengths: ['Decidido/a', 'Sentido de justicia', 'Sistemático/a', 'Voluntad fuerte'], weaknesses: ['Terco/a', 'Intransigente', 'Demasiado crítico/a'], career: 'Derecho, militar/policía, finanzas, ingeniería' },
    zh: { strengths: ['果断', '正义感强', '有条理', '意志坚定'], weaknesses: ['固执', '不妥协', '过度批评'], career: '法律、军警、金融、工程' },
  },
  Water: {
    ko: { strengths: ['지혜로움', '적응력', '통찰력', '외교적'], weaknesses: ['우유부단', '불안함', '지나친 사색'], career: '철학, 글쓰기, 상담, 외교' },
    en: { strengths: ['Wise', 'Adaptable', 'Insightful', 'Diplomatic'], weaknesses: ['Indecisive', 'Anxious', 'Over-contemplative'], career: 'Philosophy, writing, counseling, diplomacy' },
    ja: { strengths: ['知恵がある', '適応力がある', '洞察力', '外交的'], weaknesses: ['優柔不断', '不安', '過度な思索'], career: '哲学、執筆、カウンセリング、外交' },
    fr: { strengths: ['Sage', 'Adaptable', 'Perspicace', 'Diplomatique'], weaknesses: ['Indécis(e)', 'Anxieux(se)', 'Trop contemplatif(ve)'], career: 'Philosophie, écriture, conseil, diplomatie' },
    es: { strengths: ['Sabio/a', 'Adaptable', 'Perspicaz', 'Diplomático/a'], weaknesses: ['Indeciso/a', 'Ansioso/a', 'Demasiado contemplativo/a'], career: 'Filosofía, escritura, asesoramiento, diplomacia' },
    zh: { strengths: ['智慧', '适应力强', '洞察力', '外交手腕'], weaknesses: ['优柔寡断', '焦虑', '过度沉思'], career: '哲学、写作、咨询、外交' },
  },
};

// ─── Sexagenary year cycle ─────────────────────────────────────────────────────
// Epoch: 1984 is 甲子 (Stem 0, Branch 0)
const SEXAGENARY_EPOCH = 1984;

function getYearStem(year: number): number {
  return ((year - SEXAGENARY_EPOCH) % 10 + 10) % 10;
}
function getYearBranch(year: number): number {
  return ((year - SEXAGENARY_EPOCH) % 12 + 12) % 12;
}

// Month pillar: stems cycle by 5 per year-stem group; branches = (month + 1) % 12
function getMonthBranch(month: number): number {
  // Months 1-12 → branches 2 (寅) to 1 (丑) — Chinese solar calendar approximation
  return (month + 1) % 12;
}
function getMonthStem(yearStem: number, month: number): number {
  // Starting stem for the year depends on year stem parity group
  const base = (yearStem % 5) * 2;
  return (base + (month - 1)) % 10;
}

// Day pillar: use a known epoch
// January 1, 1900 = 甲戌 day → stem 0, branch 10
const DAY_EPOCH_JD = 2415021; // Julian Day for 1900-01-01
function julianDay(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yr = y + 4800 - a;
  const mo = m + 12 * a - 3;
  return d + Math.floor((153 * mo + 2) / 5) + 365 * yr + Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) - 32045;
}
function getDayStem(y: number, m: number, d: number): number {
  const jd = julianDay(y, m, d);
  return ((jd - DAY_EPOCH_JD) % 10 + 10) % 10;
}
function getDayBranch(y: number, m: number, d: number): number {
  const jd = julianDay(y, m, d);
  return ((jd - DAY_EPOCH_JD) % 12 + 12) % 12;
}

// Hour pillar: branches go in 2-hour segments starting at 23:00 (子)
function getHourBranch(hour: number): number {
  // 23-01: 子(0), 01-03: 丑(1), 03-05: 寅(2), 05-07: 卯(3), ...
  return Math.floor((hour + 1) / 2) % 12;
}
function getHourStem(dayStem: number, hourBranch: number): number {
  const base = (dayStem % 5) * 2;
  return (base + hourBranch) % 10;
}

// ─── Lucky number based on dominant element ───────────────────────────────────
const LUCKY: Record<string, Record<Locale, { colors: string; numbers: string; directions: string }>> = {
  Wood: {
    ko: { colors: '초록, 파랑', numbers: '3, 8', directions: '동쪽' },
    en: { colors: 'Green, Blue', numbers: '3, 8', directions: 'East' },
    ja: { colors: '緑、青', numbers: '3、8', directions: '東' },
    fr: { colors: 'Vert, Bleu', numbers: '3, 8', directions: 'Est' },
    es: { colors: 'Verde, Azul', numbers: '3, 8', directions: 'Este' },
    zh: { colors: '綠色、藍色', numbers: '3、8', directions: '東方' },
  },
  Fire: {
    ko: { colors: '빨강, 보라', numbers: '2, 7', directions: '남쪽' },
    en: { colors: 'Red, Purple', numbers: '2, 7', directions: 'South' },
    ja: { colors: '赤、紫', numbers: '2、7', directions: '南' },
    fr: { colors: 'Rouge, Violet', numbers: '2, 7', directions: 'Sud' },
    es: { colors: 'Rojo, Morado', numbers: '2, 7', directions: 'Sur' },
    zh: { colors: '紅色、紫色', numbers: '2、7', directions: '南方' },
  },
  Earth: {
    ko: { colors: '노랑, 갈색', numbers: '5, 10', directions: '중앙' },
    en: { colors: 'Yellow, Brown', numbers: '5, 10', directions: 'Center' },
    ja: { colors: '黄色、茶色', numbers: '5、10', directions: '中央' },
    fr: { colors: 'Jaune, Brun', numbers: '5, 10', directions: 'Centre' },
    es: { colors: 'Amarillo, Marrón', numbers: '5, 10', directions: 'Centro' },
    zh: { colors: '黄色、棕色', numbers: '5、10', directions: '中央' },
  },
  Metal: {
    ko: { colors: '흰색, 금색', numbers: '4, 9', directions: '서쪽' },
    en: { colors: 'White, Gold', numbers: '4, 9', directions: 'West' },
    ja: { colors: '白、金', numbers: '4、9', directions: '西' },
    fr: { colors: 'Blanc, Or', numbers: '4, 9', directions: 'Ouest' },
    es: { colors: 'Blanco, Dorado', numbers: '4, 9', directions: 'Oeste' },
    zh: { colors: '白色、金色', numbers: '4、9', directions: '西方' },
  },
  Water: {
    ko: { colors: '검정, 파랑', numbers: '1, 6', directions: '북쪽' },
    en: { colors: 'Black, Blue', numbers: '1, 6', directions: 'North' },
    ja: { colors: '黒、青', numbers: '1、6', directions: '北' },
    fr: { colors: 'Noir, Bleu', numbers: '1, 6', directions: 'Nord' },
    es: { colors: 'Negro, Azul', numbers: '1, 6', directions: 'Norte' },
    zh: { colors: '黑色、藍色', numbers: '1、6', directions: '北方' },
  },
};

const L: Record<Locale, {
  title: string; subtitle: string;
  birthYear: string; birthMonth: string; birthDay: string; birthHour: string;
  calcBtn: string; resetBtn: string;
  unknownHour: string;
  fourPillars: string; yearPillar: string; monthPillar: string; dayPillar: string; hourPillar: string;
  stem: string; branch: string; animal: string; element: string;
  dominantElement: string; strengths: string; weaknesses: string; career: string;
  luckyColors: string; luckyNumbers: string; luckyDirections: string;
  disclaimer: string;
  months: string[];
}> = {
  ko: {
    title: '사주 계산기', subtitle: '사주팔자(四柱八字) — 생년월일시 기반 운명 분석',
    birthYear: '태어난 해', birthMonth: '태어난 달', birthDay: '태어난 날', birthHour: '태어난 시간',
    calcBtn: '사주 보기', resetBtn: '초기화',
    unknownHour: '모름',
    fourPillars: '사주 (四柱)', yearPillar: '년주(年柱)', monthPillar: '월주(月柱)', dayPillar: '일주(日柱)', hourPillar: '시주(時柱)',
    stem: '천간', branch: '지지', animal: '띠', element: '오행',
    dominantElement: '주요 오행', strengths: '강점', weaknesses: '약점', career: '적합 직업',
    luckyColors: '행운의 색', luckyNumbers: '행운의 숫자', luckyDirections: '행운의 방위',
    disclaimer: '사주는 동양의 전통적인 운명론으로, 과학적 근거가 없습니다. 재미와 자기 이해의 도구로만 활용하세요.',
    months: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  },
  en: {
    title: 'Saju (사주) Calculator', subtitle: 'Four Pillars of Destiny — Birth chart analysis',
    birthYear: 'Birth Year', birthMonth: 'Birth Month', birthDay: 'Birth Day', birthHour: 'Birth Hour',
    calcBtn: 'Read My Saju', resetBtn: 'Reset',
    unknownHour: 'Unknown',
    fourPillars: 'Four Pillars (사주)', yearPillar: 'Year Pillar', monthPillar: 'Month Pillar', dayPillar: 'Day Pillar', hourPillar: 'Hour Pillar',
    stem: 'Heavenly Stem', branch: 'Earthly Branch', animal: 'Zodiac', element: 'Element',
    dominantElement: 'Dominant Element', strengths: 'Strengths', weaknesses: 'Weaknesses', career: 'Suited Careers',
    luckyColors: 'Lucky Colors', luckyNumbers: 'Lucky Numbers', luckyDirections: 'Lucky Directions',
    disclaimer: 'Saju is a traditional East Asian fortune-telling art with no scientific basis. Use it only for fun and self-reflection.',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
  ja: {
    title: '四柱推命計算機', subtitle: '生年月日時から運命を分析',
    birthYear: '生年', birthMonth: '生月', birthDay: '生日', birthHour: '生時',
    calcBtn: '四柱推命を見る', resetBtn: 'リセット',
    unknownHour: '不明',
    fourPillars: '四柱八字', yearPillar: '年柱', monthPillar: '月柱', dayPillar: '日柱', hourPillar: '時柱',
    stem: '天干', branch: '地支', animal: '干支', element: '五行',
    dominantElement: '主な五行', strengths: '長所', weaknesses: '短所', career: '適性',
    luckyColors: '幸運の色', luckyNumbers: '幸運の数字', luckyDirections: '幸運の方角',
    disclaimer: '四柱推命は東洋の伝統的な占術であり、科学的根拠はありません。楽しみと自己理解のツールとしてのみご利用ください。',
    months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  },
  fr: {
    title: 'Calculateur Saju (사주)', subtitle: "Quatre Piliers du Destin — Analyse de la carte natale",
    birthYear: 'Année de naissance', birthMonth: 'Mois de naissance', birthDay: 'Jour de naissance', birthHour: 'Heure de naissance',
    calcBtn: 'Lire mon Saju', resetBtn: 'Réinitialiser',
    unknownHour: 'Inconnu(e)',
    fourPillars: 'Quatre Piliers (사주)', yearPillar: 'Pilier Année', monthPillar: 'Pilier Mois', dayPillar: 'Pilier Jour', hourPillar: 'Pilier Heure',
    stem: 'Tige céleste', branch: 'Branche terrestre', animal: 'Zodiaque', element: 'Élément',
    dominantElement: 'Élément dominant', strengths: 'Points forts', weaknesses: 'Points faibles', career: 'Carrières adaptées',
    luckyColors: 'Couleurs porte-bonheur', luckyNumbers: 'Chiffres porte-bonheur', luckyDirections: 'Directions porte-bonheur',
    disclaimer: "Le Saju est un art divinatoire traditionnel est-asiatique sans base scientifique. Utilisez-le uniquement pour le plaisir et la réflexion personnelle.",
    months: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
  },
  es: {
    title: 'Calculadora Saju (사주)', subtitle: 'Cuatro Pilares del Destino — Análisis de carta natal',
    birthYear: 'Año de nacimiento', birthMonth: 'Mes de nacimiento', birthDay: 'Día de nacimiento', birthHour: 'Hora de nacimiento',
    calcBtn: 'Leer mi Saju', resetBtn: 'Reiniciar',
    unknownHour: 'Desconocido',
    fourPillars: 'Cuatro Pilares (사주)', yearPillar: 'Pilar Año', monthPillar: 'Pilar Mes', dayPillar: 'Pilar Día', hourPillar: 'Pilar Hora',
    stem: 'Tronco celestial', branch: 'Rama terrestre', animal: 'Zodíaco', element: 'Elemento',
    dominantElement: 'Elemento dominante', strengths: 'Fortalezas', weaknesses: 'Debilidades', career: 'Carreras adecuadas',
    luckyColors: 'Colores de suerte', luckyNumbers: 'Números de suerte', luckyDirections: 'Direcciones de suerte',
    disclaimer: 'El Saju es un arte adivinatorio tradicional de Asia Oriental sin base científica. Úsalo solo para entretenimiento y reflexión.',
    months: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  },
  zh: {
    title: '四柱推命计算器', subtitle: '依生年月日时分析四柱八字',
    birthYear: '出生年', birthMonth: '出生月', birthDay: '出生日', birthHour: '出生时辰',
    calcBtn: '查看我的四柱', resetBtn: '重置',
    unknownHour: '不知道',
    fourPillars: '四柱 (사주)', yearPillar: '年柱', monthPillar: '月柱', dayPillar: '日柱', hourPillar: '时柱',
    stem: '天干', branch: '地支', animal: '生肖', element: '五行',
    dominantElement: '主要五行', strengths: '优点', weaknesses: '缺点', career: '适合职业',
    luckyColors: '幸运颜色', luckyNumbers: '幸运数字', luckyDirections: '幸运方向',
    disclaimer: '四柱推命是东亚传统占术，没有科学依据。请仅用于娱乐和自我认识。',
    months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  },
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function SajuCalculator({ locale = 'ko' }: { locale?: Locale }) {
  const t = L[locale] ?? L.ko;

  const [year, setYear] = useState(1990);
  const [month, setMonth] = useState(6);
  const [day, setDay] = useState(15);
  const [hour, setHour] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const result = useMemo(() => {
    const yStem = getYearStem(year);
    const yBranch = getYearBranch(year);
    const mBranch = getMonthBranch(month);
    const mStem = getMonthStem(yStem, month);
    const dStem = getDayStem(year, month, day);
    const dBranch = getDayBranch(year, month, day);
    const hBranch = hour !== null ? getHourBranch(hour) : null;
    const hStem = hour !== null ? getHourStem(dStem, getHourBranch(hour)) : null;

    const pillars = [
      { label: t.yearPillar, stem: yStem, branch: yBranch },
      { label: t.monthPillar, stem: mStem, branch: mBranch },
      { label: t.dayPillar, stem: dStem, branch: dBranch },
      ...(hStem !== null && hBranch !== null ? [{ label: t.hourPillar, stem: hStem, branch: hBranch }] : []),
    ];

    // Dominant element: count stems + branches
    const elementCount: Record<string, number> = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
    pillars.forEach(p => {
      elementCount[STEM_ELEMENT[p.stem]] = (elementCount[STEM_ELEMENT[p.stem]] || 0) + 1;
      elementCount[BRANCH_ELEMENT[p.branch]] = (elementCount[BRANCH_ELEMENT[p.branch]] || 0) + 1;
    });
    const dominant = Object.entries(elementCount).sort(([, a], [, b]) => b - a)[0][0];

    return { pillars, elementCount, dominant };
  }, [year, month, day, hour, t.yearPillar, t.monthPillar, t.dayPillar, t.hourPillar]);

  const daysInMonth = new Date(year, month, 0).getDate();

  function handleCalc() {
    const clampedDay = Math.min(day, daysInMonth);
    if (day !== clampedDay) setDay(clampedDay);
    setDone(true);
  }

  const PillarCard = ({ label, stemIdx, branchIdx }: { label: string; stemIdx: number; branchIdx: number }) => {
    const elem = STEM_ELEMENT[stemIdx];
    const c = ELEMENT_COLORS[elem];
    return (
      <div className={`rounded-xl border p-3 text-center ${c.bg} ${c.border}`}>
        <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
        <div className="text-2xl font-bold text-gray-900 mb-0.5">{STEMS[stemIdx]}</div>
        <div className="text-xs text-gray-500 mb-1">{STEM_NAMES[locale][stemIdx]}</div>
        <div className="text-2xl font-bold text-gray-900 mb-0.5">{BRANCHES[branchIdx]}</div>
        <div className="text-xs text-gray-500 mb-1">{BRANCH_EMOJIS[branchIdx]} {BRANCH_ANIMALS[locale][branchIdx]}</div>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${c.text} bg-white bg-opacity-60`}>
          {ELEMENTS[elem][locale]}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-gray-500 mt-1">{t.subtitle}</p>
      </div>

      {/* Input */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        {/* Year */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.birthYear}</label>
          <div className="flex items-center gap-3">
            <input
              type="range" min={1920} max={2024} step={1} value={year}
              onChange={e => { setYear(Number(e.target.value)); setDone(false); }}
              className="flex-1 accent-indigo-600"
            />
            <span className="w-16 text-right font-bold text-indigo-700 text-sm">{year}</span>
          </div>
        </div>

        {/* Month + Day */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.birthMonth}</label>
            <select
              value={month}
              onChange={e => { setMonth(Number(e.target.value)); setDone(false); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {t.months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.birthDay}</label>
            <select
              value={Math.min(day, daysInMonth)}
              onChange={e => { setDay(Number(e.target.value)); setDone(false); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Hour */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.birthHour}</label>
          <select
            value={hour ?? ''}
            onChange={e => { setHour(e.target.value === '' ? null : Number(e.target.value)); setDone(false); }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">{t.unknownHour}</option>
            {HOURS.map(h => (
              <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCalc}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
        >
          {t.calcBtn}
        </button>
      </div>

      {/* Results */}
      {done && (
        <>
          {/* Four Pillars */}
          <div>
            <h2 className="text-sm font-bold text-indigo-700 mb-3">{t.fourPillars}</h2>
            <div className={`grid gap-3 ${result.pillars.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {result.pillars.map(p => (
                <PillarCard key={p.label} label={p.label} stemIdx={p.stem} branchIdx={p.branch} />
              ))}
            </div>
          </div>

          {/* Element balance */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">{t.dominantElement}</h2>
            <div className="space-y-2">
              {(['Wood', 'Fire', 'Earth', 'Metal', 'Water'] as const).map(el => {
                const c = ELEMENT_COLORS[el];
                const count = result.elementCount[el] || 0;
                const total = result.pillars.length * 2;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={el} className="flex items-center gap-2">
                    <span className="w-5 text-sm">{ELEMENT_EMOJIS[el]}</span>
                    <span className={`text-xs font-medium w-16 ${c.text}`}>{ELEMENTS[el][locale]}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full">
                      <div className={`h-2 rounded-full ${c.bg.replace('bg-', 'bg-').replace('-50', '-400')}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dominant element profile */}
          {(() => {
            const el = result.dominant;
            const c = ELEMENT_COLORS[el];
            const traits = ELEMENT_TRAITS[el][locale];
            const lucky = LUCKY[el][locale];
            return (
              <div className={`rounded-2xl border p-5 ${c.bg} ${c.border}`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{ELEMENT_EMOJIS[el]}</span>
                  <div>
                    <h2 className={`font-bold text-lg ${c.text}`}>{ELEMENTS[el][locale]}</h2>
                    <p className="text-xs text-gray-500">{t.dominantElement}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">✅ {t.strengths}</p>
                    <ul className="space-y-0.5">
                      {traits.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-gray-700 flex gap-1">
                          <span className="text-gray-400">·</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">⚠️ {t.weaknesses}</p>
                    <ul className="space-y-0.5">
                      {traits.weaknesses.map((w, i) => (
                        <li key={i} className="text-sm text-gray-700 flex gap-1">
                          <span className="text-gray-400">·</span>{w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-600 mb-0.5">💼 {t.career}</p>
                  <p className="text-sm text-gray-700">{traits.career}</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: t.luckyColors, value: lucky.colors, icon: '🎨' },
                    { label: t.luckyNumbers, value: lucky.numbers, icon: '🔢' },
                    { label: t.luckyDirections, value: lucky.directions, icon: '🧭' },
                  ].map(item => (
                    <div key={item.label} className="bg-white bg-opacity-60 rounded-lg p-2 text-center">
                      <p className="text-base mb-0.5">{item.icon}</p>
                      <p className="text-[10px] text-gray-500 mb-0.5">{item.label}</p>
                      <p className="text-xs font-semibold text-gray-800">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <p className="text-xs text-gray-400 text-center">{t.disclaimer}</p>

          <button
            onClick={() => setDone(false)}
            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium rounded-xl transition-colors"
          >
            {t.resetBtn}
          </button>
        </>
      )}
    </div>
  );
}

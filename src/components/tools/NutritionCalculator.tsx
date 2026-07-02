import React, { useState, useMemo } from 'react';

type Locale = 'ko' | 'en' | 'ja' | 'fr' | 'es' | 'zh';
type Gender = 'M' | 'F';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';
type Goal = 'lose' | 'maintain' | 'gain';
type WeightUnit = 'kg' | 'lbs';
type HeightUnit = 'cm' | 'ft';

const L: Record<Locale, {
  title: string; subtitle: string;
  age: string; gender: string; weight: string; height: string;
  activity: string; goal: string;
  male: string; female: string;
  sedentary: string; light: string; moderate: string; active: string; veryActive: string;
  lose: string; maintain: string; gain: string;
  calc: string; reset: string;
  calories: string; protein: string; carbs: string; fat: string;
  fiber: string; water: string;
  bmr: string; tdee: string; goalCalories: string;
  perDay: string; perMeal: string;
  macroTitle: string;
  weightUnit: string; heightUnit: string;
  tip: string;
  tips: Record<Goal, string[]>;
  bmiLabel: string; bmiValue: string;
  underweight: string; normal: string; overweight: string; obese: string;
}> = {
  ko: {
    title: '영양소 & 칼로리 계산기', subtitle: 'Daily Nutrition Planner',
    age: '나이', gender: '성별', weight: '체중 (kg)', height: '신장 (cm)',
    activity: '활동량', goal: '목표',
    male: '남성', female: '여성',
    sedentary: '비활동적 (주로 앉아서)', light: '가벼운 활동 (주 1-3회)', moderate: '보통 활동 (주 3-5회)', active: '활발한 활동 (주 6-7회)', veryActive: '매우 활발 (하루 2회 이상)',
    lose: '체중 감량', maintain: '체중 유지', gain: '체중 증가',
    calc: '계산하기', reset: '초기화',
    calories: '칼로리', protein: '단백질', carbs: '탄수화물', fat: '지방',
    fiber: '식이섬유', water: '하루 물 섭취량',
    bmr: '기초대사량 (BMR)', tdee: '총 에너지 소비량 (TDEE)', goalCalories: '목표 칼로리',
    perDay: '일일 권장량', perMeal: '1끼 기준 (3식)',
    macroTitle: '3대 영양소',
    weightUnit: 'kg', heightUnit: 'cm',
    tip: '💡 영양 팁',
    tips: {
      lose: ['단백질을 충분히 섭취해 근손실 방지', '칼로리는 500kcal 이상 줄이지 마세요', '물을 충분히 마시면 포만감 증가'],
      maintain: ['균형 잡힌 식단으로 꾸준히 유지', '주 3-5회 규칙적인 운동 권장', '과도한 설탕·가공식품 제한'],
      gain: ['운동 후 30분 이내 단백질 섭취', '양질의 탄수화물로 에너지 보충', '점진적으로 칼로리 늘리기'],
    },
    bmiLabel: 'BMI', bmiValue: '',
    underweight: '저체중', normal: '정상', overweight: '과체중', obese: '비만',
  },
  en: {
    title: 'Nutrition & Calorie Calculator', subtitle: 'Daily Macro & Calorie Planner',
    age: 'Age', gender: 'Gender', weight: 'Weight (kg)', height: 'Height (cm)',
    activity: 'Activity Level', goal: 'Goal',
    male: 'Male', female: 'Female',
    sedentary: 'Sedentary (desk job)', light: 'Light (1-3x/week)', moderate: 'Moderate (3-5x/week)', active: 'Active (6-7x/week)', veryActive: 'Very Active (2x/day)',
    lose: 'Lose Weight', maintain: 'Maintain', gain: 'Gain Muscle',
    calc: 'Calculate', reset: 'Reset',
    calories: 'Calories', protein: 'Protein', carbs: 'Carbohydrates', fat: 'Fat',
    fiber: 'Fiber', water: 'Daily Water',
    bmr: 'BMR (Basal Metabolic Rate)', tdee: 'TDEE (Total Daily Energy)', goalCalories: 'Goal Calories',
    perDay: 'Per Day', perMeal: 'Per Meal (÷3)',
    macroTitle: 'Macronutrients',
    weightUnit: 'kg', heightUnit: 'cm',
    tip: '💡 Nutrition Tips',
    tips: {
      lose: ['Keep protein high to preserve muscle', "Don't cut more than 500 kcal/day", 'Drink plenty of water to reduce hunger'],
      maintain: ['Balance macros consistently', 'Exercise 3-5x/week', 'Limit sugar and processed foods'],
      gain: ['Eat protein within 30min post-workout', 'Use quality carbs for energy', 'Increase calories gradually'],
    },
    bmiLabel: 'BMI', bmiValue: '',
    underweight: 'Underweight', normal: 'Normal', overweight: 'Overweight', obese: 'Obese',
  },
  ja: {
    title: '栄養素・カロリー計算機', subtitle: '1日のマクロ栄養素プランナー',
    age: '年齢', gender: '性別', weight: '体重（kg）', height: '身長（cm）',
    activity: '活動量', goal: '目標',
    male: '男性', female: '女性',
    sedentary: '非活動的（座り仕事）', light: '軽い活動（週1-3回）', moderate: '普通（週3-5回）', active: '活発（週6-7回）', veryActive: '非常に活発（1日2回以上）',
    lose: '体重減少', maintain: '体重維持', gain: '筋肉増量',
    calc: '計算する', reset: 'リセット',
    calories: 'カロリー', protein: 'たんぱく質', carbs: '炭水化物', fat: '脂質',
    fiber: '食物繊維', water: '1日の水分摂取量',
    bmr: '基礎代謝量（BMR）', tdee: '総エネルギー消費量（TDEE）', goalCalories: '目標カロリー',
    perDay: '1日あたり', perMeal: '1食あたり（÷3）',
    macroTitle: '3大栄養素',
    weightUnit: 'kg', heightUnit: 'cm',
    tip: '💡 栄養のヒント',
    tips: {
      lose: ['筋肉量維持のためたんぱく質を十分に', '500kcal以上減らさないように', '十分な水分摂取で満腹感UP'],
      maintain: ['バランスの良い食事を継続', '週3-5回の運動を推奨', '過剰な糖分・加工食品は制限'],
      gain: ['運動後30分以内にたんぱく質摂取', '良質な炭水化物でエネルギー補給', '段階的にカロリーを増やす'],
    },
    bmiLabel: 'BMI', bmiValue: '',
    underweight: '低体重', normal: '正常', overweight: '過体重', obese: '肥満',
  },
  fr: {
    title: 'Calculateur Nutrition & Calories', subtitle: 'Planificateur macros quotidiens',
    age: 'Âge', gender: 'Genre', weight: 'Poids (kg)', height: 'Taille (cm)',
    activity: "Niveau d'activité", goal: 'Objectif',
    male: 'Homme', female: 'Femme',
    sedentary: 'Sédentaire', light: 'Légère (1-3x/sem)', moderate: 'Modérée (3-5x/sem)', active: 'Active (6-7x/sem)', veryActive: 'Très active (2x/jour)',
    lose: 'Perdre du poids', maintain: 'Maintenir', gain: 'Prendre du muscle',
    calc: 'Calculer', reset: 'Réinitialiser',
    calories: 'Calories', protein: 'Protéines', carbs: 'Glucides', fat: 'Lipides',
    fiber: 'Fibres', water: 'Eau quotidienne',
    bmr: 'Métabolisme de base (BMR)', tdee: 'Dépense énergétique totale (TDEE)', goalCalories: 'Calories cible',
    perDay: 'Par jour', perMeal: 'Par repas (÷3)',
    macroTitle: 'Macronutriments',
    weightUnit: 'kg', heightUnit: 'cm',
    tip: '💡 Conseils nutritionnels',
    tips: {
      lose: ['Maintenir les protéines pour préserver le muscle', 'Ne pas réduire de plus de 500 kcal/jour', 'Boire beaucoup pour réduire la faim'],
      maintain: ['Équilibrer les macros régulièrement', 'Faire du sport 3-5x/semaine', 'Limiter sucres et aliments transformés'],
      gain: ['Protéines dans les 30min post-entraînement', 'Glucides de qualité pour l\'énergie', 'Augmenter les calories progressivement'],
    },
    bmiLabel: 'IMC', bmiValue: '',
    underweight: 'Insuffisance pondérale', normal: 'Normal', overweight: 'Surpoids', obese: 'Obèse',
  },
  es: {
    title: 'Calculadora de Nutrición y Calorías', subtitle: 'Planificador de macros diarios',
    age: 'Edad', gender: 'Género', weight: 'Peso (kg)', height: 'Altura (cm)',
    activity: 'Nivel de actividad', goal: 'Objetivo',
    male: 'Hombre', female: 'Mujer',
    sedentary: 'Sedentario', light: 'Ligero (1-3x/sem)', moderate: 'Moderado (3-5x/sem)', active: 'Activo (6-7x/sem)', veryActive: 'Muy activo (2x/día)',
    lose: 'Perder peso', maintain: 'Mantener', gain: 'Ganar músculo',
    calc: 'Calcular', reset: 'Restablecer',
    calories: 'Calorías', protein: 'Proteínas', carbs: 'Carbohidratos', fat: 'Grasas',
    fiber: 'Fibra', water: 'Agua diaria',
    bmr: 'Metabolismo basal (BMR)', tdee: 'Gasto energético total (TDEE)', goalCalories: 'Calorías objetivo',
    perDay: 'Por día', perMeal: 'Por comida (÷3)',
    macroTitle: 'Macronutrientes',
    weightUnit: 'kg', heightUnit: 'cm',
    tip: '💡 Consejos nutricionales',
    tips: {
      lose: ['Mantén proteínas altas para preservar músculo', 'No reduzcas más de 500 kcal/día', 'Bebe agua para reducir el hambre'],
      maintain: ['Equilibra macros constantemente', 'Ejercita 3-5x/semana', 'Limita azúcares y procesados'],
      gain: ['Proteínas en los 30 min post-entrenamiento', 'Carbohidratos de calidad para energía', 'Aumenta calorías progresivamente'],
    },
    bmiLabel: 'IMC', bmiValue: '',
    underweight: 'Bajo peso', normal: 'Normal', overweight: 'Sobrepeso', obese: 'Obesidad',
  },
  zh: {
    title: '营养素与卡路里计算器', subtitle: '每日宏量营养素规划师',
    age: '年龄', gender: '性别', weight: '体重（kg）', height: '身高（cm）',
    activity: '活动量', goal: '目标',
    male: '男性', female: '女性',
    sedentary: '久坐不动', light: '轻度活动（每周1-3次）', moderate: '中度活动（每周3-5次）', active: '高度活动（每周6-7次）', veryActive: '非常活跃（每天2次以上）',
    lose: '减重', maintain: '维持体重', gain: '增肌',
    calc: '计算', reset: '重置',
    calories: '卡路里', protein: '蛋白质', carbs: '碳水化合物', fat: '脂肪',
    fiber: '膳食纤维', water: '每日饮水量',
    bmr: '基础代谢率（BMR）', tdee: '每日总能量消耗（TDEE）', goalCalories: '目标卡路里',
    perDay: '每日', perMeal: '每餐（÷3）',
    macroTitle: '三大营养素',
    weightUnit: 'kg', heightUnit: 'cm',
    tip: '💡 营养建议',
    tips: {
      lose: ['摄取足够蛋白质防止肌肉流失', '每日热量缺口不超过500kcal', '多喝水增加饱腹感'],
      maintain: ['均衡摄取三大营养素', '建议每周运动3-5次', '限制糖分和加工食品'],
      gain: ['运动后30分钟内补充蛋白质', '优质碳水化合物补充能量', '逐步增加卡路里摄入'],
    },
    bmiLabel: 'BMI', bmiValue: '',
    underweight: '体重过轻', normal: '正常', overweight: '过重', obese: '肥胖',
  },
};

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

const GOAL_ADJUSTMENTS: Record<Goal, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

function calcBMR(weight: number, height: number, age: number, gender: Gender): number {
  // Mifflin-St Jeor equation
  if (gender === 'M') return 10 * weight + 6.25 * height - 5 * age + 5;
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

function calcBMI(weight: number, height: number): number {
  return weight / Math.pow(height / 100, 2);
}

const NutritionCalculator: React.FC<{ locale?: Locale }> = ({ locale = 'en' }) => {
  const t = L[locale] ?? L.en;
  const [age, setAge] = useState(28);
  const [gender, setGender] = useState<Gender>('M');
  const [weight, setWeight] = useState(70);
  const [height, setHeight] = useState(170);
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<Goal>('maintain');

  const result = useMemo(() => {
    const bmr = calcBMR(weight, height, age, gender);
    const tdee = bmr * ACTIVITY_MULTIPLIERS[activity];
    const goalCals = tdee + GOAL_ADJUSTMENTS[goal];
    const bmi = calcBMI(weight, height);

    // Macro splits based on goal
    const proteinPct = goal === 'gain' ? 0.30 : goal === 'lose' ? 0.35 : 0.25;
    const fatPct = 0.25;
    const carbsPct = 1 - proteinPct - fatPct;

    const proteinG = Math.round((goalCals * proteinPct) / 4);
    const fatG = Math.round((goalCals * fatPct) / 9);
    const carbsG = Math.round((goalCals * carbsPct) / 4);
    const fiberG = Math.round(goalCals / 1000 * 14); // 14g/1000kcal
    const waterL = +(weight * 0.033).toFixed(1);

    return { bmr: Math.round(bmr), tdee: Math.round(tdee), goalCals: Math.round(goalCals), proteinG, fatG, carbsG, fiberG, waterL, bmi };
  }, [age, gender, weight, height, activity, goal]);

  const bmiCategory = result.bmi < 18.5 ? t.underweight : result.bmi < 25 ? t.normal : result.bmi < 30 ? t.overweight : t.obese;
  const bmiColor = result.bmi < 18.5 ? 'text-info' : result.bmi < 25 ? 'text-success' : result.bmi < 30 ? 'text-warning' : 'text-destructive';
  const goalColor = goal === 'lose' ? 'text-info' : goal === 'gain' ? 'text-success' : 'text-primary';

  const macros = [
    { label: t.protein, value: result.proteinG, unit: 'g', color: 'bg-info', pct: 0 },
    { label: t.carbs, value: result.carbsG, unit: 'g', color: 'bg-warning', pct: 0 },
    { label: t.fat, value: result.fatG, unit: 'g', color: 'bg-destructive/40', pct: 0 },
  ];
  const totalMacroG = result.proteinG + result.carbsG + result.fatG;
  macros.forEach(m => { m.pct = Math.round((m.value / totalMacroG) * 100); });

  return (
    <div className="not-prose my-8 p-6 sm:p-10 bg-card border border-border rounded-4xl shadow-sm max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-black">{t.title}</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <label className="text-xs font-black uppercase tracking-widest text-muted-foreground block mb-1">{t.age}: {age}</label>
          <input type="range" min={15} max={80} value={age} onChange={e => setAge(Number(e.target.value))} className="w-full accent-primary" />
        </div>
        <div>
          <label className="text-xs font-black uppercase tracking-widest text-muted-foreground block mb-1.5">{t.gender}</label>
          <div className="flex gap-2">
            {(['M','F'] as Gender[]).map(g => (
              <button key={g} onClick={() => setGender(g)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-black border-2 transition-all ${gender === g ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}>
                {g === 'M' ? t.male : t.female}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-black uppercase tracking-widest text-muted-foreground block mb-1">{t.weight}: {weight} kg</label>
          <input type="range" min={40} max={150} value={weight} onChange={e => setWeight(Number(e.target.value))} className="w-full accent-primary" />
        </div>
        <div>
          <label className="text-xs font-black uppercase tracking-widest text-muted-foreground block mb-1">{t.height}: {height} cm</label>
          <input type="range" min={140} max={210} value={height} onChange={e => setHeight(Number(e.target.value))} className="w-full accent-primary" />
        </div>
      </div>

      {/* Activity */}
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">{t.activity}</p>
        <div className="flex flex-col gap-1">
          {(['sedentary','light','moderate','active','veryActive'] as ActivityLevel[]).map(a => (
            <button key={a} onClick={() => setActivity(a)}
              className={`py-2 px-3 rounded-xl text-xs font-bold border-2 text-left transition-all ${activity === a ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}>
              {t[a]}
            </button>
          ))}
        </div>
      </div>

      {/* Goal */}
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">{t.goal}</p>
        <div className="grid grid-cols-3 gap-2">
          {(['lose','maintain','gain'] as Goal[]).map(g => (
            <button key={g} onClick={() => setGoal(g)}
              className={`py-2 rounded-xl text-xs font-black border-2 transition-all ${goal === g ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}>
              {t[g]}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {/* Goal calories hero */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 sm:col-span-1 p-5 rounded-2xl bg-primary/10 border border-primary/20 text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.goalCalories}</p>
            <p className={`text-4xl font-black ${goalColor}`}>{result.goalCals.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">kcal / {t.perDay}</p>
          </div>
          <div className="p-4 rounded-2xl bg-muted/20 border border-border text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.bmr}</p>
            <p className="text-xl font-black">{result.bmr.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">kcal</p>
          </div>
          <div className="p-4 rounded-2xl bg-muted/20 border border-border text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.tdee}</p>
            <p className="text-xl font-black">{result.tdee.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">kcal</p>
          </div>
        </div>

        {/* BMI */}
        <div className="p-4 rounded-2xl bg-muted/20 border border-border flex justify-between items-center">
          <span className="text-sm font-bold">{t.bmiLabel}</span>
          <span className={`text-2xl font-black ${bmiColor}`}>{result.bmi.toFixed(1)} <span className="text-sm">{bmiCategory}</span></span>
        </div>

        {/* Macros */}
        <div className="p-4 rounded-2xl bg-muted/20 border border-border">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">{t.macroTitle}</p>
          {/* Visual bar */}
          <div className="w-full h-4 rounded-full overflow-hidden flex mb-3">
            {macros.map(m => (
              <div key={m.label} className={`h-full ${m.color}`} style={{ width: `${m.pct}%` }} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {macros.map(m => (
              <div key={m.label} className="text-center">
                <div className={`w-3 h-3 ${m.color} rounded-full mx-auto mb-1`} />
                <p className="text-[10px] font-bold text-muted-foreground">{m.label}</p>
                <p className="text-lg font-black">{m.value}g</p>
                <p className="text-[10px] text-muted-foreground">{m.pct}%</p>
              </div>
            ))}
          </div>
        </div>

        {/* Other nutrients */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-muted/20 border border-border text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.fiber}</p>
            <p className="text-2xl font-black">{result.fiberG}g</p>
          </div>
          <div className="p-4 rounded-2xl bg-info/10 border border-info/30 text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.water}</p>
            <p className="text-2xl font-black text-info">{result.waterL}L</p>
          </div>
        </div>

        {/* Per meal */}
        <div className="p-4 rounded-2xl bg-muted/20 border border-border">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{t.perMeal}</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: t.calories, value: Math.round(result.goalCals / 3).toLocaleString(), unit: 'kcal' },
              { label: t.protein, value: Math.round(result.proteinG / 3), unit: 'g' },
              { label: t.carbs, value: Math.round(result.carbsG / 3), unit: 'g' },
              { label: t.fat, value: Math.round(result.fatG / 3), unit: 'g' },
            ].map(({ label, value, unit }) => (
              <div key={label}>
                <p className="text-[9px] font-bold text-muted-foreground">{label}</p>
                <p className="text-lg font-black">{value}</p>
                <p className="text-[10px] text-muted-foreground">{unit}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="p-4 rounded-2xl bg-success/10 border border-success/30">
          <p className="text-xs font-black mb-2">{t.tip}</p>
          <ul className="space-y-1">
            {t.tips[goal].map((tip: string) => (
              <li key={tip} className="text-xs text-muted-foreground flex gap-2">
                <span className="text-success shrink-0">•</span>{tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NutritionCalculator;

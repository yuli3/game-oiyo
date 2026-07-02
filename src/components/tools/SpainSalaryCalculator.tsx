import React, { useState } from 'react';
import { GameContainer } from '@/components/ui/game/GamePrimitives';

interface Props {
    locale?: 'es' | 'en';
}

const labels = {
    es: {
        title: 'Calculadora de salario neto España 2024',
        desc: 'Estima tus cotizaciones a la Seguridad Social e IRPF según el baremo 2024.',
        annualGross: 'Salario bruto anual (€)',
        situation: 'Situación familiar',
        single: 'Soltero/a (sin hijos)',
        married: 'Casado/a (sin hijos)',
        married1child: 'Con 1 hijo/a',
        married2children: 'Con 2 hijos/as',
        married3children: 'Con 3 o más hijos/as',
        monthlyGross: 'Bruto mensual',
        monthlyNet: 'Neto mensual (tras IRPF)',
        annualNet: 'Neto anual',
        cotizaciones: 'Cotizaciones a la SS (mensual)',
        contingencias: 'Contingencias comunes (4,70%)',
        desempleo: 'Desempleo (1,55%)',
        fp: 'Formación profesional (0,10%)',
        mei: 'MEI Pensiones (0,12%)',
        totalCotizaciones: 'Total SS empleado',
        netBeforeIR: 'Salario neto antes de IRPF (mensual)',
        irAnnual: 'IRPF anual estimado',
        irMonthly: 'IRPF mensual estimado',
        note: '* Estimación basada en el baremo IRPF 2024, mínimo personal de 5.550 € y base máxima de cotización de 56.646 €/año. El importe real depende de otras deducciones y circunstancias personales.',
    },
    en: {
        title: 'Spain Net Salary Calculator 2024',
        desc: 'Estimate your Social Security contributions and IRPF income tax under Spain\'s 2024 scale.',
        annualGross: 'Annual Gross Salary (€)',
        situation: 'Family situation',
        single: 'Single (no children)',
        married: 'Married (no children)',
        married1child: 'With 1 child',
        married2children: 'With 2 children',
        married3children: 'With 3+ children',
        monthlyGross: 'Monthly Gross',
        monthlyNet: 'Monthly Net (after IRPF)',
        annualNet: 'Annual Net',
        cotizaciones: 'Social Security contributions (monthly)',
        contingencias: 'Common contingencies (4.70%)',
        desempleo: 'Unemployment (1.55%)',
        fp: 'Professional training (0.10%)',
        mei: 'MEI Pensions (0.12%)',
        totalCotizaciones: 'Total employee SS',
        netBeforeIR: 'Net salary before IRPF (monthly)',
        irAnnual: 'IRPF annual estimate',
        irMonthly: 'IRPF monthly estimate',
        note: '* Estimate based on 2024 IRPF scale, personal minimum of €5,550 and maximum contribution base of €56,646/year. Actual amount depends on other deductions and personal circumstances.',
    },
} as const;

// SS 2024 caps
const SS_BASE_CAP_ANNUAL = 56_646; // 4,720.50 €/month × 12

interface SSResult {
    cc: number;
    desempleo: number;
    fp: number;
    mei: number;
    total: number;
}

function calcSS(annualGross: number): SSResult {
    const base = Math.min(annualGross, SS_BASE_CAP_ANNUAL);
    const cc       = Math.round(base * 0.047);
    const desempleo = Math.round(base * 0.0155);
    const fp       = Math.round(base * 0.001);
    const mei      = Math.round(base * 0.0012);
    const total    = cc + desempleo + fp + mei;
    return { cc, desempleo, fp, mei, total };
}

// Mínimo personal 2024 (base: 5,550 €; + reducción por hijo, no implemented here)
const MINIMO_PERSONAL_BASE = 5_550;
// Additional mínimo by family situation
const MINIMO_FAMILIAR: Record<number, number> = {
    0: 0,       // sin hijos
    1: 2_400,   // 1 hijo
    2: 2_400 + 2_700, // 2 hijos (2400+2700)
    3: 2_400 + 2_700 + 4_000, // 3+ hijos (add 4000 for 3rd)
};

function calcIRPF(annualGross: number, ssTotal: number, children: number): number {
    const minimoTotal = MINIMO_PERSONAL_BASE + (MINIMO_FAMILIAR[Math.min(children, 3)] ?? 0);
    // Rendimiento del trabajo after SS
    const rendimiento = Math.max(0, annualGross - ssTotal);

    // Reducción por rendimientos del trabajo (artículo 20 LIRPF 2024)
    // For employees earning ≤ 14,852 € net: reduction up to 6,498 €
    let reduccionTrabajo = 0;
    if (rendimiento <= 14_852) {
        reduccionTrabajo = 6_498;
    } else if (rendimiento <= 17_673.52) {
        reduccionTrabajo = Math.max(0, 6_498 - (rendimiento - 14_852) * 1.14286);
    }

    const baseImponible = Math.max(0, rendimiento - reduccionTrabajo - minimoTotal);

    // IRPF brackets 2024 (escala general + autonómica combinada approximation)
    const brackets: [number, number][] = [
        [12_450, 0.19],
        [20_200 - 12_450, 0.24],
        [35_200 - 20_200, 0.30],
        [60_000 - 35_200, 0.37],
        [300_000 - 60_000, 0.45],
    ];

    let tax = 0;
    let remaining = baseImponible;
    for (const [limit, rate] of brackets) {
        if (remaining <= 0) break;
        const taxable = Math.min(remaining, limit);
        tax += taxable * rate;
        remaining -= taxable;
    }
    if (remaining > 0) tax += remaining * 0.47;

    return Math.round(Math.max(0, tax));
}

type FamilySituation = { label: keyof typeof labels['es']; children: number };

const FAMILY_OPTIONS: FamilySituation[] = [
    { label: 'single',           children: 0 },
    { label: 'married',          children: 0 },
    { label: 'married1child',    children: 1 },
    { label: 'married2children', children: 2 },
    { label: 'married3children', children: 3 },
];

const SpainSalaryCalculator: React.FC<Props> = ({ locale = 'es' }) => {
    const t = labels[locale === 'es' ? 'es' : 'en'];

    const [annualGross, setAnnualGross] = useState(30_000);
    const [familyIdx, setFamilyIdx] = useState(0);

    const situation = FAMILY_OPTIONS[familyIdx];
    const monthlyGross = Math.round(annualGross / 12);
    const ss = calcSS(annualGross);

    const netBeforeIRAnnual = Math.max(0, annualGross - ss.total);
    const netBeforeIRMonthly = Math.round(netBeforeIRAnnual / 12);

    const irAnnual = calcIRPF(annualGross, ss.total, situation.children);
    const irMonthly = Math.round(irAnnual / 12);

    const annualNet = Math.max(0, netBeforeIRAnnual - irAnnual);
    const monthlyNet = Math.round(annualNet / 12);

    const fmtEuro = (n: number) => `${n.toLocaleString('es-ES')} €`;

    const handleReset = () => {
        setAnnualGross(30_000);
        setFamilyIdx(0);
    };

    const monthlySSRows = [
        { label: t.contingencias, value: Math.round(ss.cc / 12) },
        { label: t.desempleo,     value: Math.round(ss.desempleo / 12) },
        { label: t.fp,            value: Math.round(ss.fp / 12) },
        { label: t.mei,           value: Math.round(ss.mei / 12) },
    ];

    return (
        <GameContainer title={t.title} subtitle="Simulador salario neto — España 2024" onReset={handleReset}>
            <div className="flex flex-col gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>

                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-foreground">{t.annualGross}</label>
                        <input
                            type="number"
                            value={annualGross}
                            onChange={(e) => setAnnualGross(Math.max(0, Number(e.target.value)))}
                            step={1_000}
                            min={0}
                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30"
                            aria-label={t.annualGross}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-foreground">{t.situation}</label>
                        <select
                            value={familyIdx}
                            onChange={(e) => setFamilyIdx(Number(e.target.value))}
                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30"
                            aria-label={t.situation}
                        >
                            {FAMILY_OPTIONS.map((opt, i) => (
                                <option key={i} value={i}>
                                    {t[opt.label] as string}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-5 flex flex-col gap-1">
                        <span className="text-xs font-bold text-destructive uppercase tracking-wide">{t.monthlyGross}</span>
                        <span className="text-2xl font-bold text-destructive">{fmtEuro(monthlyGross)}</span>
                    </div>
                    <div className="rounded-2xl bg-destructive p-5 flex flex-col gap-1">
                        <span className="text-xs font-bold text-destructive uppercase tracking-wide">{t.monthlyNet}</span>
                        <span className="text-2xl font-bold text-white">{fmtEuro(monthlyNet)}</span>
                    </div>
                    <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-5 flex flex-col gap-1">
                        <span className="text-xs font-bold text-destructive uppercase tracking-wide">{t.annualNet}</span>
                        <span className="text-2xl font-bold text-destructive">{fmtEuro(annualNet)}</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 p-6 flex flex-col gap-3">
                    <h4 className="text-sm font-bold text-foreground">{t.cotizaciones}</h4>
                    <div className="flex flex-col gap-2">
                        {monthlySSRows.map(({ label, value }) => (
                            <div key={label} className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-medium">{label}</span>
                                <span className="font-bold text-foreground">{fmtEuro(value)}</span>
                            </div>
                        ))}
                        <div className="border-t border-border mt-2 pt-2 flex justify-between items-center">
                            <span className="text-sm font-bold text-foreground">{t.totalCotizaciones}</span>
                            <span className="text-sm font-bold text-destructive">{fmtEuro(Math.round(ss.total / 12))}</span>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 p-6 flex flex-col gap-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-muted-foreground">{t.netBeforeIR}</span>
                        <span className="font-bold text-foreground">{fmtEuro(netBeforeIRMonthly)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-muted-foreground">{t.irAnnual}</span>
                        <span className="font-bold text-destructive">{fmtEuro(irAnnual)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-border pt-2 mt-1">
                        <span className="font-bold text-foreground">{t.irMonthly}</span>
                        <span className="font-bold text-destructive">{fmtEuro(irMonthly)}</span>
                    </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">{t.note}</p>
            </div>
        </GameContainer>
    );
};

export default SpainSalaryCalculator;

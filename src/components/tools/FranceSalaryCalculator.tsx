import React, { useState } from 'react';
import { GameContainer } from '@/components/ui/game/GamePrimitives';

interface Props {
    locale?: 'fr' | 'en';
}

type FamilyParts = 1 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5;

const labels = {
    fr: {
        title: 'Calculateur de salaire net France 2024',
        desc: 'Estimez vos cotisations sociales et votre impôt sur le revenu selon le barème 2024.',
        annualGross: 'Salaire brut annuel (€)',
        situation: 'Situation familiale',
        single: 'Célibataire (1 part)',
        married: 'Marié / Pacsé (2 parts)',
        married1child: 'Marié + 1 enfant (2,5 parts)',
        married2children: 'Marié + 2 enfants (3 parts)',
        married3children: 'Marié + 3 enfants (4 parts)',
        monthlyGross: 'Brut mensuel',
        monthlyNet: 'Net mensuel (avant IR)',
        annualNet: 'Net annuel (après IR)',
        cotisations: 'Cotisations salariales (mensuel)',
        csgCrds: 'CSG/CRDS (9.53% × 98.25%)',
        retraiteBase: 'Retraite de base CNAV (6.9% plafonné)',
        retraiteCompl1: 'AGIRC-ARRCO T1 (3.15% ≤ 1×PASS)',
        retraiteCompl2: 'AGIRC-ARRCO T2 (8.64% entre 1–8×PASS)',
        totalCotisations: 'Total cotisations',
        netBeforeIR: 'Salaire net avant impôt (mensuel)',
        irAnnual: "Impôt sur le revenu (annuel estimé)",
        irMonthly: "IR mensuel estimé",
        note: '* Estimation basée sur le barème 2024 et le PASS 2024 (46 368 €). Le montant réel dépend de votre déclaration fiscale et des crédits d\'impôt applicables.',
    },
    en: {
        title: 'France Net Salary Calculator 2024',
        desc: 'Estimate your social contributions and income tax under the 2024 scale.',
        annualGross: 'Annual Gross Salary (€)',
        situation: 'Family situation',
        single: 'Single (1 part)',
        married: 'Married / PACS (2 parts)',
        married1child: 'Married + 1 child (2.5 parts)',
        married2children: 'Married + 2 children (3 parts)',
        married3children: 'Married + 3 children (4 parts)',
        monthlyGross: 'Monthly Gross',
        monthlyNet: 'Monthly Net (before IR)',
        annualNet: 'Annual Net (after IR)',
        cotisations: 'Employee contributions (monthly)',
        csgCrds: 'CSG/CRDS (9.53% × 98.25%)',
        retraiteBase: 'Basic pension CNAV (6.9% capped)',
        retraiteCompl1: 'AGIRC-ARRCO T1 (3.15% ≤ 1×PASS)',
        retraiteCompl2: 'AGIRC-ARRCO T2 (8.64% 1–8×PASS)',
        totalCotisations: 'Total contributions',
        netBeforeIR: 'Net salary before income tax (monthly)',
        irAnnual: 'Income tax (annual estimate)',
        irMonthly: 'IR monthly estimate',
        note: '* Estimate based on 2024 tax scale and PASS 2024 (€46,368). The actual amount depends on your tax return and applicable credits.',
    },
} as const;

// PASS 2024
const PASS = 46_368;

/** CSG/CRDS: 9.7% × 98.25% assiette = ~9.5303% */
const CSG_CRDS_RATE = 0.097 * 0.9825;

/** Calcul cotisations salariales annuelles */
function calcCotisations(annualGross: number): {
    csgCrds: number;
    retraiteBase: number;
    retraiteCompl1: number;
    retraiteCompl2: number;
    total: number;
} {
    const csgCrds = Math.round(annualGross * CSG_CRDS_RATE);

    // Retraite base CNAV: 6.9% plafonné au PASS
    const retraiteBase = Math.round(Math.min(annualGross, PASS) * 0.069);

    // AGIRC-ARRCO Tranche 1: 3.15% jusqu'à 1×PASS
    const retraiteCompl1 = Math.round(Math.min(annualGross, PASS) * 0.0315);

    // AGIRC-ARRCO Tranche 2: 8.64% entre 1× et 8×PASS
    const t2Base = Math.max(0, Math.min(annualGross, PASS * 8) - PASS);
    const retraiteCompl2 = Math.round(t2Base * 0.0864);

    const total = csgCrds + retraiteBase + retraiteCompl1 + retraiteCompl2;
    return { csgCrds, retraiteBase, retraiteCompl1, retraiteCompl2, total };
}

/** Calcul IR 2024 avec quotient familial */
function calcIR(annualGross: number, cotisationsTotal: number, parts: number): number {
    // Salaire net imposable = brut - cotisations
    const netImposable = annualGross - cotisationsTotal;

    // Abattement forfaitaire 10% (min 472, max 12 829)
    const abattement = Math.max(472, Math.min(12_829, Math.round(netImposable * 0.1)));
    const revenuImposable = Math.max(0, netImposable - abattement);

    // Quotient familial: revenu par part
    const revenuParPart = revenuImposable / parts;

    // Barème progressif 2024 (par part)
    let irParPart = 0;
    if (revenuParPart <= 11_294) {
        irParPart = 0;
    } else if (revenuParPart <= 28_797) {
        irParPart = (revenuParPart - 11_294) * 0.11;
    } else if (revenuParPart <= 82_341) {
        irParPart = (28_797 - 11_294) * 0.11 + (revenuParPart - 28_797) * 0.30;
    } else if (revenuParPart <= 177_106) {
        irParPart =
            (28_797 - 11_294) * 0.11 +
            (82_341 - 28_797) * 0.30 +
            (revenuParPart - 82_341) * 0.41;
    } else {
        irParPart =
            (28_797 - 11_294) * 0.11 +
            (82_341 - 28_797) * 0.30 +
            (177_106 - 82_341) * 0.41 +
            (revenuParPart - 177_106) * 0.45;
    }

    return Math.max(0, Math.round(irParPart * parts));
}

const FAMILY_OPTIONS: { value: FamilyParts; labelKey: keyof (typeof labels)['fr'] }[] = [
    { value: 1, labelKey: 'single' },
    { value: 2, labelKey: 'married' },
    { value: 2.5, labelKey: 'married1child' },
    { value: 3, labelKey: 'married2children' },
    { value: 4, labelKey: 'married3children' },
];

const FranceSalaryCalculator: React.FC<Props> = ({ locale = 'fr' }) => {
    const t = labels[locale === 'fr' ? 'fr' : 'en'];

    const [annualGross, setAnnualGross] = useState(40_000);
    const [parts, setParts] = useState<FamilyParts>(1);

    const monthlyGross = Math.round(annualGross / 12);
    const cotisations = calcCotisations(annualGross);
    const annualCotisations = cotisations.total;

    const netBeforeIRAnnual = Math.max(0, annualGross - annualCotisations);
    const netBeforeIRMonthly = Math.round(netBeforeIRAnnual / 12);

    const irAnnual = calcIR(annualGross, annualCotisations, parts);
    const irMonthly = Math.round(irAnnual / 12);

    const annualNet = Math.max(0, netBeforeIRAnnual - irAnnual);
    const monthlyNet = Math.round(annualNet / 12);

    const fmtEuro = (n: number) => `${n.toLocaleString('fr-FR')} €`;

    const monthlyDeductionRows = [
        { label: t.csgCrds, value: Math.round(cotisations.csgCrds / 12) },
        { label: t.retraiteBase, value: Math.round(cotisations.retraiteBase / 12) },
        { label: t.retraiteCompl1, value: Math.round(cotisations.retraiteCompl1 / 12) },
        ...(cotisations.retraiteCompl2 > 0
            ? [{ label: t.retraiteCompl2, value: Math.round(cotisations.retraiteCompl2 / 12) }]
            : []),
    ];

    const handleReset = () => {
        setAnnualGross(40_000);
        setParts(1);
    };

    return (
        <GameContainer title={t.title} subtitle="Simulateur salaire net — France 2024" onReset={handleReset}>
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
                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-success/30"
                            aria-label={t.annualGross}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-foreground">{t.situation}</label>
                        <select
                            value={parts}
                            onChange={(e) => setParts(Number(e.target.value) as FamilyParts)}
                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-success/30"
                            aria-label={t.situation}
                        >
                            {FAMILY_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {t[opt.labelKey] as string}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl bg-success/10 border border-success/30 p-5 flex flex-col gap-1">
                        <span className="text-xs font-bold text-success uppercase tracking-wide">{t.monthlyGross}</span>
                        <span className="text-2xl font-bold text-success">{fmtEuro(monthlyGross)}</span>
                    </div>
                    <div className="rounded-2xl bg-success p-5 flex flex-col gap-1">
                        <span className="text-xs font-bold text-success uppercase tracking-wide">{t.monthlyNet}</span>
                        <span className="text-2xl font-bold text-white">{fmtEuro(monthlyNet)}</span>
                    </div>
                    <div className="rounded-2xl bg-success/10 border border-success/30 p-5 flex flex-col gap-1">
                        <span className="text-xs font-bold text-success uppercase tracking-wide">{t.annualNet}</span>
                        <span className="text-2xl font-bold text-success">{fmtEuro(annualNet)}</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 p-6 flex flex-col gap-3">
                    <h4 className="text-sm font-bold text-foreground">{t.cotisations}</h4>
                    <div className="flex flex-col gap-2">
                        {monthlyDeductionRows.map(({ label, value }) => (
                            <div key={label} className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-medium">{label}</span>
                                <span className="font-bold text-foreground">{fmtEuro(value)}</span>
                            </div>
                        ))}
                        <div className="border-t border-border mt-2 pt-2 flex justify-between items-center">
                            <span className="text-sm font-bold text-foreground">{t.totalCotisations}</span>
                            <span className="text-sm font-bold text-destructive">{fmtEuro(Math.round(annualCotisations / 12))}</span>
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

export default FranceSalaryCalculator;

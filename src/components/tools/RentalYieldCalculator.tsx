import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const RentalYieldCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "부동산 임대수익률 계산기", desc: "매매가와 임대 조건을 입력하여 실질적인 투자 수익률을 분석합니다.", price: "매수 가액 (원)", deposit: "임대 보증금 (원)", rent: "월 임대료 (원)", loan: "대출 금액 (원)", loanRate: "대출 금리 (%)", result: "수익률 분석", netYield: "실질 수익률", cashFlow: "월 순수익", leverage: "레버리지 효과" },
        en: { title: "Rental Yield Calculator", desc: "Analyze the real return on investment based on purchase and rental terms.", price: "Purchase Price", deposit: "Tenant Deposit", rent: "Monthly Rent", loan: "Loan Amount", loanRate: "Loan Rate (%)", result: "Yield Analysis", netYield: "Net Yield", cashFlow: "Monthly Cashflow", leverage: "Leverage Effect" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [price, setPrice] = useState(500000000);
    const [deposit, setDeposit] = useState(50000000);
    const [rent, setRent] = useState(2000000);
    const [loan, setLoan] = useState(200000000);
    const [loanRate, setLoanRate] = useState(4.5);

    const actualInvestment = price - deposit - loan;
    const annualRent = rent * 12;
    const annualInterest = loan * (loanRate / 100);
    const netAnnualIncome = annualRent - annualInterest;
    
    const yieldRate = (netAnnualIncome / actualInvestment) * 100;
    const monthlyCashFlow = netAnnualIncome / 12;

    return (
        <GameContainer title={t.title} subtitle="Investment Efficiency Analytics" onReset={() => { setPrice(500000000); setDeposit(50000000); setRent(2000000); setLoan(200000000); setLoanRate(4.5); }}>
            <div className="flex flex-col gap-10">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase">{t.price}</label>
                            <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase">{t.deposit}</label>
                                <input type="number" value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-sm" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase">{t.rent}</label>
                                <input type="number" value={rent} onChange={(e) => setRent(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black text-sm" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase">{t.loan}</label>
                            <input type="number" value={loan} onChange={(e) => setLoan(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase">{t.loanRate}</label>
                            <input type="number" value={loanRate} step="0.1" onChange={(e) => setLoanRate(Number(e.target.value))} className="w-full p-4 bg-muted/30 rounded-2xl border border-border font-black" />
                        </div>
                    </div>
                </div>

                <div className="p-10 bg-foreground rounded-[40px] text-background animate-in zoom-in-95 shadow-2xl relative overflow-hidden">
                    <h4 className="text-center text-[10px] font-black text-background/60 uppercase tracking-[0.2em] mb-8">{t.result}</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
                        <div className="text-center md:text-left space-y-2">
                            <p className="text-xs text-background/50 font-medium uppercase">{t.netYield}</p>
                            <h2 className="text-5xl font-black text-primary">{yieldRate.toFixed(2)}%</h2>
                            <p className="text-[10px] text-background/60">실제 적립 자본 대비 연 수익률</p>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="flex justify-between items-end border-b border-background/15 pb-2">
                                <span className="text-[10px] text-background/60 uppercase">{t.cashFlow}</span>
                                <span className="text-xl font-bold text-background">₩{Math.round(monthlyCashFlow).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-end border-b border-background/15 pb-2">
                                <span className="text-[10px] text-background/60 uppercase">{locale === 'ko' ? '투자 원금' : 'Equity'}</span>
                                <span className="text-xl font-bold text-background">₩{actualInvestment.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    {/* Abstract design elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                </div>
            </div>
        </GameContainer>
    );
};

export default RentalYieldCalculator;

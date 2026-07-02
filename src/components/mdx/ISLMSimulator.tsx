import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';

export default function ISLMSimulator() {
  // -50 ~ 50 범위: 양수면 팽창(우측이동), 음수면 긴축(좌측이동)
  const [fiscalPolicy, setFiscalPolicy] = useState(0);    // 정부지출(G) 또는 세금(T)
  const [monetaryPolicy, setMonetaryPolicy] = useState(0); // 통화량(M)

  const data = useMemo(() => {
    return Array.from({ length: 21 }, (_, i) => {
      const y = i * 5; // 국민소득(Y) 0 ~ 100
      
      // IS 곡선: 이자율(r) = 100 - Y + 재정정책(G)
      // 정부지출이 늘어나면 IS곡선이 우측(위)으로 이동
      const is_r = 100 - y + fiscalPolicy;
      
      // LM 곡선: 이자율(r) = Y - 통화정책(M)
      // 통화량이 늘어나면 LM곡선이 우측(아래)으로 이동
      const lm_r = y - monetaryPolicy;
      
      return {
        output: y,
        isCurve: is_r < 0 ? null : is_r, // 차트 밖으로 나가는 선 자르기
        lmCurve: lm_r < 0 ? null : lm_r,
      };
    });
  }, [fiscalPolicy, monetaryPolicy]);

  // 균형점(교차점) 계산
  // 100 - Y + F = Y - M  =>  2Y = 100 + F + M  =>  Y = 50 + (F+M)/2
  const eqY = 50 + (fiscalPolicy + monetaryPolicy) / 2;
  const eqR = eqY - monetaryPolicy;

  return (
    <div className="my-8 rounded-xl border border-border/60 bg-card p-6 shadow-sm not-prose">
      <div className="mb-6 border-b border-border/40 pb-4">
        <h3 className="font-heading text-lg font-bold">거시경제 IS-LM 모형 시뮬레이터</h3>
        <p className="text-sm text-muted-foreground mt-1">
          재정정책(정부지출)과 통화정책(화폐공급) 슬라이더를 조작하여 균형 국민소득(Y)과 균형 이자율(r)의 변화를 관찰하세요.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* 컨트롤 패널 */}
        <div className="flex flex-col gap-6 md:col-span-1">
          <div className="flex flex-col gap-2 p-4 rounded-lg bg-red-50/50 border border-red-100">
            <label className="text-sm font-bold text-red-700 flex justify-between">
              <span>재정 정책 (IS 곡선)</span>
              <span>{fiscalPolicy > 0 ? '팽창' : fiscalPolicy < 0 ? '긴축' : '중립'}</span>
            </label>
            <input 
              type="range" 
              min="-30" max="30" step="5"
              value={fiscalPolicy}
              onChange={(e) => setFiscalPolicy(Number(e.target.value))}
              className="w-full accent-red-500"
            />
            <span className="text-xs text-muted-foreground">정부지출(G) 증감 및 감세/증세</span>
          </div>

          <div className="flex flex-col gap-2 p-4 rounded-lg bg-blue-50/50 border border-blue-100">
            <label className="text-sm font-bold text-blue-700 flex justify-between">
              <span>통화 정책 (LM 곡선)</span>
              <span>{monetaryPolicy > 0 ? '팽창' : monetaryPolicy < 0 ? '긴축' : '중립'}</span>
            </label>
            <input 
              type="range" 
              min="-30" max="30" step="5"
              value={monetaryPolicy}
              onChange={(e) => setMonetaryPolicy(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <span className="text-xs text-muted-foreground">중앙은행 통화량(M) 증감</span>
          </div>

          <div className="mt-auto p-4 rounded-lg bg-muted/30 border border-border/50">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">현재 균형점</h4>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">국민소득 (Y)</span>
              <span className="font-mono font-bold">{eqY.toFixed(1)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">이자율 (r)</span>
              <span className="font-mono font-bold">{eqR.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* 차트 패널 */}
        <div className="h-[300px] md:h-auto md:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-20" />
              <XAxis 
                dataKey="output" 
                type="number" 
                domain={[0, 100]} 
                label={{ value: '국민소득 (Y)', position: 'bottom', offset: 0, fill: 'currentColor', className: 'text-xs opacity-70' }} 
                tick={{ fill: 'currentColor', opacity: 0.7, fontSize: 12 }}
              />
              <YAxis 
                domain={[0, 100]} 
                label={{ value: '이자율 (r)', angle: -90, position: 'insideLeft', offset: 10, fill: 'currentColor', className: 'text-xs opacity-70' }}
                tick={{ fill: 'currentColor', opacity: 0.7, fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid rgba(150,150,150,0.2)', backgroundColor: 'var(--color-card)', color: 'var(--color-card-foreground)' }}
                formatter={((value: number, name: string) => [value.toFixed(1), name === 'isCurve' ? 'IS (생산물시장)' : 'LM (화폐시장)']) as any}
                labelFormatter={(label) => `국민소득: ${label}`}
              />
              
              <Line 
                type="monotone" 
                dataKey="isCurve" 
                stroke="#ef4444" 
                strokeWidth={3} 
                dot={false}
                name="isCurve"
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="lmCurve" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                dot={false} 
                name="lmCurve"
                isAnimationActive={false}
              />
              {/* 균형점 마커 */}
              {eqY >= 0 && eqY <= 100 && eqR >= 0 && eqR <= 100 && (
                <ReferenceDot x={eqY} y={eqR} r={6} fill="var(--color-foreground)" stroke="var(--color-background)" strokeWidth={2} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

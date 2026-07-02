import React, { useState } from "react";
// 실제 프로젝트에선 아래처럼 Recharts를 사용합니다.
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ISLMChart() {
  const [govSpending, setGovSpending] = useState(50); // 정부지출 증가 시 IS 곡선 우측 이동

  // 가상의 데이터 생성 로직
  const data = Array.from({ length: 100 }, (_, i) => ({
    y: i, // 이자율(r)
    // IS: Y = C + I + G. 간략화 (우하향)
    isX: 100 - i + (govSpending - 50), 
    // LM: 화폐수요=화폐공급. 간략화 (우상향)
    lmX: i * 1.2, 
  }));

  return (
    <div className="my-8 rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="p-6">
        <h3 className="font-semibold text-lg">인터랙티브 IS-LM 모형</h3>
        <p className="text-sm text-muted-foreground mb-4">정부 지출(G)을 늘려 IS 곡선의 이동과 균형점(국민소득-이자율)의 변화를 관찰하세요.</p>
        
        <div className="flex items-center space-x-4 mb-6">
          <label className="text-sm font-medium">정부 지출 (G)</label>
          <input 
            type="range" 
            min="0" max="100" 
            value={govSpending} 
            onChange={(e) => setGovSpending(Number(e.target.value))}
            className="flex-1"
          />
        </div>

        <div className="h-64 bg-muted/20 border border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center p-4 relative">
            <span className="absolute top-2 left-2 text-xs font-bold text-muted-foreground">이자율 (r)</span>
            <span className="absolute bottom-2 right-2 text-xs font-bold text-muted-foreground">국민소득 (Y)</span>
            
            {/* 실제로는 여기에 <ResponsiveContainer><LineChart> 가 들어갑니다. */}
            <p className="text-muted-foreground text-sm text-center">
              (이곳에 Shadcn UI의 <code className="bg-muted px-1 rounded">Chart</code> (Recharts) 컴포넌트가 렌더링 됩니다.)<br/><br/>
              현재 G 값: {govSpending} -> IS 곡선은 {govSpending > 50 ? '우측' : govSpending < 50 ? '좌측' : '기본 위치'}으로 이동
            </p>
        </div>
      </div>
    </div>
  );
}

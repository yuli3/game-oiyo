import React from "react";

export default function BCGMatrix() {
  return (
    <div className="my-8 rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="font-semibold leading-none tracking-tight">BCG 매트릭스 (성장-점유율 모델)</h3>
        <p className="text-sm text-muted-foreground">시장의 성장률과 상대적 시장 점유율을 통해 사업을 평가합니다.</p>
      </div>
      
      <div className="p-6 pt-0">
        <div className="relative aspect-square md:aspect-[3/2] w-full max-w-2xl mx-auto">
          {/* Y축 레이블 (시장 성장률) */}
          <div className="absolute -left-12 inset-y-0 flex items-center justify-center -rotate-90 text-sm font-semibold text-muted-foreground">
            시장 성장률 (High ➔ Low)
          </div>
          
          {/* X축 레이블 (시장 점유율) */}
          <div className="absolute -bottom-8 inset-x-0 flex items-center justify-center text-sm font-semibold text-muted-foreground">
            상대적 시장 점유율 (High ➔ Low)
          </div>

          <div className="grid h-full grid-cols-2 grid-rows-2 gap-2">
            {/* Star (High, High) */}
            <div className="flex flex-col items-center justify-center rounded-tl-xl border-2 border-yellow-200 bg-yellow-50/50 p-4 transition-colors hover:bg-yellow-100 dark:bg-yellow-950/20">
              <span className="text-4xl mb-2">⭐</span>
              <h4 className="font-bold text-yellow-700 dark:text-yellow-400">Star</h4>
              <p className="text-xs text-center text-muted-foreground mt-2">고소고성장. 지속적 투자 필요</p>
            </div>
            
            {/* Question Mark (High, Low) */}
            <div className="flex flex-col items-center justify-center rounded-tr-xl border-2 border-blue-200 bg-blue-50/50 p-4 transition-colors hover:bg-blue-100 dark:bg-blue-950/20">
              <span className="text-4xl mb-2">❓</span>
              <h4 className="font-bold text-blue-700 dark:text-blue-400">Question Mark</h4>
              <p className="text-xs text-center text-muted-foreground mt-2">선택적 투자 (스타가 될지, 도태될지 결정)</p>
            </div>

            {/* Cash Cow (Low, High) */}
            <div className="flex flex-col items-center justify-center rounded-bl-xl border-2 border-green-200 bg-green-50/50 p-4 transition-colors hover:bg-green-100 dark:bg-green-950/20">
              <span className="text-4xl mb-2">💰</span>
              <h4 className="font-bold text-green-700 dark:text-green-400">Cash Cow</h4>
              <p className="text-xs text-center text-muted-foreground mt-2">안정적 수익 창출. 현금젖소 역할</p>
            </div>

            {/* Dog (Low, Low) */}
            <div className="flex flex-col items-center justify-center rounded-br-xl border-2 border-red-200 bg-red-50/50 p-4 transition-colors hover:bg-red-100 dark:bg-red-950/20">
              <span className="text-4xl mb-2">🐶</span>
              <h4 className="font-bold text-red-700 dark:text-red-400">Dog</h4>
              <p className="text-xs text-center text-muted-foreground mt-2">수익성 낮음. 매각 또는 철수</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

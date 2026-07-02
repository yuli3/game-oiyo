import React, { useState } from "react";
// 가상의 Shadcn 컴포넌트들
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SampleInteractiveCalculator() {
  const [revenue, setRevenue] = useState(1000000);
  const [margin, setMargin] = useState(25);

  const profit = (revenue * margin) / 100;

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow my-8 p-6">
      <div className="flex flex-col space-y-1.5 pb-4">
        <h3 className="font-semibold leading-none tracking-tight">수익률 시뮬레이터</h3>
        <p className="text-sm text-muted-foreground">강의 내용에 쓰인 공식을 직접 계산해보세요.</p>
      </div>
      
      <div className="grid gap-6">
        <div className="grid gap-3">
          <label className="text-sm font-medium leading-none" htmlFor="revenue">
            예상 매출 (원)
          </label>
          <input 
            id="revenue"
            type="number"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={revenue} 
            onChange={(e) => setRevenue(Number(e.target.value))} 
          />
        </div>

        <div className="grid gap-3">
          <label className="text-sm font-medium leading-none" htmlFor="margin">
            마진율 (%)
          </label>
          <input 
            id="margin"
            type="range"
            min="0" max="100"
            className="w-full"
            value={margin} 
            onChange={(e) => setMargin(Number(e.target.value))} 
          />
          <span className="text-right text-sm text-muted-foreground">{margin}%</span>
        </div>

        <div className="mt-4 rounded-lg bg-primary/10 p-4">
          <p className="text-sm font-medium text-primary">예상 순수익</p>
          <p className="text-3xl font-bold text-primary">
            {new Intl.NumberFormat('ko-KR').format(profit)} 원
          </p>
        </div>
      </div>
    </div>
  );
}

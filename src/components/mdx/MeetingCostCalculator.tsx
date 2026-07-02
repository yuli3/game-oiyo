'use client';

import { useState } from 'react';

function fmt(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

interface Attendee {
  id: number;
  hourlyRate: string;
  count: string;
}

export default function MeetingCostCalculator() {
  const [attendees, setAttendees] = useState<Attendee[]>([
    { id: 1, hourlyRate: '50000', count: '5' },
  ]);
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [meetingsPerWeek, setMeetingsPerWeek] = useState('3');

  const [result, setResult] = useState<{
    costPerMeeting: number;
    weeklyLoss: number;
    monthlyLoss: number;
    yearlyLoss: number;
    totalPersonMinutes: number;
  } | null>(null);

  const addAttendee = () =>
    setAttendees((a) => [...a, { id: Date.now(), hourlyRate: '', count: '1' }]);
  const removeAttendee = (id: number) =>
    setAttendees((a) => a.filter((att) => att.id !== id));
  const updateAttendee = (id: number, field: keyof Omit<Attendee, 'id'>, value: string) =>
    setAttendees((a) => a.map((att) => (att.id === id ? { ...att, [field]: value } : att)));

  const calculate = () => {
    const duration = parseFloat(durationMinutes) || 0;
    const perWeek = parseFloat(meetingsPerWeek) || 0;
    const durationHours = duration / 60;

    let costPerMeeting = 0;
    let totalPersonMinutes = 0;

    for (const att of attendees) {
      const rate = parseFloat(att.hourlyRate.replace(/,/g, '')) || 0;
      const count = parseFloat(att.count) || 0;
      costPerMeeting += rate * durationHours * count;
      totalPersonMinutes += duration * count;
    }

    const weeklyLoss = costPerMeeting * perWeek;
    const monthlyLoss = weeklyLoss * 4.33;
    const yearlyLoss = weeklyLoss * 52;

    setResult({ costPerMeeting, weeklyLoss, monthlyLoss, yearlyLoss, totalPersonMinutes });
  };

  return (
    <div className="my-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-xl font-bold text-gray-900">회의 비용 계산기</h3>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">회의 시간 (분)</label>
          <input
            type="number"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">주당 회의 횟수</label>
          <input
            type="number"
            value={meetingsPerWeek}
            onChange={(e) => setMeetingsPerWeek(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <p className="mb-2 text-sm font-medium text-gray-700">참석자 구성</p>
      <div className="space-y-3 mb-4">
        {attendees.map((att) => (
          <div key={att.id} className="flex gap-3 items-end rounded-xl border border-gray-200 p-3">
            <div className="flex-1">
              <label className="mb-0.5 block text-xs text-gray-500">시간당 인건비 (원)</label>
              <input
                type="number"
                value={att.hourlyRate}
                onChange={(e) => updateAttendee(att.id, 'hourlyRate', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
              />
            </div>
            <div className="w-20">
              <label className="mb-0.5 block text-xs text-gray-500">인원 수</label>
              <input
                type="number"
                value={att.count}
                onChange={(e) => updateAttendee(att.id, 'count', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
              />
            </div>
            {attendees.length > 1 && (
              <button onClick={() => removeAttendee(att.id)} className="text-xs text-red-400 hover:text-red-600 pb-1">삭제</button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addAttendee}
        className="mb-4 w-full rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:bg-gray-50"
      >
        + 참석자 유형 추가
      </button>

      <button
        onClick={calculate}
        className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
      >
        회의 비용 계산하기
      </button>

      {result && (
        <div className="mt-6 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: '회의 1회 비용', value: `${fmt(result.costPerMeeting)}원`, color: 'text-orange-600' },
              { label: '주간 비용 손실', value: `${fmt(result.weeklyLoss)}원`, color: 'text-red-500' },
              { label: '월간 비용 손실', value: `${fmt(result.monthlyLoss)}원`, color: 'text-red-600' },
              { label: '연간 비용 손실', value: `${fmt(result.yearlyLoss)}원`, color: 'text-red-700' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-sm font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            * 총 인원-시간: {fmt(result.totalPersonMinutes / 60)}시간 | 시간당 인건비는 연봉 ÷ 2,080(연간 근무시간)으로 계산
          </p>
        </div>
      )}
    </div>
  );
}

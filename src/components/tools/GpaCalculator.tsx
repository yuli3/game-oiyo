import React, { useState } from 'react';
import { GameContainer } from '../ui/game/GamePrimitives';

const GpaCalculator: React.FC<{ locale?: 'ko' | 'en' }> = ({ locale = 'ko' }) => {
    const t = {
        ko: { title: "학점 계산기", desc: "이수한 과목의 학점과 성적을 입력하여 평균 평점을 계산합니다.", add: "과목 추가", gradeType: "기준", score: "등급", credit: "학점", result: "최종 평점", totalCredit: "이수 학점", gpa: "평균 평점" },
        en: { title: "GPA Calculator", desc: "Calculate your average GPA by entering course credits and grades.", add: "Add Course", gradeType: "Scale", score: "Grade", credit: "Credit", result: "Final GPA", totalCredit: "Total Credits", gpa: "Average GPA" }
    }[locale === 'ko' ? 'ko' : 'en'];

    const [scale, setScale] = useState(4.5);
    const [courses, setCourses] = useState([{ id: 1, name: '', grade: 'A+', credit: 3 }]);

    const gradeMap: Record<string, number> = {
        'A+': 4.5, 'A0': 4.0, 'B+': 3.5, 'B0': 3.0, 'C+': 2.5, 'C0': 2.0, 'D+': 1.5, 'D0': 1.0, 'F': 0.0
    };

    const addCourse = () => setCourses([...courses, { id: Date.now(), name: '', grade: 'A+', credit: 3 }]);
    const removeCourse = (id: number) => setCourses(courses.filter(c => c.id !== id));

    const totalCredits = courses.reduce((acc, c) => acc + c.credit, 0);
    const weightedSum = courses.reduce((acc, c) => acc + (gradeMap[c.grade] * (scale / 4.5) * c.credit), 0);
    const finalGpa = totalCredits > 0 ? (weightedSum / totalCredits) : 0;

    return (
        <GameContainer title={t.title} subtitle="Academic Performance Mirror" onReset={() => setCourses([{ id: 1, name: '', grade: 'A+', credit: 3 }])}>
            <div className="flex flex-col gap-8">
                <p className="text-sm font-medium text-muted-foreground text-center">{t.desc}</p>
                
                <div className="flex justify-center gap-4 mb-4">
                    {[4.0, 4.3, 4.5].map(s => (
                        <button key={s} onClick={() => setScale(s)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${scale === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{s} 만점</button>
                    ))}
                </div>

                <div className="space-y-4 max-h-80 overflow-y-auto px-2">
                    {courses.map((c, i) => (
                        <div key={c.id} className="flex gap-4 items-center animate-in slide-in-from-left" style={{ animationDelay: `${i * 50}ms` }}>
                            <input 
                                placeholder={locale === 'ko' ? `과목 ${i+1}` : `Course ${i+1}`}
                                className="flex-1 p-3 bg-muted/30 border border-border rounded-xl text-xs font-bold outline-none"
                            />
                            <select 
                                value={c.grade}
                                onChange={(e) => {
                                    const next = [...courses];
                                    next[i].grade = e.target.value;
                                    setCourses(next);
                                }}
                                className="w-20 p-3 bg-muted/30 border border-border rounded-xl text-xs font-bold"
                            >
                                {Object.keys(gradeMap).map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                            <input 
                                type="number" value={c.credit}
                                onChange={(e) => {
                                    const next = [...courses];
                                    next[i].credit = Number(e.target.value);
                                    setCourses(next);
                                }}
                                className="w-16 p-3 bg-muted/30 border border-border rounded-xl text-xs font-bold text-center"
                            />
                            <button onClick={() => removeCourse(c.id)} className="text-muted-foreground hover:text-destructive">✕</button>
                        </div>
                    ))}
                </div>

                <button onClick={addCourse} className="w-full py-4 border-2 border-dashed border-muted text-muted-foreground rounded-2xl font-black text-xs hover:bg-muted/10 transition-all">+ {t.add}</button>

                <div className="p-8 bg-foreground rounded-[40px] text-background flex justify-around items-center shadow-xl">
                    <div className="text-center">
                        <p className="text-[10px] text-background/60 uppercase">{t.totalCredit}</p>
                        <p className="text-2xl font-black">{totalCredits}</p>
                    </div>
                    <div className="w-px h-12 bg-foreground" />
                    <div className="text-center">
                        <p className="text-[10px] text-primary uppercase font-black tracking-widest">{t.gpa}</p>
                        <h2 className="text-5xl font-black text-primary">{finalGpa.toFixed(2)}</h2>
                        <p className="text-[10px] text-background/60">/ {scale.toFixed(1)} SCALE</p>
                    </div>
                </div>
            </div>
        </GameContainer>
    );
};

export default GpaCalculator;

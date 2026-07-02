'use client';
import React, { useState, useCallback, useReducer } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Target from 'lucide-react/dist/esm/icons/target'
import Users from 'lucide-react/dist/esm/icons/users'
import Shield from 'lucide-react/dist/esm/icons/shield'
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3'
import Copy from 'lucide-react/dist/esm/icons/copy'
import Check from 'lucide-react/dist/esm/icons/check'
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right'
import Brain from 'lucide-react/dist/esm/icons/brain'
import Heart from 'lucide-react/dist/esm/icons/heart'
import Anchor from 'lucide-react/dist/esm/icons/anchor'
import CloudRain from 'lucide-react/dist/esm/icons/cloud-rain'
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle'
import Smile from 'lucide-react/dist/esm/icons/smile'
import Star from 'lucide-react/dist/esm/icons/star'
import Lightbulb from 'lucide-react/dist/esm/icons/lightbulb'
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up'
import BookOpen from 'lucide-react/dist/esm/icons/book-open';

// ─────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────

interface ScoreBarProps {
  label: string;
  value: number;
  max: number;
  colorClass: string;
  sublabel?: string;
}

function ScoreBar({ label, value, max, colorClass, sublabel }: ScoreBarProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-slate-700">{label}</span>
        {sublabel && <span className="text-xs text-slate-400">{sublabel}</span>}
        <span className="font-bold text-slate-900">{pct}%</span>
      </div>
      <div
        className="h-3 w-full rounded-full bg-slate-100 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface QuestionProgressProps {
  current: number;
  total: number;
  label: string;
}

function QuestionProgress({ current, total, label }: QuestionProgressProps) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
        <span>{label}</span>
        <span>
          {current} / {total}
        </span>
      </div>
      <div
        className="h-2 w-full rounded-full bg-slate-100 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} progress`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface ShareButtonProps {
  textToCopy: string;
  label: string;
  copiedLabel: string;
}

function ShareButton({ textToCopy, label, copiedLabel }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (copied) return;
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        /* silently fail if clipboard not available */
      });
  }, [textToCopy, copied]);

  return (
    <Button
      onClick={handleCopy}
      variant="outline"
      size="sm"
      aria-label={copied ? copiedLabel : label}
      className="rounded-full gap-2 border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold transition-all"
    >
      {copied ? (
        <Check className="w-4 h-4" aria-hidden="true" />
      ) : (
        <Copy className="w-4 h-4" aria-hidden="true" />
      )}
      {copied ? copiedLabel : label}
    </Button>
  );
}

interface RelatedTagsProps {
  tags: string[];
}

function RelatedTags({ tags }: RelatedTagsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100"
        >
          <BookOpen className="w-3 h-3 mr-1" aria-hidden="true" />
          {tag}
        </Badge>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Component 1: FullDISCTest
// ─────────────────────────────────────────────

type DISCKey = 'D' | 'I' | 'S' | 'C';

interface DISCOption {
  weight: Partial<Record<DISCKey, number>>;
  ko: string;
  en: string;
  ja: string;
}

interface DISCQuestion {
  ko: string;
  en: string;
  ja: string;
  options: [DISCOption, DISCOption, DISCOption, DISCOption];
}

const DISC_QUESTIONS: DISCQuestion[] = [
  {
    ko: '새로운 과제를 맡았을 때 당신의 첫 반응은?',
    en: 'When assigned a new task, what is your first reaction?',
    ja: '新しい課題を任された時、最初の反応は？',
    options: [
      { weight: { D: 3, C: 1 }, ko: '즉시 목표를 정하고 빠르게 실행한다', en: 'Set goals immediately and execute fast', ja: 'すぐ目標を定めて素早く実行する' },
      { weight: { I: 3, S: 1 }, ko: '팀원들과 아이디어를 공유하고 분위기를 띄운다', en: 'Share ideas with teammates and energize the group', ja: 'チームとアイデアを共有し雰囲気を盛り上げる' },
      { weight: { S: 3, C: 1 }, ko: '기존 방식을 참고해 안정적으로 접근한다', en: 'Refer to existing approaches for a stable start', ja: '既存の方法を参考に安定的にアプローチする' },
      { weight: { C: 3 }, ko: '데이터를 수집하고 계획을 철저히 세운다', en: 'Gather data and create a thorough plan', ja: 'データを収集し綿密な計画を立てる' },
    ],
  },
  {
    ko: '갈등 상황에서 당신의 행동은?',
    en: 'How do you act in a conflict situation?',
    ja: '対立状況でのあなたの行動は？',
    options: [
      { weight: { D: 3 }, ko: '직접 대면해 빠르게 해결한다', en: 'Confront directly and resolve quickly', ja: '直接対面して素早く解決する' },
      { weight: { I: 3 }, ko: '유머나 공감으로 분위기를 부드럽게 한다', en: 'Ease the atmosphere with humor and empathy', ja: 'ユーモアや共感で雰囲気を和らげる' },
      { weight: { S: 3 }, ko: '갈등이 가라앉을 때까지 기다린다', en: 'Wait for the conflict to settle on its own', ja: '対立が収まるまで待つ' },
      { weight: { C: 3 }, ko: '논리적 사실로 상황을 분석한다', en: 'Analyze the situation with logical facts', ja: '論理的な事実で状況を分析する' },
    ],
  },
  {
    ko: '업무 마감이 촉박할 때 당신은?',
    en: 'When a deadline is tight, what do you do?',
    ja: '締め切りが迫った時、あなたは？',
    options: [
      { weight: { D: 3, C: 1 }, ko: '우선순위를 정해 결단력 있게 밀어붙인다', en: 'Set priorities and push forward decisively', ja: '優先順位を決め決断力を持って突き進む' },
      { weight: { I: 3, D: 1 }, ko: '팀을 독려하며 열정적으로 함께 뛴다', en: 'Energize the team and run together with passion', ja: 'チームを鼓舞して情熱的に共に走る' },
      { weight: { S: 3, C: 1 }, ko: '침착하게 차근차근 처리한다', en: 'Stay calm and work through tasks step by step', ja: '落ち着いて着実に処理していく' },
      { weight: { C: 3, S: 1 }, ko: '품질을 유지하며 체계적으로 진행한다', en: 'Proceed systematically while maintaining quality', ja: '品質を保ちながら体系的に進める' },
    ],
  },
  {
    ko: '당신이 가장 잘 하는 것은?',
    en: 'What are you best at?',
    ja: 'あなたが最も得意なことは？',
    options: [
      { weight: { D: 3 }, ko: '빠른 결정과 실행', en: 'Quick decisions and execution', ja: '素早い決断と実行' },
      { weight: { I: 3 }, ko: '사람들에게 동기를 부여하는 것', en: 'Motivating and inspiring others', ja: '人々にモチベーションを与えること' },
      { weight: { S: 3 }, ko: '팀의 안정을 유지하는 것', en: 'Maintaining team stability', ja: 'チームの安定を維持すること' },
      { weight: { C: 3 }, ko: '정확하고 꼼꼼한 분석', en: 'Precise and thorough analysis', ja: '正確で緻密な分析' },
    ],
  },
  {
    ko: '회의에서 당신의 역할은?',
    en: 'What is your role in meetings?',
    ja: '会議でのあなたの役割は？',
    options: [
      { weight: { D: 3, I: 1 }, ko: '방향을 제시하고 결론을 이끈다', en: 'Provide direction and drive toward conclusions', ja: '方向性を示し結論に導く' },
      { weight: { I: 3 }, ko: '분위기를 활기차게 만들고 아이디어를 낸다', en: 'Energize the atmosphere and generate ideas', ja: '雰囲気を活気づけアイデアを出す' },
      { weight: { S: 3 }, ko: '경청하며 팀의 의견을 조율한다', en: 'Listen carefully and coordinate team opinions', ja: '傾聴しながらチームの意見を調整する' },
      { weight: { C: 3 }, ko: '세부 사항을 검토하고 논리적 피드백을 준다', en: 'Review details and provide logical feedback', ja: '詳細を確認し論理的なフィードバックを提供する' },
    ],
  },
  {
    ko: '스트레스를 받을 때 당신은?',
    en: 'When you are stressed, what do you do?',
    ja: 'ストレスを感じた時、あなたは？',
    options: [
      { weight: { D: 3 }, ko: '더 공격적으로 결과를 추진한다', en: 'Push for results more aggressively', ja: 'より積極的に結果を追い求める' },
      { weight: { I: 3 }, ko: '다른 사람들과 이야기하며 해소한다', en: 'Talk with others to relieve stress', ja: '他の人と話して解消する' },
      { weight: { S: 3 }, ko: '참고 인내하며 상황이 지나가길 기다린다', en: 'Endure patiently and wait for the situation to pass', ja: '我慢して状況が過ぎるのを待つ' },
      { weight: { C: 3 }, ko: '문제를 분석하고 해결책을 찾는다', en: 'Analyze the problem and find solutions', ja: '問題を分析し解決策を探す' },
    ],
  },
  {
    ko: '새로운 사람을 만날 때 당신은?',
    en: 'When meeting someone new, how do you approach them?',
    ja: '新しい人に会う時、あなたは？',
    options: [
      { weight: { D: 3 }, ko: '주도적으로 소개하고 목적을 파악한다', en: 'Introduce yourself proactively and gauge their purpose', ja: '積極的に自己紹介し目的を把握する' },
      { weight: { I: 3 }, ko: '밝고 친근하게 대화를 시작한다', en: 'Start conversation in a bright and friendly way', ja: '明るく親しみやすく会話を始める' },
      { weight: { S: 3 }, ko: '천천히 신뢰를 쌓아간다', en: 'Slowly build trust over time', ja: 'ゆっくり信頼を築いていく' },
      { weight: { C: 3 }, ko: '상대방을 관찰하며 신중하게 접근한다', en: 'Observe carefully and approach with caution', ja: '相手を観察しながら慎重にアプローチする' },
    ],
  },
  {
    ko: '당신의 가장 큰 두려움은?',
    en: 'What is your greatest fear?',
    ja: 'あなたの最大の恐れは？',
    options: [
      { weight: { D: 3 }, ko: '통제력을 잃는 것', en: 'Losing control', ja: 'コントロールを失うこと' },
      { weight: { I: 3 }, ko: '거절당하거나 무시받는 것', en: 'Being rejected or ignored', ja: '拒絶されたり無視されること' },
      { weight: { S: 3 }, ko: '갑작스러운 변화', en: 'Sudden unexpected change', ja: '突然の変化' },
      { weight: { C: 3 }, ko: '실수를 저지르는 것', en: 'Making mistakes', ja: '間違いを犯すこと' },
    ],
  },
  {
    ko: '당신이 선호하는 업무 환경은?',
    en: 'What kind of work environment do you prefer?',
    ja: '好みの仕事環境は？',
    options: [
      { weight: { D: 3 }, ko: '자율성과 도전이 있는 환경', en: 'An environment with autonomy and challenges', ja: '自律性と挑戦がある環境' },
      { weight: { I: 3 }, ko: '활발한 소통과 협업이 있는 환경', en: 'An environment with active communication and collaboration', ja: '活発なコミュニケーションと協働がある環境' },
      { weight: { S: 3 }, ko: '안정적이고 일관된 환경', en: 'A stable and consistent environment', ja: '安定していて一貫性のある環境' },
      { weight: { C: 3 }, ko: '체계적이고 정밀한 업무가 있는 환경', en: 'An environment with systematic and precise work', ja: '体系的で精密な業務がある環境' },
    ],
  },
  {
    ko: '프로젝트 목표 달성보다 중요한 것은?',
    en: 'What is more important than achieving project goals?',
    ja: 'プロジェクトの目標達成より重要なものは？',
    options: [
      { weight: { D: 3 }, ko: '결과와 성과', en: 'Results and outcomes', ja: '結果と成果' },
      { weight: { I: 3 }, ko: '과정의 즐거움과 팀 활기', en: 'Enjoyment of the process and team energy', ja: 'プロセスの楽しさとチームの活気' },
      { weight: { S: 3 }, ko: '팀 화합과 안정', en: 'Team harmony and stability', ja: 'チームの団結と安定' },
      { weight: { C: 3 }, ko: '품질과 정확성', en: 'Quality and accuracy', ja: '品質と正確さ' },
    ],
  },
  {
    ko: '리더십 스타일을 고르면?',
    en: 'Which leadership style fits you?',
    ja: 'リーダーシップスタイルを選ぶなら？',
    options: [
      { weight: { D: 3 }, ko: '지시하고 책임진다', en: 'Direct and take full responsibility', ja: '指示して責任を取る' },
      { weight: { I: 3 }, ko: '영감을 주고 이끈다', en: 'Inspire and lead by example', ja: 'インスピレーションを与えて導く' },
      { weight: { S: 3 }, ko: '지원하고 조율한다', en: 'Support and coordinate', ja: 'サポートして調整する' },
      { weight: { C: 3 }, ko: '분석하고 가이드한다', en: 'Analyze and provide guidance', ja: '分析してガイドする' },
    ],
  },
  {
    ko: '피드백을 받을 때 당신은?',
    en: 'How do you respond to receiving feedback?',
    ja: 'フィードバックを受けた時、あなたは？',
    options: [
      { weight: { D: 3 }, ko: '핵심만 말하고 바로 개선한다', en: 'Get to the point and improve immediately', ja: '要点だけ把握してすぐ改善する' },
      { weight: { I: 3 }, ko: '감정적 맥락을 함께 이해한다', en: 'Understand the emotional context alongside the content', ja: '感情的なコンテクストも一緒に理解する' },
      { weight: { S: 3 }, ko: '천천히 소화하며 반영한다', en: 'Slowly internalize and reflect on it', ja: 'ゆっくり消化して反映させる' },
      { weight: { C: 3 }, ko: '논리적 근거를 확인하고 검토한다', en: 'Verify the logical basis and review carefully', ja: '論理的な根拠を確認して検討する' },
    ],
  },
  {
    ko: '변화가 필요한 상황에서?',
    en: 'In a situation that calls for change?',
    ja: '変化が必要な状況では？',
    options: [
      { weight: { D: 3 }, ko: '즉시 변화를 주도한다', en: 'Lead the change immediately', ja: 'すぐに変化を主導する' },
      { weight: { I: 3 }, ko: '변화의 장점을 팀에 설명한다', en: 'Explain the benefits of change to the team', ja: '変化のメリットをチームに説明する' },
      { weight: { S: 3 }, ko: '점진적으로 적응한다', en: 'Adapt gradually and steadily', ja: '段階的に適応していく' },
      { weight: { C: 3 }, ko: '변화의 리스크를 먼저 분석한다', en: 'First analyze the risks of change', ja: '変化のリスクを先に分析する' },
    ],
  },
  {
    ko: '팀 프로젝트에서 가장 중요한 것은?',
    en: 'What matters most in a team project?',
    ja: 'チームプロジェクトで最も重要なことは？',
    options: [
      { weight: { D: 3 }, ko: '목표 달성', en: 'Achieving the goal', ja: '目標達成' },
      { weight: { I: 3 }, ko: '팀원 간 소통', en: 'Communication between team members', ja: 'チームメンバー間のコミュニケーション' },
      { weight: { S: 3 }, ko: '협력과 안정', en: 'Cooperation and stability', ja: '協力と安定' },
      { weight: { C: 3 }, ko: '정확성과 품질', en: 'Accuracy and quality', ja: '正確さと品質' },
    ],
  },
  {
    ko: '실패했을 때 당신의 반응은?',
    en: 'How do you react when you fail?',
    ja: '失敗した時のあなたの反応は？',
    options: [
      { weight: { D: 3 }, ko: '원인을 파악하고 다시 시작한다', en: 'Identify the cause and start again', ja: '原因を把握してやり直す' },
      { weight: { I: 3 }, ko: '긍정적으로 해석하고 주변을 웃긴다', en: 'Reframe positively and lighten the mood', ja: 'ポジティブに解釈して周りを笑わせる' },
      { weight: { S: 3 }, ko: '조용히 반성하고 천천히 회복한다', en: 'Reflect quietly and recover slowly', ja: '静かに反省してゆっくり回復する' },
      { weight: { C: 3 }, ko: '철저히 분석해 같은 실수를 방지한다', en: 'Analyze thoroughly to prevent the same mistake', ja: '徹底的に分析して同じミスを防ぐ' },
    ],
  },
  {
    ko: '의사결정 시 당신은?',
    en: 'When making decisions, how do you proceed?',
    ja: '意思決定の際、あなたは？',
    options: [
      { weight: { D: 3 }, ko: '직관과 과감함으로 결정한다', en: 'Decide with intuition and boldness', ja: '直感と大胆さで決める' },
      { weight: { I: 3 }, ko: '주변의 반응을 고려한다', en: 'Consider the reactions of those around you', ja: '周りの反応を考慮する' },
      { weight: { S: 3 }, ko: '기존 방식과 안정성을 우선한다', en: 'Prioritize existing methods and stability', ja: '既存の方法と安定性を優先する' },
      { weight: { C: 3 }, ko: '충분한 데이터를 모은 후 결정한다', en: 'Decide after gathering sufficient data', ja: '十分なデータを集めてから決める' },
    ],
  },
  {
    ko: '당신의 강점은?',
    en: 'What is your primary strength?',
    ja: 'あなたの強みは？',
    options: [
      { weight: { D: 3 }, ko: '결단력과 추진력', en: 'Decisiveness and drive', ja: '決断力と推進力' },
      { weight: { I: 3 }, ko: '설득력과 열정', en: 'Persuasiveness and passion', ja: '説得力と情熱' },
      { weight: { S: 3 }, ko: '인내력과 협동심', en: 'Patience and teamwork', ja: '忍耐力と協調性' },
      { weight: { C: 3 }, ko: '분석력과 정확성', en: 'Analytical thinking and accuracy', ja: '分析力と正確さ' },
    ],
  },
  {
    ko: '시간 관리 방식은?',
    en: 'How do you manage your time?',
    ja: '時間管理の方法は？',
    options: [
      { weight: { D: 3 }, ko: '효율을 극대화해 최대한 많이 처리', en: 'Maximize efficiency and handle as much as possible', ja: '効率を最大化して最大限こなす' },
      { weight: { I: 3 }, ko: '즉흥적으로 에너지가 있을 때 집중', en: 'Focus spontaneously when energy is high', ja: '自発的にエネルギーがある時に集中する' },
      { weight: { S: 3 }, ko: '루틴을 만들어 꾸준히 처리', en: 'Build routines and work steadily through them', ja: 'ルーティンを作り着実にこなす' },
      { weight: { C: 3 }, ko: '일정표를 세우고 순서대로 실행', en: 'Create a schedule and execute in order', ja: 'スケジュールを立てて順番に実行する' },
    ],
  },
  {
    ko: '칭찬받을 때 가장 기쁜 것은?',
    en: 'What compliment makes you happiest?',
    ja: '褒められて最も嬉しいことは？',
    options: [
      { weight: { D: 3 }, ko: '"역시 결과물이 빠르고 좋다"', en: '"Your results are fast and excellent as always"', ja: '"やはり成果が早くていい"' },
      { weight: { I: 3 }, ko: '"분위기를 살려줘서 고마워"', en: '"Thank you for lifting the energy"', ja: '"雰囲気を盛り上げてくれてありがとう"' },
      { weight: { S: 3 }, ko: '"항상 믿고 의지할 수 있어"', en: '"I can always trust and rely on you"', ja: '"いつも信頼して頼りにできる"' },
      { weight: { C: 3 }, ko: '"정말 꼼꼼하고 정확하다"', en: '"You are truly meticulous and accurate"', ja: '"本当に丁寧で正確だ"' },
    ],
  },
  {
    ko: '미래의 내 모습은?',
    en: 'What does your ideal future self look like?',
    ja: '未来の自分の姿は？',
    options: [
      { weight: { D: 3 }, ko: '강력한 영향력을 가진 리더', en: 'A leader with powerful influence', ja: '強力な影響力を持つリーダー' },
      { weight: { I: 3 }, ko: '많은 사람에게 사랑받는 사람', en: 'Someone loved by many people', ja: 'たくさんの人に愛される人' },
      { weight: { S: 3 }, ko: '안정적인 삶에서 가족과 행복한 사람', en: 'Happy with family in a stable life', ja: '安定した生活の中で家族と幸せな人' },
      { weight: { C: 3 }, ko: '전문성으로 인정받는 권위자', en: 'An authority recognized for expertise', ja: '専門性で認められる権威者' },
    ],
  },
];

interface DISCResultData {
  key: DISCKey;
  ko: { headline: string; desc: string };
  en: { headline: string; desc: string };
  ja: { headline: string; desc: string };
  color: string;
  barColor: string;
  icon: React.ReactNode;
  relatedTags: string[];
}

const DISC_RESULTS: Record<DISCKey, DISCResultData> = {
  D: {
    key: 'D',
    ko: {
      headline: '도전적 결과 추구형',
      desc: '당신은 목표를 향해 직진하는 강한 추진력을 지니고 있습니다. 빠른 의사결정과 결단력이 돋보이며, 도전적인 상황에서 진가를 발휘합니다. 직접적인 소통을 선호하고 불필요한 절차를 최소화하려 합니다. 강점은 결단력, 추진력, 목표 지향성입니다. 성장 포인트는 타인의 감정을 더 세심하게 고려하고 팀원들에게 충분한 설명 시간을 제공하는 것입니다. D유형은 결과를 중시하는 만큼, 과정에서 동료들이 소외감을 느끼지 않도록 주의가 필요합니다.',
    },
    en: {
      headline: 'Result-Driven Challenger',
      desc: 'You have a powerful drive toward goals and results. Quick decisions and boldness are your signature strengths, especially under pressure. You prefer direct communication and minimal process overhead. Key strengths: decisiveness, drive, goal-orientation. Growth areas: listening more carefully to teammates\' concerns and providing context before charging ahead. D-types achieve great results — the challenge is bringing others along on the journey.',
    },
    ja: {
      headline: '挑戦的な成果追求型',
      desc: 'あなたは目標に向かって直進する強い推進力を持っています。素早い意思決定と決断力が際立ち、挑戦的な状況でこそ真価を発揮します。直接的なコミュニケーションを好み、無駄なプロセスを最小化しようとします。強み：決断力、推進力、目標志向。成長ポイント：チームメンバーの感情への配慮と十分な説明時間の確保。',
    },
    color: 'bg-red-50 text-red-700 border-red-200',
    barColor: 'bg-gradient-to-r from-red-400 to-rose-500',
    icon: <Target className="w-8 h-8" aria-hidden="true" />,
    relatedTags: ['DISC 유형 업무 활용', '리더십 스타일 가이드', '목표 설정 심리학'],
  },
  I: {
    key: 'I',
    ko: {
      headline: '열정적 영향력 발산형',
      desc: '당신은 사람들에게 에너지와 영감을 주는 천부적인 소통가입니다. 낙관적인 시각으로 팀 분위기를 이끌고, 새로운 아이디어와 가능성을 탐색하는 것을 즐깁니다. 강점은 설득력, 열정, 창의성입니다. 성장 포인트는 세부 사항에 더 집중하고 마감 기한을 철저히 관리하는 것입니다. I유형은 사람들의 관심을 끄는 데 뛰어나지만, 때로는 실행력과 지속성이 부족할 수 있습니다.',
    },
    en: {
      headline: 'Passionate Influence Radiator',
      desc: 'You are a natural communicator who energizes and inspires those around you. Your optimism shapes team morale, and you love exploring new ideas and possibilities. Key strengths: persuasion, enthusiasm, creativity. Growth areas: focusing on details and managing deadlines more rigorously. I-types excel at pulling people in — the challenge is following through consistently.',
    },
    ja: {
      headline: '情熱的な影響力発揮型',
      desc: 'あなたは人々にエネルギーとインスピレーションを与える生まれながらのコミュニケーターです。楽観的な視点でチームの雰囲気をリードし、新しいアイデアと可能性を探求することを楽しみます。強み：説得力、熱意、創造性。成長ポイント：細部への集中と締め切り管理の徹底。',
    },
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    barColor: 'bg-gradient-to-r from-amber-400 to-yellow-500',
    icon: <Smile className="w-8 h-8" aria-hidden="true" />,
    relatedTags: ['소통 스타일 심리학', '팀 분위기 리더십', '창의성과 아이디어 발산'],
  },
  S: {
    key: 'S',
    ko: {
      headline: '신뢰받는 팀 조화자형',
      desc: '당신은 팀의 안정을 지키는 든든한 버팀목입니다. 변화보다는 일관성을 선호하고, 타인의 입장을 깊이 공감하며 신뢰를 쌓습니다. 강점은 인내심, 협동심, 경청 능력입니다. 성장 포인트는 변화에 더 유연하게 적응하고 자신의 의견을 더 적극적으로 표현하는 것입니다. S유형은 조직의 심리적 안전망 역할을 하지만, 스스로를 위한 목소리를 내는 것도 중요합니다.',
    },
    en: {
      headline: 'Trusted Team Harmonizer',
      desc: 'You are the steady anchor that holds teams together. You prefer consistency over chaos and build trust through deep empathy and dependable follow-through. Key strengths: patience, collaboration, active listening. Growth areas: adapting more fluidly to change and speaking up for your own needs and ideas. S-types create psychological safety for teams — yet advocating for yourself matters too.',
    },
    ja: {
      headline: '信頼されるチーム調和型',
      desc: 'あなたはチームの安定を守る頼もしい支えです。変化よりも一貫性を好み、他者の立場への深い共感で信頼を積み重ねます。強み：忍耐力、協調性、傾聴能力。成長ポイント：変化への柔軟な適応と自分の意見のより積極的な表現。',
    },
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    barColor: 'bg-gradient-to-r from-emerald-400 to-green-500',
    icon: <Anchor className="w-8 h-8" aria-hidden="true" />,
    relatedTags: ['팀 심리적 안전감', '공감 능력 개발', '안정형 리더십 전략'],
  },
  C: {
    key: 'C',
    ko: {
      headline: '데이터 기반 완벽 추구형',
      desc: '당신은 정확성과 품질에 높은 기준을 둡니다. 체계적인 분석을 통해 리스크를 최소화하고, 신중한 접근으로 높은 완성도를 추구합니다. 강점은 분석력, 꼼꼼함, 전문성입니다. 성장 포인트는 완벽하지 않아도 전진하는 용기와 빠른 실행을 연습하는 것입니다. C유형은 높은 품질을 만들지만, 분석 마비를 경계하고 충분한 완성도에서 실행으로 넘어가는 시점을 인식하는 것이 중요합니다.',
    },
    en: {
      headline: 'Data-Driven Perfectionist',
      desc: 'You set high standards for accuracy and quality in everything you do. Systematic analysis minimizes risk, and your careful approach produces polished outcomes. Key strengths: analytical thinking, thoroughness, expertise. Growth areas: practicing "good enough to launch" thinking and resisting analysis paralysis. C-types produce excellent work — the challenge is knowing when to ship.',
    },
    ja: {
      headline: 'データ駆動の完璧追求型',
      desc: 'あなたは正確さと品質に高い基準を設けます。体系的な分析でリスクを最小化し、慎重なアプローチで高い完成度を追求します。強み：分析力、緻密さ、専門性。成長ポイント：完璧でなくても前進する勇気と迅速な実行の練習。',
    },
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    barColor: 'bg-gradient-to-r from-blue-400 to-indigo-500',
    icon: <BarChart3 className="w-8 h-8" aria-hidden="true" />,
    relatedTags: ['완벽주의 심리학', '분석적 사고 개발', 'C형 리더십 실전 가이드'],
  },
};

interface DISCState {
  step: number;
  scores: Record<DISCKey, number>;
  result: DISCKey | null;
}

type DISCAction =
  | { type: 'ANSWER'; weight: Partial<Record<DISCKey, number>> }
  | { type: 'RESET' };

function discReducer(state: DISCState, action: DISCAction): DISCState {
  switch (action.type) {
    case 'ANSWER': {
      const newScores = { ...state.scores };
      (Object.keys(action.weight) as DISCKey[]).forEach((k) => {
        newScores[k] = (newScores[k] ?? 0) + (action.weight[k] ?? 0);
      });
      const isLast = state.step >= DISC_QUESTIONS.length - 1;
      if (isLast) {
        const winner = (Object.keys(newScores) as DISCKey[]).reduce((a, b) =>
          newScores[a] >= newScores[b] ? a : b,
        );
        return { step: state.step + 1, scores: newScores, result: winner };
      }
      return { ...state, step: state.step + 1, scores: newScores };
    }
    case 'RESET':
      return { step: 0, scores: { D: 0, I: 0, S: 0, C: 0 }, result: null };
    default:
      return state;
  }
}

const DISC_COPY = {
  ko: {
    title: 'DISC 심층 성격 진단 (20문항)',
    questionLabel: '질문',
    resultLabel: '진단 결과',
    primaryType: '주요 유형',
    scoreTitle: '유형별 점수 분포',
    workTip: '업무 성향 팁',
    shareLabel: '결과 공유',
    copiedLabel: '복사됨',
    retake: '테스트 다시하기',
    scientificNote: '* DISC 모델은 William Moulton Marston의 이론을 기반으로 합니다.',
    typeNames: { D: '주도형 (D)', I: '사교형 (I)', S: '안정형 (S)', C: '신중형 (C)' } as Record<DISCKey, string>,
  },
  en: {
    title: 'Full DISC Personality Assessment (20 Questions)',
    questionLabel: 'Question',
    resultLabel: 'Your Result',
    primaryType: 'Primary Type',
    scoreTitle: 'Score Distribution by Type',
    workTip: 'Work Style Tip',
    shareLabel: 'Share Result',
    copiedLabel: 'Copied',
    retake: 'Retake Test',
    scientificNote: '* The DISC model is based on William Moulton Marston\'s theory.',
    typeNames: { D: 'Dominance (D)', I: 'Influence (I)', S: 'Steadiness (S)', C: 'Conscientiousness (C)' } as Record<DISCKey, string>,
  },
  ja: {
    title: 'DISC 深層性格診断（20問）',
    questionLabel: '質問',
    resultLabel: '診断結果',
    primaryType: '主要タイプ',
    scoreTitle: 'タイプ別スコア分布',
    workTip: '業務スタイルのヒント',
    shareLabel: '結果をシェア',
    copiedLabel: 'コピー済み',
    retake: 'もう一度テスト',
    scientificNote: '* DISCモデルはウィリアム・マーストンの理論に基づいています。',
    typeNames: { D: '主導型 (D)', I: '社交型 (I)', S: '安定型 (S)', C: '慎重型 (C)' } as Record<DISCKey, string>,
  },
} as const;

export function FullDISCTest({ locale = 'ko' }: { locale?: 'ko' | 'en' | 'ja' }) {
  const [state, dispatch] = useReducer(discReducer, {
    step: 0,
    scores: { D: 0, I: 0, S: 0, C: 0 },
    result: null,
  });

  const copy = DISC_COPY[locale];
  const maxPossible = 60;

  const handleAnswer = useCallback(
    (weight: Partial<Record<DISCKey, number>>) => {
      dispatch({ type: 'ANSWER', weight });
    },
    [],
  );

  const handleReset = useCallback(() => dispatch({ type: 'RESET' }), []);

  if (state.result) {
    const res = DISC_RESULTS[state.result];
    const localeData = res[locale];
    const shareText = `[DISC 결과] ${copy.typeNames[state.result]}: ${localeData.headline}\n${localeData.desc.slice(0, 100)}...`;

    return (
      <Card className="mt-8 overflow-hidden border-2 border-emerald-100 shadow-2xl rounded-2xl">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-slate-50">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl border-2 ${res.color}`}>{res.icon}</div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{copy.primaryType}</p>
              <CardTitle className="text-2xl font-bold text-slate-900">{copy.typeNames[state.result]}</CardTitle>
              <p className="text-sm font-bold text-emerald-600 mt-0.5">{localeData.headline}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <p className="text-slate-700 leading-relaxed text-sm font-medium">{localeData.desc}</p>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" aria-hidden="true" />
              {copy.scoreTitle}
            </p>
            <div className="space-y-3">
              {(['D', 'I', 'S', 'C'] as DISCKey[]).map((k) => (
                <ScoreBar
                  key={k}
                  label={copy.typeNames[k]}
                  value={state.scores[k]}
                  max={maxPossible}
                  colorClass={DISC_RESULTS[k].barColor}
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 flex gap-3">
            <Lightbulb className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-emerald-700 mb-1">{copy.workTip}</p>
              <p className="text-sm text-emerald-800">{localeData.desc.split('. ')[2] ?? ''}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <BookOpen className="w-3 h-3 inline mr-1" aria-hidden="true" />
              Related
            </p>
            <RelatedTags tags={res.relatedTags} />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 items-start bg-slate-50">
          <div className="flex gap-2 flex-wrap">
            <ShareButton textToCopy={shareText} label={copy.shareLabel} copiedLabel={copy.copiedLabel} />
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="rounded-full gap-1.5 font-bold"
              aria-label={copy.retake}
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
              {copy.retake}
            </Button>
          </div>
          <p className="text-xs text-slate-400">{copy.scientificNote}</p>
        </CardFooter>
      </Card>
    );
  }

  const q = DISC_QUESTIONS[state.step];
  const qLocaleOptions = q.options.map((o) => ({
    weight: o.weight,
    text: o[locale],
  }));

  return (
    <Card className="mt-8 overflow-hidden border-2 border-slate-100 shadow-2xl rounded-2xl">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-slate-50">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-5 h-5 text-emerald-500" aria-hidden="true" />
          <CardTitle className="text-lg font-bold text-slate-800">{copy.title}</CardTitle>
        </div>
        <QuestionProgress
          current={state.step + 1}
          total={DISC_QUESTIONS.length}
          label={copy.questionLabel}
        />
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <p className="text-xl font-bold text-slate-800 leading-snug text-center">{q[locale]}</p>
        <div className="grid grid-cols-1 gap-3" role="list">
          {qLocaleOptions.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(opt.weight)}
              className="w-full text-left p-4 rounded-xl border-2 border-slate-100 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50 text-slate-700 font-bold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-label={opt.text}
              role="listitem"
            >
              <span className="text-xs font-bold text-emerald-500 mr-2" aria-hidden="true">
                {String.fromCharCode(65 + i)}.
              </span>
              {opt.text}
            </button>
          ))}
        </div>
      </CardContent>

      <CardFooter className="bg-slate-50">
        <p className="text-xs text-slate-400">{copy.scientificNote}</p>
      </CardFooter>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Component 2: AttachmentStyleTest
// ─────────────────────────────────────────────

type AttachmentKey = 'secure' | 'anxious' | 'avoidant' | 'fearful';

interface AttachmentQuestion {
  type: AttachmentKey;
  ko: string;
  en: string;
  ja: string;
}

const ATTACHMENT_QUESTIONS: AttachmentQuestion[] = [
  { type: 'secure',   ko: '친한 사람에게 감정을 솔직하게 표현하는 것이 편하다',                    en: 'I feel comfortable expressing my emotions honestly to close people',            ja: '親しい人に感情を正直に表現するのが楽だ' },
  { type: 'anxious',  ko: '상대방이 나를 어떻게 생각하는지 자주 걱정된다',                         en: 'I often worry about what others think of me',                                   ja: '相手が自分をどう思っているか頻繁に心配になる' },
  { type: 'avoidant', ko: '너무 가까워지면 숨이 막히는 느낌이 든다',                               en: 'When things get too close, I feel suffocated',                                  ja: '距離が近くなりすぎると息苦しさを感じる' },
  { type: 'fearful',  ko: '친해지고 싶지만 동시에 두렵기도 하다',                                  en: 'I want to get close but I am also afraid at the same time',                     ja: '仲良くなりたいが同時に怖くもある' },
  { type: 'secure',   ko: '갈등이 생겨도 관계가 괜찮을 것이라고 믿는다',                           en: 'Even when conflict arises, I trust the relationship will be okay',              ja: '対立が生じても関係は大丈夫だと信じている' },
  { type: 'anxious',  ko: '연락이 없으면 상대방이 나를 멀리하는 것 같다',                          en: 'When I hear nothing, I feel like the other person is distancing from me',       ja: '連絡がないと相手が自分から距離を置いている気がする' },
  { type: 'avoidant', ko: '혼자 있는 시간이 인간관계보다 더 편할 때가 많다',                       en: 'Time alone is often more comfortable than being with others',                   ja: '一人でいる時間の方が人間関係より楽な時が多い' },
  { type: 'fearful',  ko: '나를 믿어준 사람에게도 쉽게 배신당할 것 같다',                         en: 'Even people who trust me will likely betray me eventually',                     ja: '自分を信じてくれた人にも簡単に裏切られそうだ' },
  { type: 'secure',   ko: '필요할 때 타인에게 도움을 요청하는 것이 자연스럽다',                    en: 'It feels natural to ask others for help when needed',                           ja: '必要な時に他人に助けを求めるのが自然だ' },
  { type: 'anxious',  ko: '상대방의 반응이 조금만 달라져도 불안해진다',                            en: 'Even slight changes in the other person\'s reaction make me anxious',          ja: '相手の反応が少し変わるだけで不安になる' },
  { type: 'avoidant', ko: '감정을 드러내는 것이 약점처럼 느껴진다',                                en: 'Showing emotions feels like exposing a weakness',                               ja: '感情を見せることが弱みのように感じる' },
  { type: 'fearful',  ko: '친밀한 관계에서 통제력을 잃는 것이 두렵다',                             en: 'Losing control in intimate relationships scares me',                            ja: '親密な関係でコントロールを失うことが怖い' },
];

interface AttachmentResultInfo {
  ko: { headline: string; desc: string; tip: string };
  en: { headline: string; desc: string; tip: string };
  ja: { headline: string; desc: string; tip: string };
  color: string;
  barColor: string;
  icon: React.ReactNode;
  relatedTags: string[];
}

const ATTACHMENT_RESULTS: Record<AttachmentKey, AttachmentResultInfo> = {
  secure: {
    ko: {
      headline: '안정형',
      desc: '건강한 친밀감의 기준점. 자신과 타인을 신뢰하며 갈등 속에서도 관계의 지속 가능성을 믿습니다. 감정 표현이 자연스럽고, 도움을 주고받는 것에 불안함이 없습니다.',
      tip: '안정형의 자연스러운 공감과 일관성은 불안형·회피형 파트너에게 큰 안전감을 줍니다. 이 강점을 의식적으로 표현해 주세요.',
    },
    en: {
      headline: 'Secure',
      desc: 'The gold standard of healthy intimacy. You trust yourself and others, and believe in the sustainability of relationships even through conflict. Emotional expression comes naturally, and seeking or giving help creates no anxiety.',
      tip: 'Your natural empathy and consistency create enormous safety for anxious or avoidant partners. Express this strength consciously and consistently.',
    },
    ja: {
      headline: '安定型',
      desc: '健全な親密さの基準点。自分と他人を信頼し、対立の中でも関係の継続可能性を信じています。感情表現が自然で、助けを求めたり与えたりすることへの不安がありません。',
      tip: '安定型の自然な共感と一貫性は、不安型・回避型のパートナーに大きな安心感を与えます。この強みを意識的に表現してください。',
    },
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    barColor: 'bg-gradient-to-r from-emerald-400 to-green-500',
    icon: <Anchor className="w-8 h-8" aria-hidden="true" />,
    relatedTags: ['안정 애착 형성 방법', '건강한 관계 심리학', '공감 능력 강화'],
  },
  anxious: {
    ko: {
      headline: '불안형',
      desc: '연결을 갈망하지만 두려운 유형. 상대의 반응에 민감하게 반응하며 거절받을까 봐 지나치게 확인하려 합니다. 관계 속에서 많은 에너지를 소진하는 경향이 있습니다.',
      tip: '불안한 감정을 상대방에게 솔직하게 표현하되, 행동으로 확인하기보다 언어로 전달하는 연습이 관계를 안정시킵니다.',
    },
    en: {
      headline: 'Anxious',
      desc: 'Craving connection but afraid of losing it. You are highly sensitive to others\' reactions and tend to over-reassure yourself through checking behaviors. Relationships consume significant emotional energy for you.',
      tip: 'Practice expressing your anxiety in words rather than actions. Direct verbal communication builds far more security than repeated checking behaviors.',
    },
    ja: {
      headline: '不安型',
      desc: 'つながりを渇望しながらも失うことを恐れるタイプ。相手の反応に敏感で、拒絶されることを恐れて過度に確認しようとします。関係の中で多くのエネルギーを消耗する傾向があります。',
      tip: '不安な感情を行動で確認するより、言葉で直接相手に伝える練習が関係を安定させます。',
    },
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    barColor: 'bg-gradient-to-r from-blue-400 to-sky-500',
    icon: <CloudRain className="w-8 h-8" aria-hidden="true" />,
    relatedTags: ['불안 애착 극복 전략', '관계 불안 심리학', '자아 존중감 강화'],
  },
  avoidant: {
    ko: {
      headline: '회피형',
      desc: '독립성을 최우선으로 두는 유형. 친밀함이 자유를 침해한다고 느끼며 감정 표현을 최소화합니다. 내면은 연결을 원하지만 방어 기제로 거리를 두게 됩니다.',
      tip: '회피 반응이 상대방에게 거절로 보일 수 있습니다. "지금은 시간이 필요해"라고 명확히 말하는 것이 단절보다 훨씬 효과적입니다.',
    },
    en: {
      headline: 'Avoidant',
      desc: 'Independence above all. Closeness feels like an infringement on freedom, so emotional expression stays minimal. Internally you may want connection, but defensive distancing becomes the default pattern.',
      tip: 'Your withdrawal can read as rejection to others. Saying "I need some time right now" explicitly is far more effective than simply disconnecting.',
    },
    ja: {
      headline: '回避型',
      desc: '独立性を最優先するタイプ。親密さが自由を侵害すると感じ、感情表現を最小限に抑えます。内心ではつながりを求めていても、防衛機制として距離を置くようになります。',
      tip: '回避的な反応が相手には拒絶に見えることがあります。「今は時間が必要」と明確に伝えることが、単に距離を置くよりずっと効果的です。',
    },
    color: 'bg-slate-50 text-slate-700 border-slate-200',
    barColor: 'bg-gradient-to-r from-slate-400 to-gray-500',
    icon: <Shield className="w-8 h-8" aria-hidden="true" />,
    relatedTags: ['회피 애착 이해하기', '친밀감 두려움 극복', '관계 회피 패턴'],
  },
  fearful: {
    ko: {
      headline: '혼란형',
      desc: '친밀함을 원하면서도 두려워하는 유형. 친해지고 싶은 마음과 상처받을까 봐 두려운 마음이 공존합니다. 내면에 두 개의 목소리가 동시에 들리는 상태입니다.',
      tip: '혼란형은 내면의 두 목소리(연결 욕구 vs 두려움)를 인식하는 것이 시작입니다. 신뢰할 수 있는 관계에서 작은 취약함을 하나씩 연습해 보세요.',
    },
    en: {
      headline: 'Fearful-Avoidant',
      desc: 'Wanting intimacy while fearing it. The desire to connect and the fear of being hurt coexist simultaneously. Two inner voices — one reaching out, one pulling back — speak at the same time.',
      tip: 'Recognizing your two inner voices (desire for connection vs. fear of pain) is the first step. Practice small acts of vulnerability in safe, trusted relationships.',
    },
    ja: {
      headline: '混乱型',
      desc: '親密さを求めながらも恐れるタイプ。仲良くなりたいという気持ちと傷つくことへの恐れが共存しています。内面では二つの声が同時に聞こえている状態です。',
      tip: '混乱型は内面の二つの声（つながりへの欲求と恐れ）を認識することが始まりです。信頼できる関係で小さな脆弱性を一つずつ練習してみてください。',
    },
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    barColor: 'bg-gradient-to-r from-purple-400 to-violet-500',
    icon: <AlertCircle className="w-8 h-8" aria-hidden="true" />,
    relatedTags: ['혼란 애착 치유 경로', '내면 아이 심리학', '트라우마와 애착 이론'],
  },
};

const ATTACHMENT_COPY = {
  ko: {
    title: '성인 애착 유형 정밀 진단 (12문항)',
    questionLabel: '질문',
    scaleLabels: ['전혀 아니다', '아니다', '보통', '그렇다', '매우 그렇다'],
    resultLabel: '진단 결과',
    primaryType: '주요 애착 유형',
    scoreTitle: '유형별 점수 분포',
    tip: '관계 팁',
    shareLabel: '결과 공유',
    copiedLabel: '복사됨',
    retake: '테스트 다시하기',
    scientificNote: '* Hazan & Shaver(1987) 성인 애착 이론을 기반으로 재구성한 간이 진단입니다.',
    typeNames: { secure: '안정형', anxious: '불안형', avoidant: '회피형', fearful: '혼란형' } as Record<AttachmentKey, string>,
  },
  en: {
    title: 'Adult Attachment Style Deep Assessment (12 Questions)',
    questionLabel: 'Question',
    scaleLabels: ['Not at all', 'Not really', 'Neutral', 'Somewhat', 'Very much'],
    resultLabel: 'Your Result',
    primaryType: 'Primary Attachment Style',
    scoreTitle: 'Score Distribution',
    tip: 'Relationship Tip',
    shareLabel: 'Share Result',
    copiedLabel: 'Copied',
    retake: 'Retake Test',
    scientificNote: '* Based on Hazan & Shaver (1987) Adult Attachment Theory.',
    typeNames: { secure: 'Secure', anxious: 'Anxious', avoidant: 'Avoidant', fearful: 'Fearful-Avoidant' } as Record<AttachmentKey, string>,
  },
  ja: {
    title: '成人愛着スタイル精密診断（12問）',
    questionLabel: '質問',
    scaleLabels: ['全くない', 'そうでもない', '普通', 'そうだ', 'とてもそうだ'],
    resultLabel: '診断結果',
    primaryType: '主要な愛着スタイル',
    scoreTitle: 'タイプ別スコア分布',
    tip: '関係アドバイス',
    shareLabel: '結果をシェア',
    copiedLabel: 'コピー済み',
    retake: 'もう一度テスト',
    scientificNote: '* Hazan & Shaver（1987）の成人愛着理論を基に再構成した簡易診断です。',
    typeNames: { secure: '安定型', anxious: '不安型', avoidant: '回避型', fearful: '混乱型' } as Record<AttachmentKey, string>,
  },
} as const;

interface AttachmentState {
  step: number;
  scores: Record<AttachmentKey, number>;
  result: AttachmentKey | null;
}

type AttachmentAction =
  | { type: 'ANSWER'; questionType: AttachmentKey; score: number }
  | { type: 'RESET' };

function attachmentReducer(state: AttachmentState, action: AttachmentAction): AttachmentState {
  switch (action.type) {
    case 'ANSWER': {
      const newScores = {
        ...state.scores,
        [action.questionType]: state.scores[action.questionType] + action.score,
      };
      const isLast = state.step >= ATTACHMENT_QUESTIONS.length - 1;
      if (isLast) {
        const winner = (Object.keys(newScores) as AttachmentKey[]).reduce((a, b) =>
          newScores[a] >= newScores[b] ? a : b,
        );
        return { step: state.step + 1, scores: newScores, result: winner };
      }
      return { ...state, step: state.step + 1, scores: newScores };
    }
    case 'RESET':
      return { step: 0, scores: { secure: 0, anxious: 0, avoidant: 0, fearful: 0 }, result: null };
    default:
      return state;
  }
}

export function AttachmentStyleTest({ locale = 'ko' }: { locale?: 'ko' | 'en' | 'ja' }) {
  const [state, dispatch] = useReducer(attachmentReducer, {
    step: 0,
    scores: { secure: 0, anxious: 0, avoidant: 0, fearful: 0 },
    result: null,
  });

  const copy = ATTACHMENT_COPY[locale];
  const maxPossible = 15;

  const handleAnswer = useCallback(
    (questionType: AttachmentKey, score: number) => {
      dispatch({ type: 'ANSWER', questionType, score });
    },
    [],
  );

  const handleReset = useCallback(() => dispatch({ type: 'RESET' }), []);

  if (state.result) {
    const res = ATTACHMENT_RESULTS[state.result];
    const localeData = res[locale];
    const shareText = `[애착 유형 결과] ${copy.typeNames[state.result]}: ${localeData.headline}\n${localeData.tip}`;

    return (
      <Card className="mt-8 overflow-hidden border-2 border-emerald-100 shadow-2xl rounded-2xl">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-slate-50">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl border-2 ${res.color}`}>{res.icon}</div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{copy.primaryType}</p>
              <CardTitle className="text-2xl font-bold text-slate-900">{copy.typeNames[state.result]}</CardTitle>
              <p className="text-sm font-bold text-emerald-600 mt-0.5">{localeData.headline}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <p className="text-slate-700 leading-relaxed text-sm font-medium">{localeData.desc}</p>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" aria-hidden="true" />
              {copy.scoreTitle}
            </p>
            <div className="space-y-3">
              {(['secure', 'anxious', 'avoidant', 'fearful'] as AttachmentKey[]).map((k) => (
                <ScoreBar
                  key={k}
                  label={copy.typeNames[k]}
                  value={state.scores[k]}
                  max={maxPossible}
                  colorClass={ATTACHMENT_RESULTS[k].barColor}
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 flex gap-3">
            <Heart className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-emerald-700 mb-1">{copy.tip}</p>
              <p className="text-sm text-emerald-800">{localeData.tip}</p>
            </div>
          </div>

          <RelatedTags tags={res.relatedTags} />
        </CardContent>

        <CardFooter className="flex flex-col gap-3 items-start bg-slate-50">
          <div className="flex gap-2 flex-wrap">
            <ShareButton textToCopy={shareText} label={copy.shareLabel} copiedLabel={copy.copiedLabel} />
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="rounded-full gap-1.5 font-bold"
              aria-label={copy.retake}
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
              {copy.retake}
            </Button>
          </div>
          <p className="text-xs text-slate-400">{copy.scientificNote}</p>
        </CardFooter>
      </Card>
    );
  }

  const q = ATTACHMENT_QUESTIONS[state.step];

  return (
    <Card className="mt-8 overflow-hidden border-2 border-slate-100 shadow-2xl rounded-2xl">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-slate-50">
        <div className="flex items-center gap-2 mb-1">
          <Heart className="w-5 h-5 text-rose-500" aria-hidden="true" />
          <CardTitle className="text-lg font-bold text-slate-800">{copy.title}</CardTitle>
        </div>
        <QuestionProgress
          current={state.step + 1}
          total={ATTACHMENT_QUESTIONS.length}
          label={copy.questionLabel}
        />
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <p className="text-xl font-bold text-slate-800 leading-snug text-center">{q[locale]}</p>
        <div className="space-y-2" role="group" aria-label={`Question ${state.step + 1} rating scale`}>
          <div className="flex justify-between text-xs text-slate-400 font-bold px-1">
            <span>{copy.scaleLabels[0]}</span>
            <span>{copy.scaleLabels[4]}</span>
          </div>
          <div className="flex gap-2 justify-between" role="list">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                onClick={() => handleAnswer(q.type, score)}
                className="flex-1 py-4 rounded-xl border-2 border-slate-100 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50 text-slate-600 font-bold text-lg transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                aria-label={`${copy.scaleLabels[score - 1]} (${score})`}
                role="listitem"
              >
                {score}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-400 font-bold px-1">
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-slate-50">
        <p className="text-xs text-slate-400">{copy.scientificNote}</p>
      </CardFooter>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Component 3: BigFiveTest
// ─────────────────────────────────────────────

type BigFiveKey = 'O' | 'C' | 'E' | 'A' | 'N';

interface BigFiveQuestion {
  dimension: BigFiveKey;
  ko: string;
  en: string;
  ja: string;
}

const BIG_FIVE_QUESTIONS: BigFiveQuestion[] = [
  { dimension: 'O', ko: '새로운 예술, 음악, 아이디어에 쉽게 매료된다',            en: 'I am easily fascinated by new art, music, and ideas',                 ja: '新しい芸術・音楽・アイデアに簡単に魅了される' },
  { dimension: 'O', ko: '상상력이 풍부하고 추상적 개념을 즐긴다',                  en: 'I have a rich imagination and enjoy abstract concepts',               ja: '想像力が豊かで抽象的な概念を楽しむ' },
  { dimension: 'O', ko: '익숙한 것보다 새로운 경험을 적극적으로 찾는다',           en: 'I actively seek new experiences over familiar ones',                  ja: '慣れたものより新しい経験を積極的に求める' },
  { dimension: 'C', ko: '할 일 목록을 만들고 계획대로 실행한다',                   en: 'I make to-do lists and follow through with my plans',                 ja: 'やることリストを作り計画通りに実行する' },
  { dimension: 'C', ko: '마감을 지키는 것을 매우 중요하게 여긴다',                  en: 'I consider meeting deadlines to be very important',                   ja: '締め切りを守ることをとても重視する' },
  { dimension: 'C', ko: '실수를 최소화하기 위해 세심하게 확인한다',                 en: 'I check carefully to minimize mistakes',                              ja: 'ミスを最小化するために丁寧に確認する' },
  { dimension: 'E', ko: '사람들과 함께 있을 때 에너지가 충전된다',                  en: 'Being with people energizes me',                                      ja: '人と一緒にいると元気が出る' },
  { dimension: 'E', ko: '모임에서 먼저 말을 걸고 분위기를 이끈다',                  en: 'I initiate conversations and lead the atmosphere in gatherings',      ja: '集まりで先に話しかけて雰囲気をリードする' },
  { dimension: 'E', ko: '활동적이고 자극이 많은 환경을 즐긴다',                     en: 'I enjoy active and stimulating environments',                         ja: '活動的で刺激の多い環境を楽しむ' },
  { dimension: 'A', ko: '다른 사람의 감정에 쉽게 공감한다',                         en: 'I easily empathize with others\' emotions',                          ja: '他の人の感情に簡単に共感できる' },
  { dimension: 'A', ko: '갈등을 피하고 협력을 선호한다',                             en: 'I prefer to avoid conflict and cooperate',                           ja: '対立を避けて協力を好む' },
  { dimension: 'A', ko: '타인을 돕는 것에서 보람을 느낀다',                          en: 'I find meaning in helping others',                                    ja: '他人を助けることにやりがいを感じる' },
  { dimension: 'N', ko: '작은 일에도 쉽게 걱정되거나 불안해진다',                   en: 'Even small things make me worried or anxious easily',                 ja: '小さなことでも簡単に心配になったり不安になる' },
  { dimension: 'N', ko: '기분이 자주 바뀌는 편이다',                                 en: 'My mood changes frequently',                                         ja: '気分がよく変わる方だ' },
  { dimension: 'N', ko: '스트레스 상황에서 감정 조절이 어렵다',                      en: 'I find it difficult to regulate emotions in stressful situations',    ja: 'ストレス状況では感情のコントロールが難しい' },
];

interface BigFiveDimensionInfo {
  ko: { name: string; high: string; low: string };
  en: { name: string; high: string; low: string };
  ja: { name: string; high: string; low: string };
  barColor: string;
  icon: React.ReactNode;
}

const BIG_FIVE_DIMENSIONS: Record<BigFiveKey, BigFiveDimensionInfo> = {
  O: {
    ko: { name: '개방성 (O)', high: '높은 창의성과 호기심', low: '안정성과 실용적 사고 선호' },
    en: { name: 'Openness (O)', high: 'High creativity & curiosity', low: 'Prefers stability & practical thinking' },
    ja: { name: '開放性 (O)', high: '高い創造性と好奇心', low: '安定性と実用的思考を好む' },
    barColor: 'bg-gradient-to-r from-violet-400 to-purple-500',
    icon: <Star className="w-4 h-4" aria-hidden="true" />,
  },
  C: {
    ko: { name: '성실성 (C)', high: '높은 조직력과 목표 지향성', low: '유연성과 즉흥적 처리 선호' },
    en: { name: 'Conscientiousness (C)', high: 'High organization & goal-focus', low: 'Prefers flexibility & spontaneity' },
    ja: { name: '誠実性 (C)', high: '高い組織力と目標志向性', low: '柔軟性と即興的処理を好む' },
    barColor: 'bg-gradient-to-r from-blue-400 to-indigo-500',
    icon: <Target className="w-4 h-4" aria-hidden="true" />,
  },
  E: {
    ko: { name: '외향성 (E)', high: '사교적이고 활동 지향적', low: '내성적이고 깊은 사색 선호' },
    en: { name: 'Extraversion (E)', high: 'Social & activity-oriented', low: 'Introspective & prefers deep reflection' },
    ja: { name: '外向性 (E)', high: '社交的で活動志向', low: '内省的で深い思索を好む' },
    barColor: 'bg-gradient-to-r from-amber-400 to-yellow-500',
    icon: <Users className="w-4 h-4" aria-hidden="true" />,
  },
  A: {
    ko: { name: '친화성 (A)', high: '공감 능력과 협력 지향', low: '독립적 사고와 경쟁 선호' },
    en: { name: 'Agreeableness (A)', high: 'Empathetic & cooperation-focused', low: 'Independent thinking & competition-oriented' },
    ja: { name: '協調性 (A)', high: '共感能力と協力志向', low: '独立的な思考と競争を好む' },
    barColor: 'bg-gradient-to-r from-emerald-400 to-green-500',
    icon: <Heart className="w-4 h-4" aria-hidden="true" />,
  },
  N: {
    ko: { name: '신경증 (N)', high: '감정적 반응성과 민감성', low: '감정 안정성과 스트레스 내성' },
    en: { name: 'Neuroticism (N)', high: 'Emotional reactivity & sensitivity', low: 'Emotional stability & stress resilience' },
    ja: { name: '神経症的傾向 (N)', high: '感情的反応性と敏感さ', low: '感情の安定性とストレス耐性' },
    barColor: 'bg-gradient-to-r from-rose-400 to-red-500',
    icon: <Brain className="w-4 h-4" aria-hidden="true" />,
  },
};

const BIG_FIVE_COPY = {
  ko: {
    title: '빅파이브 성격 정밀 진단 (15문항)',
    questionLabel: '질문',
    scaleLabels: ['전혀 아니다', '아니다', '보통', '그렇다', '매우 그렇다'] as [string, string, string, string, string],
    resultLabel: '진단 결과',
    scoreTitle: '5가지 차원별 점수',
    shareLabel: '결과 공유',
    copiedLabel: '복사됨',
    retake: '테스트 다시하기',
    scientificNote: '* Big Five(OCEAN) 모델은 성격심리학에서 가장 널리 검증된 5요인 모델입니다.',
    highLabel: '높음',
    lowLabel: '낮음',
    relatedTags: ['빅파이브 OCEAN 완전 가이드', '성격 심리학 기초', '자기이해 심층 진단'],
  },
  en: {
    title: 'Big Five Personality Deep Assessment (15 Questions)',
    questionLabel: 'Question',
    scaleLabels: ['Not at all', 'Not really', 'Neutral', 'Somewhat', 'Very much'] as [string, string, string, string, string],
    resultLabel: 'Your Profile',
    scoreTitle: 'Five Dimension Scores',
    shareLabel: 'Share Result',
    copiedLabel: 'Copied',
    retake: 'Retake Test',
    scientificNote: '* The Big Five (OCEAN) is the most widely validated personality model in psychology.',
    highLabel: 'High',
    lowLabel: 'Low',
    relatedTags: ['Big Five OCEAN Complete Guide', 'Personality Psychology Basics', 'Deep Self-Understanding'],
  },
  ja: {
    title: 'ビッグファイブ性格精密診断（15問）',
    questionLabel: '質問',
    scaleLabels: ['全くない', 'そうでもない', '普通', 'そうだ', 'とてもそうだ'] as [string, string, string, string, string],
    resultLabel: 'あなたのプロフィール',
    scoreTitle: '5つの次元別スコア',
    shareLabel: '結果をシェア',
    copiedLabel: 'コピー済み',
    retake: 'もう一度テスト',
    scientificNote: '* ビッグファイブ（OCEAN）は性格心理学で最も広く検証された5因子モデルです。',
    highLabel: '高い',
    lowLabel: '低い',
    relatedTags: ['ビッグファイブOCEAN完全ガイド', '性格心理学の基礎', '自己理解深層診断'],
  },
} as const;

interface BigFiveState {
  step: number;
  scores: Record<BigFiveKey, number>;
  done: boolean;
}

type BigFiveAction =
  | { type: 'ANSWER'; dimension: BigFiveKey; score: number }
  | { type: 'RESET' };

function bigFiveReducer(state: BigFiveState, action: BigFiveAction): BigFiveState {
  switch (action.type) {
    case 'ANSWER': {
      const newScores = {
        ...state.scores,
        [action.dimension]: state.scores[action.dimension] + action.score,
      };
      const isLast = state.step >= BIG_FIVE_QUESTIONS.length - 1;
      return { step: state.step + 1, scores: newScores, done: isLast };
    }
    case 'RESET':
      return { step: 0, scores: { O: 0, C: 0, E: 0, A: 0, N: 0 }, done: false };
    default:
      return state;
  }
}

export function BigFiveTest({ locale = 'ko' }: { locale?: 'ko' | 'en' | 'ja' }) {
  const [state, dispatch] = useReducer(bigFiveReducer, {
    step: 0,
    scores: { O: 0, C: 0, E: 0, A: 0, N: 0 },
    done: false,
  });

  const copy = BIG_FIVE_COPY[locale];
  const maxPossible = 15;

  const handleAnswer = useCallback(
    (dimension: BigFiveKey, score: number) => {
      dispatch({ type: 'ANSWER', dimension, score });
    },
    [],
  );

  const handleReset = useCallback(() => dispatch({ type: 'RESET' }), []);

  if (state.done) {
    const shareLines = (Object.keys(BIG_FIVE_DIMENSIONS) as BigFiveKey[]).map((k) => {
      const pct = Math.round((state.scores[k] / maxPossible) * 100);
      return `${BIG_FIVE_DIMENSIONS[k][locale].name}: ${pct}%`;
    });
    const shareText = `[빅파이브 성격 결과]\n${shareLines.join('\n')}`;

    return (
      <Card className="mt-8 overflow-hidden border-2 border-emerald-100 shadow-2xl rounded-2xl">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-slate-50">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5 text-emerald-500" aria-hidden="true" />
            <CardTitle className="text-lg font-bold text-slate-800">{copy.resultLabel}</CardTitle>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{copy.scoreTitle}</p>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <div className="space-y-5">
            {(Object.keys(BIG_FIVE_DIMENSIONS) as BigFiveKey[]).map((k) => {
              const dim = BIG_FIVE_DIMENSIONS[k];
              const pct = Math.round((state.scores[k] / maxPossible) * 100);
              const isHigh = pct >= 60;
              const dimLocale = dim[locale];
              return (
                <div key={k} className="space-y-2">
                  <ScoreBar
                    label={dimLocale.name}
                    value={state.scores[k]}
                    max={maxPossible}
                    colorClass={dim.barColor}
                    sublabel={isHigh ? copy.highLabel : copy.lowLabel}
                  />
                  <p className="text-xs text-slate-500 pl-1">
                    {isHigh ? dimLocale.high : dimLocale.low}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 flex gap-3">
            <Lightbulb className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-emerald-800 leading-relaxed">
              {locale === 'ko' && '각 차원의 점수는 상대적인 경향성입니다. 높낮이 자체보다 조합 패턴을 보는 것이 더 정확합니다.'}
              {locale === 'en' && 'Each dimension score reflects a relative tendency. The combination pattern across dimensions reveals more than any single score.'}
              {locale === 'ja' && '各次元のスコアは相対的な傾向です。高低そのものより組み合わせパターンを見る方がより正確です。'}
            </p>
          </div>

          <RelatedTags tags={copy.relatedTags as unknown as string[]} />
        </CardContent>

        <CardFooter className="flex flex-col gap-3 items-start bg-slate-50">
          <div className="flex gap-2 flex-wrap">
            <ShareButton textToCopy={shareText} label={copy.shareLabel} copiedLabel={copy.copiedLabel} />
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="rounded-full gap-1.5 font-bold"
              aria-label={copy.retake}
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
              {copy.retake}
            </Button>
          </div>
          <p className="text-xs text-slate-400">{copy.scientificNote}</p>
        </CardFooter>
      </Card>
    );
  }

  const q = BIG_FIVE_QUESTIONS[state.step];

  return (
    <Card className="mt-8 overflow-hidden border-2 border-slate-100 shadow-2xl rounded-2xl">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-slate-50">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-5 h-5 text-emerald-500" aria-hidden="true" />
          <CardTitle className="text-lg font-bold text-slate-800">{copy.title}</CardTitle>
        </div>
        <QuestionProgress
          current={state.step + 1}
          total={BIG_FIVE_QUESTIONS.length}
          label={copy.questionLabel}
        />
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <div className="flex items-center justify-center gap-2">
          <span className={`p-2 rounded-lg ${
            q.dimension === 'O' ? 'bg-violet-100 text-violet-600' :
            q.dimension === 'C' ? 'bg-blue-100 text-blue-600' :
            q.dimension === 'E' ? 'bg-amber-100 text-amber-600' :
            q.dimension === 'A' ? 'bg-emerald-100 text-emerald-600' :
            'bg-rose-100 text-rose-600'
          }`} aria-hidden="true">
            {BIG_FIVE_DIMENSIONS[q.dimension].icon}
          </span>
          <Badge variant="secondary" className="text-xs font-bold">
            {BIG_FIVE_DIMENSIONS[q.dimension][locale].name}
          </Badge>
        </div>
        <p className="text-xl font-bold text-slate-800 leading-snug text-center">{q[locale]}</p>
        <div className="space-y-2" role="group" aria-label={`Question ${state.step + 1} rating scale`}>
          <div className="flex justify-between text-xs text-slate-400 font-bold px-1">
            <span>{copy.scaleLabels[0]}</span>
            <span>{copy.scaleLabels[4]}</span>
          </div>
          <div className="flex gap-2 justify-between" role="list">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                onClick={() => handleAnswer(q.dimension, score)}
                className="flex-1 py-4 rounded-xl border-2 border-slate-100 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50 text-slate-600 font-bold text-lg transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                aria-label={`${copy.scaleLabels[score - 1]} (${score})`}
                role="listitem"
              >
                {score}
              </button>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-slate-50">
        <p className="text-xs text-slate-400">{copy.scientificNote}</p>
      </CardFooter>
    </Card>
  );
}

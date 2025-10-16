"use client";

import React, { useMemo, useState } from "react";

const QUIZ_CONFIG = {
  meta: {
    title: "Work-Life Balance Quiz",
    subtitle:
      "Assess your habits, sacrifices, and AI workflow to get your Work-Life Balance score.",
  },
  weights: {
    sentiments: 0.5,
    sacrifices: 0.3,
    aiContribution: 0.2,
  },
  burnoutThresholds: {
    low: 0,
    moderate: 45,
    high: 70,
  },
  optimizationScaleMax: 10,
  hours: {
    typicalWeekMin: 5,
    typicalWeekMax: 100,
    overworkStart: 50,
    extremeOverwork: 65,
  },
  sections: [
    {
      id: "sentiments",
      title: "Work Sentiments",
      description: "How you feel about your current work situation.",
      items: [
        {
          id: "wlb_self_rating",
          type: "radio",
          prompt: "Rate your current work-life balance.",
          options: ["Very poor", "Poor", "Fair", "Good", "Very good"],
        },
        {
          id: "job_satisfaction",
          type: "radio",
          prompt: "Rate your job satisfaction.",
          options: ["Very poor", "Poor", "Fair", "Good", "Very good"],
        },
        {
          id: "mental_health",
          type: "radio",
          prompt: "Rate your current mental health.",
          options: ["Very poor", "Poor", "Fair", "Good", "Very good"],
        },
        {
          id: "weekly_hours",
          type: "number",
          prompt: "How many hours do you typically work per week?",
          min: 0,
          max: 100,
          step: 1,
        },
      ],
    },
    {
      id: "sacrifices",
      title: "Sacrifices",
      description: "What do you trade off to get work done?",
      items: [
        {
          id: "sleep_sacrifice",
          type: "radio",
          prompt: "I sacrifice SLEEP for work.",
          options: ["Never", "Rarely", "Sometimes", "Often", "Always"],
        },
        {
          id: "social_sacrifice",
          type: "radio",
          prompt: "I cancel SOCIAL plans for work.",
          options: ["Never", "Rarely", "Sometimes", "Often", "Always"],
        },
        {
          id: "health_sacrifice",
          type: "radio",
          prompt: "I skip HEALTH/EXERCISE for work.",
          options: ["Never", "Rarely", "Sometimes", "Often", "Always"],
        },
      ],
    },
    {
      id: "ai",
      title: "AI Workflow",
      description: "How you apply AI to optimize your work.",
      items: [
        {
          id: "ai_depth",
          type: "radio",
          prompt: "Depth of AI integration in your workflow.",
          options: [
            "None",
            "Light (occasional prompts)",
            "Moderate (regular use in some tasks)",
            "High (deeply integrated)",
          ],
        },
        {
          id: "ai_eligible_pct",
          type: "slider",
          prompt:
            "What % of your weekly tasks could reasonably be assisted by AI?",
          min: 0,
          max: 100,
          step: 1,
        },
        {
          id: "ai_time_saved_pct",
          type: "slider",
          prompt: "Estimated % of total work time saved via AI.",
          min: 0,
          max: 100,
          step: 1,
        },
      ],
    },
  ],
};

const labelTo01 = (label: string, ordered: string[]) => {
  const idx = ordered.findIndex((x) => x === label);
  if (idx < 0) return 0.5;
  return ordered.length === 1 ? 1 : idx / (ordered.length - 1);
};

const invert01 = (x: number) => 1 - x;

export type Answers = Record<string, number | string>;

function computeScores(answers: Answers) {
  const cfg = QUIZ_CONFIG;
  const sentimentsOpts = ["Very poor", "Poor", "Fair", "Good", "Very good"];
  const sacrificeOpts = ["Never", "Rarely", "Sometimes", "Often", "Always"];

  const wlb = labelTo01(String(answers["wlb_self_rating"] ?? "Fair"), sentimentsOpts);
  const job = labelTo01(String(answers["job_satisfaction"] ?? "Fair"), sentimentsOpts);
  const mh = labelTo01(String(answers["mental_health"] ?? "Fair"), sentimentsOpts);
  const sentiments01 = (wlb + job + mh) / 3;
  const sentiments100 = sentiments01 * 100;

  const weeklyHours = clamp(toNum(answers["weekly_hours"] ?? 40), 0, cfg.hours.typicalWeekMax);
  let overwork01 = 0;
  if (weeklyHours >= cfg.hours.overworkStart) {
    const span = Math.max(1, cfg.hours.extremeOverwork - cfg.hours.overworkStart);
    overwork01 = clamp((weeklyHours - cfg.hours.overworkStart) / span, 0, 1);
  }

  const sleepSac = labelTo01(String(answers["sleep_sacrifice"] ?? "Sometimes"), sacrificeOpts);
  const socialSac = labelTo01(String(answers["social_sacrifice"] ?? "Sometimes"), sacrificeOpts);
  const healthSac = labelTo01(String(answers["health_sacrifice"] ?? "Sometimes"), sacrificeOpts);
  const sacrifices01 = (sleepSac + socialSac + healthSac) / 3;
  const sacrifices100 = sacrifices01 * 100;

  const aiDepthLabels = [
    "None",
    "Light (occasional prompts)",
    "Moderate (regular use in some tasks)",
    "High (deeply integrated)",
  ];
  const aiDepth01 = labelTo01(String(answers["ai_depth"] ?? "Light (occasional prompts)"), aiDepthLabels);
  const aiEligible01 = clamp(toNum(answers["ai_eligible_pct"] ?? 0) / 100, 0, 1);
  const aiSaved01 = clamp(toNum(answers["ai_time_saved_pct"] ?? 0) / 100, 0, 1);
  const aiComposite01 = aiDepth01 * 0.5 + aiEligible01 * 0.25 + aiSaved01 * 0.25;
  const optimizationLevel = Math.round(aiComposite01 * QUIZ_CONFIG.optimizationScaleMax);

  const wSent = cfg.weights.sentiments * sentiments100;
  const wSac = cfg.weights.sacrifices * (100 * invert01(sacrifices01));
  const wAI = cfg.weights.aiContribution * (aiComposite01 * 100);
  const wlBalanceScore = Math.round(clamp(wSent + wSac + wAI, 0, 100));

  const riskComposite100 =
    (100 - sentiments100) * 0.45 + sacrifices100 * 0.35 + overwork01 * 100 * 0.2;

  let burnoutRisk: "Low" | "Moderate" | "High" = "Low";
  if (riskComposite100 >= cfg.burnoutThresholds.high) burnoutRisk = "High";
  else if (riskComposite100 >= cfg.burnoutThresholds.moderate) burnoutRisk = "Moderate";

  return {
    wlBalanceScore,
    burnoutRisk,
    optimizationLevel,
  };
}

function toNum(x: any) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

function clamp(n: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, n));
}

function isAnswered(item: Item, value: any): boolean {
  const req = item.required !== false;
  if (!req) return true;
  switch (item.type) {
    case "radio":
      return value !== undefined && value !== null && String(value).length > 0;
    case "checkbox":
      return Array.isArray(value) && value.length > 0;
    case "slider":
      return typeof value === "number";
    case "number":
      return value !== undefined && value !== null && value !== "";
    default:
      return value !== undefined && value !== null;
  }
}

type Item = {
  id: string;
  type: "radio" | "checkbox" | "slider" | "number";
  prompt: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
};

type Section = {
  id: string;
  title: string;
  description?: string;
  items: Item[];
};

export default function Page() {
  const sections = QUIZ_CONFIG.sections as Section[];
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const isLast = step >= sections.length;
  const progressPct = Math.round((Math.min(step, sections.length) / sections.length) * 100);
  const scores = useMemo(() => (isLast ? computeScores(answers) : null), [isLast, answers]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 bg-white text-gray-900">
      <h1 className="text-3xl font-bold tracking-tight text-[#1976d3]">{QUIZ_CONFIG.meta.title}</h1>
      <p className="mt-2 text-sm text-gray-600">{QUIZ_CONFIG.meta.subtitle}</p>
      <div className="mt-6 h-2 w-full rounded-full bg-gray-200">
        <div className="h-2 rounded-full bg-[#1976d3] transition-all" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="mt-1 text-right text-xs text-gray-500">{progressPct}%</div>
      {!isLast ? (
        <SectionForm
          key={sections[step].id}
          section={sections[step]}
          answers={answers}
          onChange={(patch) => setAnswers((a) => ({ ...a, ...patch }))}
          onNext={() => setStep((s) => Math.min(sections.length, s + 1))}
          onBack={() => setStep((s) => Math.max(0, s - 1))}
          isFirst={step === 0}
          isLast={step === sections.length - 1}
        />
      ) : (
        <ResultsView scores={scores!} onRestart={() => { setStep(0); setAnswers({}); }} />
      )}
    </div>
  );
}

function SectionForm({ section, answers, onChange, onNext, onBack, isFirst, isLast }: { section: Section; answers: Answers; onChange: (patch: Answers) => void; onNext: () => void; onBack: () => void; isFirst: boolean; isLast: boolean; }) {
  const [attempted, setAttempted] = React.useState(false);
  const isValid = section.items.every((it) => isAnswered(it, answers[it.id]));
  const handleNext = () => {
    if (!isValid) {
      setAttempted(true);
      return;
    }
    onNext();
  };
  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold text-[#1976d3]">{section.title}</h2>
      {section.description && <p className="mt-1 text-sm text-gray-600">{section.description}</p>}
      <div className="mt-6 space-y-6">
        {section.items.map((item) => (
          <QuestionControl key={item.id} item={item} value={answers[item.id]} onChange={(v) => onChange({ [item.id]: v })} />
        ))}
      </div>
      <div className="mt-8 flex items-center justify-between">
        <button type="button" onClick={onBack} className="rounded-xl border px-4 cursor-pointer py-2 text-sm hover:bg-gray-50" disabled={isFirst}>Back</button>
        <button type="button" onClick={handleNext} className="rounded-xl bg-[#1976d3] cursor-pointer px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50" disabled={!isValid}>
          {isLast ? "See results" : "Continue"}
        </button>
      </div>
      {!isValid && attempted && <div className="mt-3 text-sm text-red-600">Please complete all required fields in this section.</div>}
    </div>
  );
}

function QuestionControl({ item, value, onChange }: { item: Item; value: any; onChange: (v: any) => void; }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm`}>
      <div className="text-sm font-medium">
        {item.prompt} {item.required !== false && <span className="text-red-600">*</span>}
      </div>
      {item.type === "radio" && item.options && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {item.options.map((opt) => (
            <label key={opt} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2 ${value === opt ? "border-[#1976d3]" : "border-gray-200"}`}>
              <input type="radio" name={item.id} value={opt} checked={value === opt} onChange={() => onChange(opt)} className="h-4 w-4 text-[#1976d3] focus:ring-[#1976d3]" />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      )}
      {item.type === "checkbox" && item.options && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {item.options.map((opt) => {
            const arr = Array.isArray(value) ? (value as string[]) : [];
            const checked = arr.includes(opt);
            return (
              <label key={opt} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2 ${checked ? "border-[#1976d3]" : "border-gray-200"}`}>
                <input type="checkbox" value={opt} checked={checked} onChange={(e) => { if (e.target.checked) onChange([...(arr || []), opt]); else onChange(arr.filter((x) => x !== opt)); }} className="h-4 w-4 text-[#1976d3] focus:ring-[#1976d3]" />
                <span className="text-sm">{opt}</span>
              </label>
            );
          })}
        </div>
      )}
      {item.type === "slider" && (
        <div className="mt-3">
          <input type="range" min={item.min ?? 0} max={item.max ?? 100} step={item.step ?? 1} value={typeof value === "number" ? value : (item.min ?? 0)} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-[#1976d3]" />
          <div className="mt-1 text-xs text-gray-600">{value ?? 0}%</div>
        </div>
      )}
      {item.type === "number" && (
        <div className="mt-3">
          <input type="number" min={item.min ?? 0} max={item.max ?? 100} step={item.step ?? 1} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : parseFloat(e.target.value))} className="w-40 rounded-md border px-3 py-2 text-sm focus:border-[#1976d3] focus:ring-[#1976d3]" />
        </div>
      )}
    </div>
  );
}

function ResultsView({ scores, onRestart }: { scores: { wlBalanceScore: number; burnoutRisk: string; optimizationLevel: number; }; onRestart: () => void; }) {
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-[#1976d3]">Your Results</h2>
      <div className="mt-6 space-y-6">
        <div className="rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-600">Work-Life Balance Score</div>
          <div className="mt-2 text-4xl font-bold text-[#1976d3]">{scores.wlBalanceScore} / 100</div>
          <div className="mt-1 text-sm text-gray-500">Higher is better.   A score above 70 indicates a healthy balance.</div>
        </div>
        <div className="rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-600">Burnout Risk Level</div>
          <div className="mt-2 text-4xl font-bold text-[#1976d3]">{scores.burnoutRisk}</div>
          <div className="mt-1 text-sm text-gray-500">Based on your sentiments, sacrifices, and workload.</div>
        </div>
        <div className="rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-600">AI Optimization Level</div>
          <div className="mt-2 text-4xl font-bold text-[#1976d3]">{scores.optimizationLevel} / {QUIZ_CONFIG.optimizationScaleMax}</div>
          <div className="mt-1 text-sm text-gray-500">Higher means you are effectively leveraging AI in your workflow.</div>
        </div>
      </div>
      <div className="mt-8">
        <button type="button" onClick={onRestart} className="rounded-xl bg-[#1976d3] px-5 py-2 cursor-pointer text-sm font-medium text-white hover:opacity-90">
          Retake Quiz
        </button>
      </div>
    </div>
  );
}
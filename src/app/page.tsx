"use client";

import React, { useMemo, useState } from "react";

const RISK_CONFIG = {
  meta: {
    title: "Holiday Hide-and-Seek Risk Index",
    subtitle:
      "Pick a hiding spot and select household/kid factors. We'll rate how risky that spot is and suggest safety tips.",
  },
  thresholds: {
    low: 0,
    moderate: 36,
    high: 66,
  },
  spotBaseRisk: {
    "Workbench / open surface": 18,
    "Open shelf at eye level": 16,
    "On top of toolbox (unlocked)": 16,
    "Clear/transparent bin (visible contents)": 15,
    "Behind obviously seasonal bins (e.g., “XMAS LIGHTS”)": 12,
    "Car trunk used daily": 12,
    "Under tarp/on floor behind yard tools": 11,
    "Top of fridge/freezer in garage": 10,
    "Opaque bin on mid shelf (unlabeled)": 10,
    "Back corner behind heavy items (no cover)": 9,
    "Attic/rafters (reachable by standard step stool)": 8,
    "Inside toolbox drawer (unlocked)": 8,
    "Opaque bin labeled something boring (“Tax Records,” “Paint rags”)": 7,
    "Locked cabinet (garage)": 6,
    "Attic/rafters requiring ladder only adults use": 5,
    "Locked trunk infrequently used": 5,
    "Neighbors / relatives house, not on property": 2,
    "Off-site storage with lock": 1,
  } as Record<string, number>,
  riskFactors: {
    "Oldest Child's Age": {
      "0-3": 2,
      "4-6": 6,
      "7-9": 10,
    },
    "How many kids": {
      "1": 3,
      "2": 6,
      "3+": 9,
    },
    "Snooping tendencies": {
      "Chill / doesn't snoop": 2,
      "Sometimes snoops or found something once": 8,
      "Repeat gift-finder / detective mode": 16,
    },
    "Access to the garage/shed/attic": {
      "Rarely there": 2,
      "Sometimes": 7,
      "Often": 13,
    },
    "Reach and climbing": {
      "Won't climb": 2,
      "Uses stool/chair": 7,
      "Comfortable with ladders": 12,
    },
    "Days until gift-opening": {
      "30+": 4,
      "14-29": 8,
      "7-13": 12,
    },
    "How obvious are the clues": {
      "Plain boxes, quiet": 2,
      "Some branding/crinkly bags": 8,
      "Very obvious shapes/sounds (bike silhouette, jingly toys)": 12,
    },
    "Container security": {
      "Unlocked/loose": 10,
      "Taped/zip-tied": 6,
      "Locked": 2,
    },
  } as const,
} as const;

type Answers = Record<string, string | number | boolean>;

type Item = {
  id: string;
  type: "radio" | "slider" | "number" | "boolean" | "select";
  prompt: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  hint?: string;
};

const FORM_ITEMS: Item[] = [
  { id: "spot", type: "radio", prompt: "Hiding spot selection", options: Object.keys(RISK_CONFIG.spotBaseRisk), required: true },
  { id: "age_group", type: "select", prompt: "Oldest Child's Age", options: Object.keys(RISK_CONFIG.riskFactors["Oldest Child's Age"]), required: true },
  { id: "kids_count", type: "select", prompt: "How many kids?", options: Object.keys(RISK_CONFIG.riskFactors["How many kids"]), required: true },
  { id: "snooping", type: "select", prompt: "Snooping tendencies", options: Object.keys(RISK_CONFIG.riskFactors["Snooping tendencies"]), required: true },
  { id: "access_area", type: "select", prompt: "Access to the hiding area (garage/shed/attic)", options: Object.keys(RISK_CONFIG.riskFactors["Access to the garage/shed/attic"]), required: true },
  { id: "reach_climb", type: "select", prompt: "Reach and climbing", options: Object.keys(RISK_CONFIG.riskFactors["Reach and climbing"]), required: true },
  { id: "days_until", type: "select", prompt: "Days until gift-opening", options: Object.keys(RISK_CONFIG.riskFactors["Days until gift-opening"]), required: true },
  { id: "clues", type: "select", prompt: "How obvious are the clues", options: Object.keys(RISK_CONFIG.riskFactors["How obvious are the clues"]), required: true },
  { id: "container_security", type: "select", prompt: "Container security", options: Object.keys(RISK_CONFIG.riskFactors["Container security"]), required: true },
];

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));
const isAnswered = (item: Item, value: any): boolean =>
  item.required === false
    ? true
    : item.type === "radio" || item.type === "select"
      ? value !== undefined && value !== null && String(value).length > 0
      : item.type === "slider"
        ? typeof value === "number"
        : item.type === "number"
          ? value !== undefined && value !== null && value !== ""
          : item.type === "boolean"
            ? typeof value === "boolean"
            : value !== undefined && value !== null;

function computeRiskIndex(a: Answers) {
  const spot = String(a.spot ?? "");
  const base = RISK_CONFIG.spotBaseRisk[spot] ?? 0;

  const f = RISK_CONFIG.riskFactors;
  const age = f["Oldest Child's Age"][String(a.age_group ?? "") as keyof typeof f["Oldest Child's Age"]] ?? 0;
  const kids = f["How many kids"][String(a.kids_count ?? "") as keyof typeof f["How many kids"]] ?? 0;
  const snoop = f["Snooping tendencies"][String(a.snooping ?? "") as keyof typeof f["Snooping tendencies"]] ?? 0;
  const access = f["Access to the garage/shed/attic"][String(a.access_area ?? "") as keyof typeof f["Access to the garage/shed/attic"]] ?? 0;
  const reach = f["Reach and climbing"][String(a.reach_climb ?? "") as keyof typeof f["Reach and climbing"]] ?? 0;
  const days = f["Days until gift-opening"][String(a.days_until ?? "") as keyof typeof f["Days until gift-opening"]] ?? 0;
  const clues = f["How obvious are the clues"][String(a.clues ?? "") as keyof typeof f["How obvious are the clues"]] ?? 0;
  const container = f["Container security"][String(a.container_security ?? "") as keyof typeof f["Container security"]] ?? 0;

  const raw = base + age + kids + snoop + access + reach + days + clues + container;
  const riskScore = Math.round(clamp(raw, 0, 100));
  const tier: "Low" | "Moderate" | "High" = riskScore >= RISK_CONFIG.thresholds.high ? "High" : riskScore >= RISK_CONFIG.thresholds.moderate ? "Moderate" : "Low";

  return { riskScore, tier };
}

export default function Page() {
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const valid = useMemo(() => FORM_ITEMS.every((it) => isAnswered(it, (answers as any)[it.id])), [answers]);
  const scores = useMemo(() => (submitted ? computeRiskIndex(answers) : null), [submitted, answers]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 bg-white text-gray-900 ">
      <h1 className="text-3xl font-bold tracking-tight text-[#1976d3] rounded-2xl border p-4 shadow-sm text-center border-[#1976d3]">{RISK_CONFIG.meta.title}</h1>
      <FormView answers={answers} onChange={setAnswers} />
      {submitted && (<ResultsView scores={scores!} />)}
      <div className="flex justify-center align-center">
        {!submitted ? <div className="pt-2">
          <button type="button" className="rounded-xl bg-[#1976d3] cursor-pointer px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50" disabled={!valid} onClick={() => setSubmitted(true)}>
            Calculate Risk
          </button>
        </div> :
          <div className="mt-8 flex gap-3">
            <button type="button" onClick={() => { setSubmitted(false); setAnswers({}) }} className="rounded-xl bg-[#1976d3] px-5 py-2 cursor-pointer text-sm font-medium text-white hover:opacity-90">Start Over</button>
          </div>}
      </div>
    </div>
  );
}

function FormView({ answers, onChange }: { answers: Answers; onChange: (patch: Answers | ((a: Answers) => Answers)) => void; }) {
  const [first, ...rest] = FORM_ITEMS;
  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-2xl border p-4 shadow-sm">
        <Question item={first} value={(answers as any)[first.id]} onChange={(v) => onChange({ ...answers, [first.id]: v })} />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 rounded-2xl border p-4 shadow-sm">
        {rest.map((item) => (
          <Question key={item.id} item={item} value={(answers as any)[item.id]} onChange={(v) => onChange({ ...answers, [item.id]: v })} />
        ))}
      </div>

    </div>
  );
}

function Question({ item, value, onChange }: { item: Item; value: any; onChange: (v: any) => void }) {
  return (
    <div className="">
      <div className="text-sm font-medium">
        {item.prompt} {item.required !== false && <span className="text-red-600">*</span>}
      </div>
      {item.hint && <div className="mt-1 text-xs text-gray-500">{item.hint}</div>}

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

      {item.type === "slider" && (
        <div className="mt-3">
          {(() => {
            const numeric = typeof value === "number" ? value : Number(item.min ?? 0);
            return (
              <>
                <input type="range" min={item.min ?? 0} max={item.max ?? 100} step={item.step ?? 1} value={numeric} onChange={(e) => onChange(Number(e.target.value))} onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))} className="w-full accent-[#1976d3]" />
                <div className="mt-1 text-xs text-gray-600">{numeric}%</div>
              </>
            );
          })()}
        </div>
      )}

      {item.type === "number" && (
        <div className="mt-3">
          <input type="number" min={item.min ?? 0} max={item.max ?? 100} step={item.step ?? 1} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : parseFloat(e.target.value))} className="w-40 rounded-md border px-3 py-2 text-sm focus:border-[#1976d3] focus:ring-[#1976d3]" />
        </div>
      )}

      {item.type === "boolean" && (
        <div className="mt-3">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 text-[#1976d3] focus:ring-[#1976d3]" />
            <span className="text-sm">Yes</span>
          </label>
        </div>
      )}
      {item.type === "select" && (
        <div className="mt-3">
          <select
            className="w-full rounded-md border px-3 py-2 text-sm focus:border-[#1976d3] focus:ring-[#1976d3]"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="" disabled>Select…</option>
            {item.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function ResultsView({ scores, }: { scores: { riskScore: number; tier: "Low" | "Moderate" | "High" } }) {
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-[#1976d3] text-center">Your Results</h2>
      <div className="mt-6 grid gap-6">
        <div className="rounded-2xl border border-[#1976d3] p-6 shadow-sm text-center flex justify-center items-center gap-6">
          <span className="text-sm font-medium text-gray-600 flex align-center">Risk Score</span>
          <div className="text-4xl font-bold text-[#1976d3]">{scores.riskScore} / 100</div>
        </div>
      </div>
    </div>
  );
}
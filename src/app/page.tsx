"use client";

import React, { useMemo, useState } from "react";

/**
 * Holiday Hide-and-Seek Risk Index
 * -----------------------------------------------------------
 * Single-file, self-contained interactive built in React + Tailwind.
 * Fewer screens than the previous quiz: one form screen → results.
 * No external libs. All config/logic lives in this file.
 */

// -------------------------------
// CONFIG
// -------------------------------
const RISK_CONFIG = {
  meta: {
    title: "Holiday Hide-and-Seek Risk Index",
    subtitle:
      "Pick a hiding spot and tell us a bit about your home and kids. We'll rate how risky that spot is and offer safety tips.",
  },
  thresholds: {
    low: 0, // inclusive
    moderate: 36, // 36–65
    high: 66, // 66–100
  },
  // Base risk by hiding spot (0–100). Higher = riskier.
  // These values are sensible defaults; tune as needed against your spec.
  spotBaseRisk: {
    "Under the bed": 65,
    "Closet with heavy items": 80,
    "Laundry hamper": 55,
    "Behind curtains": 35,
    "Behind the sofa": 40,
    "Kitchen cabinets": 85,
    Garage: 90,
    "Backyard shed": 95,
    "Basement storage": 88,
    Attic: 92,
    "Parent's bedroom wardrobe": 60,
  } as Record<string, number>,
};

// -------------------------------
// TYPES
// -------------------------------

type Answers = Record<string, string | number | boolean>;

type Item = {
  id: string;
  type: "radio" | "checkbox" | "slider" | "number" | "boolean";
  prompt: string;
  options?: string[]; // for radio/checkbox
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  hint?: string;
};

// -------------------------------
// FORM DEFINITION (one screen)
// -------------------------------
const FORM_ITEMS: Item[] = [
  // Hiding spot selection (required)
  {
    id: "spot",
    type: "radio",
    prompt: "Choose the hiding spot",
    options: Object.keys(RISK_CONFIG.spotBaseRisk),
    required: true,
  },
  // Household factors
  {
    id: "clutter_level",
    type: "slider",
    prompt: "Clutter level in/near that area",
    hint: "0 = very tidy, 100 = very cluttered",
    min: 0,
    max: 100,
    step: 1,
    required: true,
  },
  {
    id: "stairs_nearby",
    type: "boolean",
    prompt: "Stairs or loft edge nearby?",
  },
  {
    id: "heaters_or_candles",
    type: "boolean",
    prompt: "Space heaters/candles/heat sources nearby?",
  },
  {
    id: "cords_or_string_lights",
    type: "boolean",
    prompt: "Many cords or string lights that could snag?",
  },
  {
    id: "breakables_within_reach",
    type: "boolean",
    prompt: "Fragile or heavy breakables within reach?",
  },
  // Kids factors
  {
    id: "age_group",
    type: "radio",
    prompt: "Age of the kid(s)",
    options: ["3–5", "6–8", "9–12"],
    required: true,
  },
  {
    id: "kids_count",
    type: "radio",
    prompt: "How many kids are hiding together?",
    options: ["1", "2", "3+"],
    required: true,
  },
  {
    id: "understands_rules",
    type: "boolean",
    prompt: "Kid(s) understand the rules (stay visible to adults / no climbing)?",
  },
  {
    id: "time_limit_set",
    type: "boolean",
    prompt: "A firm time limit is set for each round?",
  },
  {
    id: "adult_checkins",
    type: "boolean",
    prompt: "An adult is doing periodic check-ins?",
  },
];

// -------------------------------
// HELPERS
// -------------------------------
function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

function isAnswered(item: Item, value: any): boolean {
  const req = item.required !== false;
  if (!req) return true;
  switch (item.type) {
    case "radio":
      return value !== undefined && value !== null && String(value).length > 0;
    case "slider":
      return typeof value === "number";
    case "number":
      return value !== undefined && value !== null && value !== "";
    case "boolean":
      return typeof value === "boolean";
    default:
      return value !== undefined && value !== null;
  }
}

// -------------------------------
// SCORING LOGIC
// -------------------------------
function computeRiskIndex(a: Answers) {
  const spot = String(a.spot ?? "Behind curtains");
  const base = RISK_CONFIG.spotBaseRisk[spot] ?? 50;

  // Household modifiers
  const clutter = clamp(Number(a.clutter_level ?? 30));
  let modifiers = 0;
  modifiers += clutter * 0.3; // clutter contributes up to +30
  if (a.stairs_nearby === true) modifiers += 10; // fall hazard
  if (a.heaters_or_candles === true) modifiers += 12; // burn/heat/fire
  if (a.cords_or_string_lights === true) modifiers += 8; // strangling/snagging
  if (a.breakables_within_reach === true) modifiers += 10; // tipping/breakage

  // Kids factors
  const age = String(a.age_group ?? "6–8");
  const kids = String(a.kids_count ?? "1");
  if (age === "3–5") modifiers += 20;
  else if (age === "6–8") modifiers += 10;
  else modifiers += 0; // 9–12

  if (kids === "2") modifiers += 5; // excitement → risk
  else if (kids === "3+") modifiers += 10;

  if (a.understands_rules === true) modifiers -= 8;
  if (a.time_limit_set === true) modifiers -= 5;
  if (a.adult_checkins === true) modifiers -= 12;

  const raw = base + modifiers;
  const riskScore = Math.round(clamp(raw, 0, 100));

  let tier: "Low" | "Moderate" | "High" = "Low";
  if (riskScore >= RISK_CONFIG.thresholds.high) tier = "High";
  else if (riskScore >= RISK_CONFIG.thresholds.moderate) tier = "Moderate";

  return { riskScore, tier };
}

function generateTips(a: Answers, riskScore: number): string[] {
  const tips: string[] = [];

  // General guidance by tier
  if (riskScore >= 66) tips.push("Choose a different spot with fewer hazards and set clear rules before play.");
  else if (riskScore >= 36) tips.push("Reduce nearby hazards and make sure kids know the boundaries and time limit.");
  else tips.push("Nice choice! Keep supervision and rules in place to stay safe.");

  // Targeted advice
  const spot = String(a.spot ?? "");
  if (["Attic", "Basement storage", "Backyard shed", "Garage"].includes(spot))
    tips.push("Avoid isolated utility areas (attic/basement/garage/shed); lock or mark them off-limits.");
  if (spot === "Kitchen cabinets") tips.push("Keep kids out of the kitchen during play—hot surfaces and sharp tools.");
  if (spot === "Closet with heavy items") tips.push("Secure heavy items and avoid stacked bins that could tip.");
  if (spot === "Under the bed") tips.push("Check for sharp frames, storage boxes, and ensure easy exit.");

  // Household factors
  if (a.stairs_nearby === true) tips.push("Block stairways with a gate or set a no-near-stairs rule.");
  if (a.heaters_or_candles === true) tips.push("Turn off space heaters and remove candles in play areas.");
  if (a.cords_or_string_lights === true) tips.push("Route cords along walls and out of reach; avoid wrapping around furniture.");
  if (a.breakables_within_reach === true) tips.push("Move fragile/heavy decor higher or to another room before the game.");

  // Kids factors
  const age = String(a.age_group ?? "");
  if (age === "3–5") tips.push("Stick to open, highly visible spots for younger kids.");
  if (a.time_limit_set !== true) tips.push("Set a strict time limit for each round and follow it.");
  if (a.adult_checkins !== true) tips.push("Schedule adult check-ins (e.g., every 2–3 minutes).");

  return Array.from(new Set(tips)).slice(0, 8); // keep it concise
}

// -------------------------------
// UI
// -------------------------------
export default function Page() {
  const [answers, setAnswers] = useState<Answers>({
    // defaults
    clutter_level: 30,
    age_group: "6–8",
    kids_count: "1",
  });
  const [submitted, setSubmitted] = useState(false);
  const valid = useMemo(
    () => FORM_ITEMS.every((it) => isAnswered(it, (answers as any)[it.id])),
    [answers]
  );
  const scores = useMemo(() => (submitted ? computeRiskIndex(answers) : null), [submitted, answers]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 bg-white text-gray-900">
      <h1 className="text-3xl font-bold tracking-tight text-[#1976d3]">{RISK_CONFIG.meta.title}</h1>
      <p className="mt-2 text-sm text-gray-600">{RISK_CONFIG.meta.subtitle}</p>

      {!submitted ? (
        <FormView answers={answers} onChange={setAnswers} valid={valid} onSubmit={() => setSubmitted(true)} />
      ) : (
        <ResultsView onRestart={() => setSubmitted(false)} scores={scores!} answers={answers} />
      )}
    </div>
  );
}

function FormView({
  answers,
  onChange,
  valid,
  onSubmit,
}: {
  answers: Answers;
  onChange: (patch: Answers | ((a: Answers) => Answers)) => void;
  valid: boolean;
  onSubmit: () => void;
}) {
  // Separate first question (full width) and the rest (50% columns)
  const first = FORM_ITEMS[0];
  const rest = FORM_ITEMS.slice(1);

  return (
    <div className="mt-6 space-y-6">
      {/* Full-width first question */}
      <Question
        key={first.id}
        item={first}
        value={(answers as any)[first.id]}
        onChange={(v) => onChange({ ...answers, [first.id]: v })}
      />

      {/* Two-column grid for remaining questions */}
      <div className="grid gap-6 sm:grid-cols-2">
        {rest.map((item) => (
          <Question
            key={item.id}
            item={item}
            value={(answers as any)[item.id]}
            onChange={(v) => onChange({ ...answers, [item.id]: v })}
          />
        ))}
      </div>

      <div className="pt-2">
        <button
          type="button"
          className="rounded-xl bg-[#1976d3] cursor-pointer px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          disabled={!valid}
          onClick={onSubmit}
        >
          Calculate Risk
        </button>
      </div>
    </div>
  );
}

function Question({ item, value, onChange }: { item: Item; value: any; onChange: (v: any) => void }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="text-sm font-medium">
        {item.prompt} {item.required !== false && <span className="text-red-600">*</span>}
      </div>
      {item.hint && <div className="mt-1 text-xs text-gray-500">{item.hint}</div>}

      {item.type === "radio" && item.options && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {item.options.map((opt) => (
            <label
              key={opt}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2 ${value === opt ? "border-[#1976d3]" : "border-gray-200"}`}
            >
              <input
                type="radio"
                name={item.id}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="h-4 w-4 text-[#1976d3] focus:ring-[#1976d3]"
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {item.type === "slider" && (
        <div className="mt-3">
          {/** Ensure numeric value and live updates on drag **/}
          {(() => {
            const numeric = typeof value === "number" ? value : Number(item.min ?? 0);
            return (
              <>
                <input
                  type="range"
                  min={item.min ?? 0}
                  max={item.max ?? 100}
                  step={item.step ?? 1}
                  value={numeric}
                  onChange={(e) => onChange(Number(e.target.value))}
                  onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
                  className="w-full accent-[#1976d3]"
                />
                <div className="mt-1 text-xs text-gray-600">{numeric}%</div>
              </>
            );
          })()}
        </div>
      )}

      {item.type === "number" && (
        <div className="mt-3">
          <input
            type="number"
            min={item.min ?? 0}
            max={item.max ?? 100}
            step={item.step ?? 1}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
            className="w-40 rounded-md border px-3 py-2 text-sm focus:border-[#1976d3] focus:ring-[#1976d3]"
          />
        </div>
      )}

      {item.type === "boolean" && (
        <div className="mt-3">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              className="h-4 w-4 text-[#1976d3] focus:ring-[#1976d3]"
            />
            <span className="text-sm">Yes</span>
          </label>
        </div>
      )}
    </div>
  );
}

function ResultsView({
  scores,
  answers,
  onRestart,
}: {
  scores: { riskScore: number; tier: "Low" | "Moderate" | "High" };
  answers: Answers;
  onRestart: () => void;
}) {
  const tips = useMemo(() => generateTips(answers, scores.riskScore), [answers, scores]);
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-[#1976d3]">Your Results</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-600">Risk Score</div>
          <div className="mt-2 text-4xl font-bold text-[#1976d3]">{scores.riskScore} / 100</div>
          <div className="mt-1 text-sm text-gray-500">Higher means riskier for hide-and-seek in that spot.</div>
        </div>
        <div className="rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-600">Risk Tier</div>
          <div className="mt-2 text-4xl font-bold text-[#1976d3]">{scores.tier}</div>
          <div className="mt-1 text-sm text-gray-500">Based on spot hazards, household, and kids factors.</div>
        </div>
        <div className="rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-600">Chosen Spot</div>
          <div className="mt-2 text-2xl font-semibold text-[#1976d3]">{String(answers.spot ?? "").replace(/\s+/g, " ")}</div>
          <div className="mt-1 text-sm text-gray-500">Tune inputs and recalc to compare spots.</div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="text-sm font-medium text-gray-600">Safety Tips</div>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-gray-700">
          {tips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-xl bg-[#1976d3] px-5 py-2 cursor-pointer text-sm font-medium text-white hover:opacity-90"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}

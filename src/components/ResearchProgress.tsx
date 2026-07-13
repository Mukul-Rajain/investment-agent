"use client";

import { CheckCircle, Circle, Loader2 } from "lucide-react";
import { RESEARCH_STEPS } from "@/lib/types";
import { PhysicsPlayground } from "./PhysicsPlayground";

interface Props {
  completedSteps: string[];
  currentStep?: string;
}

export function ResearchProgress({ completedSteps, currentStep }: Props) {
  return (
    <div className="w-full max-w-xl mx-auto">
      <h2 className="font-pixel text-[10px] sm:text-xs text-riso-blue mb-8 text-center tracking-widest uppercase">
        Researching
      </h2>
      <div className="space-y-3">
        {RESEARCH_STEPS.map((step, idx) => {
          const isDone = completedSteps.includes(step.id);
          const isActive =
            currentStep === step.id || (!isDone && idx === completedSteps.length);

          return (
            <div
              key={step.id}
              className={`flex items-center gap-4 p-3 border-2 transition-all duration-300 ${
                isDone
                  ? "border-riso-green bg-riso-green/10"
                  : isActive
                  ? "border-ink bg-paper-dim shadow-hard-blue"
                  : "border-ink/20 opacity-50"
              }`}
            >
              <div className="shrink-0">
                {isDone ? (
                  <CheckCircle className="w-5 h-5 text-riso-green" />
                ) : isActive ? (
                  <Loader2 className="w-5 h-5 text-riso-blue animate-spin" />
                ) : (
                  <Circle className="w-5 h-5 text-ink/30" />
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={`text-sm font-bold ${
                    isDone
                      ? "text-riso-green"
                      : isActive
                      ? "text-ink"
                      : "text-ink/40"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-ink/50 truncate">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-8">
        <PhysicsPlayground />
      </div>
    </div>
  );
}

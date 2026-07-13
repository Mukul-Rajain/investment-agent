"use client";

interface Props {
  label: string;
  score: number;
  description?: string;
}

function getInk(score: number) {
  if (score >= 75) return { bar: "bg-riso-green", text: "text-riso-green" };
  if (score >= 55) return { bar: "bg-riso-blue", text: "text-riso-blue" };
  if (score >= 35) return { bar: "bg-riso-gold", text: "text-riso-gold" };
  return { bar: "bg-riso-red", text: "text-riso-red" };
}

export function ScoreBar({ label, score, description }: Props) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const ink = getInk(clampedScore);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-bold uppercase tracking-wider text-ink/70">
          {label}
        </span>
        <span className={`text-lg font-bold tabular-nums ${ink.text}`}>
          {clampedScore.toFixed(0)}
          <span className="text-xs text-ink/40">/100</span>
        </span>
      </div>
      <div className="h-3 bg-paper-dim border-2 border-ink overflow-hidden">
        <div
          className={`h-full ${ink.bar} transition-all duration-700`}
          style={{ width: `${clampedScore}%` }}
        />
      </div>
      {description && (
        <p className="text-xs text-ink/70 leading-relaxed">{description}</p>
      )}
    </div>
  );
}

import React from "react";

type ReadingProgressBarProps = {
  percent: number;
};

export function ReadingProgressBar({ percent }: ReadingProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
        <span>Прогресс чтения</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className="h-2 rounded-full bg-cyan-300 transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

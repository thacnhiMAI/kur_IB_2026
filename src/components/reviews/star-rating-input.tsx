"use client";

import { Star } from "lucide-react";
import { useState } from "react";

export function StarRatingInput({ name = "rating", defaultValue = 5 }: { name?: string; defaultValue?: number }) {
  const [value, setValue] = useState(Math.min(5, Math.max(1, defaultValue)));
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? value;

  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Оценка книги">
      <input type="hidden" name={name} value={value} />
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} из 5`}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => setHovered(star)}
          onBlur={() => setHovered(null)}
          onClick={() => setValue(star)}
          className="review-star-button"
        >
          <Star size={28} fill={star <= active ? "currentColor" : "none"} />
        </button>
      ))}
      <span className="ml-2 text-sm tabular-nums text-[var(--text-muted)]">{value}/5</span>
    </div>
  );
}

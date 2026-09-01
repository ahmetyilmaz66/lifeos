"use client";

import { useState } from "react";
import { categoryLabel, categorySpendColor, formatMoney } from "@/lib/lifeos";

type Segment = { category: string; amount: number; percent: number };

export default function CategorySpendingChart({ segments, currency }: { segments: Segment[]; currency: string }) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (!segments.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">Henüz kategori bazlı harcama gösterecek kadar veri yok.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="relative flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label="Kategori bazlı harcama dağılımı">
        {segments.map((segment) => (
          <div
            key={segment.category}
            className={`relative h-full transition-opacity ${categorySpendColor(segment.category)} ${hovered && hovered !== segment.category ? "opacity-50" : ""}`}
            style={{ width: `${Math.max(segment.percent, 1.5)}%` }}
            onMouseEnter={() => setHovered(segment.category)}
            onMouseLeave={() => setHovered(null)}
          >
            {hovered === segment.category && (
              <div className="pointer-events-none absolute -top-11 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-md">
                {categoryLabel(segment.category)} · {formatMoney(segment.amount, currency)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2.5">
        {segments.map((segment) => (
          <div
            key={segment.category}
            className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-sm transition-colors ${hovered === segment.category ? "bg-accent" : ""}`}
            onMouseEnter={() => setHovered(segment.category)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${categorySpendColor(segment.category)}`} />
              <span className="truncate">{categoryLabel(segment.category)}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2 tabular-nums">
              <span className="font-medium">{formatMoney(segment.amount, currency)}</span>
              <span className="text-xs text-muted-foreground">(%{segment.percent.toFixed(0)})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { motion } from "motion/react";
import { ProductThumb } from "@/components/basket/product-thumb";
import type { OrderState, SearchResult } from "@/lib/types";
import { cn } from "@/lib/utils";

const diff = (n: number | undefined) =>
  n === undefined || n === 0 ? "Same price" : n < 0 ? `$${Math.abs(n).toFixed(2)} less` : `$${n.toFixed(2)} more`;

export function SwapCard({
  pending,
  onPick,
  onDismiss,
}: {
  pending: NonNullable<OrderState["pending"]>;
  onPick: (option: SearchResult) => void;
  onDismiss: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="rounded-[32px] border border-hairline bg-white p-5"
    >
      <div className="flex items-start justify-between gap-3 px-1">
        <div>
          <p className="text-[11px] font-medium tracking-[0.12em] text-oos-ink uppercase">Not on the shelf</p>
          <p className="mt-1 font-display text-[24px] leading-tight font-medium tracking-[-0.02em]">{pending.missing.name}</p>
        </div>
        <button onClick={onDismiss} className="mt-0.5 text-[13px] text-subtle hover:text-ink">
          Skip
        </button>
      </div>
      <div className="no-scrollbar -mx-4 mt-3 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1">
        {pending.options.map((o, i) => (
          <button
            key={o.product.id}
            onClick={() => onPick(o)}
            className={cn(
              "group w-[164px] shrink-0 snap-start rounded-[22px] border p-3 text-left transition-colors",
              i === 0 ? "border-navy/70" : "border-hairline hover:border-navy/30",
            )}
          >
            <ProductThumb product={o.product} size={72} />
            <p className="mt-2.5 line-clamp-2 text-[13.5px] leading-snug font-medium">{o.product.name}</p>
            <p className="mt-1 text-[12px] text-subtle">{o.reason}</p>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-[14px] font-medium tabular">${o.product.price.toFixed(2)}</span>
              <span className={cn("text-[11.5px]", (o.price_diff ?? 0) < 0 ? "text-emerald-700" : "text-subtle")}>
                {diff(o.price_diff)}
              </span>
            </div>
            <div
              className={cn(
                "mt-3 flex h-8 items-center justify-center rounded-full text-[13px] font-medium transition-colors",
                i === 0 ? "bg-navy text-white" : "bg-surface text-ink group-hover:bg-hairline",
              )}
            >
              Swap
            </div>
          </button>
        ))}
      </div>
      <p className="mt-2 px-1 text-[11.5px] text-subtle">Check the label for allergens before you buy.</p>
    </motion.section>
  );
}

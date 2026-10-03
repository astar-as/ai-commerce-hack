"use client";

import { motion } from "motion/react";
import type { FulfillmentMode } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ mode: FulfillmentMode; label: string }> = [
  { mode: "instacart_delivery", label: "Delivery" },
  { mode: "store_pickup", label: "Pickup" },
  { mode: "in_store", label: "In store" },
];

export function FulfillmentSwitch({
  mode,
  onChange,
}: {
  mode: FulfillmentMode;
  onChange: (mode: FulfillmentMode) => void;
}) {
  return (
    <div role="radiogroup" className="grid grid-cols-3 rounded-full bg-surface p-1">
      {OPTIONS.map(({ mode: m, label }) => {
        const active = m === mode;
        return (
          <button
            key={m}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(m)}
            className={cn(
              "relative flex h-11 items-center justify-center rounded-full text-[15px] font-medium transition-colors duration-200",
              active ? "text-white" : "text-body hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId="fulfillment-pill"
                className="absolute inset-0 rounded-full bg-navy"
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
              />
            )}
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

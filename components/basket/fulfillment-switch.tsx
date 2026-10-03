"use client";

import { motion } from "motion/react";
import { ShoppingBag, Store, Truck } from "lucide-react";
import type { FulfillmentMode } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ mode: FulfillmentMode; label: string; Icon: typeof Truck }> = [
  { mode: "instacart_delivery", label: "Delivery", Icon: Truck },
  { mode: "store_pickup", label: "Pickup", Icon: ShoppingBag },
  { mode: "in_store", label: "In store", Icon: Store },
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
      {OPTIONS.map(({ mode: m, label, Icon }) => {
        const active = m === mode;
        return (
          <button
            key={m}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(m)}
            className={cn(
              "relative flex h-9 items-center justify-center gap-1.5 rounded-full text-[13px] font-medium transition-colors",
              active ? "text-ink" : "text-subtle hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId="fulfillment-pill"
                className="absolute inset-0 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <Icon className="relative size-[15px]" strokeWidth={1.75} />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

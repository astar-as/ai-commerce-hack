"use client";

import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { OrderState } from "@/lib/types";

export function CheckoutBar({ order }: { order: OrderState }) {
  const { mode, checkout_url } = order.fulfillment;
  const count = order.items.reduce((n, i) => n + i.qty, 0);
  const picked = order.items.filter((i) => i.status === "picked").length;

  const label =
    mode === "instacart_delivery" ? "Checkout on Instacart" : mode === "store_pickup" ? "Place pickup order" : "Finish shopping";
  const sub = mode === "in_store" ? `${picked} of ${order.items.length} picked` : `${count} ${count === 1 ? "item" : "items"}`;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className="pointer-events-auto mx-auto w-full max-w-[480px] px-5 pb-[max(env(safe-area-inset-bottom),20px)]"
    >
      <a
        href={mode === "instacart_delivery" ? (checkout_url ?? "#") : undefined}
        target="_blank"
        rel="noreferrer"
        className="flex h-[68px] items-center justify-between rounded-full border border-[#c9ced8] bg-white/95 pr-2.5 pl-7 shadow-[0_18px_40px_-18px_rgba(11,31,91,0.35)] backdrop-blur-xl transition-transform active:scale-[0.985]"
      >
        <span className="flex flex-col leading-tight">
          <span className="text-[16px] font-medium text-ink">{label}</span>
          <span className="text-[13px] text-subtle tabular">
            ${order.subtotal.toFixed(2)} · {sub}
          </span>
        </span>
        <span className="flex size-12 items-center justify-center rounded-full bg-navy text-white">
          {mode === "instacart_delivery" ? (
            <ArrowUpRight className="size-5" strokeWidth={2} />
          ) : (
            <ArrowRight className="size-5" strokeWidth={2} />
          )}
        </span>
      </a>
    </motion.div>
  );
}

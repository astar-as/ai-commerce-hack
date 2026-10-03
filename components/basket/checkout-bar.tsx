"use client";

import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import type { OrderState } from "@/lib/types";

export function CheckoutBar({ order }: { order: OrderState }) {
  const { mode, eta, checkout_url } = order.fulfillment;
  const count = order.items.reduce((n, i) => n + i.qty, 0);
  const picked = order.items.filter((i) => i.status === "picked").length;

  const label =
    mode === "instacart_delivery"
      ? "Checkout on Instacart"
      : mode === "store_pickup"
        ? "Place pickup order"
        : `${picked} of ${order.items.length} picked`;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className="pointer-events-auto mx-auto w-full max-w-[440px] px-5 pb-[max(env(safe-area-inset-bottom),16px)]"
    >
      <a
        href={mode === "instacart_delivery" ? (checkout_url ?? "#") : undefined}
        target="_blank"
        rel="noreferrer"
        className="flex h-14 items-center justify-between rounded-full bg-ink pr-2 pl-6 text-white shadow-[0_12px_32px_-8px_rgba(0,0,0,0.35)] transition-transform active:scale-[0.98]"
      >
        <span className="flex flex-col leading-tight">
          <span className="text-[15px] font-medium">{label}</span>
          {eta && mode !== "in_store" && <span className="text-[12px] text-white/60">{eta}</span>}
        </span>
        <span className="flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 font-mono text-[14px] tabular">
          ${order.subtotal.toFixed(2)}
          <span className="text-white/50">· {count}</span>
          {mode === "instacart_delivery" && <ArrowUpRight className="size-4" strokeWidth={2} />}
        </span>
      </a>
    </motion.div>
  );
}

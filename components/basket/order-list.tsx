"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, RotateCcw } from "lucide-react";
import { ProductThumb } from "@/components/basket/product-thumb";
import type { OrderItem, OrderState } from "@/lib/types";
import { cn } from "@/lib/utils";

const money = (n: number) => `$${n.toFixed(2)}`;

function Row({ item, onTogglePicked, inStore }: { item: OrderItem; onTogglePicked: (id: string) => void; inStore: boolean }) {
  const { product, qty, status } = item;
  const oos = status === "out_of_stock";
  const picked = status === "picked";
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex items-center gap-3.5 py-3"
    >
      {inStore && (
        <button
          aria-label={picked ? "Mark not picked" : "Mark picked"}
          onClick={() => onTogglePicked(product.id)}
          disabled={oos}
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
            picked ? "border-ink bg-ink text-white" : "border-hairline bg-white",
            oos && "opacity-30",
          )}
        >
          {picked && <Check className="size-3.5" strokeWidth={2.5} />}
        </button>
      )}
      <ProductThumb product={product} className={cn((oos || picked) && "opacity-50")} />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[15px] font-medium leading-tight", (oos || picked) && "text-subtle", oos && "line-through")}>
          {product.name}
        </p>
        <p className="mt-0.5 truncate text-[13px] text-subtle">
          {product.size}
          {inStore ? ` · Aisle ${product.aisle}` : ` · ${product.brand}`}
        </p>
        {status === "swapped" && item.swapped_from && (
          <span className="mt-1.5 inline-flex max-w-full items-center gap-1 rounded-full bg-swap px-2 py-0.5 text-[11.5px] font-medium text-swap-ink">
            <RotateCcw className="size-3 shrink-0" strokeWidth={2} />
            <span className="truncate">
              Swapped from {item.swapped_from.brand}
              {item.note ? ` · ${item.note}` : ""}
            </span>
          </span>
        )}
        {oos && (
          <span className="mt-1.5 inline-flex items-center rounded-full bg-oos px-2 py-0.5 text-[11.5px] font-medium text-oos-ink">
            Out of stock
          </span>
        )}
      </div>
      <div className="text-right">
        <p className={cn("text-[15px] font-medium tabular", oos && "text-subtle line-through")}>{money(product.price * qty)}</p>
        {qty > 1 && <p className="text-[13px] text-subtle tabular">×{qty}</p>}
      </div>
    </motion.li>
  );
}

export function OrderList({ order, onTogglePicked }: { order: OrderState; onTogglePicked: (id: string) => void }) {
  const inStore = order.fulfillment.mode === "in_store";
  const items = inStore
    ? [...order.items].sort((a, b) => Number(a.product.aisle) - Number(b.product.aisle))
    : order.items;

  const groups = inStore
    ? items.reduce<Array<{ aisle: string; items: OrderItem[] }>>((acc, item) => {
        const last = acc[acc.length - 1];
        if (last && last.aisle === item.product.aisle) last.items.push(item);
        else acc.push({ aisle: item.product.aisle, items: [item] });
        return acc;
      }, [])
    : [{ aisle: "", items }];

  return (
    <div>
      {groups.map((g) => (
        <div key={g.aisle || "all"}>
          {inStore && (
            <p className="pt-4 pb-1 text-[11px] font-medium tracking-[0.12em] text-subtle uppercase">
              Aisle {g.aisle} · {g.items[0].product.department}
            </p>
          )}
          <ul className="divide-y divide-hairline">
            <AnimatePresence initial={false} mode="popLayout">
              {g.items.map((item) => (
                <Row key={item.product.id} item={item} onTogglePicked={onTogglePicked} inStore={inStore} />
              ))}
            </AnimatePresence>
          </ul>
        </div>
      ))}
    </div>
  );
}

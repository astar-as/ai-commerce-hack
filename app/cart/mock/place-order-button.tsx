"use client";

import { useState } from "react";
import { Check } from "lucide-react";

// Placing the order counts as paying: the server issues the receipt and emails it automatically.
export function PlaceOrderButton({ label, list }: { label: string; list?: string }) {
  const [placed, setPlaced] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);

  async function place() {
    setPlaced(true);
    if (!list) return;
    try {
      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list }),
      });
      const out = (await res.json()) as { emailed_to?: string | null };
      setReceipt(out.emailed_to ? `Receipt sent to ${out.emailed_to}` : "Receipt saved");
    } catch {
      setReceipt(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={place}
        disabled={placed}
        className="flex h-[60px] w-full items-center justify-center gap-2 rounded-full bg-navy text-[16px] font-medium text-white transition-transform active:scale-[0.985] disabled:bg-ink"
      >
        {placed ? (
          <>
            <Check className="size-5" strokeWidth={2.5} />
            Order placed (demo)
          </>
        ) : (
          label
        )}
      </button>
      {receipt && <p className="text-center text-[13px] text-subtle">{receipt}</p>}
    </div>
  );
}

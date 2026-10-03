"use client";

import { useState } from "react";
import { Check } from "lucide-react";

export function PlaceOrderButton({ label }: { label: string }) {
  const [placed, setPlaced] = useState(false);
  return (
    <button
      onClick={() => setPlaced(true)}
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
  );
}

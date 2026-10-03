"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckoutBar } from "@/components/basket/checkout-bar";
import { FulfillmentSwitch } from "@/components/basket/fulfillment-switch";
import { OrderList } from "@/components/basket/order-list";
import { SwapCard } from "@/components/basket/swap-card";
import { VoiceOrb } from "@/components/basket/voice-orb";
import { useLiveVoice } from "@/hooks/use-live-voice";
import { readDelegate } from "@/lib/delegate-client";
import { emptyOrder, setFulfillment, STORE, swapInOrder } from "@/lib/order-core";
import type { FulfillmentMode, OrderState, SearchResult } from "@/lib/types";
import { cn } from "@/lib/utils";

const MODE_LABEL: Record<FulfillmentMode, string> = {
  instacart_delivery: "delivery",
  store_pickup: "pickup",
  in_store: "shopping in store",
};

const MODE_LINE: Record<FulfillmentMode, [string, string]> = {
  instacart_delivery: ["Delivery today.", "Through Instacart, arriving 5–6 PM."],
  store_pickup: ["Pickup today.", `Ready at ${STORE.name} at 5:30 PM.`],
  in_store: ["Shopping in store.", "Sorted by aisle. Say it if something’s not on the shelf."],
};

const spring = { type: "spring" as const, stiffness: 220, damping: 30 };

export function BasketApp() {
  const [order, setOrder] = useState<OrderState>(emptyOrder);
  const voice = useLiveVoice({ order, onOrder: setOrder });
  const live = voice.status === "live";
  const connecting = voice.status === "connecting";
  const hasItems = order.items.length > 0;
  const caption = voice.transcript[voice.transcript.length - 1];

  const statusText = voice.error
    ? voice.error
    : connecting
      ? "Connecting…"
      : voice.agentState === "thinking"
        ? "Checking the shelves…"
        : live
          ? voice.agentState === "talking"
            ? "Speaking"
            : "Listening"
          : "Tap the orb to start talking";

  const toggleVoice = () => (live || connecting ? voice.stop() : voice.start());

  const pickSwap = (option: SearchResult) => {
    if (!order.pending) return;
    const missing = order.pending.missing;
    setOrder((o) => swapInOrder(o, missing, option.product));
    if (live) voice.say(`The shopper tapped to swap ${missing.name} for ${option.product.name}. Confirm it in a few words.`);
  };

  const dismissSwap = () => {
    setOrder((o) => ({ ...o, pending: undefined }));
    if (live) voice.note("The shopper skipped the substitute.");
  };

  const setMode = (mode: FulfillmentMode) => {
    setOrder((o) => setFulfillment(o, mode));
    if (live) voice.note(`The shopper switched the order to ${MODE_LABEL[mode]}.`);
  };

  const togglePicked = useCallback((id: string) => {
    setOrder((o) => ({
      ...o,
      items: o.items.map((i) =>
        i.product.id === id ? { ...i, status: i.status === "picked" ? (i.swapped_from ? "swapped" : "added") : "picked" } : i,
      ),
    }));
  }, []);

  const [placing, setPlacing] = useState(false);
  const placeOrder = async () => {
    setPlacing(true);
    try {
      const res = await fetch("/api/delegate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delegation_id: `tap_${Date.now()}`,
          transcript: [...voice.transcript, { role: "user", text: "Yes, place my pickup order now.", at: Date.now() }],
          order,
        }),
      });
      const out = await readDelegate(res);
      setOrder(out.order);
      if (live) voice.say(`The shopper tapped Place pickup order. Result: ${out.say}`);
    } finally {
      setPlacing(false);
    }
  };

  const [lead, rest] = MODE_LINE[order.fulfillment.mode];
  const pickupLine = order.fulfillment.mode === "store_pickup" && /code/i.test(order.fulfillment.eta ?? "") ? order.fulfillment.eta : null;

  return (
    <div className="min-h-dvh bg-white p-2 sm:p-3">
      <main className="relative mx-auto min-h-[calc(100dvh-1rem)] w-full max-w-[1200px] overflow-hidden rounded-[36px] bg-[linear-gradient(180deg,#edf1f7_0%,#f3f5f8_45%,#f5f5f6_100%)] sm:min-h-[calc(100dvh-1.5rem)] sm:rounded-[48px]">
        <div className="mx-auto flex min-h-[inherit] w-full max-w-[480px] flex-col px-5">
          <motion.section
            layout
            transition={spring}
            className={cn(
              "flex",
              hasItems
                ? "sticky top-0 z-10 -mx-5 items-center gap-4 bg-[#eef2f7]/80 px-5 pt-[max(env(safe-area-inset-top),20px)] pb-4 backdrop-blur-xl"
                : "flex-1 flex-col items-center justify-center pt-[max(env(safe-area-inset-top),28px)] pb-16 text-center",
            )}
          >
            {!hasItems && (
              <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <h1 className="font-display text-[52px] leading-[0.95] font-medium tracking-[-0.035em] text-ink sm:text-[64px]">
                  What’s for
                  <br />
                  dinner?
                </h1>
                <p className="mt-4 text-[17px] text-body">Just say it. Your order builds itself.</p>
              </motion.div>
            )}

            <div className={cn("relative", !hasItems && "mt-12")}>
              <VoiceOrb
                size={hasItems ? 64 : 224}
                agentState={voice.agentState}
                live={live}
                connecting={connecting}
                onToggle={toggleVoice}
                getInputVolume={voice.getInputVolume}
                getOutputVolume={voice.getOutputVolume}
              />
            </div>

            <motion.div layout className={cn("min-w-0", hasItems ? "flex-1" : "mt-8 min-h-[72px] max-w-[340px]")}>
              <p
                className={cn(
                  "text-[14px] font-medium transition-colors",
                  voice.error ? "text-oos-ink" : live ? "text-navy" : "text-subtle",
                )}
              >
                {live && <span className="mr-1.5 inline-block size-1.5 -translate-y-px animate-pulse rounded-full bg-navy align-middle" />}
                {statusText}
              </p>
              <AnimatePresence mode="wait">
                {caption && (
                  <motion.p
                    key={`${caption.role}-${caption.at}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.22 }}
                    className={cn(
                      "mt-1 line-clamp-2 leading-snug",
                      hasItems ? "text-[15px]" : "text-[17px]",
                      caption.role === "user" ? "text-subtle" : "text-ink",
                    )}
                  >
                    {caption.role === "user" ? `“${caption.text.trim()}”` : caption.text}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.section>

          <AnimatePresence>
            {hasItems && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.08 }}
                className="flex flex-col gap-4 pt-2 pb-36"
              >
                <section className="rounded-[32px] border border-hairline bg-white p-2">
                  <FulfillmentSwitch mode={order.fulfillment.mode} onChange={setMode} />
                  <p className="px-4 pt-3 pb-2 text-[15px] leading-snug text-body">
                    <span className="text-ink">{pickupLine ? "Pickup booked." : lead}</span> {pickupLine ?? rest}
                  </p>
                </section>

                <AnimatePresence>
                  {order.pending && <SwapCard pending={order.pending} onPick={pickSwap} onDismiss={dismissSwap} />}
                </AnimatePresence>

                <section className="rounded-[32px] border border-hairline bg-white px-5 pt-5 pb-2">
                  <div className="flex items-baseline justify-between">
                    <h2 className="font-display text-[28px] leading-none font-medium tracking-[-0.02em] text-ink">Your order</h2>
                    <span className="text-[14px] text-subtle tabular">
                      {order.items.length} {order.items.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                  <OrderList order={order} onTogglePicked={togglePicked} />
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {hasItems && (
            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20">
              <CheckoutBar order={order} onPlace={placeOrder} placing={placing} />
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

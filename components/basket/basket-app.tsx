"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Keyboard } from "lucide-react";
import { CheckoutBar } from "@/components/basket/checkout-bar";
import { FulfillmentSwitch } from "@/components/basket/fulfillment-switch";
import { OrderList } from "@/components/basket/order-list";
import { SwapCard } from "@/components/basket/swap-card";
import { VoiceOrb } from "@/components/basket/voice-orb";
import { useLiveVoice } from "@/hooks/use-live-voice";
import { DEMO_STORE } from "@/lib/demo-catalog";
import { applyAction, emptyOrder } from "@/lib/order";
import type { DelegateOutput, FulfillmentMode, OrderState, SearchResult, TranscriptLine } from "@/lib/types";
import { cn } from "@/lib/utils";

const MODE_LABEL: Record<FulfillmentMode, string> = {
  instacart_delivery: "delivery",
  store_pickup: "pickup",
  in_store: "shopping in store",
};

export function BasketApp() {
  const [order, setOrder] = useState<OrderState>(emptyOrder);
  const [typed, setTyped] = useState<TranscriptLine[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const voice = useLiveVoice({ order, onOrder: setOrder });
  const live = voice.status === "live";
  const connecting = voice.status === "connecting";
  const hasItems = order.items.length > 0;

  const lines = useMemo(
    () => [...voice.transcript, ...typed].sort((a, b) => a.at - b.at),
    [voice.transcript, typed],
  );
  const caption = lines[lines.length - 1];

  const statusText = voice.error
    ? voice.error
    : connecting
      ? "Connecting…"
      : busy || voice.agentState === "thinking"
        ? "Checking the shelves…"
        : live
          ? voice.agentState === "talking"
            ? "Speaking"
            : "Listening"
          : "Tap the orb to talk";

  const toggleVoice = () => (live || connecting ? voice.stop() : voice.start());

  const sendText = async (text: string) => {
    const line: TranscriptLine = { role: "user", text, at: Date.now() };
    const next = [...typed, line];
    setTyped(next);
    setBusy(true);
    try {
      const res = await fetch("/api/delegate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delegation_id: `typed_${line.at}`,
          transcript: [...voice.transcript, ...next].sort((a, b) => a.at - b.at),
          order,
        }),
      });
      const out = (await res.json()) as DelegateOutput;
      setOrder(out.order);
      if (live) voice.say(out.say);
      else setTyped((t) => [...t, { role: "assistant", text: out.say, at: Date.now() }]);
    } finally {
      setBusy(false);
    }
  };

  const pickSwap = (option: SearchResult) => {
    if (!order.pending) return;
    const missing = order.pending.missing;
    setOrder((o) => applyAction(o, { type: "swap_item", product_id: missing.id, substitute_product_id: option.product.id }));
    if (live) voice.say(`The shopper tapped to swap ${missing.name} for ${option.product.name}. Confirm it in a few words.`);
  };

  const dismissSwap = () => {
    setOrder((o) => applyAction(o, { type: "dismiss_swap" }));
    if (live) voice.note("The shopper skipped the substitute.");
  };

  const setMode = (mode: FulfillmentMode) => {
    setOrder((o) => applyAction(o, { type: "set_fulfillment", mode }));
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

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5">
      <header className="flex items-center justify-between pt-[max(env(safe-area-inset-top),18px)] pb-2">
        <span className="font-display text-[26px] leading-none italic">basket</span>
        <span className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[12px] text-subtle">
          <span className={cn("size-1.5 rounded-full", live ? "bg-emerald-500" : "bg-hairline")} />
          {DEMO_STORE.name.split(" · ")[1] ?? DEMO_STORE.name}
        </span>
      </header>

      <motion.section
        layout
        transition={{ type: "spring", stiffness: 220, damping: 30 }}
        className={cn(
          "flex",
          hasItems ? "sticky top-0 z-10 items-center gap-4 bg-white/85 py-3 backdrop-blur-xl" : "flex-1 flex-col items-center justify-center pb-24",
        )}
      >
        <VoiceOrb
          size={hasItems ? 72 : 248}
          agentState={voice.agentState}
          live={live}
          connecting={connecting}
          onToggle={toggleVoice}
          getInputVolume={voice.getInputVolume}
          getOutputVolume={voice.getOutputVolume}
        />
        <motion.div layout className={cn("min-w-0", hasItems ? "flex-1" : "mt-10 text-center")}>
          {!hasItems && !caption && (
            <h1 className="font-display text-[40px] leading-[1.05] tracking-[-0.01em]">
              What are we
              <br />
              <span className="italic">cooking</span> today?
            </h1>
          )}
          <p
            className={cn(
              "text-[12px] font-medium tracking-[0.12em] uppercase transition-colors",
              hasItems ? "" : "mt-4",
              voice.error ? "text-oos-ink" : live ? "text-swap-ink" : "text-subtle",
            )}
          >
            {statusText}
          </p>
          <AnimatePresence mode="wait">
            {caption && (
              <motion.p
                key={`${caption.role}-${caption.at}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  "mt-1.5 line-clamp-3 leading-snug",
                  hasItems ? "text-[15px]" : "mx-auto max-w-[320px] font-display text-[26px] leading-tight",
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
            transition={{ type: "spring", stiffness: 260, damping: 30, delay: 0.1 }}
            className="flex flex-col gap-5 pt-3 pb-44"
          >
            <div className="flex flex-col gap-2">
              <FulfillmentSwitch mode={order.fulfillment.mode} onChange={setMode} />
              <p className="px-1 text-[12.5px] text-subtle">
                {order.fulfillment.mode === "instacart_delivery" && `Instacart · ${order.fulfillment.eta}`}
                {order.fulfillment.mode === "store_pickup" && `Pickup at ${DEMO_STORE.name.split(" · ")[1]} · ${order.fulfillment.eta}`}
                {order.fulfillment.mode === "in_store" && "Sorted by aisle · tap “not on shelf” by voice"}
              </p>
            </div>

            <AnimatePresence>
              {order.pending && <SwapCard pending={order.pending} onPick={pickSwap} onDismiss={dismissSwap} />}
            </AnimatePresence>

            <div>
              <div className="flex items-baseline justify-between px-1">
                <h2 className="font-display text-[28px] leading-none">Your order</h2>
                <span className="font-mono text-[13px] text-subtle tabular">
                  {order.items.length} items · ${order.subtotal.toFixed(2)}
                </span>
              </div>
              <OrderList order={order} onTogglePicked={togglePicked} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3">
        <div className="pointer-events-auto w-full max-w-[440px] px-5">
          <AnimatePresence mode="wait" initial={false}>
            {composerOpen ? (
              <motion.form
                key="composer"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const text = draft.trim();
                  if (!text || busy) return;
                  setDraft("");
                  void sendText(text);
                }}
                className="flex h-12 items-center gap-2 rounded-full border border-hairline bg-white/90 pr-1.5 pl-5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)] backdrop-blur-xl"
              >
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => !draft && setComposerOpen(false)}
                  placeholder="Add penne and parmesan…"
                  className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || busy}
                  className="flex size-9 items-center justify-center rounded-full bg-ink text-white transition-opacity disabled:opacity-25"
                >
                  <ArrowUp className="size-4" strokeWidth={2.25} />
                </button>
              </motion.form>
            ) : (
              <motion.button
                key="type"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setComposerOpen(true)}
                className="mx-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] text-subtle hover:text-ink"
              >
                <Keyboard className="size-3.5" strokeWidth={1.75} />
                Type instead
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>{hasItems && <CheckoutBar order={order} />}</AnimatePresence>
        {!hasItems && (
          <p className="pb-[max(env(safe-area-inset-bottom),14px)] text-[11px] text-subtle/80">
            Safeway-style demo store · prices and stock are simulated
          </p>
        )}
      </div>
    </main>
  );
}

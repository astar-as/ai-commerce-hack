"use client";

import { motion } from "motion/react";
import { SkyOrb, type OrbMode } from "@/components/basket/sky-orb";
import type { AgentState } from "@/hooks/use-live-voice";

export function VoiceOrb({
  size,
  agentState,
  live,
  connecting,
  onToggle,
  getInputVolume,
  getOutputVolume,
}: {
  size: number;
  agentState: AgentState;
  live: boolean;
  connecting: boolean;
  onToggle: () => void;
  getInputVolume: () => number;
  getOutputVolume: () => number;
}) {
  const mode: OrbMode = connecting ? "connecting" : live ? (agentState ?? "listening") : "idle";
  return (
    <motion.button
      type="button"
      aria-label={live ? "End conversation" : "Start talking"}
      onClick={onToggle}
      layout
      transition={{ type: "spring", stiffness: 220, damping: 30 }}
      style={{ width: size, height: size }}
      whileTap={{ scale: 0.96 }}
      className="relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]/40 focus-visible:ring-offset-4"
    >
      <span
        className="pointer-events-none absolute inset-[8%] translate-y-[6%] rounded-full blur-2xl transition-opacity duration-700"
        style={{ background: "radial-gradient(circle, rgba(37,99,235,0.35) 0%, transparent 70%)", opacity: live ? 1 : 0.6 }}
      />
      <SkyOrb
        mode={mode}
        getInputVolume={getInputVolume}
        getOutputVolume={getOutputVolume}
        className="relative h-full w-full"
      />
    </motion.button>
  );
}

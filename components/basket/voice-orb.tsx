"use client";

import dynamic from "next/dynamic";
import { motion } from "motion/react";
import type { AgentState } from "@/components/ui/orb";

const Orb = dynamic(() => import("@/components/ui/orb").then((m) => m.Orb), { ssr: false });

const COLORS: [string, string] = ["#CADCFC", "#A0B9D1"];

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
  const manual = live && agentState !== "thinking";
  return (
    <motion.button
      type="button"
      aria-label={live ? "End conversation" : "Start talking"}
      onClick={onToggle}
      layout
      transition={{ type: "spring", stiffness: 220, damping: 30 }}
      style={{ width: size, height: size }}
      whileTap={{ scale: 0.96 }}
      className="relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#A0B9D1] focus-visible:ring-offset-4"
    >
      <div
        className="pointer-events-none absolute inset-[6%] rounded-full blur-2xl transition-opacity duration-700"
        style={{ background: "radial-gradient(circle, #CADCFC 0%, transparent 70%)", opacity: live ? 0.9 : 0.45 }}
      />
      <div className="relative h-full w-full">
        <Orb
          colors={COLORS}
          seed={7}
          agentState={live ? agentState : connecting ? "thinking" : null}
          volumeMode={manual ? "manual" : "auto"}
          getInputVolume={getInputVolume}
          getOutputVolume={getOutputVolume}
        />
      </div>
    </motion.button>
  );
}

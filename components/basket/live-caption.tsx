"use client";

import { AnimatePresence, motion } from "motion/react";
import type { TranscriptLine } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_WORDS = 22;

export function LiveCaption({ line, compact }: { line?: TranscriptLine; compact: boolean }) {
  const words = (line?.text ?? "").trim().split(/\s+/).filter(Boolean);
  const start = Math.max(0, words.length - MAX_WORDS);
  const user = line?.role === "user";

  return (
    <AnimatePresence mode="wait" initial={false}>
      {line && words.length > 0 && (
        <motion.p
          key={line.id ?? `${line.role}-${line.at}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{ duration: 0.18 }}
          className={cn(
            "mt-1 leading-snug",
            compact ? "text-[15px]" : "text-[17px]",
            user ? "text-subtle" : "text-ink",
          )}
        >
          {start > 0 && <span className="text-subtle">… </span>}
          {user && "“"}
          {words.slice(start).map((w, i) => (
            <motion.span
              key={`${start + i}:${w}`}
              initial={{ opacity: 0, filter: "blur(3px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="inline"
            >
              {w}
              {start + i < words.length - 1 ? " " : ""}
            </motion.span>
          ))}
          {user && "”"}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

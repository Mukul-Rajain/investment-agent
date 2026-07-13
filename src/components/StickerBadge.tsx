"use client";

import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";

type Ink = "riso-red" | "riso-blue" | "riso-green" | "riso-gold";

const INK_STYLES: Record<Ink, { bg: string; border: string; shadow: string }> = {
  "riso-red": { bg: "bg-riso-red/15", border: "border-riso-red", shadow: "shadow-hard-red" },
  "riso-blue": { bg: "bg-riso-blue/15", border: "border-riso-blue", shadow: "shadow-hard-blue" },
  "riso-green": { bg: "bg-riso-green/15", border: "border-riso-green", shadow: "shadow-hard-green" },
  "riso-gold": { bg: "bg-riso-gold/15", border: "border-riso-gold", shadow: "shadow-hard-gold" },
};

interface Props {
  icon: LucideIcon;
  label: string;
  ink: Ink;
  className?: string;
  rotate?: number;
}

export function StickerBadge({ icon: Icon, label, ink, className = "", rotate = -6 }: Props) {
  const styles = INK_STYLES[ink];

  return (
    <motion.div
      drag
      dragMomentum={false}
      whileDrag={{ scale: 1.15, zIndex: 50 }}
      whileHover={{ scale: 1.05 }}
      initial={{ rotate }}
      className={`absolute cursor-grab active:cursor-grabbing select-none touch-none ${className}`}
    >
      <div
        className={`relative w-24 h-24 rounded-full border-[3px] flex flex-col items-center justify-center gap-1 overflow-hidden ${styles.bg} ${styles.border} ${styles.shadow}`}
      >
        <div className="absolute inset-0 texture-halftone pointer-events-none" />
        <div className="absolute top-3 left-4 w-6 h-3 bg-paper/70 rounded-full -rotate-[20deg] blur-[1px] pointer-events-none" />
        <Icon className="w-7 h-7 text-ink relative" strokeWidth={2.5} />
        <span className="text-[7px] font-pixel uppercase tracking-wide text-ink relative">
          {label}
        </span>
      </div>
    </motion.div>
  );
}

import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type StatusTone = "ok" | "warn" | "danger" | "neutral";

type StatusPillProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: StatusTone;
};

const tones: Record<StatusTone, string> = {
  ok: "border-primary/30 bg-primary/10 text-primary",
  warn: "border-text-secondary/40 bg-text-secondary/10 text-secondary",
  danger: "border-error/30 bg-error/10 text-error",
  neutral: "border-text-secondary/25 bg-surface-container-high text-on-surface-variant",
};

export function StatusPill({
  className,
  tone = "neutral",
  ...props
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-1 font-mono text-[10px] font-medium uppercase",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

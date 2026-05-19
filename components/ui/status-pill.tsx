import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type StatusTone = "ok" | "warn" | "danger" | "neutral";

type StatusPillProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: StatusTone;
};

const tones: Record<StatusTone, string> = {
  ok: "border-forest/25 bg-forest/10 text-forest",
  warn: "border-amber/30 bg-amber/10 text-[#80501d]",
  danger: "border-accent/25 bg-accent/10 text-accent",
  neutral: "border-line bg-paper text-muted",
};

export function StatusPill({
  className,
  tone = "neutral",
  ...props
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

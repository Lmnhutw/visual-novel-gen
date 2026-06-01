import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        "rounded border border-text-secondary/20 bg-surface-container shadow-none",
        className,
      )}
      {...props}
    />
  );
}

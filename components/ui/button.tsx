import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-forest text-white hover:bg-[#264d42] focus-visible:outline-forest",
  secondary:
    "border border-line bg-panel text-ink hover:border-forest hover:text-forest focus-visible:outline-forest",
  ghost:
    "bg-transparent text-muted hover:bg-white hover:text-ink focus-visible:outline-forest",
  danger:
    "bg-accent text-white hover:bg-[#743341] focus-visible:outline-accent",
};

export function Button({
  className,
  variant = "secondary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      type={type}
      {...props}
    />
  );
}


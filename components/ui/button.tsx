import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-container focus-visible:outline-primary",
  secondary:
    "border border-text-secondary/70 bg-transparent text-text-secondary hover:border-primary hover:text-primary focus-visible:outline-primary",
  ghost:
    "bg-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-primary focus-visible:outline-primary",
  danger:
    "bg-error-container text-error hover:bg-error-container/80 focus-visible:outline-error",
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
        "inline-flex h-9 items-center justify-center gap-2 rounded px-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      type={type}
      {...props}
    />
  );
}

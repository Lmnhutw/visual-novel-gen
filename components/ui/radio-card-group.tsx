"use client";

import { cn } from "@/lib/utils";

export type RadioCardOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

type RadioCardGroupProps<T extends string> = {
  label: string;
  value: T | "";
  options: readonly RadioCardOption<T>[];
  onChange: (value: T) => void;
  helperText?: string;
  columns?: boolean;
};

export function RadioCardGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  helperText,
  columns = false,
}: RadioCardGroupProps<T>) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs font-semibold uppercase text-on-surface-variant">
        {label}
      </legend>
      <div className={cn("grid gap-2", columns ? "sm:grid-cols-2" : "")}>
        {options.map((option) => {
          const selected = value === option.value;

          return (
            <button
              key={option.value}
              className={cn(
                "rounded border px-3 py-2 text-left text-sm transition",
                selected
                  ? "border-primary bg-primary text-on-primary"
                  : "border-outline-variant bg-surface-dim text-on-surface-variant hover:border-primary hover:text-primary",
              )}
              type="button"
              onClick={() => onChange(option.value)}
            >
              <span className="block font-semibold">{option.label}</span>
              {option.description ? (
                <span
                  className={cn(
                    "mt-1 block text-xs leading-5",
                    selected ? "text-on-primary/80" : "text-on-surface-variant",
                  )}
                >
                  {option.description}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {helperText ? (
        <p className="text-xs leading-5 text-on-surface-variant">{helperText}</p>
      ) : null}
    </fieldset>
  );
}

"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export type ChipOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

type MultiSelectChipsProps<T extends string> = {
  label: string;
  value: T[];
  options: readonly ChipOption<T>[];
  onChange: (value: T[]) => void;
  helperText?: string;
  columns?: boolean;
};

export function MultiSelectChips<T extends string>({
  label,
  value,
  options,
  onChange,
  helperText,
  columns = false,
}: MultiSelectChipsProps<T>) {
  function toggle(option: T) {
    onChange(
      value.includes(option)
        ? value.filter((item) => item !== option)
        : [...value, option],
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase text-on-surface-variant">
          {label}
        </span>
        {value.length ? (
          <div className="flex flex-wrap justify-end gap-1.5">
            {value.map((item) => {
              const optionLabel =
                options.find((option) => option.value === item)?.label ?? item;

              return (
                <button
                  key={item}
                  className="inline-flex max-w-full items-center gap-1 rounded bg-primary px-2 py-1 text-xs font-semibold text-on-primary"
                  type="button"
                  onClick={() => toggle(item)}
                >
                  <span className="truncate">{optionLabel}</span>
                  <X className="size-3 shrink-0" />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      <div
        className={cn(
          "grid gap-2",
          columns ? "sm:grid-cols-2" : "grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]",
        )}
      >
        {options.map((option) => {
          const selected = value.includes(option.value);

          return (
            <button
              key={option.value}
              className={cn(
                "min-h-10 rounded border px-3 py-2 text-left text-sm transition",
                selected
                  ? "border-primary bg-primary text-on-primary"
                  : "border-outline-variant bg-surface-dim text-on-surface-variant hover:border-primary hover:text-primary",
              )}
              type="button"
              onClick={() => toggle(option.value)}
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
    </div>
  );
}

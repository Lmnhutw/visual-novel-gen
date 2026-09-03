"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type SelectMenuOption = {
  value: string;
  label: string;
};

type SelectMenuProps = {
  ariaDescribedBy?: string;
  ariaLabel: string;
  className?: string;
  invalid?: boolean;
  options: readonly SelectMenuOption[];
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

export function SelectMenu({
  ariaDescribedBy,
  ariaLabel,
  className,
  invalid = false,
  options,
  placeholder,
  value,
  onChange,
}: SelectMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedOption = options.find((option) => option.value === value);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value) + 1);

  useEffect(() => {
    function closeOnOutsidePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsidePointer);
    return () => document.removeEventListener("mousedown", closeOnOutsidePointer);
  }, []);

  function selectOption(nextValue: string) {
    setIsOpen(false);
    onChange(nextValue);
    triggerRef.current?.focus();
  }

  function focusOption(index: number) {
    optionRefs.current[index]?.focus();
  }

  function openAndFocus(index: number) {
    setIsOpen(true);
    requestAnimationFrame(() => focusOption(index));
  }

  return (
    <div className="relative min-w-0" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-describedby={ariaDescribedBy}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-dim px-3 text-left text-sm text-on-surface transition duration-200 hover:border-white/20 hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          invalid && "border-error-container",
          className,
        )}
        data-invalid={invalid || undefined}
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openAndFocus(event.key === "ArrowDown" ? selectedIndex : options.length);
          }
          if (event.key === "Escape") setIsOpen(false);
        }}
      >
        <span className={cn("min-w-0 truncate", !selectedOption && "text-on-surface-variant")}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn("size-4 shrink-0 text-primary transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>
      {isOpen ? (
        <div
          className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-full origin-top animate-[select-menu-enter_180ms_ease-out] overflow-hidden rounded-xl border border-white/10 bg-surface-container-high p-1.5 shadow-xl shadow-black/35"
          id={menuId}
          role="listbox"
          aria-label={ariaLabel}
        >
          <button
            aria-selected={!value}
            className={cn(
              "flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm transition",
              !value ? "bg-primary/15 text-primary" : "text-on-surface-variant hover:bg-white/[0.06] hover:text-on-surface",
            )}
            ref={(element) => {
              optionRefs.current[0] = element;
            }}
            role="option"
            type="button"
            onClick={() => selectOption("")}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                focusOption(1);
              }
              if (event.key === "ArrowUp" || event.key === "Home") {
                event.preventDefault();
                focusOption(0);
              }
              if (event.key === "End") {
                event.preventDefault();
                focusOption(options.length);
              }
              if (event.key === "Escape") {
                setIsOpen(false);
                triggerRef.current?.focus();
              }
            }}
          >
            {placeholder}
          </button>
          {options.map((option, index) => {
            const selected = option.value === value;
            const optionIndex = index + 1;
            return (
              <button
                aria-selected={selected}
                className={cn(
                  "flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm transition",
                  selected ? "bg-primary/15 text-primary" : "text-on-surface-variant hover:bg-white/[0.06] hover:text-on-surface",
                )}
                key={option.value}
                ref={(element) => {
                  optionRefs.current[optionIndex] = element;
                }}
                role="option"
                type="button"
                onClick={() => selectOption(option.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    focusOption(optionIndex === options.length ? 0 : optionIndex + 1);
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    focusOption(optionIndex - 1);
                  }
                  if (event.key === "Home") {
                    event.preventDefault();
                    focusOption(0);
                  }
                  if (event.key === "End") {
                    event.preventDefault();
                    focusOption(options.length);
                  }
                  if (event.key === "Escape") {
                    setIsOpen(false);
                    triggerRef.current?.focus();
                  }
                }}
              >
                <span className="truncate">{option.label}</span>
                {selected ? <Check aria-hidden="true" className="size-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

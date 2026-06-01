"use client";

import { ChevronDown } from "lucide-react";
import { ReactNode, useState } from "react";

import { cn } from "@/lib/utils";

type CollapsibleSectionProps = {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  required?: boolean;
  children: ReactNode;
};

export function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  required = false,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="rounded border border-outline-variant bg-surface-container-lowest">
      <button
        className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition hover:bg-surface-container-low"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-primary">
            {title}
            {required ? (
              <span className="rounded bg-primary-container px-1.5 py-0.5 text-[10px] uppercase text-on-primary-container">
                Required
              </span>
            ) : null}
          </span>
          {description ? (
            <span className="mt-1 block text-xs leading-5 text-on-surface-variant">
              {description}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "mt-0.5 size-4 shrink-0 text-on-surface-variant transition",
            isOpen ? "rotate-180" : "",
          )}
        />
      </button>
      {isOpen ? (
        <div className="border-t border-outline-variant px-4 py-4">{children}</div>
      ) : null}
    </section>
  );
}

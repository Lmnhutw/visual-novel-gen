"use client";

import { X } from "lucide-react";
import { KeyboardEvent, useState } from "react";

import { cn } from "@/lib/utils";

type TagInputProps = {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  helperText?: string;
  className?: string;
};

export function TagInput({
  label,
  value,
  onChange,
  placeholder = "Add tag",
  helperText,
  className,
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const nextTag = draft.trim();

    if (!nextTag || value.includes(nextTag)) {
      setDraft("");
      return;
    }

    onChange([...value, nextTag]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag();
    }

    if (event.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <label className={cn("flex flex-col gap-2", className)}>
      <span className="text-xs font-semibold uppercase text-on-surface-variant">
        {label}
      </span>
      <div className="min-h-10 rounded-xl border border-outline-variant bg-surface-dim px-2 py-1.5 transition focus-within:border-primary">
        <div className="flex flex-wrap items-center gap-1.5">
          {value.map((tag) => (
            <button
              key={tag}
              className="inline-flex max-w-full items-center gap-1 rounded bg-surface-container-high px-2 py-1 text-xs text-on-surface transition hover:text-primary"
              type="button"
              onClick={() => onChange(value.filter((item) => item !== tag))}
            >
              <span className="truncate">{tag}</span>
              <X className="size-3 shrink-0" />
            </button>
          ))}
          <input
            className="h-7 min-w-32 flex-1 border-0 bg-transparent px-1 text-sm outline-none"
            value={draft}
            onBlur={addTag}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={value.length ? "" : placeholder}
          />
        </div>
      </div>
      {helperText ? (
        <span className="text-xs leading-5 text-on-surface-variant">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}

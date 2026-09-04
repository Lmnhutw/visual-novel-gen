"use client";

import { RotateCcw, Save, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { SelectMenu } from "@/components/ui/select-menu";
import { TagInput } from "@/components/ui/tag-input";
import { cn } from "@/lib/utils";
import {
  getDefaultWritingHarness,
  type WritingHarnessConfig,
  writingHarnessSchema,
} from "@/lib/writing-harness/config";
import {
  compileWritingHarness,
  type HarnessNarrativeSettings,
} from "@/lib/writing-harness/prompt";

type WritingHarnessEditorProps = {
  value: WritingHarnessConfig;
  narrativeSettings: HarnessNarrativeSettings;
  isSaving: boolean;
  onSave: (value: WritingHarnessConfig) => Promise<void>;
  onReset: () => Promise<void>;
};

const numberInputClass =
  "mt-2 h-10 w-full rounded-xl border border-outline-variant bg-surface-dim px-3 text-sm text-on-surface outline-none transition focus:border-primary";

export function WritingHarnessEditor({
  value,
  narrativeSettings,
  isSaving,
  onSave,
  onReset,
}: WritingHarnessEditorProps) {
  const [draft, setDraft] = useState(value);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    setDraft(value);
    setValidationError("");
  }, [value]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(value);
  const preview = compileWritingHarness(draft, narrativeSettings);

  async function save() {
    const parsed = writingHarnessSchema.safeParse(draft);
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid writing harness.");
      return;
    }

    setValidationError("");
    await onSave(parsed.data);
  }

  async function reset() {
    setDraft(getDefaultWritingHarness());
    setValidationError("");
    await onReset();
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface-container-low shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.16em] text-primary/80">
            AI WRITING HARNESS
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-on-surface">
            Set the story&apos;s writing contract
          </h2>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">
            Hard checks are verified after generation. Style goals guide the AI
            and may still require editorial review.
          </p>
        </div>
        <ToggleRow
          checked={draft.enabled}
          label="Harness enabled"
          onChange={(enabled) => setDraft((current) => ({ ...current, enabled }))}
        />
      </div>

      <div
        className={cn(
          "space-y-6 p-5 transition-opacity duration-200 sm:p-6",
          !draft.enabled && "opacity-60",
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-on-surface">
            Language
            <span className="mt-2 block">
              <SelectMenu
                ariaLabel="Writing harness language"
                options={[
                  { value: "en", label: "English" },
                  { value: "vi", label: "Vietnamese" },
                ]}
                placeholder="Choose a language"
                value={draft.language}
                onChange={(language) =>
                  setDraft((current) => ({
                    ...current,
                    language: language as WritingHarnessConfig["language"],
                  }))
                }
              />
            </span>
          </label>
          <label className="block text-sm font-semibold text-on-surface">
            Readability
            <span className="mt-2 block">
              <SelectMenu
                ariaLabel="Writing harness readability"
                options={[
                  { value: "simple", label: "Simple" },
                  { value: "balanced", label: "Balanced" },
                  { value: "literary", label: "Literary" },
                ]}
                placeholder="Choose readability"
                value={draft.readability}
                onChange={(readability) =>
                  setDraft((current) => ({
                    ...current,
                    readability:
                      readability as WritingHarnessConfig["readability"],
                  }))
                }
              />
            </span>
          </label>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <TagInput
            label="Style goals"
            value={draft.styleGoals}
            onChange={(styleGoals) =>
              setDraft((current) => ({ ...current, styleGoals }))
            }
            placeholder="Add a preferred style"
            helperText="Guidance only; tone, rhythm, and readability are not mechanically guaranteed."
          />
          <TagInput
            label="Required writing rules"
            value={draft.requiredRules}
            onChange={(requiredRules) =>
              setDraft((current) => ({ ...current, requiredRules }))
            }
            placeholder="Add a mandatory instruction"
            helperText="Sent as mandatory writing data. Only rules covered by a hard check can be verified automatically."
          />
          <TagInput
            label="Forbidden characters"
            value={draft.forbiddenCharacters}
            onChange={(forbiddenCharacters) =>
              setDraft((current) => ({ ...current, forbiddenCharacters }))
            }
            placeholder="Type a character and press Enter"
            helperText="Checked exactly after generation. Commas are accepted as values in this field."
            splitOnComma={false}
          />
          <TagInput
            label="Forbidden words or phrases"
            value={draft.forbiddenPhrases}
            onChange={(forbiddenPhrases) =>
              setDraft((current) => ({ ...current, forbiddenPhrases }))
            }
            placeholder="Add a word or phrase"
            helperText="Checked case-insensitively after generation."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm font-semibold text-on-surface">
            Preferred maximum sentence words
            <input
              className={numberInputClass}
              max={80}
              min={5}
              type="number"
              value={draft.maxSentenceWords ?? ""}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  maxSentenceWords: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                }))
              }
            />
            <span className="mt-1.5 block text-xs font-normal leading-5 text-on-surface-variant">
              Advisory only; it does not prove readability.
            </span>
          </label>
          <label className="block text-sm font-semibold text-on-surface">
            Maximum consecutive blank lines
            <input
              className={numberInputClass}
              max={3}
              min={0}
              type="number"
              value={draft.outputRules.maxConsecutiveBlankLines}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  outputRules: {
                    ...current.outputRules,
                    maxConsecutiveBlankLines: Number(event.target.value),
                  },
                }))
              }
            />
          </label>
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <ToggleRow
              checked={draft.outputRules.proseOnly}
              label="Prose only"
              onChange={(proseOnly) =>
                setDraft((current) => ({
                  ...current,
                  outputRules: { ...current.outputRules, proseOnly },
                }))
              }
            />
            <ToggleRow
              checked={draft.outputRules.allowMarkdown}
              label="Allow Markdown"
              onChange={(allowMarkdown) =>
                setDraft((current) => ({
                  ...current,
                  outputRules: { ...current.outputRules, allowMarkdown },
                }))
              }
            />
            <ToggleRow
              checked={draft.repairOnViolation}
              label="Repair one time on violation"
              onChange={(repairOnViolation) =>
                setDraft((current) => ({ ...current, repairOnViolation }))
              }
            />
          </div>
        </div>

        <details className="rounded-xl border border-primary/20 bg-primary/[0.05] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-on-surface">
            Preview effective model instructions
          </summary>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs leading-5 text-on-surface-variant">
            {preview}
          </pre>
        </details>

        {validationError ? (
          <p className="text-sm text-rose-200" role="alert">
            {validationError}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-5">
          <p className="flex items-center gap-2 text-xs text-on-surface-variant">
            <ShieldCheck className="size-4 text-primary" /> Version 1 contract ·
            one bounded repair attempt maximum
          </p>
          <div className="flex gap-2">
            <button
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-on-surface-variant transition hover:border-white/25 hover:text-on-surface disabled:opacity-45"
              disabled={isSaving}
              type="button"
              onClick={() => void reset()}
            >
              <RotateCcw className="size-4" /> Reset to default
            </button>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary transition hover:brightness-110 disabled:opacity-45"
              disabled={isSaving || !dirty}
              type="button"
              onClick={() => void save()}
            >
              <Save className="size-4" /> Save harness
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ToggleRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-pressed={checked}
      className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-white/10 bg-surface-dim px-3 text-left text-sm font-semibold text-on-surface transition hover:border-white/20"
      type="button"
      onClick={() => onChange(!checked)}
    >
      {label}
      <span
        aria-hidden="true"
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-white/15",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-white transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

"use client";

import type { TemplateRecord } from "./types";

type CharacterTemplateLibraryProps = {
  templates: TemplateRecord[];
  query: string;
  isLoading: boolean;
  onQueryChange: (query: string) => void;
  onEdit: (template: TemplateRecord) => void;
  onDelete: (template: TemplateRecord) => void;
};

function templateSummary(template: TemplateRecord) {
  const personality = template.profile.personality;
  if (
    typeof personality === "object" &&
    personality &&
    "summary" in personality
  ) {
    return String(
      (personality as { summary?: unknown }).summary ?? "",
    );
  }

  return "Reusable character profile";
}

export function CharacterTemplateLibrary({
  templates,
  query,
  isLoading,
  onQueryChange,
  onEdit,
  onDelete,
}: CharacterTemplateLibraryProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-surface-container-low p-5 sm:p-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-on-surface-variant">
          CHARACTER LIBRARY
        </p>
        <h2 className="mt-1 text-xl font-semibold text-on-surface">
          Reusable character profiles
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
          Library characters are profile input only. Adding one to a Story
          always creates a separate canonical character.
        </p>
      </div>

      <label className="mt-6 block max-w-md text-sm font-semibold text-on-surface">
        Search library
        <input
          className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-surface-dim px-3 text-on-surface outline-none focus:border-primary"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>

      <div className="mt-5 divide-y divide-white/[0.08] border-y border-white/[0.08]">
        {templates.map((template) => (
          <article
            key={template.id}
            className="flex flex-wrap items-start justify-between gap-4 px-1 py-4"
          >
            <div className="min-w-0">
              <h3 className="font-semibold text-on-surface">{template.name}</h3>
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                {templateSummary(template)}
              </p>
            </div>
            <div className="flex gap-3 text-sm font-semibold">
              <button
                className="text-on-surface-variant hover:text-on-surface"
                type="button"
                onClick={() => onEdit(template)}
              >
                Edit
              </button>
              <button
                className="text-rose-200 hover:text-rose-100 disabled:opacity-50"
                disabled={isLoading}
                type="button"
                onClick={() => onDelete(template)}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
        {!templates.length ? (
          <p className="px-1 py-6 text-sm leading-6 text-on-surface-variant">
            Create a reusable character profile here, then add independent
            copies to any Story.
          </p>
        ) : null}
      </div>
    </section>
  );
}

"use client";

import {
  AlertTriangle,
  BookOpen,
  Brain,
  GitBranch,
  Library,
  Network,
  Play,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";

type WorkspaceTab =
  | "editor"
  | "characters"
  | "relationships"
  | "timeline"
  | "lore"
  | "memory"
  | "retrieval"
  | "settings";

type GenerationResponse = {
  generationRunId: string | null;
  draft: string | null;
  prompt?: string;
  contextPreview?: unknown;
  continuityWarnings?: Array<{
    severity: string;
    category: string;
    description: string;
  }>;
};

const tabs: Array<{
  id: WorkspaceTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "editor", label: "Chapter Editor", icon: BookOpen },
  { id: "characters", label: "Characters", icon: Users },
  { id: "relationships", label: "Relationships", icon: Network },
  { id: "timeline", label: "Timeline", icon: GitBranch },
  { id: "lore", label: "Lore", icon: Library },
  { id: "memory", label: "Memory", icon: Brain },
  { id: "retrieval", label: "Retrieval", icon: Search },
  { id: "settings", label: "Settings", icon: Settings2 },
];

const continuityItems = [
  {
    severity: "P0",
    label: "Adult confirmation required before mature generation",
    tone: "danger" as const,
  },
  {
    severity: "P1",
    label: "Relationship intimacy changed without a turning point",
    tone: "warn" as const,
  },
  {
    severity: "P2",
    label: "Recent injury should be reflected in action scenes",
    tone: "neutral" as const,
  },
];

const memoryRows = [
  ["Character", "Mira hides fear behind dry humor", "0.84"],
  ["Relationship", "Mira and Ren trust each other, but the betrayal is unresolved", "0.79"],
  ["Lore", "The ash bells ring only when a pact is broken", "0.76"],
  ["Event", "Ren learned the harbor map was forged in chapter 7", "0.73"],
];

type DisplayWarning = {
  severity: string;
  label: string;
  tone: StatusTone;
};

export function WorkspaceShell() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("editor");
  const [storyId, setStoryId] = useState("");
  const [goal, setGoal] = useState(
    "Write a tense reunion scene where the leads must cooperate despite unresolved betrayal.",
  );
  const [maturityMode, setMaturityMode] = useState<"safe" | "mature">("safe");
  const [draft, setDraft] = useState("");
  const [contextPreview, setContextPreview] = useState("");
  const [warnings, setWarnings] = useState<GenerationResponse["continuityWarnings"]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const canGenerate = storyId.trim().length > 0 && goal.trim().length >= 10;

  const activeTitle = useMemo(
    () => tabs.find((tab) => tab.id === activeTab)?.label ?? "Workspace",
    [activeTab],
  );

  const displayWarnings: DisplayWarning[] = warnings?.length
    ? warnings.map((warning) => ({
        severity: warning.severity,
        label: warning.description,
        tone:
          warning.severity === "P0"
            ? "danger"
            : warning.severity === "P1"
              ? "warn"
              : "neutral",
      }))
    : continuityItems;

  async function submitGeneration(previewOnly: boolean) {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/generation/scene", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storyId,
          goal,
          maturityMode,
          previewOnly,
        }),
      });

      const payload = (await response.json()) as GenerationResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Generation request failed.");
      }

      setDraft(payload.draft ?? "");
      setContextPreview(JSON.stringify(payload.contextPreview ?? {}, null, 2));
      setWarnings(payload.continuityWarnings ?? []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unknown generation error.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-[1500px] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[248px_1fr_340px]">
        <aside className="rounded-lg border border-line bg-panel p-3 shadow-soft lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <div className="mb-5 flex items-center gap-3 px-2 py-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-forest text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-5">Visual Novel Gen</h1>
              <p className="text-xs text-muted">Local writing system</p>
            </div>
          </div>

          <nav className="space-y-1" aria-label="Workspace sections">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  className={cn(
                    "flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition",
                    isActive
                      ? "bg-forest text-white"
                      : "text-muted hover:bg-paper hover:text-ink",
                  )}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-5 border-t border-line pt-4">
            <p className="px-2 text-xs font-medium uppercase tracking-wide text-muted">
              Model
            </p>
            <div className="mt-2 space-y-2 px-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Generation</span>
                <StatusPill tone="ok">Qwen 2.5 7B</StatusPill>
              </div>
              <div className="flex items-center justify-between">
                <span>Embeddings</span>
                <StatusPill>768 dim</StatusPill>
              </div>
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          <Panel className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Active Workspace
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-normal">
                  {activeTitle}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone="ok">Postgres canon</StatusPill>
                <StatusPill tone="warn">Hybrid retrieval</StatusPill>
                <StatusPill>Local Ollama</StatusPill>
              </div>
            </div>
          </Panel>

          <Panel className="p-4">
            <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium">Story ID</span>
                  <input
                    className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-forest"
                    placeholder="Paste a story UUID from /api/stories"
                    value={storyId}
                    onChange={(event) => setStoryId(event.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Scene Goal</span>
                  <textarea
                    className="mt-2 min-h-32 w-full rounded-md border border-line bg-white px-3 py-3 text-sm leading-6 outline-none transition focus:border-forest"
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                  />
                </label>
              </div>

              <div className="rounded-md border border-line bg-paper p-3">
                <p className="text-sm font-semibold">Generation Controls</p>
                <div className="mt-3 grid grid-cols-2 rounded-md border border-line bg-white p-1">
                  {(["safe", "mature"] as const).map((mode) => (
                    <button
                      key={mode}
                      className={cn(
                        "h-8 rounded px-2 text-xs font-medium capitalize",
                        maturityMode === mode
                          ? "bg-forest text-white"
                          : "text-muted hover:text-ink",
                      )}
                      type="button"
                      onClick={() => setMaturityMode(mode)}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <Button
                    className="w-full"
                    disabled={!canGenerate || isLoading}
                    variant="secondary"
                    onClick={() => submitGeneration(true)}
                  >
                    <Search className="h-4 w-4" />
                    Preview Context
                  </Button>
                  <Button
                    className="w-full"
                    disabled={!canGenerate || isLoading}
                    variant="primary"
                    onClick={() => submitGeneration(false)}
                  >
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Generate Scene
                  </Button>
                </div>
                {error ? (
                  <p className="mt-3 rounded-md border border-accent/20 bg-accent/10 p-2 text-xs text-accent">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <Panel className="min-h-[420px] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Draft Output</h3>
                <StatusPill tone={draft ? "ok" : "neutral"}>
                  {draft ? "Generated" : "Waiting"}
                </StatusPill>
              </div>
              <textarea
                className="min-h-[340px] w-full rounded-md border border-line bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-forest"
                placeholder="Generated prose will appear here."
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
            </Panel>

            <Panel className="min-h-[420px] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Context Preview</h3>
                <StatusPill>{contextPreview ? "Loaded" : "Empty"}</StatusPill>
              </div>
              <pre className="max-h-[340px] overflow-auto rounded-md border border-line bg-[#101614] p-3 text-xs leading-5 text-[#dce8df]">
                {contextPreview || "Preview retrieval context before generation."}
              </pre>
            </Panel>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:overflow-auto">
          <Panel className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-semibold">Continuity Warnings</h3>
            </div>
            <div className="mt-3 space-y-2">
              {displayWarnings.map((item) => (
                <div
                  key={`${item.severity}-${item.label}`}
                  className="rounded-md border border-line bg-paper p-3"
                >
                  <StatusPill tone={item.tone}>{item.severity}</StatusPill>
                  <p className="mt-2 text-sm leading-5">{item.label}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-forest" />
              <h3 className="text-sm font-semibold">Memory Inspector</h3>
            </div>
            <div className="mt-3 divide-y divide-line rounded-md border border-line bg-white">
              {memoryRows.map(([type, text, score]) => (
                <div key={text} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <StatusPill>{type}</StatusPill>
                    <span className="text-xs text-muted">{score}</span>
                  </div>
                  <p className="mt-2 text-sm leading-5">{text}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-4">
            <h3 className="text-sm font-semibold">Retrieval Budget</h3>
            <div className="mt-3 space-y-3">
              {[
                ["Canon", "92%"],
                ["Characters", "81%"],
                ["Relationships", "68%"],
                ["Lore", "54%"],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-xs text-muted">
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-paper">
                    <div
                      className="h-2 rounded-full bg-forest"
                      style={{ width: value }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </div>
    </main>
  );
}

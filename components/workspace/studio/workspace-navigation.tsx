"use client";

import { BookOpen, CircleDot, Feather, Library, Users } from "lucide-react";

import { cn } from "@/lib/utils";

import type { WorkspaceView } from "./types";

const items = [
  { id: "studio", label: "Studio", icon: Feather },
  { id: "story", label: "Story map", icon: CircleDot },
  { id: "cast", label: "Cast", icon: Users },
  { id: "chapters", label: "Chapters", icon: BookOpen },
  { id: "canon", label: "Canon review", icon: Library },
] as const;

export function WorkspaceNavigation({
  activeView,
  onChange,
  issueCount,
}: {
  activeView: WorkspaceView;
  onChange: (view: WorkspaceView) => void;
  issueCount: number;
}) {
  return (
    <nav aria-label="Workspace" className="flex gap-1 overflow-x-auto px-1 py-2 lg:flex-col lg:gap-1 lg:px-0">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.id === activeView;
        return (
          <button
            key={item.id}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group inline-flex h-10 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              active
                ? "bg-primary/15 text-primary"
                : "text-on-surface-variant hover:bg-white/[0.05] hover:text-on-surface",
            )}
            type="button"
            onClick={() => onChange(item.id)}
          >
            <Icon className="size-4" strokeWidth={active ? 2.2 : 1.8} />
            <span className="font-medium">{item.label}</span>
            {item.id === "canon" && issueCount > 0 ? (
              <span className="ml-auto grid size-5 place-items-center rounded-full bg-amber-300/15 text-[11px] font-bold text-amber-200">
                {issueCount > 9 ? "9+" : issueCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

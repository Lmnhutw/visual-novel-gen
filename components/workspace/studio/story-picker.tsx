"use client";

import { SelectMenu } from "@/components/ui/select-menu";

import type { StorySummary } from "./types";

type StoryPickerProps = {
  stories: StorySummary[];
  value: string;
  onChange: (storyId: string) => void;
};

export function StoryPicker({ stories, value, onChange }: StoryPickerProps) {
  return (
    <SelectMenu
      ariaLabel="Select story"
      className="h-11 bg-surface-dim/70 text-lg font-semibold tracking-tight"
      options={stories.map((story) => ({
        label: story.title,
        value: story.id,
      }))}
      placeholder="Please select a story"
      value={value}
      onChange={onChange}
    />
  );
}

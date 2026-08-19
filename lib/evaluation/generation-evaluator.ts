import type { ContinuityWarning } from "@/lib/continuity/rule-checks";

export type DraftEvaluation = {
  decision: "pass" | "review_required" | "rewrite_recommended";
  counts: Record<"P0" | "P1" | "P2" | "P3", number>;
};

export function evaluateDraft(
  warnings: ContinuityWarning[],
): DraftEvaluation {
  const counts = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const warning of warnings) {
    counts[warning.severity] += 1;
  }

  return {
    decision:
      counts.P0 > 0
        ? "rewrite_recommended"
        : counts.P1 > 0
          ? "review_required"
          : "pass",
    counts,
  };
}

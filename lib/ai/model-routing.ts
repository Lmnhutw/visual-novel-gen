import { getModelConfig } from "@/lib/ai/model-config";

export type ModelTask = "generation" | "evaluation" | "extraction";

export function getModelForTask(task: ModelTask): string {
  const fallback = getModelConfig().generationModel;

  if (task === "evaluation") {
    return process.env.EVALUATION_MODEL?.trim() || fallback;
  }

  if (task === "extraction") {
    return process.env.EXTRACTION_MODEL?.trim() || fallback;
  }

  return fallback;
}

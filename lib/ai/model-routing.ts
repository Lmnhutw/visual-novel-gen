import { getModelConfig } from "@/lib/ai/model-config";

export type ModelTask = "generation" | "evaluation" | "extraction";

export function getModelForTask(task: ModelTask): string {
  const generationModel = getModelConfig().generationModel;
  const unchangedTaskFallback =
    process.env.GENERATION_MODEL?.trim() || "qwen/qwen-2.5-72b-instruct";

  if (task === "evaluation") {
    return process.env.EVALUATION_MODEL?.trim() || unchangedTaskFallback;
  }

  if (task === "extraction") {
    return process.env.EXTRACTION_MODEL?.trim() || unchangedTaskFallback;
  }

  return generationModel;
}

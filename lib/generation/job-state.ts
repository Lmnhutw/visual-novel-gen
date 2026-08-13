export const terminalGenerationStatuses = [
  "READY_FOR_REVIEW",
  "FAILED",
  "CANCELLED",
] as const;

export const retryableGenerationStatuses = ["FAILED", "CANCELLED"] as const;

export function isTerminalGenerationStatus(status: string) {
  return terminalGenerationStatuses.some((terminalStatus) => terminalStatus === status);
}

export function isRetryableGenerationStatus(status: string) {
  return retryableGenerationStatuses.some((retryableStatus) => retryableStatus === status);
}

export function canWriteGenerationStage(status: string) {
  return status === "RUNNING";
}

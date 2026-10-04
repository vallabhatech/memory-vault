import { classifyWithGemma } from "@/lib/memory/gemma-classifier";
import type {
  CandidateMemory,
  MemoryClassifier,
  MemoryConflictResolution,
  MemoryJudgment,
  NewMemory,
} from "@/lib/memory/types";

const conflictingRelations = new Set(["contradiction", "supersedes"]);

export async function resolveMemoryConflict(
  newMemory: NewMemory,
  candidateMemories: readonly CandidateMemory[],
  classify: MemoryClassifier = classifyWithGemma,
): Promise<MemoryConflictResolution> {
  const activeCandidates = candidateMemories.filter(
    (memory) =>
      memory.user_id === newMemory.user_id && memory.status === "active",
  );
  const uniqueCandidates = new Map<string, CandidateMemory>();

  for (const candidate of activeCandidates) {
    if (uniqueCandidates.has(candidate.id)) {
      throw new Error("Candidate memories must have unique IDs.");
    }
    uniqueCandidates.set(candidate.id, candidate);
  }

  const candidates = [...uniqueCandidates.values()];
  if (candidates.length === 0) {
    return {
      action: "add",
      conflictingMemoryIds: [],
      supersededMemoryIds: [],
      explanation: "No active memories were available for comparison.",
    };
  }

  const judgments = await classify(newMemory, candidates);
  validateJudgments(candidates, judgments);

  const relevantJudgments = judgments.filter(
    (judgment) => judgment.relation !== "unrelated",
  );
  const conflictingMemoryIds = judgments
    .filter((judgment) => conflictingRelations.has(judgment.relation))
    .map((judgment) => judgment.memoryId);
  const action =
    conflictingMemoryIds.length > 0
      ? "supersede"
      : relevantJudgments.length > 0 &&
          relevantJudgments.every((judgment) => judgment.relation === "duplicate")
        ? "duplicate"
        : "add";

  return {
    action,
    conflictingMemoryIds,
    supersededMemoryIds: [...conflictingMemoryIds],
    explanation: buildExplanation(action, relevantJudgments),
  };
}

function validateJudgments(
  candidates: readonly CandidateMemory[],
  judgments: readonly MemoryJudgment[],
): void {
  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  const seenIds = new Set<string>();

  for (const judgment of judgments) {
    if (!candidateIds.has(judgment.memoryId) || seenIds.has(judgment.memoryId)) {
      throw new Error("The memory classifier returned an invalid candidate ID.");
    }
    if (
      typeof judgment.rationale !== "string" ||
      judgment.rationale.trim().length === 0
    ) {
      throw new Error("The memory classifier returned an invalid rationale.");
    }
    seenIds.add(judgment.memoryId);
  }

  if (seenIds.size !== candidateIds.size) {
    throw new Error("The memory classifier must classify every candidate.");
  }
}

function buildExplanation(
  action: MemoryConflictResolution["action"],
  judgments: readonly MemoryJudgment[],
): string {
  if (action === "duplicate") {
    return "The new memory duplicates an existing active memory. " +
      judgments.map((judgment) => judgment.rationale.trim()).join(" ");
  }

  if (action === "supersede") {
    return "The new memory conflicts with or replaces an existing active memory; " +
      "the older memory will be retained as superseded history. " +
      judgments.map((judgment) => judgment.rationale.trim()).join(" ");
  }

  const informativeReasons = judgments
    .filter((judgment) => judgment.relation === "adds_information")
    .map((judgment) => judgment.rationale.trim());

  return informativeReasons.length > 0
    ? `The new memory adds compatible information. ${informativeReasons.join(" ")}`
    : "The new memory does not conflict with the active memories that were checked.";
}
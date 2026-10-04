import type { RelevantMemory } from "@/lib/memory/retrieval";
import { retrieveRelevantMemories } from "@/lib/memory/retrieval";
import type { MemoryStatus } from "@/lib/memory/types";

const maximumEvidence = 8;
const maximumHistoryDepth = 4;

export type AnswerEvidence = {
  memoryId: string;
  content: string;
  status: MemoryStatus;
  createdAt: string;
  sourceId: string;
  reason: string;
};

export type GeneratedMemoryAnswer = {
  answer: string;
  confidence: number;
  evidenceMemoryIds: string[];
};

export type MemoryAnswerGenerator = (
  query: string,
  evidence: readonly AnswerEvidence[],
) => Promise<GeneratedMemoryAnswer>;

export type MemoryAnswer = {
  answer: string;
  confidence: number;
  evidence: AnswerEvidence[];
};

export type AnswerMemoryQueryOptions = {
  retrieve?: (
    query: string,
    userId: string,
  ) => Promise<RelevantMemory[]>;
  generate?: MemoryAnswerGenerator;
};

export class MemoryAnswerGenerationError extends Error {
  constructor() {
    super("Gemma could not generate a grounded memory answer.");
    this.name = "MemoryAnswerGenerationError";
  }
}

export async function answerMemoryQuery(
  query: string,
  userId: string,
  options: AnswerMemoryQueryOptions = {},
): Promise<MemoryAnswer> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery || !userId) return unavailableAnswer();

  const retrieve = options.retrieve ?? retrieveRelevantMemories;
  const rankedMemories = await retrieve(normalizedQuery, userId);
  const evidence = selectAnswerEvidence(rankedMemories);
  if (evidence.length === 0) return unavailableAnswer();

  const conflictingActiveMemories = findConflictingActiveMemories(rankedMemories);
  if (conflictingActiveMemories.length > 1) {
    const conflictEvidence = toEvidence(conflictingActiveMemories);
    const entity = conflictingActiveMemories[0].memory.entity;
    const contents = conflictingActiveMemories
      .map(({ memory }) => `"${memory.content}"`)
      .join(" and ");

    return {
      answer: `Memory is uncertain: active records conflict about ${entity}: ${contents}.`,
      confidence: 0.25,
      evidence: conflictEvidence,
    };
  }

  const generate = options.generate ?? (await getGemmaAnswerGenerator());
  const generatedAnswer = await generate(normalizedQuery, evidence);
  const citedEvidence = validateGeneratedAnswer(generatedAnswer, evidence);
  const confidence = calculateGroundedConfidence(
    generatedAnswer.confidence,
    citedEvidence,
    rankedMemories,
  );

  return {
    answer: generatedAnswer.answer.trim(),
    confidence,
    evidence: citedEvidence,
  };
}

function selectAnswerEvidence(
  rankedMemories: readonly RelevantMemory[],
): AnswerEvidence[] {
  const available = rankedMemories.filter(
    ({ memory }) => memory.status !== "forgotten",
  );
  const byId = new Map(available.map((result) => [result.memory.id, result]));
  const selected = new Map<string, RelevantMemory>();

  for (const result of available.slice(0, maximumEvidence)) {
    selected.set(result.memory.id, result);
  }

  for (const result of available.filter(({ memory }) => memory.status === "active")) {
    let predecessorId = result.memory.supersedes;
    let historyDepth = 0;

    while (predecessorId && historyDepth < maximumHistoryDepth) {
      const predecessor = byId.get(predecessorId);
      if (!predecessor || predecessor.memory.status === "forgotten") break;
      selected.set(predecessor.memory.id, predecessor);
      predecessorId = predecessor.memory.supersedes;
      historyDepth += 1;
    }
  }

  return [...selected.values()]
    .sort(
      (left, right) =>
        Date.parse(left.memory.valid_from) - Date.parse(right.memory.valid_from),
    )
    .map(toEvidenceItem);
}

function findConflictingActiveMemories(
  rankedMemories: readonly RelevantMemory[],
): RelevantMemory[] {
  const groups = new Map<string, RelevantMemory[]>();

  for (const result of rankedMemories) {
    const { memory } = result;
    if (memory.status !== "active") continue;
    const key = `${memory.entity}\u0000${memory.scope}\u0000${memory.type}`;
    const group = groups.get(key) ?? [];
    group.push(result);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    const distinctContents = new Set(group.map(({ memory }) => normalizeContent(memory.content)));
    if (distinctContents.size > 1) return group;
  }

  return [];
}

function validateGeneratedAnswer(
  value: GeneratedMemoryAnswer,
  suppliedEvidence: readonly AnswerEvidence[],
): AnswerEvidence[] {
  if (
    typeof value.answer !== "string" ||
    value.answer.trim().length === 0 ||
    value.answer.length > 2_000 ||
    typeof value.confidence !== "number" ||
    !Number.isFinite(value.confidence) ||
    value.confidence < 0 ||
    value.confidence > 1 ||
    !Array.isArray(value.evidenceMemoryIds)
  ) {
    throw new MemoryAnswerGenerationError();
  }

  const evidenceById = new Map(
    suppliedEvidence.map((item) => [item.memoryId, item]),
  );
  const citedIds = new Set<string>();
  for (const memoryId of value.evidenceMemoryIds) {
    if (
      typeof memoryId !== "string" ||
      !evidenceById.has(memoryId) ||
      citedIds.has(memoryId)
    ) {
      throw new MemoryAnswerGenerationError();
    }
    citedIds.add(memoryId);
  }

  if (citedIds.size === 0) throw new MemoryAnswerGenerationError();
  return value.evidenceMemoryIds.map((memoryId) => evidenceById.get(memoryId)!);
}

function calculateGroundedConfidence(
  generatedConfidence: number,
  evidence: readonly AnswerEvidence[],
  rankedMemories: readonly RelevantMemory[],
): number {
  const scores = new Map(
    rankedMemories.map((result) => [result.memory.id, result.score]),
  );
  const evidenceScore =
    evidence.reduce((total, item) => total + (scores.get(item.memoryId) ?? 0), 0) /
    evidence.length;
  return Number(Math.min(generatedConfidence, evidenceScore).toFixed(3));
}

function toEvidence(results: readonly RelevantMemory[]): AnswerEvidence[] {
  return results.map(toEvidenceItem);
}

function toEvidenceItem(result: RelevantMemory): AnswerEvidence {
  const { memory } = result;
  const temporalReason =
    memory.status === "active"
      ? memory.supersedes
        ? "This is the active reinstated version and supersedes an earlier memory."
        : "This is an active memory."
      : `This is historical and was superseded${memory.valid_until ? ` after ${memory.valid_until}` : ""}; do not treat it as current.`;

  return {
    memoryId: memory.id,
    content: memory.content,
    status: memory.status,
    createdAt: memory.created_at,
    sourceId: memory.source_id,
    reason: `${result.reason}; ${temporalReason}`,
  };
}

function normalizeContent(content: string): string {
  return content.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function unavailableAnswer(): MemoryAnswer {
  return {
    answer: "The memory is uncertain or unavailable; no relevant stored evidence was found.",
    confidence: 0,
    evidence: [],
  };
}

async function getGemmaAnswerGenerator(): Promise<MemoryAnswerGenerator> {
  const generator = await import("@/lib/memory/gemma-answer-generator");
  return generator.generateAnswerWithGemma;
}
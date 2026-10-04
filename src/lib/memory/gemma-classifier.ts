import type {
  MemoryClassifier,
  MemoryJudgment,
  MemoryRelation,
} from "@/lib/memory/types";

const validRelations = new Set<MemoryRelation>([
  "adds_information",
  "duplicate",
  "contradiction",
  "supersedes",
  "unrelated",
]);

export class GemmaConfigurationError extends Error {
  constructor() {
    super("Gemma inference is not configured.");
    this.name = "GemmaConfigurationError";
  }
}

export class GemmaInferenceError extends Error {
  constructor() {
    super("Gemma inference could not classify the candidate memories.");
    this.name = "GemmaInferenceError";
  }
}

export const classifyWithGemma: MemoryClassifier = async (
  newMemory,
  candidates,
) => {
  const baseUrl = process.env.GEMMA_OPENAI_BASE_URL;
  const model = process.env.GEMMA_MODEL;

  if (!baseUrl || !model) {
    throw new GemmaConfigurationError();
  }

  const endpoint = new URL("chat/completions", `${baseUrl.replace(/\/+$/, "")}/`);
  const headers = new Headers({
    "Content-Type": "application/json",
  });
  const apiKey = process.env.GEMMA_API_KEY;
  if (apiKey) {
    headers.set("Authorization", `Bearer ${apiKey}`);
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: Math.min(200 + candidates.length * 80, 12_000),
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Classify each candidate memory in relation to the new memory. " +
              "Return only a JSON object shaped as {\"judgments\":[{\"memoryId\":\"candidate id\",\"relation\":\"relation\",\"rationale\":\"brief reason\"}]}. " +
              "Use adds_information when both memories can remain true and the new one adds a distinct detail. " +
              "Use duplicate when they express the same information. " +
              "Use contradiction when both cannot be current at once. " +
              "Use supersedes when the new memory explicitly replaces or revises the candidate. " +
              "Use unrelated when they concern different facts. " +
              "Do not invent IDs. Classify every candidate exactly once.",
          },
          {
            role: "user",
            content: JSON.stringify({
              newMemory: {
                content: newMemory.content,
                type: newMemory.type,
                entity: newMemory.entity,
                scope: newMemory.scope,
                validFrom: newMemory.valid_from,
              },
              candidates: candidates.map((candidate) => ({
                memoryId: candidate.id,
                content: candidate.content,
                type: candidate.type,
                entity: candidate.entity,
                scope: candidate.scope,
                validFrom: candidate.valid_from,
              })),
            }),
          },
        ],
      }),
    });
  } catch {
    throw new GemmaInferenceError();
  }

  if (!response.ok) {
    throw new GemmaInferenceError();
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new GemmaInferenceError();
  }

  const text = getCompletionText(payload);
  if (!text) {
    throw new GemmaInferenceError();
  }

  let result: unknown;
  try {
    result = JSON.parse(text);
  } catch {
    throw new GemmaInferenceError();
  }

  return parseJudgments(result);
};

function getCompletionText(payload: unknown): string | null {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    return null;
  }

  const choice = payload.choices[0];
  if (!isRecord(choice) || !isRecord(choice.message)) {
    return null;
  }

  return typeof choice.message.content === "string"
    ? choice.message.content
    : null;
}

function parseJudgments(value: unknown): MemoryJudgment[] {
  if (!isRecord(value) || !Array.isArray(value.judgments)) {
    throw new GemmaInferenceError();
  }

  const judgments: MemoryJudgment[] = [];
  for (const item of value.judgments) {
    if (
      !isRecord(item) ||
      typeof item.memoryId !== "string" ||
      typeof item.relation !== "string" ||
      !validRelations.has(item.relation as MemoryRelation) ||
      typeof item.rationale !== "string"
    ) {
      throw new GemmaInferenceError();
    }

    judgments.push({
      memoryId: item.memoryId,
      relation: item.relation as MemoryRelation,
      rationale: item.rationale.slice(0, 1000),
    });
  }

  return judgments;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
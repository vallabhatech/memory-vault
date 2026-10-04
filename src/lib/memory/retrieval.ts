import type { MemoryStatus } from "@/lib/memory/types";

export type RetrievedMemory = {
  id: string;
  user_id: string;
  content: string;
  type: string;
  entity: string;
  scope: string;
  confidence: number;
  status: MemoryStatus;
  created_at: string;
  valid_from: string;
  valid_until: string | null;
  supersedes: string | null;
  source_id: string;
  textRank: number;
};

export type MemoryCandidateProvider = {
  search(
    query: string,
    userId: string,
    limit: number,
  ): Promise<readonly RetrievedMemory[]>;
};

export type RetrievalWeights = {
  semanticSimilarity: number;
  recency: number;
  scopeMatch: number;
  confidence: number;
  currentStatus: number;
};

export type RetrievalOptions = {
  provider?: MemoryCandidateProvider;
  scope?: string;
  now?: Date;
  weights?: Partial<RetrievalWeights>;
  limit?: number;
  recencyHalfLifeDays?: number;
  historicalCurrentQueryMultiplier?: number;
};

export type RelevantMemory = {
  memory: RetrievedMemory;
  score: number;
  reason: string;
};

const defaultWeights: RetrievalWeights = {
  semanticSimilarity: 0.5,
  recency: 0.2,
  scopeMatch: 0.1,
  confidence: 0.1,
  currentStatus: 0.1,
};

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "do",
  "for",
  "how",
  "i",
  "is",
  "it",
  "me",
  "of",
  "our",
  "the",
  "to",
  "use",
  "using",
  "we",
  "what",
]);

const maximumCandidates = 500;

export async function retrieveRelevantMemories(
  query: string,
  userId: string,
  options: RetrievalOptions = {},
): Promise<RelevantMemory[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery || !userId) return [];

  const provider = options.provider ?? (await getPostgresTextSearchProvider());
  const candidates = await provider.search(
    normalizedQuery,
    userId,
    maximumCandidates,
  );

  return rankRelevantMemories(normalizedQuery, candidates, options);
}

export function rankRelevantMemories(
  query: string,
  candidates: readonly RetrievedMemory[],
  options: Omit<RetrievalOptions, "provider"> = {},
): RelevantMemory[] {
  const eligibleMemories = candidates.filter(
    (memory) => memory.user_id && memory.status !== "forgotten",
  );
  if (eligibleMemories.length === 0) return [];

  const weights = resolveWeights(options.weights);
  const halfLifeDays = options.recencyHalfLifeDays ?? 180;
  if (!Number.isFinite(halfLifeDays) || halfLifeDays <= 0) {
    throw new RangeError("recencyHalfLifeDays must be a positive number.");
  }

  const currentTime = options.now?.getTime() ?? Date.now();
  const expectedScope = options.scope ?? inferScope(query);
  const asksForCurrentState = isCurrentStateQuery(query);
  const historicalCurrentQueryMultiplier =
    options.historicalCurrentQueryMultiplier ?? 0.35;
  if (
    !Number.isFinite(historicalCurrentQueryMultiplier) ||
    historicalCurrentQueryMultiplier < 0 ||
    historicalCurrentQueryMultiplier > 1
  ) {
    throw new RangeError("historicalCurrentQueryMultiplier must be between 0 and 1.");
  }
  const queryTokens = tokenize(query);
  const maximumTextRank = Math.max(
    0,
    ...eligibleMemories.map((memory) => normalizeTextRank(memory.textRank)),
  );

  return eligibleMemories
    .flatMap((memory) => {
      const lexicalSimilarity =
        maximumTextRank === 0
          ? 0
          : normalizeTextRank(memory.textRank) / maximumTextRank;
      const entityTopicMatch = calculateEntityTopicMatch(queryTokens, memory.entity);
      const semanticSimilarity = clamp(
        lexicalSimilarity * 0.75 + entityTopicMatch * 0.25,
      );
      if (lexicalSimilarity === 0 && entityTopicMatch === 0) return [];
      const historicalAdjustment =
        asksForCurrentState && memory.status === "superseded"
          ? historicalCurrentQueryMultiplier
          : 1;
      const recency = calculateRecency(memory.valid_from, currentTime, halfLifeDays);
      const scopeMatch = calculateScopeMatch(memory.scope, expectedScope);
      const confidence = clamp(memory.confidence);
      const currentStatus = memory.status === "active" ? 1 : 0.15;
      const score =
        semanticSimilarity * historicalAdjustment * weights.semanticSimilarity +
        recency * weights.recency +
        scopeMatch * weights.scopeMatch +
        confidence * weights.confidence +
        currentStatus * weights.currentStatus;

      return [{
        memory,
        score: Number(clamp(score).toFixed(6)),
        reason: buildReason({
          entityTopicMatch,
          lexicalSimilarity,
          recency,
          scopeMatch,
          expectedScope,
          currentStatus: memory.status,
          historicalAdjustment,
        }),
      }];
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        Number(right.memory.status === "active") -
          Number(left.memory.status === "active") ||
        Date.parse(right.memory.valid_from) - Date.parse(left.memory.valid_from),
    )
    .slice(0, Math.max(1, Math.min(options.limit ?? 10, maximumCandidates)));
}

async function getPostgresTextSearchProvider(): Promise<MemoryCandidateProvider> {
  const provider = await import("@/lib/memory/postgres-text-search-provider");
  return provider.postgresTextSearchProvider;
}

function resolveWeights(overrides?: Partial<RetrievalWeights>): RetrievalWeights {
  const environmentWeights = process.env.MEMORY_RETRIEVAL_WEIGHTS;
  let parsedEnvironment: Partial<RetrievalWeights> = {};

  if (environmentWeights) {
    try {
      parsedEnvironment = JSON.parse(environmentWeights) as Partial<RetrievalWeights>;
    } catch {
      throw new Error("MEMORY_RETRIEVAL_WEIGHTS must contain valid JSON.");
    }
  }

  const weights = {
    ...defaultWeights,
    ...parsedEnvironment,
    ...overrides,
  };
  const knownWeightKeys = new Set(Object.keys(defaultWeights));
  if (
    [...Object.keys(parsedEnvironment), ...Object.keys(overrides ?? {})].some(
      (key) => !knownWeightKeys.has(key),
    )
  ) {
    throw new RangeError("Retrieval weights contain an unknown key.");
  }

  const values = Object.values(weights);
  if (values.some((weight) => !Number.isFinite(weight) || weight < 0)) {
    throw new RangeError("Retrieval weights must be finite, non-negative numbers.");
  }

  const total = values.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) {
    throw new RangeError("At least one retrieval weight must be greater than zero.");
  }

  return Object.fromEntries(
    Object.entries(weights).map(([key, value]) => [key, value / total]),
  ) as RetrievalWeights;
}

function normalizeTextRank(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function calculateEntityTopicMatch(queryTokens: Set<string>, entity: string): number {
  const entityTokens = tokenize(entity);
  if (entityTokens.size === 0 || queryTokens.size === 0) return 0;

  let matches = 0;
  for (const token of entityTokens) {
    if (queryTokens.has(token)) matches += 1;
  }
  return matches / entityTokens.size;
}

function calculateRecency(
  validFrom: string,
  currentTime: number,
  halfLifeDays: number,
): number {
  const timestamp = Date.parse(validFrom);
  if (Number.isNaN(timestamp)) return 0;
  const ageDays = Math.max(0, (currentTime - timestamp) / 86_400_000);
  return 2 ** (-ageDays / halfLifeDays);
}

function calculateScopeMatch(scope: string, expectedScope: string | undefined): number {
  if (!expectedScope) return 0.5;
  return scope.toLowerCase() === expectedScope.toLowerCase() ? 1 : 0;
}

function inferScope(query: string): string | undefined {
  const normalized = query.toLowerCase();
  if (/\b(project|repository|repo|codebase|application|app|framework|stack)\b/.test(normalized)) {
    return "project";
  }
  if (/\b(my|mine|personal|i prefer|i like)\b/.test(normalized)) {
    return "user";
  }
  return undefined;
}

function isCurrentStateQuery(query: string): boolean {
  return /\b(current(?:ly)?|now|latest|today|still)\b/i.test(query);
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length > 1 && !stopWords.has(token)),
  );
}

function buildReason(input: {
  entityTopicMatch: number;
  lexicalSimilarity: number;
  recency: number;
  scopeMatch: number;
  expectedScope: string | undefined;
  currentStatus: MemoryStatus;
  historicalAdjustment: number;
}): string {
  const reasons: string[] = [];
  if (input.entityTopicMatch > 0) reasons.push("entity/topic matches the query");
  if (input.lexicalSimilarity > 0) reasons.push("PostgreSQL text search matched");
  if (input.expectedScope) {
    reasons.push(
      input.scopeMatch === 1
        ? `scope matches ${input.expectedScope}`
        : `scope does not match ${input.expectedScope}`,
    );
  }
  reasons.push(
    input.currentStatus === "active"
      ? "active current memory"
      : "superseded historical memory, not a current fact",
  );
  if (input.historicalAdjustment < 1) {
    reasons.push("historical relevance downweighted for a current-state query");
  }
  reasons.push(`recency score ${input.recency.toFixed(2)}`);
  return reasons.join("; ");
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
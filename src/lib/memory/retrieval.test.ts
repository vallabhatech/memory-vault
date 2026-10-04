import assert from "node:assert/strict";
import test from "node:test";
import {
  retrieveRelevantMemories,
  type MemoryCandidateProvider,
  type RetrievedMemory,
} from "@/lib/memory/retrieval";

const userId = "00000000-0000-4000-8000-000000000001";
const currentTime = new Date("2025-01-06T00:00:00.000Z");

function memory(input: {
  id: string;
  content: string;
  validFrom: string;
  status: "active" | "superseded" | "forgotten";
  textRank: number;
  supersedes?: string | null;
}): RetrievedMemory {
  return {
    id: input.id,
    user_id: userId,
    content: input.content,
    type: "technical_decision",
    entity: "project.framework",
    scope: "project",
    confidence: 1,
    status: input.status,
    created_at: input.validFrom,
    valid_from: input.validFrom,
    valid_until: input.status === "superseded" ? "2025-01-05T00:00:00.000Z" : null,
    supersedes: input.supersedes ?? null,
    source_id: `source-${input.id}`,
    textRank: input.textRank,
  };
}

function providerFor(candidates: readonly RetrievedMemory[]): MemoryCandidateProvider {
  return {
    async search() {
      return candidates;
    },
  };
}

test("current React ranks above superseded Next.js for a current framework query", async () => {
  const candidates = [
    memory({
      id: "react-1",
      content: "The project uses React.",
      validFrom: "2025-01-01T00:00:00.000Z",
      status: "superseded",
      textRank: 0.9,
    }),
    memory({
      id: "next-1",
      content: "We switched the project to Next.js.",
      validFrom: "2025-01-03T00:00:00.000Z",
      status: "superseded",
      textRank: 1,
      supersedes: "react-1",
    }),
    memory({
      id: "react-2",
      content: "We went back to React.",
      validFrom: "2025-01-05T00:00:00.000Z",
      status: "active",
      textRank: 0.3,
      supersedes: "next-1",
    }),
  ];

  const results = await retrieveRelevantMemories(
    "What framework are we currently using?",
    userId,
    {
      provider: providerFor(candidates),
      now: currentTime,
    },
  );

  assert.equal(results[0]?.memory.id, "react-2");
  assert.ok((results[0]?.score ?? 0) > (results[1]?.score ?? 0));
  assert.match(results[0]?.reason ?? "", /active current memory/);
  assert.match(results[1]?.reason ?? "", /not a current fact/);
});

test("forgotten memories are excluded even when their text rank is highest", async () => {
  const candidates = [
    memory({
      id: "forgotten-next",
      content: "The project uses Next.js.",
      validFrom: "2025-01-04T00:00:00.000Z",
      status: "forgotten",
      textRank: 10,
    }),
    memory({
      id: "react-current",
      content: "The project uses React.",
      validFrom: "2025-01-05T00:00:00.000Z",
      status: "active",
      textRank: 0.1,
    }),
  ];

  const results = await retrieveRelevantMemories(
    "What framework are we currently using?",
    userId,
    { provider: providerFor(candidates), now: currentTime },
  );

  assert.deepEqual(results.map((result) => result.memory.id), ["react-current"]);
});

test("retrieval weights can be overridden", async () => {
  const active = memory({
    id: "react-current",
    content: "The project uses React.",
    validFrom: "2025-01-05T00:00:00.000Z",
    status: "active",
    textRank: 0.2,
  });

  const results = await retrieveRelevantMemories("React framework", userId, {
    provider: providerFor([active]),
    now: currentTime,
    weights: {
      semanticSimilarity: 0,
      recency: 0,
      scopeMatch: 0,
      confidence: 0,
      currentStatus: 1,
    },
  });

  assert.equal(results[0]?.score, 1);
});
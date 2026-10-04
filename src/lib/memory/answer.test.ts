import assert from "node:assert/strict";
import test from "node:test";
import {
  answerMemoryQuery,
  type AnswerEvidence,
  type GeneratedMemoryAnswer,
  type MemoryAnswerGenerator,
} from "@/lib/memory/answer";
import type { RelevantMemory } from "@/lib/memory/retrieval";

const userId = "00000000-0000-4000-8000-000000000001";

function result(input: {
  id: string;
  content: string;
  status: "active" | "superseded" | "forgotten";
  validFrom: string;
  supersedes?: string | null;
  score?: number;
}): RelevantMemory {
  return {
    memory: {
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
      valid_until: input.status === "superseded" ? input.validFrom : null,
      supersedes: input.supersedes ?? null,
      source_id: `source-${input.id}`,
      textRank: input.score ?? 1,
    },
    score: input.score ?? 0.9,
    reason: input.status === "active" ? "active current memory" : "historical result",
  };
}

function retrievalFor(memories: readonly RelevantMemory[]) {
  return async () => [...memories];
}

function generatorFor(
  answer: string,
  evidenceMemoryIds?: string[],
): MemoryAnswerGenerator {
  return async (_query: string, evidence: readonly AnswerEvidence[]) =>
    ({
      answer,
      confidence: 0.95,
      evidenceMemoryIds: evidenceMemoryIds ?? evidence.map((item) => item.memoryId),
    }) satisfies GeneratedMemoryAnswer;
}

test("answers a current fact from active evidence", async () => {
  const current = result({
    id: "react-current",
    content: "The project uses React.",
    status: "active",
    validFrom: "2025-01-05T12:00:00.000Z",
  });

  const answer = await answerMemoryQuery("What framework are we using?", userId, {
    retrieve: retrievalFor([current]),
    generate: generatorFor("The project currently uses React."),
  });

  assert.equal(answer.answer, "The project currently uses React.");
  assert.equal(answer.evidence[0]?.memoryId, "react-current");
  assert.equal(answer.evidence[0]?.status, "active");
  assert.ok(answer.confidence > 0);
});

test("includes superseded memories to explain a changed fact", async () => {
  const history = [
    result({
      id: "react-1",
      content: "The project uses React.",
      status: "superseded",
      validFrom: "2025-01-01T12:00:00.000Z",
    }),
    result({
      id: "next-1",
      content: "We switched the project to Next.js.",
      status: "superseded",
      validFrom: "2025-01-03T12:00:00.000Z",
      supersedes: "react-1",
    }),
    result({
      id: "react-2",
      content: "We went back to React.",
      status: "active",
      validFrom: "2025-01-05T12:00:00.000Z",
      supersedes: "next-1",
    }),
  ];

  const answer = await answerMemoryQuery("What framework are we using?", userId, {
    retrieve: retrievalFor(history),
    generate: generatorFor(
      "The project currently uses React. It previously switched to Next.js, but that decision was later reversed.",
      ["react-1", "next-1", "react-2"],
    ),
  });

  assert.deepEqual(
    answer.evidence.map((item) => item.memoryId),
    ["react-1", "next-1", "react-2"],
  );
  assert.equal(answer.evidence[0]?.status, "superseded");
  assert.equal(answer.evidence[2]?.status, "active");
});

test("reports uncertainty when active memories conflict", async () => {
  const conflicting = [
    result({
      id: "react-active",
      content: "The project uses React.",
      status: "active",
      validFrom: "2025-01-05T12:00:00.000Z",
    }),
    result({
      id: "vue-active",
      content: "The project uses Vue.",
      status: "active",
      validFrom: "2025-01-05T12:01:00.000Z",
    }),
  ];
  let generated = false;

  const answer = await answerMemoryQuery("What framework are we using?", userId, {
    retrieve: retrievalFor(conflicting),
    generate: async () => {
      generated = true;
      return {
        answer: "This should not be reached.",
        confidence: 1,
        evidenceMemoryIds: ["react-active", "vue-active"],
      };
    },
  });

  assert.equal(generated, false);
  assert.match(answer.answer, /Memory is uncertain/);
  assert.equal(answer.confidence, 0.25);
  assert.equal(answer.evidence.length, 2);
});

test("returns unavailable without calling Gemma when no memory matches", async () => {
  let generated = false;
  const answer = await answerMemoryQuery("What is our office address?", userId, {
    retrieve: retrievalFor([]),
    generate: async () => {
      generated = true;
      return { answer: "invented", confidence: 1, evidenceMemoryIds: [] };
    },
  });

  assert.equal(generated, false);
  assert.match(answer.answer, /unavailable/);
  assert.equal(answer.confidence, 0);
  assert.deepEqual(answer.evidence, []);
});

test("rejects model citations that were not supplied as evidence", async () => {
  const current = result({
    id: "react-current",
    content: "The project uses React.",
    status: "active",
    validFrom: "2025-01-05T12:00:00.000Z",
  });

  await assert.rejects(
    answerMemoryQuery("What framework are we using?", userId, {
      retrieve: retrievalFor([current]),
      generate: generatorFor("The project uses Vue.", ["invented-memory-id"]),
    }),
    /could not generate a grounded memory answer/,
  );
});
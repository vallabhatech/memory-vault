import assert from "node:assert/strict";
import test from "node:test";
import { resolveMemoryConflict } from "@/lib/memory/conflict-resolution";
import type {
  CandidateMemory,
  MemoryClassifier,
  MemoryRelation,
  NewMemory,
} from "@/lib/memory/types";

const userId = "00000000-0000-4000-8000-000000000001";

function memory(content: string, validFrom: string, entity = "project.stack"): NewMemory {
  return {
    user_id: userId,
    content,
    type: "technical_decision",
    entity,
    scope: "project",
    valid_from: validFrom,
  };
}

function candidate(
  id: string,
  content: string,
  validFrom: string,
  entity = "project.stack",
): CandidateMemory {
  return {
    ...memory(content, validFrom, entity),
    id,
    status: "active",
  };
}

function classifyAs(relation: MemoryRelation): MemoryClassifier {
  return async (_newMemory, candidates) =>
    candidates.map((item) => ({
      memoryId: item.id,
      relation,
      rationale: `${relation} for ${item.content}`,
    }));
}

test("React to Next.js retains React as superseded history", async () => {
  const previous = candidate("react-1", "The project uses React.", "2025-01-01T00:00:00Z");
  const result = await resolveMemoryConflict(
    memory("The project switched to Next.js.", "2025-01-03T00:00:00Z"),
    [previous],
    classifyAs("contradiction"),
  );

  assert.equal(result.action, "supersede");
  assert.deepEqual(result.conflictingMemoryIds, ["react-1"]);
  assert.deepEqual(result.supersededMemoryIds, ["react-1"]);
  assert.match(result.explanation, /retained as superseded history/);
});

test("MongoDB to PostgreSQL supersedes the earlier database choice", async () => {
  const previous = candidate(
    "mongo-1",
    "The project uses MongoDB.",
    "2025-01-01T00:00:00Z",
    "project.database",
  );
  const result = await resolveMemoryConflict(
    memory(
      "The project migrated to PostgreSQL.",
      "2025-01-04T00:00:00Z",
      "project.database",
    ),
    [previous],
    classifyAs("supersedes"),
  );

  assert.equal(result.action, "supersede");
  assert.deepEqual(result.supersededMemoryIds, ["mongo-1"]);
});

test("Friday deadline to Monday deadline supersedes the old date", async () => {
  const previous = candidate(
    "friday-deadline",
    "The launch deadline is Friday.",
    "2025-01-01T00:00:00Z",
    "project.launch_deadline",
  );
  const result = await resolveMemoryConflict(
    memory(
      "The launch deadline moved to Monday.",
      "2025-01-02T00:00:00Z",
      "project.launch_deadline",
    ),
    [previous],
    classifyAs("contradiction"),
  );

  assert.equal(result.action, "supersede");
  assert.deepEqual(result.conflictingMemoryIds, ["friday-deadline"]);
});

test("React to Next.js to React forms a supersession chain", async () => {
  const react = candidate("react-1", "The project uses React.", "2025-01-01T00:00:00Z");
  const next = candidate("next-1", "The project uses Next.js.", "2025-01-03T00:00:00Z");

  const toNext = await resolveMemoryConflict(
    memory("The project switched to Next.js.", "2025-01-03T00:00:00Z"),
    [react],
    classifyAs("contradiction"),
  );
  const backToReact = await resolveMemoryConflict(
    memory("The project went back to React.", "2025-01-05T00:00:00Z"),
    [next],
    classifyAs("supersedes"),
  );

  assert.deepEqual(toNext.supersededMemoryIds, ["react-1"]);
  assert.deepEqual(backToReact.supersededMemoryIds, ["next-1"]);
  assert.equal(backToReact.action, "supersede");
});

test("non-conflicting memories are added without supersession", async () => {
  const previous = candidate(
    "react-1",
    "The project uses React.",
    "2025-01-01T00:00:00Z",
  );
  const result = await resolveMemoryConflict(
    memory("The team deploys on Fridays.", "2025-01-02T00:00:00Z", "team.release_day"),
    [previous],
    classifyAs("unrelated"),
  );

  assert.equal(result.action, "add");
  assert.deepEqual(result.conflictingMemoryIds, []);
  assert.deepEqual(result.supersededMemoryIds, []);
});

test("compatible new information is added", async () => {
  const previous = candidate(
    "react-1",
    "The project uses React.",
    "2025-01-01T00:00:00Z",
  );
  const result = await resolveMemoryConflict(
    memory("The project uses React with TypeScript.", "2025-01-02T00:00:00Z"),
    [previous],
    classifyAs("adds_information"),
  );

  assert.equal(result.action, "add");
  assert.deepEqual(result.supersededMemoryIds, []);
});

test("duplicate information does not supersede the existing memory", async () => {
  const previous = candidate(
    "react-1",
    "The project uses React.",
    "2025-01-01T00:00:00Z",
  );
  const result = await resolveMemoryConflict(
    memory("The project uses React.", "2025-01-02T00:00:00Z"),
    [previous],
    classifyAs("duplicate"),
  );

  assert.equal(result.action, "duplicate");
  assert.deepEqual(result.conflictingMemoryIds, []);
  assert.deepEqual(result.supersededMemoryIds, ["react-1"]);
});

test("classifier results cannot refer to untrusted memory IDs", async () => {
  const previous = candidate("react-1", "The project uses React.", "2025-01-01T00:00:00Z");
  const invalidClassifier: MemoryClassifier = async () => [
    {
      memoryId: "another-users-memory",
      relation: "contradiction",
      rationale: "Invalid candidate.",
    },
  ];

  await assert.rejects(
    resolveMemoryConflict(
      memory("The project switched to Next.js.", "2025-01-03T00:00:00Z"),
      [previous],
      invalidClassifier,
    ),
    /invalid candidate ID/,
  );
});
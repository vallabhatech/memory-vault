import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { resolveMemoryConflict } from "@/lib/memory/conflict-resolution";
import {
  rankRelevantMemories,
  type RetrievedMemory,
} from "@/lib/memory/retrieval";
import type {
  CandidateMemory,
  MemoryRelation,
  MemoryType,
} from "@/lib/memory/types";
import {
  evaluationScenarios,
  type EvaluationScenario,
  type ScenarioTransition,
} from "./scenarios";

const demoUserId = "00000000-0000-4000-8000-000000000001";
const topK = 3;

type StoredMemory = RetrievedMemory & { value: string };

type ScenarioResult = {
  id: string;
  category: string;
  expectedCurrent: string;
  baseline: {
    predictedCurrent: string | null;
    topMemoryId: string | null;
    relevanceAtK: number;
  };
  memoryVault: {
    predictedCurrent: string | null;
    topMemoryId: string | null;
    relevanceAtK: number;
  };
  transitions: { correct: number; total: number };
};

function actionFor(transition: ScenarioTransition): "add" | "duplicate" | "supersede" {
  if (transition === "initial") return "add";
  if (transition === "duplicate") return "duplicate";
  return "supersede";
}

function relationFor(transition: ScenarioTransition): MemoryRelation {
  if (transition === "duplicate") return "duplicate";
  if (transition === "reversal") return "supersedes";
  if (transition === "contradiction") return "contradiction";
  return "unrelated";
}

function toCandidate(memory: StoredMemory): CandidateMemory {
  return {
    id: memory.id,
    user_id: memory.user_id,
    content: memory.content,
    type: memory.type as MemoryType,
    entity: memory.entity,
    scope: memory.scope,
    valid_from: memory.valid_from,
    status: memory.status,
  };
}

function toStoredMemory(
  scenario: EvaluationScenario,
  event: EvaluationScenario["conversationHistory"][number],
  index: number,
  supersedes: string | null,
): StoredMemory {
  return {
    id: `${scenario.id}-memory-${index + 1}`,
    user_id: demoUserId,
    content: event.statement,
    type: "fact",
    entity: scenario.entity,
    scope: scenario.scope,
    confidence: 1,
    status: "active",
    created_at: event.date,
    valid_from: event.date,
    valid_until: null,
    supersedes,
    source_id: `${scenario.id}-source-${index + 1}`,
    textRank: rawTextRank(scenario.query, scenario.entity, event.statement),
    value: event.value,
  };
}

async function replayMemoryVault(scenario: EvaluationScenario) {
  const memories: StoredMemory[] = [];
  const seenValues = new Set<string>();
  let correctTransitions = 0;
  let evaluatedTransitions = 0;

  for (const [index, event] of scenario.conversationHistory.entries()) {
    const activeMemories = memories.filter((memory) => memory.status === "active");
    const candidates = activeMemories.map(toCandidate);
    const relation = relationFor(event.expectedTransition);
    const resolution = await resolveMemoryConflict(
      {
        user_id: demoUserId,
        content: event.statement,
        type: "fact",
        entity: scenario.entity,
        scope: scenario.scope,
        valid_from: event.date,
      },
      candidates,
      async (_newMemory, activeCandidates) =>
        activeCandidates.map((candidate) => ({
          memoryId: candidate.id,
          relation,
          rationale: `Structured synthetic transition: ${event.expectedTransition}.`,
        })),
    );

    if (index > 0) {
      evaluatedTransitions += 1;
      if (resolution.action === actionFor(event.expectedTransition)) {
        correctTransitions += 1;
      }
    }

    if (resolution.action === "duplicate") {
      seenValues.add(normalize(event.value));
      continue;
    }

    if (resolution.action === "supersede") {
      for (const memory of memories) {
        if (resolution.supersededMemoryIds.includes(memory.id)) {
          memory.status = "superseded";
          memory.valid_until = event.date;
        }
      }
    }

    const supersedes =
      resolution.action === "supersede"
        ? resolution.supersededMemoryIds[0] ?? null
        : null;
    memories.push(toStoredMemory(scenario, event, index, supersedes));
    seenValues.add(normalize(event.value));
  }

  return { memories, correctTransitions, evaluatedTransitions };
}

async function evaluateScenario(scenario: EvaluationScenario): Promise<ScenarioResult> {
  const baselineMemories = scenario.conversationHistory.map((event, index) => ({
    id: `${scenario.id}-raw-${index + 1}`,
    value: event.value,
    textRank: rawTextRank(scenario.query, scenario.entity, event.statement),
    validFrom: event.date,
  }));
  const baselineRanked = [...baselineMemories].sort(
    (left, right) =>
      right.textRank - left.textRank ||
      Date.parse(right.validFrom) - Date.parse(left.validFrom),
  );
  const baselineTopK = baselineRanked.slice(0, topK);

  const replay = await replayMemoryVault(scenario);
  const vaultRanked = rankRelevantMemories(
    scenario.query,
    replay.memories,
    {
      now: new Date(scenario.conversationHistory.at(-1)!.date),
      scope: scenario.scope,
    },
  );
  const vaultTopK = vaultRanked
    .slice(0, topK)
    .map(({ memory }) => replay.memories.find((candidate) => candidate.id === memory.id)!)
    .filter((memory): memory is StoredMemory => Boolean(memory));
  const currentMemory = vaultRanked.find(({ memory }) => memory.status === "active");
  const baselineTop = baselineRanked[0];

  return {
    id: scenario.id,
    category: scenario.category,
    expectedCurrent: scenario.expectedCurrent,
    baseline: {
      predictedCurrent: baselineTop?.value ?? null,
      topMemoryId: baselineTop?.id ?? null,
      relevanceAtK: precisionAtK(
        baselineTopK.map((memory) => memory.value),
        scenario.expectedCurrent,
      ),
    },
    memoryVault: {
      predictedCurrent: currentMemory
        ? replay.memories.find((memory) => memory.id === currentMemory.memory.id)?.value ?? null
        : null,
      topMemoryId: currentMemory?.memory.id ?? null,
      relevanceAtK: precisionAtK(
        vaultTopK.map((memory) => memory.value),
        scenario.expectedCurrent,
      ),
    },
    transitions: {
      correct: replay.correctTransitions,
      total: replay.evaluatedTransitions,
    },
  };
}

function rawTextRank(query: string, entity: string, statement: string): number {
  const queryTokens = tokenize(query);
  const documentTokens = tokenize(`${entity.replaceAll(".", " ")} ${statement}`);
  let score = 0;
  for (const token of queryTokens) {
    if (documentTokens.has(token)) score += 1;
  }
  return score;
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length > 1),
  );
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("en-US").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function precisionAtK(values: readonly string[], expected: string): number {
  if (values.length === 0) return 0;
  return values.filter((value) => normalize(value) === normalize(expected)).length / values.length;
}

function assertDatasetShape(): void {
  const categories = new Set(evaluationScenarios.map((scenario) => scenario.category));
  if (evaluationScenarios.length !== 40 || categories.size !== 10) {
    throw new Error("Expected exactly 40 scenarios across the 10 configured categories.");
  }
  if (evaluationScenarios.some((scenario) => scenario.conversationHistory.length < 2)) {
    throw new Error("Each evaluation scenario must contain multiple dated statements.");
  }
}

function percentage(value: number | null): string {
  return value === null ? "N/A" : `${(value * 100).toFixed(1)}%`;
}

function summarize(runs: readonly ScenarioResult[], track: "baseline" | "memoryVault") {
  const correct = runs.filter(
    (run) => normalize(run[track].predictedCurrent ?? "") === normalize(run.expectedCurrent),
  ).length;
  const stale = runs.length - correct;
  const relevance = runs.reduce((total, run) => total + run[track].relevanceAtK, 0) / runs.length;
  const transitions = runs.reduce((total, run) => total + run.transitions.total, 0);
  const correctTransitions = runs.reduce((total, run) => total + run.transitions.correct, 0);

  return {
    currentFactAccuracy: correct / runs.length,
    correctCurrentFacts: correct,
    totalScenarios: runs.length,
    conflictResolutionAccuracy:
      track === "baseline" || transitions === 0 ? null : correctTransitions / transitions,
    correctTransitions: track === "baseline" ? null : correctTransitions,
    totalTransitions: track === "baseline" ? null : transitions,
    retrievalRelevanceAt3: relevance,
    staleMemoryErrorRate: stale / runs.length,
    staleAnswers: stale,
  };
}

function renderMarkdown(report: {
  generatedAt: string;
  scenarioCount: number;
  categories: string[];
  answerGeneration: { note: string };
  method: { baseline: string; memoryVault: string; conflictLabels: string; relevanceAtK: string };
  metrics: {
    baseline: ReturnType<typeof summarize>;
    memoryVault: ReturnType<typeof summarize>;
  };
  scenarios: ScenarioResult[];
}): string {
  const baseline = report.metrics.baseline;
  const memoryVault = report.metrics.memoryVault;
  const lines = [
    "# Memory Vault Evaluation Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Synthetic scenarios: ${report.scenarioCount}`,
    `Categories: ${report.categories.join(", ")}`,
    "",
    `> ${report.answerGeneration.note}`,
    "",
    "## Metrics",
    "",
    "| Metric | Baseline | Memory Vault |",
    "| --- | ---: | ---: |",
    `| Current-fact accuracy (top retrieved value) | ${baseline.correctCurrentFacts}/${baseline.totalScenarios} (${percentage(baseline.currentFactAccuracy)}) | ${memoryVault.correctCurrentFacts}/${memoryVault.totalScenarios} (${percentage(memoryVault.currentFactAccuracy)}) |`,
    `| Conflict-resolution accuracy | N/A | ${memoryVault.correctTransitions}/${memoryVault.totalTransitions} (${percentage(memoryVault.conflictResolutionAccuracy)}) |`,
    `| Retrieval relevance, precision@3 | ${percentage(baseline.retrievalRelevanceAt3)} | ${percentage(memoryVault.retrievalRelevanceAt3)} |`,
    `| Stale-memory error rate | ${baseline.staleAnswers}/${baseline.totalScenarios} (${percentage(baseline.staleMemoryErrorRate)}) | ${memoryVault.staleAnswers}/${memoryVault.totalScenarios} (${percentage(memoryVault.staleMemoryErrorRate)}) |`,
    "",
    "## Method",
    "",
    `- Baseline: ${report.method.baseline}`,
    `- Memory Vault: ${report.method.memoryVault}`,
    `- Conflict labels: ${report.method.conflictLabels}`,
    `- Relevance: ${report.method.relevanceAtK}`,
    "- LLM answer quality is not included in these metrics.",
    "",
    "## Scenario results",
    "",
    "| ID | Category | Expected current | Baseline | Memory Vault | Base P@3 | Vault P@3 | Transitions |",
    "| --- | --- | --- | --- | --- | ---: | ---: | ---: |",
    ...report.scenarios.map(
      (run) =>
        `| ${run.id} | ${run.category} | ${run.expectedCurrent} | ${run.baseline.predictedCurrent ?? "(none)"} | ${run.memoryVault.predictedCurrent ?? "(none)"} | ${percentage(run.baseline.relevanceAtK)} | ${percentage(run.memoryVault.relevanceAtK)} | ${run.transitions.correct}/${run.transitions.total} |`,
    ),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  assertDatasetShape();
  const scenarioResults: ScenarioResult[] = [];
  for (const scenario of evaluationScenarios) {
    scenarioResults.push(await evaluateScenario(scenario));
  }

  const report = {
    dataset: "Memory Vault synthetic temporal evaluation v1",
    synthetic: true,
    generatedAt: new Date().toISOString(),
    scenarioCount: evaluationScenarios.length,
    categories: [...new Set(evaluationScenarios.map((scenario) => scenario.category))],
    evaluationMode: "offline deterministic temporal and retrieval evaluation",
    answerGeneration: {
      modelBacked: false,
      status: "not_evaluated",
      note:
        "Actual deterministic runner results on synthetic structured scenarios. Gemma answer generation was not invoked; current-fact and stale-memory figures are top-retrieved-value proxies, not LLM quality or production performance results.",
    },
    method: {
      baseline:
        "Rank dated statements by raw query/entity token overlap, break ties by recency, and select the top value without temporal status resolution.",
      memoryVault:
        "Replay transitions through the production resolveMemoryConflict and rankRelevantMemories functions, preserve superseded history, then select the highest-ranked active value.",
      conflictLabels:
        "Synthetic value labels identify duplicates, changed values, and reversals. The injected classifier uses these structured labels, so the metric evaluates state transitions, not natural-language classification.",
      relevanceAtK:
        "Precision@3 per scenario: fraction of retrieved values matching expectedCurrent, averaged over all 40 scenarios.",
    },
    metrics: {
      baseline: summarize(scenarioResults, "baseline"),
      memoryVault: summarize(scenarioResults, "memoryVault"),
    },
    scenarios: scenarioResults,
  };

  const outputDirectory = resolve(process.cwd(), "eval", "reports");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    resolve(outputDirectory, "memory-evaluation-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    resolve(outputDirectory, "memory-evaluation-report.md"),
    renderMarkdown(report),
    "utf8",
  );

  console.log(`Scenarios evaluated: ${report.scenarioCount}`);
  console.log(`Baseline current-fact accuracy: ${percentage(report.metrics.baseline.currentFactAccuracy)}`);
  console.log(`Memory Vault current-fact accuracy: ${percentage(report.metrics.memoryVault.currentFactAccuracy)}`);
  console.log(`Baseline stale-memory error rate: ${percentage(report.metrics.baseline.staleMemoryErrorRate)}`);
  console.log(`Memory Vault stale-memory error rate: ${percentage(report.metrics.memoryVault.staleMemoryErrorRate)}`);
  console.log(
    `Memory Vault conflict-resolution accuracy: ${percentage(report.metrics.memoryVault.conflictResolutionAccuracy)} ` +
      `(${report.metrics.memoryVault.correctTransitions}/${report.metrics.memoryVault.totalTransitions})`,
  );
  console.log("Gemma answer evaluation: not run; report labels the model-backed metric unavailable.");
  console.log("Reports: eval/reports/memory-evaluation-report.json and .md");
}

void main();
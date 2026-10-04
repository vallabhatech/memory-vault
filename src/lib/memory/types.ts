export const memoryTypes = [
  "fact",
  "preference",
  "decision",
  "event",
  "technical_decision",
] as const;

export type MemoryType = (typeof memoryTypes)[number];
export type MemoryStatus = "active" | "superseded" | "forgotten";

export type MemoryAction = "add" | "duplicate" | "supersede";

export type MemoryRelation =
  | "adds_information"
  | "duplicate"
  | "contradiction"
  | "supersedes"
  | "unrelated";

export type NewMemory = {
  user_id: string;
  content: string;
  type: MemoryType;
  entity: string;
  scope: string;
  valid_from: string;
};

export type CandidateMemory = NewMemory & {
  id: string;
  status: MemoryStatus;
};

export type MemoryJudgment = {
  memoryId: string;
  relation: MemoryRelation;
  rationale: string;
};

export type MemoryConflictResolution = {
  action: MemoryAction;
  conflictingMemoryIds: string[];
  supersededMemoryIds: string[];
  explanation: string;
};

export type MemoryClassifier = (
  newMemory: NewMemory,
  candidates: readonly CandidateMemory[],
) => Promise<readonly MemoryJudgment[]>;
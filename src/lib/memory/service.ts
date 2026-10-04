import "server-only";
import { resolveMemoryConflict } from "@/lib/memory/conflict-resolution";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CandidateMemory,
  MemoryConflictResolution,
  MemoryType,
  NewMemory,
} from "@/lib/memory/types";

export const demoUserId = "00000000-0000-4000-8000-000000000001";

const candidateLimit = 200;

export type AddMemoryInput = NewMemory & {
  confidence: number;
  source: {
    source_type: string;
    source_location: string;
    source_date: string;
    original_content: string;
  };
};

export type AddMemoryResult = MemoryConflictResolution & {
  memoryId: string;
  inserted: boolean;
};

export class MemoryDatabaseError extends Error {
  readonly code: string | undefined;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "MemoryDatabaseError";
    this.code = code;
  }
}

export async function addMemory(input: AddMemoryInput): Promise<AddMemoryResult> {
  const supabase = createSupabaseAdminClient();
  const { data: candidateRows, error: candidateError } = await supabase
    .from("memories")
    .select("id,user_id,content,type,entity,scope,valid_from,status")
    .eq("user_id", input.user_id)
    .eq("entity", input.entity)
    .eq("scope", input.scope)
    .eq("status", "active")
    .order("valid_from", { ascending: false })
    .limit(candidateLimit + 1);

  if (candidateError) {
    throw new MemoryDatabaseError("Could not load active memories.", candidateError.code);
  }

  if ((candidateRows ?? []).length > candidateLimit) {
    throw new MemoryDatabaseError(
      "Too many active memories share this entity and scope.",
      "54000",
    );
  }

  const candidates = (candidateRows ?? []) as CandidateMemory[];
  const resolution = await resolveMemoryConflict(input, candidates);
  const { data, error } = await supabase.rpc("apply_memory_resolution", {
    p_user_id: input.user_id,
    p_candidate_memory_ids: candidates.map((candidate) => candidate.id),
    p_memory: {
      content: input.content,
      type: input.type satisfies MemoryType,
      entity: input.entity,
      scope: input.scope,
      confidence: input.confidence,
      valid_from: input.valid_from,
    },
    p_source: input.source,
    p_action: resolution.action,
    p_superseded_memory_ids: resolution.supersededMemoryIds,
  });

  if (error) {
    throw new MemoryDatabaseError("Could not apply the memory resolution.", error.code);
  }

  if (!isRecord(data) || typeof data.memory_id !== "string") {
    throw new MemoryDatabaseError("The database returned an invalid resolution.");
  }

  return {
    ...resolution,
    memoryId: data.memory_id,
    inserted: data.inserted === true,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
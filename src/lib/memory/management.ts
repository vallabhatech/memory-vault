import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoUserId, MemoryDatabaseError } from "@/lib/memory/service";
import type {
  MemoryRecord,
  MemorySource,
  ProvenanceSource,
  SourceMemory,
  SupersedingMemory,
} from "@/lib/memory/record";

const pageSize = 500;

type MemoryRow = Omit<MemoryRecord, "source" | "superseded_by">;

type SourceRow = MemorySource;
type SourceMemoryRow = SourceMemory & { source_id: string };

export type MemoryManagementAction = "confirm" | "edit" | "forget";

export async function getDemoMemories(): Promise<MemoryRecord[]> {
  const supabase = createSupabaseAdminClient();
  const rows: MemoryRow[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("memories")
      .select(
        "id,user_id,content,type,entity,scope,confidence,status,created_at,valid_from,valid_until,supersedes,source_id",
      )
      .eq("user_id", demoUserId)
      .order("valid_from", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new MemoryDatabaseError("Could not load memories.", error.code);
    }

    const page = (data ?? []) as MemoryRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  if (rows.length === 0) return [];

  const sourceIds = [...new Set(rows.map((row) => row.source_id))];
  const { data: sourceRows, error: sourceError } = await supabase
    .from("sources")
    .select("id,source_type,source_location,source_date,original_content")
    .eq("user_id", demoUserId)
    .in("id", sourceIds);

  if (sourceError) {
    throw new MemoryDatabaseError("Could not load memory sources.", sourceError.code);
  }

  const sources = new Map(
    ((sourceRows ?? []) as SourceRow[]).map((source) => [source.id, source]),
  );
  const supersedingMemories = new Map<string, SupersedingMemory[]>();

  for (const row of rows) {
    if (!row.supersedes) continue;
    const newer = supersedingMemories.get(row.supersedes) ?? [];
    newer.push({ id: row.id, content: row.content });
    supersedingMemories.set(row.supersedes, newer);
  }

  return rows.map((row) => ({
    ...row,
    confidence: Number(row.confidence),
    source: sources.get(row.source_id) ?? null,
    superseded_by: supersedingMemories.get(row.id) ?? [],
  }));
}

export async function getDemoSources(): Promise<ProvenanceSource[]> {
  const supabase = createSupabaseAdminClient();
  const sources: SourceRow[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("sources")
      .select("id,source_type,source_location,source_date,original_content")
      .eq("user_id", demoUserId)
      .order("source_date", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new MemoryDatabaseError("Could not load sources.", error.code);
    }

    const page = (data ?? []) as SourceRow[];
    sources.push(...page);
    if (page.length < pageSize) break;
  }

  if (sources.length === 0) return [];

  const sourceIds = sources.map((source) => source.id);
  const memories: SourceMemoryRow[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("memories")
      .select(
        "id,source_id,content,type,entity,scope,status,created_at,valid_from,valid_until,supersedes",
      )
      .eq("user_id", demoUserId)
      .in("source_id", sourceIds)
      .order("valid_from", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new MemoryDatabaseError("Could not load source memories.", error.code);
    }

    const page = (data ?? []) as SourceMemoryRow[];
    memories.push(...page);
    if (page.length < pageSize) break;
  }

  const memoriesBySource = new Map<string, SourceMemory[]>();
  for (const { source_id: sourceId, ...memory } of memories) {
    const extracted = memoriesBySource.get(sourceId) ?? [];
    extracted.push(memory);
    memoriesBySource.set(sourceId, extracted);
  }

  return sources.map((source) => ({
    ...source,
    memories: memoriesBySource.get(source.id) ?? [],
  }));
}

export async function manageDemoMemory(input: {
  action: MemoryManagementAction;
  memoryId: string;
  content?: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("manage_memory", {
    p_user_id: demoUserId,
    p_memory_id: input.memoryId,
    p_action: input.action,
    p_content: input.content ?? null,
  });

  if (error) {
    throw new MemoryDatabaseError("Could not update this memory.", error.code);
  }

  return data;
}
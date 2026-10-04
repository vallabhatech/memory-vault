import type { MemoryStatus, MemoryType } from "@/lib/memory/types";

export type MemorySource = {
  id: string;
  source_type: string;
  source_location: string;
  source_date: string;
  original_content: string;
};

export type SourceMemory = {
  id: string;
  content: string;
  type: MemoryType;
  entity: string;
  scope: string;
  status: MemoryStatus;
  created_at: string;
  valid_from: string;
  valid_until: string | null;
  supersedes: string | null;
};

export type ProvenanceSource = MemorySource & {
  memories: SourceMemory[];
};

export type SupersedingMemory = {
  id: string;
  content: string;
};

export type MemoryRecord = {
  id: string;
  user_id: string;
  content: string;
  type: MemoryType;
  entity: string;
  scope: string;
  confidence: number;
  status: MemoryStatus;
  created_at: string;
  valid_from: string;
  valid_until: string | null;
  supersedes: string | null;
  source_id: string;
  source: MemorySource | null;
  superseded_by: SupersedingMemory[];
};
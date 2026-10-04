import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  MemoryCandidateProvider,
  RetrievedMemory,
} from "@/lib/memory/retrieval";

type RetrievalCandidateRow = Omit<RetrievedMemory, "textRank"> & {
  text_rank: number | string;
};

export const postgresTextSearchProvider: MemoryCandidateProvider = {
  async search(query, userId, limit) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("retrieve_memory_candidates", {
      p_user_id: userId,
      p_query: query,
      p_limit: limit,
    });

    if (error) {
      throw new Error("PostgreSQL memory search failed.");
    }

    return ((data ?? []) as unknown as RetrievalCandidateRow[]).map((row) => {
      const { text_rank: textRank, ...memory } = row;
      return {
        ...memory,
        confidence: Number(memory.confidence),
        textRank: Number(textRank),
      } as RetrievedMemory;
    });
  },
};
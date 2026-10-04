import { NextResponse } from "next/server";
import { getDemoSources } from "@/lib/memory/management";
import { MemoryDatabaseError } from "@/lib/memory/service";
import { SupabaseConfigurationError } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const sources = await getDemoSources();
    return NextResponse.json({ sources });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return NextResponse.json(
        { error: "Supabase is not configured on the server." },
        { status: 503 },
      );
    }

    const status = error instanceof MemoryDatabaseError ? 503 : 500;
    return NextResponse.json({ error: "Could not load sources." }, { status });
  }
}
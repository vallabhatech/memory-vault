import { NextResponse } from "next/server";
import { answerMemoryQuery } from "@/lib/memory/answer";
import { GemmaConfigurationError } from "@/lib/memory/gemma-classifier";
import { demoUserId } from "@/lib/memory/service";
import { SupabaseConfigurationError } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("query" in payload) ||
    typeof payload.query !== "string" ||
    payload.query.trim().length === 0 ||
    payload.query.length > 500
  ) {
    return NextResponse.json(
      { error: "Provide a query between 1 and 500 characters." },
      { status: 400 },
    );
  }

  try {
    const answer = await answerMemoryQuery(payload.query, demoUserId);
    return NextResponse.json(answer);
  } catch (error) {
    if (error instanceof SupabaseConfigurationError || error instanceof GemmaConfigurationError) {
      return NextResponse.json(
        { error: "The answer service is not configured on the server." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Could not generate a grounded memory answer." },
      { status: 502 },
    );
  }
}
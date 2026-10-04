import { NextResponse } from "next/server";
import { retrieveRelevantMemories } from "@/lib/memory/retrieval";
import { demoUserId } from "@/lib/memory/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query || query.length > 500) {
    return NextResponse.json(
      { error: "Provide a query between 1 and 500 characters." },
      { status: 400 },
    );
  }

  try {
    const results = await retrieveRelevantMemories(query, demoUserId);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Memory retrieval is unavailable." },
      { status: 503 },
    );
  }
}
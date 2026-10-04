import { NextResponse } from "next/server";
import {
  manageDemoMemory,
  type MemoryManagementAction,
} from "@/lib/memory/management";
import { MemoryDatabaseError } from "@/lib/memory/service";
import { SupabaseConfigurationError } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const memoryIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isRecord(payload) || !isMemoryManagementAction(payload.action)) {
    return NextResponse.json({ error: "Invalid memory action." }, { status: 400 });
  }

  if (typeof payload.memoryId !== "string" || !memoryIdPattern.test(payload.memoryId)) {
    return NextResponse.json({ error: "Invalid memory ID." }, { status: 400 });
  }

  const editedContent =
    typeof payload.content === "string" ? payload.content.trim() : null;
  if (
    payload.action === "edit" &&
    (!editedContent || editedContent.length > 5_000)
  ) {
    return NextResponse.json(
      { error: "Edited content must be between 1 and 5,000 characters." },
      { status: 400 },
    );
  }

  try {
    const result = await manageDemoMemory({
      action: payload.action,
      memoryId: payload.memoryId,
      content: payload.action === "edit" ? editedContent ?? undefined : undefined,
    });
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return NextResponse.json(
        { error: "Supabase is not configured on the server." },
        { status: 503 },
      );
    }

    if (error instanceof MemoryDatabaseError) {
      const status = error.code === "22023" ? 409 : 503;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ error: "Could not update this memory." }, { status: 500 });
  }
}

function isMemoryManagementAction(value: unknown): value is MemoryManagementAction {
  return value === "confirm" || value === "edit" || value === "forget";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
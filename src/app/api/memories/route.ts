import { NextResponse } from "next/server";
import { GemmaConfigurationError, GemmaInferenceError } from "@/lib/memory/gemma-classifier";
import { demoUserId, addMemory, MemoryDatabaseError } from "@/lib/memory/service";
import { memoryTypes, type MemoryType } from "@/lib/memory/types";
import { SupabaseConfigurationError } from "@/lib/supabase/admin";
import { getDemoMemories } from "@/lib/memory/management";

export const runtime = "nodejs";

const maxContentLength = 5_000;

export async function GET() {
  try {
    const memories = await getDemoMemories();
    return NextResponse.json({ memories });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return NextResponse.json(
        { error: "Supabase is not configured on the server." },
        { status: 503 },
      );
    }

    const status = error instanceof MemoryDatabaseError ? 503 : 500;
    return NextResponse.json({ error: "Could not load memories." }, { status });
  }
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 20_000) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const input = parseInput(payload);
  if (!input) {
    return NextResponse.json({ error: "Invalid memory payload." }, { status: 400 });
  }

  try {
    const result = await addMemory({
      ...input,
      user_id: demoUserId,
    });

    return NextResponse.json(result, { status: result.inserted ? 201 : 200 });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return NextResponse.json(
        { error: "Supabase is not configured on the server." },
        { status: 503 },
      );
    }

    if (error instanceof GemmaConfigurationError) {
      return NextResponse.json(
        { error: "Gemma inference is not configured on the server." },
        { status: 503 },
      );
    }

    if (error instanceof GemmaInferenceError) {
      return NextResponse.json(
        { error: "Gemma could not resolve the memory candidates." },
        { status: 502 },
      );
    }

    if (error instanceof MemoryDatabaseError) {
      const status = ["22023", "40001", "54000"].includes(error.code ?? "")
        ? 409
        : 503;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ error: "Could not add this memory." }, { status: 500 });
  }
}

type ParsedInput = Omit<
  Parameters<typeof addMemory>[0],
  "user_id"
>;

function parseInput(value: unknown): ParsedInput | null {
  if (!isRecord(value)) return null;

  const content = boundedString(value.content, maxContentLength);
  const entity = boundedString(value.entity, 250);
  const type = value.type;
  const scope = boundedString(value.scope ?? "user", 250);
  const confidence = value.confidence ?? 1;
  const validFrom =
    value.valid_from === undefined
      ? new Date().toISOString()
      : parseDate(value.valid_from);
  if (
    !content ||
    !entity ||
    !scope ||
    typeof type !== "string" ||
    !memoryTypes.includes(type as MemoryType) ||
    typeof confidence !== "number" ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1 ||
    !validFrom
  ) {
    return null;
  }

  const source = isRecord(value.source) ? value.source : {};
  const sourceType = boundedString(source.source_type ?? "conversation", 80);
  const sourceLocation = boundedString(source.source_location ?? "chat/manual", 1_000);
  const sourceDate =
    source.source_date === undefined
      ? validFrom
      : parseDate(source.source_date);
  const originalContent = boundedString(
    source.original_content ?? content,
    maxContentLength,
  );
  if (!sourceType || !sourceLocation || !originalContent || !sourceDate) return null;

  return {
    content,
    type: type as MemoryType,
    entity,
    scope,
    confidence,
    valid_from: validFrom,
    source: {
      source_type: sourceType,
      source_location: sourceLocation,
      source_date: sourceDate,
      original_content: originalContent,
    },
  };
}

function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maxLength
    ? normalized
    : null;
}

function parseDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
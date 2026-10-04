"use client";

import { useEffect, useState } from "react";
import type { MemoryRecord } from "@/lib/memory/record";
import type { MemoryType } from "@/lib/memory/types";

type MemoryFilter =
  | "all"
  | "active"
  | "superseded"
  | "forgotten"
  | "decisions"
  | "preferences"
  | "facts";

const filters: { id: MemoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "superseded", label: "Superseded" },
  { id: "forgotten", label: "Forgotten" },
  { id: "decisions", label: "Decisions" },
  { id: "preferences", label: "Preferences" },
  { id: "facts", label: "Facts" },
];

export function MemoryWorkspace() {
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [filter, setFilter] = useState<MemoryFilter>("all");
  const [loading, setLoading] = useState(true);
  const [busyMemoryId, setBusyMemoryId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function loadMemories() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/memories", { cache: "no-store" });
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(readError(payload));
        if (!isMemoryList(payload)) throw new Error("Memory service returned invalid data.");
        if (isCurrent) setMemories(payload.memories);
      } catch (loadError) {
        if (isCurrent) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load memories.",
          );
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    void loadMemories();
    return () => {
      isCurrent = false;
    };
  }, []);

  const visibleMemories = memories.filter((memory) => matchesFilter(memory, filter));

  async function performAction(input: {
    action: "confirm" | "edit" | "forget";
    memoryId: string;
    content?: string;
  }): Promise<boolean> {
    setBusyMemoryId(input.memoryId);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/memories/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(readError(payload));

      const refreshed = await fetch("/api/memories", { cache: "no-store" });
      const memoryPayload: unknown = await refreshed.json();
      if (!refreshed.ok || !isMemoryList(memoryPayload)) {
        throw new Error(readError(memoryPayload));
      }

      setMemories(memoryPayload.memories);
      setNotice(
        input.action === "edit"
          ? "Edit saved as a new memory version."
          : input.action === "forget"
            ? "Memory forgotten. Its history is retained."
            : "Memory confirmed.",
      );
      return true;
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Memory action failed. Try again.",
      );
      return false;
    } finally {
      setBusyMemoryId(null);
    }
  }

  return (
    <div className="memory-page">
      <header className="memory-page-header">
        <div>
          <p className="eyebrow">KNOWLEDGE BASE</p>
          <h2 className="page-heading">Memory</h2>
          <p className="page-description">
            Inspect facts, their sources, and how each decision changed over time.
          </p>
        </div>
        <span className="memory-total">
          {error ? (
            <strong>Unavailable</strong>
          ) : (
            <>
              <strong>{memories.length}</strong> {memories.length === 1 ? "memory" : "memories"}
            </>
          )}
        </span>
      </header>

      <div aria-label="Filter memories" className="memory-filters" role="group">
        {filters.map((item) => (
          <button
            aria-pressed={filter === item.id}
            className="memory-filter"
            key={item.id}
            onClick={() => setFilter(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {notice && <p className="memory-notice" role="status">{notice}</p>}
      {error && <p className="memory-page-error" role="alert">{error}</p>}

      {loading ? (
        <div className="memory-loading" role="status">
          <span className="loading-indicator" aria-hidden="true" />
          Loading memory records…
        </div>
      ) : error ? null : visibleMemories.length > 0 ? (
        <section aria-label={`${visibleMemories.length} memories`} className="memory-list">
          {visibleMemories.map((memory) => (
            <MemoryCard
              busy={busyMemoryId === memory.id}
              key={memory.id}
              memory={memory}
              onAction={performAction}
              onError={setError}
            />
          ))}
        </section>
      ) : (
        <section aria-live="polite" className="memory-empty">
          <span className="memory-empty-mark" aria-hidden="true">∅</span>
          <h3>{memories.length === 0 ? "No memories stored" : "No matching memories"}</h3>
          <p>
            {memories.length === 0
              ? "Memory records will appear here as they are added to the vault."
              : "Choose another filter to see more of the memory history."}
          </p>
        </section>
      )}
    </div>
  );
}

function MemoryCard({
  memory,
  busy,
  onAction,
  onError,
}: {
  memory: MemoryRecord;
  busy: boolean;
  onAction: (input: {
    action: "confirm" | "edit" | "forget";
    memoryId: string;
    content?: string;
  }) => Promise<boolean>;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(memory.content);
  const supersedingMemory = memory.superseded_by[0];
  const statusLabel = memory.status.toUpperCase();

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = editedContent.trim();
    if (!content || content === memory.content) {
      setEditing(false);
      return;
    }
    if (
      !window.confirm(
        "Save this edit as a new version? The current memory will be retained as superseded history.",
      )
    ) {
      return;
    }

    const saved = await onAction({ action: "edit", memoryId: memory.id, content });
    if (saved) setEditing(false);
  }

  async function forgetMemory() {
    if (
      !window.confirm(
        "Forget this memory? It will be excluded from current answers, but its history will be retained.",
      )
    ) {
      return;
    }
    await onAction({ action: "forget", memoryId: memory.id });
  }

  async function confirmMemory() {
    await onAction({ action: "confirm", memoryId: memory.id });
  }

  return (
    <article className={`memory-card memory-card-${memory.status}`}>
      <div className="memory-card-main">
        <div className="memory-card-topline">
          <span className={`memory-status memory-status-${memory.status}`}>
            <span aria-hidden="true" className="status-dot" />
            {statusLabel}
          </span>
          <time dateTime={memory.created_at}>{formatDate(memory.created_at)}</time>
        </div>

        {editing ? (
          <form className="memory-edit-form" onSubmit={saveEdit}>
            <label htmlFor={`edit-${memory.id}`}>Edit memory content</label>
            <textarea
              id={`edit-${memory.id}`}
              maxLength={5_000}
              onChange={(event) => setEditedContent(event.target.value)}
              value={editedContent}
            />
            <div className="memory-edit-actions">
              <button disabled={busy} onClick={() => setEditing(false)} type="button">
                Cancel
              </button>
              <button className="memory-action-primary" disabled={busy || !editedContent.trim()} type="submit">
                {busy ? "Saving…" : "Save version"}
              </button>
            </div>
          </form>
        ) : (
          <p className="memory-card-content">{memory.content}</p>
        )}

        {supersedingMemory && (
          <p className="superseded-by">
            Superseded by <strong>{supersedingMemory.content}</strong>
          </p>
        )}

        <dl className="memory-metadata">
          <div>
            <dt>Type</dt>
            <dd>{formatType(memory.type)}</dd>
          </div>
          <div>
            <dt>Entity</dt>
            <dd>{memory.entity}</dd>
          </div>
          <div>
            <dt>Scope</dt>
            <dd>{memory.scope}</dd>
          </div>
          <div>
            <dt>Confidence</dt>
            <dd>{Math.round(memory.confidence * 100)}%</dd>
          </div>
          <div>
            <dt>Valid period</dt>
            <dd>
              <time dateTime={memory.valid_from}>{formatDate(memory.valid_from)}</time>
              {memory.valid_until ? ` → ${formatDate(memory.valid_until)}` : " → present"}
            </dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd title={memory.source?.source_location ?? memory.source_id}>
              {memory.source
                ? `${formatType(memory.source.source_type)} · ${memory.source.source_location}`
                : shortId(memory.source_id)}
            </dd>
          </div>
        </dl>
      </div>

      <footer className="memory-card-actions" aria-label={`Actions for ${memory.content}`}>
        <button
          disabled={busy || memory.status === "forgotten" || memory.confidence >= 1}
          onClick={confirmMemory}
          title={memory.confidence >= 1 ? "Already confirmed" : "Set confidence to 100%"}
          type="button"
        >
          {busy ? "Working…" : memory.confidence >= 1 ? "Confirmed" : "Confirm"}
        </button>
        <button
          disabled={busy || memory.status !== "active"}
          onClick={() => {
            onError("");
            setEditedContent(memory.content);
            setEditing(true);
          }}
          title={memory.status === "active" ? "Edit as a new version" : "Historical memories are immutable"}
          type="button"
        >
          Edit
        </button>
        <button
          className="memory-action-forget"
          disabled={busy || memory.status === "forgotten"}
          onClick={forgetMemory}
          type="button"
        >
          Forget
        </button>
      </footer>
    </article>
  );
}

function matchesFilter(memory: MemoryRecord, filter: MemoryFilter): boolean {
  if (filter === "all") return true;
  if (filter === "active" || filter === "superseded" || filter === "forgotten") {
    return memory.status === filter;
  }
  if (filter === "decisions") {
    return memory.type === "decision" || memory.type === "technical_decision";
  }
  if (filter === "preferences") return memory.type === "preference";
  return memory.type === "fact";
}

function formatType(type: MemoryType | string): string {
  return type.replaceAll("_", " ");
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function shortId(value: string): string {
  return value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

function readError(value: unknown): string {
  if (isRecord(value) && typeof value.error === "string") return value.error;
  return "Memory request failed. Try again.";
}

function isMemoryList(value: unknown): value is { memories: MemoryRecord[] } {
  return isRecord(value) && Array.isArray(value.memories);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
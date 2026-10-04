"use client";

import { useEffect, useState } from "react";
import type { ProvenanceSource, SourceMemory } from "@/lib/memory/record";

export function SourcesWorkspace() {
  const [sources, setSources] = useState<ProvenanceSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function loadSources() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/sources", { cache: "no-store" });
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(readError(payload));
        if (!isSourceList(payload)) throw new Error("Source service returned invalid data.");
        if (isCurrent) setSources(payload.sources);
      } catch (loadError) {
        if (isCurrent) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load sources.",
          );
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    void loadSources();
    return () => {
      isCurrent = false;
    };
  }, []);

  const memoryCount = sources.reduce((total, source) => total + source.memories.length, 0);

  return (
    <div className="sources-page">
      <header className="sources-page-header">
        <div>
          <p className="eyebrow">PROVENANCE</p>
          <h2 className="page-heading">Sources</h2>
          <p className="page-description">
            Trace extracted memories back to the original conversation that established them.
          </p>
        </div>
        <div className="sources-summary" aria-label="Source and extracted memory counts">
          <span><strong>{error ? "—" : sources.length}</strong> sources</span>
          <span><strong>{error ? "—" : memoryCount}</strong> memories</span>
        </div>
      </header>

      {error && <p className="sources-error" role="alert">{error}</p>}

      {loading ? (
        <div className="sources-loading" role="status">
          <span className="loading-indicator" aria-hidden="true" />
          Loading source records…
        </div>
      ) : error ? null : sources.length > 0 ? (
        <section aria-label={`${sources.length} source records`} className="sources-list">
          {sources.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </section>
      ) : (
        <section aria-live="polite" className="sources-empty">
          <span className="sources-empty-mark" aria-hidden="true">⌁</span>
          <h3>No sources stored</h3>
          <p>Original conversations will appear here when memories are captured.</p>
        </section>
      )}
    </div>
  );
}

function SourceCard({ source }: { source: ProvenanceSource }) {
  return (
    <article className="source-card">
      <header className="source-card-header">
        <div className="source-card-kind">
          <span className="source-kind-mark" aria-hidden="true">SRC</span>
          <span>{formatLabel(source.source_type)}</span>
        </div>
        <time dateTime={source.source_date}>{formatDate(source.source_date)}</time>
      </header>

      <div className="source-location">
        <span>Location</span>
        <code title={source.source_location}>{source.source_location}</code>
      </div>

      <section aria-label="Original source content" className="source-original">
        <p className="source-section-label">ORIGINAL CONTENT</p>
        <blockquote>{source.original_content}</blockquote>
      </section>

      <section aria-label="Memories extracted from this source" className="source-memories">
        <div className="source-memories-header">
          <h3>Extracted memories</h3>
          <span>{String(source.memories.length).padStart(2, "0")}</span>
        </div>
        {source.memories.length > 0 ? (
          <ul className="source-memory-list">
            {source.memories.map((memory) => (
              <SourceMemoryItem key={memory.id} memory={memory} sourceId={source.id} />
            ))}
          </ul>
        ) : (
          <p className="source-no-memories">No extracted memories are linked to this source.</p>
        )}
      </section>
    </article>
  );
}

function SourceMemoryItem({
  memory,
  sourceId,
}: {
  memory: SourceMemory;
  sourceId: string;
}) {
  return (
    <li className="source-memory-item">
      <details>
        <summary>
          <span className={`memory-status memory-status-${memory.status}`}>
            <span aria-hidden="true" className="status-dot" />
            {memory.status.toUpperCase()}
          </span>
          <span className="source-memory-content">{memory.content}</span>
          <span className="source-memory-type">{formatLabel(memory.type)}</span>
        </summary>
        <div className="source-relationship">
          <p className="source-section-label">PROVENANCE LINK</p>
          <p>
            This memory was extracted from this source and is linked by its source ID.
          </p>
          <dl>
            <div>
              <dt>Memory ID</dt>
              <dd><code>{memory.id}</code></dd>
            </div>
            <div>
              <dt>Source ID</dt>
              <dd><code>{sourceId}</code></dd>
            </div>
            <div>
              <dt>Recorded</dt>
              <dd><time dateTime={memory.created_at}>{formatDate(memory.created_at)}</time></dd>
            </div>
            <div>
              <dt>Entity / scope</dt>
              <dd>{memory.entity} · {memory.scope}</dd>
            </div>
            {memory.supersedes && (
              <div>
                <dt>Supersedes</dt>
                <dd><code>{memory.supersedes}</code></dd>
              </div>
            )}
          </dl>
        </div>
      </details>
    </li>
  );
}

function formatLabel(value: string): string {
  return value.replaceAll("_", " ");
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

function readError(value: unknown): string {
  if (isRecord(value) && typeof value.error === "string") return value.error;
  return "Source request failed. Try again.";
}

function isSourceList(value: unknown): value is { sources: ProvenanceSource[] } {
  return isRecord(value) && Array.isArray(value.sources);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
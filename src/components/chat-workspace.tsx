"use client";

import { useState, type FormEvent } from "react";

type EvidenceStatus = "active" | "superseded" | "forgotten";

type AnswerEvidence = {
  memoryId: string;
  content: string;
  status: EvidenceStatus;
  createdAt: string;
  sourceId: string;
  reason: string;
};

type MemoryAnswer = {
  answer: string;
  confidence: number;
  evidence: AnswerEvidence[];
};

const starterQuestion = "What framework are we currently using?";

export function ChatWorkspace() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [answer, setAnswer] = useState<MemoryAnswer | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = query.trim();
    if (!normalizedQuery || isLoading) return;

    setSubmittedQuery(normalizedQuery);
    setAnswer(null);
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/memories/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: normalizedQuery }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(readErrorMessage(payload));
      }

      if (!isMemoryAnswer(payload)) {
        throw new Error("The answer service returned an invalid response.");
      }

      setAnswer(payload);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The answer could not be loaded. Try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="chat-page">
      <header className="chat-page-header">
        <div>
          <p className="eyebrow">MEMORY QUERY</p>
          <h2 className="page-heading">Ask the vault</h2>
          <p className="page-description">
            Answers are grounded in stored facts, with the change history kept in view.
          </p>
        </div>
        <div className="evidence-mode" aria-label="Answer mode: evidence grounded">
          <span className="evidence-mode-mark" aria-hidden="true" />
          <span>Evidence grounded</span>
        </div>
      </header>

      <div className="chat-layout">
        <section aria-label="Memory conversation" className="conversation-panel">
          <div className="conversation-stream" aria-live="polite" aria-busy={isLoading}>
            {!submittedQuery && !isLoading && (
              <div className="conversation-empty">
                <span className="conversation-index" aria-hidden="true">01</span>
                <h3>Start with a question</h3>
                <p>
                  Ask about a decision, preference, or change. The answer will show
                  which memories support it.
                </p>
                <button
                  className="starter-question"
                  onClick={() => setQuery(starterQuestion)}
                  type="button"
                >
                  <span aria-hidden="true">↳</span>
                  {starterQuestion}
                </button>
              </div>
            )}

            {submittedQuery && (
              <article className="question-entry">
                <p className="entry-label">QUERY</p>
                <p>{submittedQuery}</p>
              </article>
            )}

            {isLoading && (
              <div className="answer-loading" role="status">
                <span className="loading-indicator" aria-hidden="true" />
                <div>
                  <p className="entry-label">RETRIEVING EVIDENCE</p>
                  <p>Tracing relevant memories and their history…</p>
                </div>
              </div>
            )}

            {error && (
              <div className="chat-error" role="alert">
                <span className="error-code" aria-hidden="true">!</span>
                <div>
                  <p className="entry-label">ANSWER UNAVAILABLE</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {answer && <AnswerCard answer={answer} />}
          </div>

          <form className="chat-composer" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="memory-question">
              Ask a question about your memory
            </label>
            <textarea
              autoComplete="off"
              id="memory-question"
              maxLength={500}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Ask about a fact, decision, or change…"
              rows={2}
              value={query}
            />
            <div className="composer-footer">
              <span className="composer-hint">Enter to ask · Shift+Enter for a new line</span>
              <button
                className="ask-button"
                disabled={isLoading || !query.trim()}
                type="submit"
              >
                {isLoading ? "Searching…" : "Ask memory"}
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          </form>
        </section>

        <EvidenceTimeline evidence={answer?.evidence ?? []} hasAnswer={answer !== null} />
      </div>
    </div>
  );
}

function AnswerCard({ answer }: { answer: MemoryAnswer }) {
  const confidence = Math.max(0, Math.min(1, answer.confidence));
  const confidencePercent = Math.round(confidence * 100);

  return (
    <article aria-label="Memory answer" className="answer-card">
      <div className="answer-card-header">
        <p className="entry-label">ANSWER</p>
        <span className="answer-evidence-count">
          {answer.evidence.length} {answer.evidence.length === 1 ? "source" : "sources"}
        </span>
      </div>
      <p className="answer-text">{answer.answer}</p>
      <div className="confidence-row">
        <span>Confidence</span>
        <div
          aria-label={`Confidence ${confidencePercent}%`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={confidencePercent}
          className="confidence-track"
          role="meter"
        >
          <span style={{ width: `${confidencePercent}%` }} />
        </div>
        <strong>{confidencePercent}%</strong>
      </div>
    </article>
  );
}

function EvidenceTimeline({
  evidence,
  hasAnswer,
}: {
  evidence: AnswerEvidence[];
  hasAnswer: boolean;
}) {
  return (
    <aside aria-label="Evidence timeline" className="evidence-panel">
      <header className="evidence-header">
        <div>
          <p className="entry-label">PROVENANCE</p>
          <h3>Evidence trail</h3>
        </div>
        <span className="evidence-count" aria-label={`${evidence.length} evidence items`}>
          {String(evidence.length).padStart(2, "0")}
        </span>
      </header>

      {evidence.length > 0 ? (
        <ol className="evidence-timeline">
          {evidence.map((item) => (
            <EvidenceItem evidence={item} key={item.memoryId} />
          ))}
        </ol>
      ) : (
        <div className="evidence-empty" aria-live="polite">
          <span className="evidence-empty-mark" aria-hidden="true">⌁</span>
          <p>{hasAnswer ? "No supporting memories were returned." : "Evidence will appear here after a query."}</p>
        </div>
      )}
    </aside>
  );
}

function EvidenceItem({ evidence }: { evidence: AnswerEvidence }) {
  const statusLabel = evidence.status.toUpperCase();

  return (
    <li className={`evidence-item evidence-item-${evidence.status}`}>
      <div className="evidence-item-topline">
        <span className={`memory-status memory-status-${evidence.status}`}>
          <span aria-hidden="true" className="status-dot" />
          {statusLabel}
        </span>
        <time dateTime={evidence.createdAt}>{formatDate(evidence.createdAt)}</time>
      </div>
      <p className="evidence-content">{evidence.content}</p>
      <div className="evidence-source">
        <span>Source</span>
        <code title={evidence.sourceId}>{shortId(evidence.sourceId)}</code>
      </div>
      <details className="evidence-reason">
        <summary>Why do you know this?</summary>
        <p>{evidence.reason}</p>
      </details>
    </li>
  );
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

function isMemoryAnswer(value: unknown): value is MemoryAnswer {
  if (!isRecord(value)) return false;
  if (
    typeof value.answer !== "string" ||
    typeof value.confidence !== "number" ||
    !Number.isFinite(value.confidence) ||
    !Array.isArray(value.evidence)
  ) {
    return false;
  }

  return value.evidence.every(
    (item) =>
      isRecord(item) &&
      typeof item.memoryId === "string" &&
      typeof item.content === "string" &&
      ["active", "superseded", "forgotten"].includes(String(item.status)) &&
      typeof item.createdAt === "string" &&
      typeof item.sourceId === "string" &&
      typeof item.reason === "string",
  );
}

function readErrorMessage(value: unknown): string {
  if (isRecord(value) && typeof value.error === "string") return value.error;
  return "The answer could not be loaded. Try again.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
# Memory Vault Evaluation Report

Generated: 2026-10-04T15:35:58.304Z
Synthetic scenarios: 40
Categories: Technology decisions, Programming languages, Databases, Frameworks, Deadlines, Project requirements, User preferences, Locations, Team decisions, Reversed decisions

> Actual deterministic runner results on synthetic structured scenarios. Gemma answer generation was not invoked; current-fact and stale-memory figures are top-retrieved-value proxies, not LLM quality or production performance results.

## Metrics

| Metric | Baseline | Memory Vault |
| --- | ---: | ---: |
| Current-fact accuracy (top retrieved value) | 26/40 (65.0%) | 40/40 (100.0%) |
| Conflict-resolution accuracy | N/A | 80/80 (100.0%) |
| Retrieval relevance, precision@3 | 58.3% | 55.4% |
| Stale-memory error rate | 14/40 (35.0%) | 0/40 (0.0%) |

## Method

- Baseline: Rank dated statements by raw query/entity token overlap, break ties by recency, and select the top value without temporal status resolution.
- Memory Vault: Replay transitions through the production resolveMemoryConflict and rankRelevantMemories functions, preserve superseded history, then select the highest-ranked active value.
- Conflict labels: Synthetic value labels identify duplicates, changed values, and reversals. The injected classifier uses these structured labels, so the metric evaluates state transitions, not natural-language classification.
- Relevance: Precision@3 per scenario: fraction of retrieved values matching expectedCurrent, averaged over all 40 scenarios.
- LLM answer quality is not included in these metrics.

## Scenario results

| ID | Category | Expected current | Baseline | Memory Vault | Base P@3 | Vault P@3 | Transitions |
| --- | --- | --- | --- | --- | ---: | ---: | ---: |
| technology-01 | Technology decisions | Valkey | Redis | Valkey | 33.3% | 50.0% | 2/2 |
| technology-02 | Technology decisions | Google Cloud | Google Cloud | Google Cloud | 33.3% | 33.3% | 2/2 |
| technology-03 | Technology decisions | OAuth 2.1 | OAuth 2.1 | OAuth 2.1 | 33.3% | 33.3% | 2/2 |
| technology-04 | Technology decisions | Kafka | Kafka | Kafka | 66.7% | 66.7% | 2/2 |
| language-01 | Programming languages | Go | Python | Go | 33.3% | 50.0% | 2/2 |
| language-02 | Programming languages | Rust | Rust | Rust | 66.7% | 50.0% | 2/2 |
| language-03 | Programming languages | Bash | Python | Bash | 66.7% | 66.7% | 2/2 |
| language-04 | Programming languages | Kotlin Multiplatform | Kotlin Multiplatform | Kotlin Multiplatform | 66.7% | 50.0% | 2/2 |
| database-01 | Databases | PostgreSQL | MongoDB | PostgreSQL | 66.7% | 50.0% | 2/2 |
| database-02 | Databases | BigQuery | Snowflake | BigQuery | 33.3% | 33.3% | 2/2 |
| database-03 | Databases | Redis | Redis | Redis | 66.7% | 66.7% | 2/2 |
| database-04 | Databases | OpenSearch | OpenSearch | OpenSearch | 66.7% | 50.0% | 2/2 |
| framework-01 | Frameworks | React | React | React | 66.7% | 66.7% | 2/2 |
| framework-02 | Frameworks | Fastify | Express | Fastify | 66.7% | 50.0% | 2/2 |
| framework-03 | Frameworks | Tailwind CSS | Bootstrap | Tailwind CSS | 66.7% | 50.0% | 2/2 |
| framework-04 | Frameworks | Vitest | Vitest | Vitest | 66.7% | 50.0% | 2/2 |
| deadline-01 | Deadlines | Monday, 2025-01-06 | Monday, 2025-01-06 | Monday, 2025-01-06 | 66.7% | 50.0% | 2/2 |
| deadline-02 | Deadlines | 2025-01-09 | 2025-01-10 | 2025-01-09 | 33.3% | 33.3% | 2/2 |
| deadline-03 | Deadlines | 2025-01-14 | 2025-01-14 | 2025-01-14 | 100.0% | 100.0% | 2/2 |
| deadline-04 | Deadlines | 2025-01-12 | 2025-01-08 | 2025-01-12 | 66.7% | 50.0% | 2/2 |
| requirement-01 | Project requirements | CSV and JSON | CSV | CSV and JSON | 33.3% | 50.0% | 2/2 |
| requirement-02 | Project requirements | Required | Required | Required | 66.7% | 50.0% | 2/2 |
| requirement-03 | Project requirements | WCAG 2.2 AA | WCAG 2.2 AA | WCAG 2.2 AA | 66.7% | 50.0% | 2/2 |
| requirement-04 | Project requirements | Required | Required | Required | 66.7% | 50.0% | 2/2 |
| preference-01 | User preferences | Detailed | Detailed | Detailed | 33.3% | 50.0% | 2/2 |
| preference-02 | User preferences | JavaScript | JavaScript | JavaScript | 66.7% | 66.7% | 2/2 |
| preference-03 | User preferences | US month/day/year | US month/day/year | US month/day/year | 33.3% | 50.0% | 2/2 |
| preference-04 | User preferences | Daily digest | Immediate | Daily digest | 66.7% | 50.0% | 2/2 |
| location-01 | Locations | Portland | Seattle | Portland | 33.3% | 50.0% | 2/2 |
| location-02 | Locations | West Europe | West Europe | West Europe | 66.7% | 50.0% | 2/2 |
| location-03 | Locations | East US | East US | East US | 66.7% | 66.7% | 2/2 |
| location-04 | Locations | Europe/Paris | Europe/Paris | Europe/Paris | 66.7% | 50.0% | 2/2 |
| team-01 | Team decisions | Jordan | Maya | Jordan | 33.3% | 50.0% | 2/2 |
| team-02 | Team decisions | One approver | One approver | One approver | 66.7% | 100.0% | 2/2 |
| team-03 | Team decisions | Tuesday | Tuesday | Tuesday | 66.7% | 50.0% | 2/2 |
| team-04 | Team decisions | Dana | Dana | Dana | 66.7% | 66.7% | 2/2 |
| reversal-01 | Reversed decisions | Monolith | Monolith | Monolith | 66.7% | 66.7% | 2/2 |
| reversal-02 | Reversed decisions | Prisma | Prisma | Prisma | 66.7% | 66.7% | 2/2 |
| reversal-03 | Reversed decisions | Trunk-based development | Release branches | Trunk-based development | 66.7% | 66.7% | 2/2 |
| reversal-04 | Reversed decisions | v1 | v1 | v1 | 66.7% | 66.7% | 2/2 |


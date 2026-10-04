export type ScenarioTransition = "initial" | "duplicate" | "contradiction" | "reversal";

export type ConversationStatement = {
  date: string;
  statement: string;
  value: string;
  expectedTransition: ScenarioTransition;
};

export type EvaluationScenario = {
  id: string;
  category: string;
  entity: string;
  scope: "project" | "user" | "team";
  query: string;
  expectedCurrent: string;
  conversationHistory: ConversationStatement[];
};

type ScenarioDefinition = Omit<EvaluationScenario, "conversationHistory"> & {
  statements: [
    { day: 1 | 3 | 5; statement: string; value: string },
    { day: 1 | 3 | 5; statement: string; value: string },
    { day: 1 | 3 | 5; statement: string; value: string },
  ];
};

const definitions: ScenarioDefinition[] = [
  {
    id: "technology-01",
    category: "Technology decisions",
    entity: "project.cache",
    scope: "project",
    query: "Which cache technology is the project currently using?",
    expectedCurrent: "Valkey",
    statements: [
      { day: 1, value: "Redis", statement: "The project cache strategy uses Redis." },
      { day: 3, value: "Redis", statement: "The project is still using Redis for cache." },
      { day: 5, value: "Valkey", statement: "The cache decision changed from Redis to Valkey." },
    ],
  },
  {
    id: "technology-02",
    category: "Technology decisions",
    entity: "project.cloud_provider",
    scope: "project",
    query: "Which cloud provider hosts the project now?",
    expectedCurrent: "Google Cloud",
    statements: [
      { day: 1, value: "AWS", statement: "The project is hosted on AWS." },
      { day: 3, value: "Azure", statement: "The team moved project hosting from AWS to Azure." },
      { day: 5, value: "Google Cloud", statement: "The hosting decision changed from Azure to Google Cloud." },
    ],
  },
  {
    id: "technology-03",
    category: "Technology decisions",
    entity: "project.api_authentication",
    scope: "project",
    query: "What authentication technology does the project API use?",
    expectedCurrent: "OAuth 2.1",
    statements: [
      { day: 1, value: "JWT bearer tokens", statement: "The project API uses JWT bearer token authentication." },
      { day: 3, value: "mTLS", statement: "The API authentication was changed from JWT bearer tokens to mTLS." },
      { day: 5, value: "OAuth 2.1", statement: "The project API now uses OAuth 2.1 authentication." },
    ],
  },
  {
    id: "technology-04",
    category: "Technology decisions",
    entity: "project.message_queue",
    scope: "project",
    query: "Which message queue is selected for the project?",
    expectedCurrent: "Kafka",
    statements: [
      { day: 1, value: "Kafka", statement: "Kafka is the project message queue." },
      { day: 3, value: "RabbitMQ", statement: "The project message queue changed from Kafka to RabbitMQ." },
      { day: 5, value: "Kafka", statement: "The team reversed the queue decision and returned to Kafka." },
    ],
  },
  {
    id: "language-01",
    category: "Programming languages",
    entity: "project.backend_language",
    scope: "project",
    query: "What language is the project backend currently written in?",
    expectedCurrent: "Go",
    statements: [
      { day: 1, value: "Python", statement: "The project backend is written in Python." },
      { day: 3, value: "Python", statement: "The backend continues to use Python." },
      { day: 5, value: "Go", statement: "The backend language changed from Python to Go." },
    ],
  },
  {
    id: "language-02",
    category: "Programming languages",
    entity: "project.cli_language",
    scope: "project",
    query: "Which language implements the project CLI?",
    expectedCurrent: "Rust",
    statements: [
      { day: 1, value: "TypeScript", statement: "The project CLI is implemented in TypeScript." },
      { day: 3, value: "Rust", statement: "The CLI implementation switched from TypeScript to Rust." },
      { day: 5, value: "Rust", statement: "Rust remains the implementation language for the CLI." },
    ],
  },
  {
    id: "language-03",
    category: "Programming languages",
    entity: "project.maintenance_scripts",
    scope: "project",
    query: "What language are the maintenance scripts written in?",
    expectedCurrent: "Bash",
    statements: [
      { day: 1, value: "Bash", statement: "Maintenance scripts for the project use Bash." },
      { day: 3, value: "Python", statement: "The maintenance scripts were rewritten from Bash in Python." },
      { day: 5, value: "Bash", statement: "The script decision was reversed and maintenance scripts returned to Bash." },
    ],
  },
  {
    id: "language-04",
    category: "Programming languages",
    entity: "project.ios_language",
    scope: "project",
    query: "Which programming language is used for the iOS client?",
    expectedCurrent: "Kotlin Multiplatform",
    statements: [
      { day: 1, value: "Swift", statement: "The iOS client is written in Swift." },
      { day: 3, value: "Kotlin Multiplatform", statement: "The iOS client language changed from Swift to Kotlin Multiplatform." },
      { day: 5, value: "Kotlin Multiplatform", statement: "Kotlin Multiplatform remains selected for the iOS client." },
    ],
  },
  {
    id: "database-01",
    category: "Databases",
    entity: "project.primary_database",
    scope: "project",
    query: "Which database is the project currently using as its primary store?",
    expectedCurrent: "PostgreSQL",
    statements: [
      { day: 1, value: "MongoDB", statement: "MongoDB is the project primary database." },
      { day: 3, value: "PostgreSQL", statement: "The primary database changed from MongoDB to PostgreSQL." },
      { day: 5, value: "PostgreSQL", statement: "PostgreSQL remains the primary database." },
    ],
  },
  {
    id: "database-02",
    category: "Databases",
    entity: "project.analytics_database",
    scope: "project",
    query: "Which database stores analytics data?",
    expectedCurrent: "BigQuery",
    statements: [
      { day: 1, value: "Snowflake", statement: "Analytics data is stored in Snowflake." },
      { day: 3, value: "ClickHouse", statement: "The analytics database moved from Snowflake to ClickHouse." },
      { day: 5, value: "BigQuery", statement: "The project switched analytics storage from ClickHouse to BigQuery." },
    ],
  },
  {
    id: "database-03",
    category: "Databases",
    entity: "project.session_store",
    scope: "project",
    query: "Where are project sessions stored?",
    expectedCurrent: "Redis",
    statements: [
      { day: 1, value: "Redis", statement: "Project sessions are stored in Redis." },
      { day: 3, value: "PostgreSQL", statement: "Session storage changed from Redis to PostgreSQL." },
      { day: 5, value: "Redis", statement: "The session-store decision was reversed back to Redis." },
    ],
  },
  {
    id: "database-04",
    category: "Databases",
    entity: "project.search_index",
    scope: "project",
    query: "Which search index is selected for the project?",
    expectedCurrent: "OpenSearch",
    statements: [
      { day: 1, value: "Elasticsearch", statement: "The project search index uses Elasticsearch." },
      { day: 3, value: "OpenSearch", statement: "The search index changed from Elasticsearch to OpenSearch." },
      { day: 5, value: "OpenSearch", statement: "OpenSearch remains the selected search index." },
    ],
  },
  {
    id: "framework-01",
    category: "Frameworks",
    entity: "project.framework",
    scope: "project",
    query: "What framework is the project currently using?",
    expectedCurrent: "React",
    statements: [
      { day: 1, value: "React", statement: "The project uses the React framework." },
      { day: 3, value: "Next.js", statement: "The project framework changed from React to Next.js." },
      { day: 5, value: "React", statement: "The framework decision was reversed and the project returned to React." },
    ],
  },
  {
    id: "framework-02",
    category: "Frameworks",
    entity: "project.api_framework",
    scope: "project",
    query: "Which framework runs the project API?",
    expectedCurrent: "Fastify",
    statements: [
      { day: 1, value: "Express", statement: "The project API runs on Express." },
      { day: 3, value: "Fastify", statement: "The API framework changed from Express to Fastify." },
      { day: 5, value: "Fastify", statement: "Fastify remains the project API framework." },
    ],
  },
  {
    id: "framework-03",
    category: "Frameworks",
    entity: "project.css_framework",
    scope: "project",
    query: "Which CSS framework does the project use?",
    expectedCurrent: "Tailwind CSS",
    statements: [
      { day: 1, value: "Bootstrap", statement: "The project styles use Bootstrap." },
      { day: 3, value: "Tailwind CSS", statement: "The CSS framework changed from Bootstrap to Tailwind CSS." },
      { day: 5, value: "Tailwind CSS", statement: "Tailwind CSS remains the project styling framework." },
    ],
  },
  {
    id: "framework-04",
    category: "Frameworks",
    entity: "project.test_framework",
    scope: "project",
    query: "Which framework runs the project tests?",
    expectedCurrent: "Vitest",
    statements: [
      { day: 1, value: "Jest", statement: "Project tests run with Jest." },
      { day: 3, value: "Vitest", statement: "The test framework switched from Jest to Vitest." },
      { day: 5, value: "Vitest", statement: "Vitest remains selected for project tests." },
    ],
  },
  {
    id: "deadline-01",
    category: "Deadlines",
    entity: "project.launch_deadline",
    scope: "project",
    query: "What is the current project launch deadline?",
    expectedCurrent: "Monday, 2025-01-06",
    statements: [
      { day: 1, value: "Friday, 2025-01-03", statement: "The project launch deadline is Friday, January 3." },
      { day: 3, value: "Monday, 2025-01-06", statement: "The launch deadline moved from Friday to Monday, January 6." },
      { day: 5, value: "Monday, 2025-01-06", statement: "The Monday, January 6 launch deadline is unchanged." },
    ],
  },
  {
    id: "deadline-02",
    category: "Deadlines",
    entity: "project.design_review_deadline",
    scope: "project",
    query: "When is the design review due?",
    expectedCurrent: "2025-01-09",
    statements: [
      { day: 1, value: "2025-01-10", statement: "The design review deadline is January 10, 2025." },
      { day: 3, value: "2025-01-12", statement: "The design review deadline moved to January 12, 2025." },
      { day: 5, value: "2025-01-09", statement: "The review deadline was brought forward to January 9, 2025." },
    ],
  },
  {
    id: "deadline-03",
    category: "Deadlines",
    entity: "project.security_signoff_deadline",
    scope: "project",
    query: "What date is the security sign-off due?",
    expectedCurrent: "2025-01-14",
    statements: [
      { day: 1, value: "2025-01-14", statement: "Security sign-off is due January 14, 2025." },
      { day: 3, value: "2025-01-14", statement: "The January 14 security sign-off date is unchanged." },
      { day: 5, value: "2025-01-14", statement: "The security sign-off remains due January 14, 2025." },
    ],
  },
  {
    id: "deadline-04",
    category: "Deadlines",
    entity: "project.beta_deadline",
    scope: "project",
    query: "When is the beta deadline now?",
    expectedCurrent: "2025-01-12",
    statements: [
      { day: 1, value: "2025-01-08", statement: "The project beta deadline is January 8, 2025." },
      { day: 3, value: "2025-01-12", statement: "The beta deadline was extended to January 12, 2025." },
      { day: 5, value: "2025-01-12", statement: "The beta deadline remains January 12, 2025." },
    ],
  },
  {
    id: "requirement-01",
    category: "Project requirements",
    entity: "project.export_formats",
    scope: "project",
    query: "Which export formats are required?",
    expectedCurrent: "CSV and JSON",
    statements: [
      { day: 1, value: "CSV", statement: "Project exports must support CSV." },
      { day: 3, value: "CSV", statement: "CSV remains the required project export format." },
      { day: 5, value: "CSV and JSON", statement: "The export requirement now includes CSV and JSON." },
    ],
  },
  {
    id: "requirement-02",
    category: "Project requirements",
    entity: "project.audit_logging",
    scope: "project",
    query: "Does the project require audit logging?",
    expectedCurrent: "Required",
    statements: [
      { day: 1, value: "Not required", statement: "Audit logging is not required for the project." },
      { day: 3, value: "Required", statement: "The project requirement changed: audit logging is required." },
      { day: 5, value: "Required", statement: "Audit logging remains a required project feature." },
    ],
  },
  {
    id: "requirement-03",
    category: "Project requirements",
    entity: "project.accessibility_target",
    scope: "project",
    query: "Which accessibility target must the project meet?",
    expectedCurrent: "WCAG 2.2 AA",
    statements: [
      { day: 1, value: "WCAG 2.1 AA", statement: "The accessibility requirement is WCAG 2.1 AA." },
      { day: 3, value: "WCAG 2.2 AA", statement: "The project accessibility target was raised to WCAG 2.2 AA." },
      { day: 5, value: "WCAG 2.2 AA", statement: "WCAG 2.2 AA remains the accessibility target." },
    ],
  },
  {
    id: "requirement-04",
    category: "Project requirements",
    entity: "project.offline_support",
    scope: "project",
    query: "Is offline support required?",
    expectedCurrent: "Required",
    statements: [
      { day: 1, value: "Not required", statement: "Offline support is not a project requirement." },
      { day: 3, value: "Required", statement: "Offline support became a required project feature." },
      { day: 5, value: "Required", statement: "Offline support remains required." },
    ],
  },
  {
    id: "preference-01",
    category: "User preferences",
    entity: "user.answer_length",
    scope: "user",
    query: "How detailed should answers be?",
    expectedCurrent: "Detailed",
    statements: [
      { day: 1, value: "Concise", statement: "The user prefers concise answers." },
      { day: 3, value: "Concise", statement: "The concise-answer preference remains unchanged." },
      { day: 5, value: "Detailed", statement: "The user changed their preference to detailed answers." },
    ],
  },
  {
    id: "preference-02",
    category: "User preferences",
    entity: "user.code_example_language",
    scope: "user",
    query: "Which language should code examples use?",
    expectedCurrent: "JavaScript",
    statements: [
      { day: 1, value: "JavaScript", statement: "The user prefers JavaScript code examples." },
      { day: 3, value: "TypeScript", statement: "The code-example preference changed to TypeScript." },
      { day: 5, value: "JavaScript", statement: "The user reversed the preference and wants JavaScript examples." },
    ],
  },
  {
    id: "preference-03",
    category: "User preferences",
    entity: "user.date_format",
    scope: "user",
    query: "What date format does the user prefer?",
    expectedCurrent: "US month/day/year",
    statements: [
      { day: 1, value: "ISO 8601", statement: "The user's preferred date format is ISO 8601." },
      { day: 3, value: "ISO 8601", statement: "The user still prefers ISO 8601 dates." },
      { day: 5, value: "US month/day/year", statement: "The user's date-format preference changed to month/day/year." },
    ],
  },
  {
    id: "preference-04",
    category: "User preferences",
    entity: "user.notification_frequency",
    scope: "user",
    query: "How often does the user want notifications?",
    expectedCurrent: "Daily digest",
    statements: [
      { day: 1, value: "Immediate", statement: "The user wants notifications immediately." },
      { day: 3, value: "Daily digest", statement: "The notification preference changed to a daily digest." },
      { day: 5, value: "Daily digest", statement: "Daily digest notifications remain preferred." },
    ],
  },
  {
    id: "location-01",
    category: "Locations",
    entity: "team.office_location",
    scope: "team",
    query: "Where is the team office currently located?",
    expectedCurrent: "Portland",
    statements: [
      { day: 1, value: "Seattle", statement: "The team office is located in Seattle." },
      { day: 3, value: "Seattle", statement: "Seattle remains the team office location." },
      { day: 5, value: "Portland", statement: "The team office location changed from Seattle to Portland." },
    ],
  },
  {
    id: "location-02",
    category: "Locations",
    entity: "project.deployment_region",
    scope: "project",
    query: "Which region is the project deployed in?",
    expectedCurrent: "West Europe",
    statements: [
      { day: 1, value: "East US", statement: "The project deploys to East US." },
      { day: 3, value: "West Europe", statement: "The deployment region changed from East US to West Europe." },
      { day: 5, value: "West Europe", statement: "West Europe remains the project deployment region." },
    ],
  },
  {
    id: "location-03",
    category: "Locations",
    entity: "project.backup_region",
    scope: "project",
    query: "Where are project backups stored?",
    expectedCurrent: "East US",
    statements: [
      { day: 1, value: "East US", statement: "Project backups are stored in East US." },
      { day: 3, value: "Central US", statement: "Backup storage moved from East US to Central US." },
      { day: 5, value: "East US", statement: "The backup location reverted to East US." },
    ],
  },
  {
    id: "location-04",
    category: "Locations",
    entity: "project.default_timezone",
    scope: "project",
    query: "What timezone does the project use by default?",
    expectedCurrent: "Europe/Paris",
    statements: [
      { day: 1, value: "UTC", statement: "The project default timezone is UTC." },
      { day: 3, value: "Europe/Paris", statement: "The project timezone changed from UTC to Europe/Paris." },
      { day: 5, value: "Europe/Paris", statement: "Europe/Paris remains the project timezone." },
    ],
  },
  {
    id: "team-01",
    category: "Team decisions",
    entity: "team.technical_owner",
    scope: "team",
    query: "Who is the current technical owner?",
    expectedCurrent: "Jordan",
    statements: [
      { day: 1, value: "Maya", statement: "Maya is the technical owner for the team." },
      { day: 3, value: "Maya", statement: "Maya remains the team technical owner." },
      { day: 5, value: "Jordan", statement: "Technical ownership transferred from Maya to Jordan." },
    ],
  },
  {
    id: "team-02",
    category: "Team decisions",
    entity: "team.deployment_approval",
    scope: "team",
    query: "How many approvals are needed to deploy?",
    expectedCurrent: "One approver",
    statements: [
      { day: 1, value: "Two approvers", statement: "Deployments require approval from two team members." },
      { day: 3, value: "One approver", statement: "The deployment approval rule changed to one approver." },
      { day: 5, value: "One approver", statement: "One approver remains sufficient for deployment." },
    ],
  },
  {
    id: "team-03",
    category: "Team decisions",
    entity: "team.standup_day",
    scope: "team",
    query: "Which day does the team hold stand-up?",
    expectedCurrent: "Tuesday",
    statements: [
      { day: 1, value: "Monday", statement: "Team stand-up is held on Monday." },
      { day: 3, value: "Tuesday", statement: "The stand-up day moved from Monday to Tuesday." },
      { day: 5, value: "Tuesday", statement: "Tuesday remains the team stand-up day." },
    ],
  },
  {
    id: "team-04",
    category: "Team decisions",
    entity: "team.incident_lead",
    scope: "team",
    query: "Who is the incident response lead?",
    expectedCurrent: "Dana",
    statements: [
      { day: 1, value: "Dana", statement: "Dana is the team incident response lead." },
      { day: 3, value: "Alex", statement: "Incident response leadership changed from Dana to Alex." },
      { day: 5, value: "Dana", statement: "The incident lead decision reverted to Dana." },
    ],
  },
  {
    id: "reversal-01",
    category: "Reversed decisions",
    entity: "project.architecture",
    scope: "project",
    query: "What architecture does the project currently use?",
    expectedCurrent: "Monolith",
    statements: [
      { day: 1, value: "Monolith", statement: "The project architecture is a monolith." },
      { day: 3, value: "Microservices", statement: "The architecture decision changed from monolith to microservices." },
      { day: 5, value: "Monolith", statement: "The team reversed the architecture decision and returned to a monolith." },
    ],
  },
  {
    id: "reversal-02",
    category: "Reversed decisions",
    entity: "project.orm",
    scope: "project",
    query: "Which ORM did the project settle on?",
    expectedCurrent: "Prisma",
    statements: [
      { day: 1, value: "Prisma", statement: "The project uses Prisma as its ORM." },
      { day: 3, value: "Drizzle", statement: "The ORM decision changed from Prisma to Drizzle." },
      { day: 5, value: "Prisma", statement: "The ORM decision was reversed and the project returned to Prisma." },
    ],
  },
  {
    id: "reversal-03",
    category: "Reversed decisions",
    entity: "project.release_process",
    scope: "project",
    query: "What release process does the team currently follow?",
    expectedCurrent: "Trunk-based development",
    statements: [
      { day: 1, value: "Trunk-based development", statement: "The project release process is trunk-based development." },
      { day: 3, value: "Release branches", statement: "The team switched the release process to release branches." },
      { day: 5, value: "Trunk-based development", statement: "The release-process change was reversed to trunk-based development." },
    ],
  },
  {
    id: "reversal-04",
    category: "Reversed decisions",
    entity: "project.api_version",
    scope: "project",
    query: "Which API version is current?",
    expectedCurrent: "v1",
    statements: [
      { day: 1, value: "v1", statement: "The current project API version is v1." },
      { day: 3, value: "v2", statement: "The API version changed from v1 to v2." },
      { day: 5, value: "v1", statement: "The API-version decision was reversed and v1 is current again." },
    ],
  },
];

function buildScenario(definition: ScenarioDefinition): EvaluationScenario {
  let currentValue: string | undefined;
  const seenValues = new Set<string>();
  const conversationHistory = definition.statements.map((entry) => {
    const expectedTransition: ScenarioTransition =
      currentValue === undefined
        ? "initial"
        : normalize(entry.value) === normalize(currentValue)
          ? "duplicate"
          : seenValues.has(normalize(entry.value))
            ? "reversal"
            : "contradiction";

    if (expectedTransition !== "duplicate") currentValue = entry.value;
    seenValues.add(normalize(entry.value));

    return {
      date: new Date(Date.UTC(2025, 0, entry.day, 12)).toISOString(),
      statement: entry.statement,
      value: entry.value,
      expectedTransition,
    };
  });

  if (currentValue !== definition.expectedCurrent) {
    throw new Error(`Dataset current value mismatch for ${definition.id}.`);
  }

  return {
    id: definition.id,
    category: definition.category,
    entity: definition.entity,
    scope: definition.scope,
    query: definition.query,
    expectedCurrent: definition.expectedCurrent,
    conversationHistory,
  };
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("en-US").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export const evaluationScenarios = definitions.map(buildScenario);
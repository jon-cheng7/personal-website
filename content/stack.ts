// Tech stack data. One entry = one word in the terminal (ls / cat / tree / grep).
// Fits: read by app/_home/sections/terminal/commands.ts. Add a tech = add a line. Add a folder = add a key.
// Blurbs = what `cat` prints: one concise description each.

/** Colour group in `ls` output. */
export type StackKind = "lang" | "data" | "infra" | "lib" | "tool";

export type StackItem = {
  /** Command-friendly name (lowercase, no spaces): `cat <id>`, shown by ls. */
  id: string;
  /** Display name for `cat` (default = id). */
  name?: string;
  kind: StackKind;
  /** Year started — shown by `cat`. */
  since?: number;
  /** One line for `cat`. */
  blurb?: string;
};

/** Folders under ~/stack, in `ls` order. Key = folder name (keep command-friendly). */
export const STACK: Record<string, StackItem[]> = {
  frontend: [
    { id: "typescript", name: "TypeScript", kind: "lang", blurb: "JavaScript with static types — catches bugs at compile time and makes large codebases manageable." },
    { id: "javascript", name: "JavaScript", kind: "lang", blurb: "The language of the browser; also runs servers via Node.js." },
    { id: "react", name: "React", kind: "lib", blurb: "Component-based UI library — the view is a function of state." },
    { id: "nextjs", name: "Next.js", kind: "lib", blurb: "React framework with routing, server rendering and builds handled. This site is built on it." },
    { id: "html", name: "HTML", kind: "lang", blurb: "Markup that gives a page its structure and meaning." },
    { id: "css", name: "CSS", kind: "lang", blurb: "Styling and layout language — colour, type, spacing, animation, responsiveness." },
  ],
  backend: [
    { id: "python", name: "Python", kind: "lang", blurb: "General-purpose language for backend services, scripting, automation and data work." },
    { id: "java", name: "Java", kind: "lang", blurb: "Statically typed JVM language for large, long-lived backend systems." },
    { id: "django", name: "Django", kind: "lib", blurb: "Python web framework with ORM, auth, admin and migrations built in." },
    { id: "django-rest", name: "Django REST Framework", kind: "lib", blurb: "Toolkit on top of Django for building REST APIs: serializers, viewsets, auth, permissions." },
    { id: "rest-apis", name: "REST APIs", kind: "infra", blurb: "Resource-based HTTP APIs — how clients and services talk to each other." },
    { id: "sql", name: "SQL", kind: "lang", blurb: "Query language for relational databases: modelling, joins, aggregation, indexing." },
  ],
  cloud: [
    { id: "aws", name: "AWS", kind: "infra", blurb: "Amazon's cloud platform — compute, storage, databases and managed services." },
    { id: "jenkins", name: "Jenkins", kind: "tool", blurb: "Automation server that runs build, test and deploy pipelines." },
    { id: "git", name: "Git", kind: "tool", blurb: "Distributed version control — branches, history, collaboration." },
    { id: "github", name: "GitHub", kind: "tool", blurb: "Hosting for Git repos, with pull requests, code review and Actions." },
    { id: "ci-cd", name: "CI/CD", kind: "infra", blurb: "Automated pipelines that test every change and ship it safely." },
  ],
  data: [
    { id: "spark", name: "Spark", kind: "data", blurb: "Distributed engine for processing large datasets across a cluster." },
    { id: "scala", name: "Scala", kind: "lang", blurb: "Functional + object-oriented JVM language; Spark's native language." },
    { id: "cpp", name: "C++", kind: "lang", blurb: "Compiled systems language for performance-critical code, with direct control over memory." },
    { id: "rust", name: "Rust", kind: "lang", blurb: "Systems language with memory safety and no garbage collector — fast and reliable." },
    { id: "machine-learning", name: "Machine Learning", kind: "data", blurb: "Training models that learn patterns from data to make predictions." },
    { id: "dynamodb", name: "DynamoDB", kind: "data", blurb: "AWS's managed NoSQL key-value database, built for low latency at any scale." },
    { id: "sqs", name: "SQS", kind: "infra", blurb: "AWS's managed message queue for decoupling services." },
  ],
};

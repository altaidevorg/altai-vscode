/**
 * Host-neutral slash command registry for the Chat composer.
 * Outcomes are pure; VS Code/Desktop hosts dispatch host actions.
 */

export type SlashCommandCategory =
  | "session"
  | "workspace"
  | "code"
  | "quality"
  | "project"
  | "settings";

export type SlashCommandBehavior = "action" | "prompt";

export type SlashCommandMeta = {
  name: string;
  invocation: string;
  label: string;
  description: string;
  aliases?: readonly string[];
  category: SlashCommandCategory;
  behavior: SlashCommandBehavior;
};

export type SlashHostAction =
  | "new"
  | "sessions"
  | "rename"
  | "retry"
  | "stop"
  | "compact"
  | "status"
  | "plan"
  | "review"
  | "tasks"
  | "inbox"
  | "automations"
  | "models"
  | "permissions"
  | "mcp"
  | "skills";

export type SlashOutcome =
  | { kind: "none" }
  | { kind: "handled"; action: SlashHostAction; tail: string; toast?: string }
  | { kind: "send-prompt"; prompt: string; commandName: string };

const INIT_PROMPT = `Scan this workspace and produce ALTAI.md at the workspace root with:

- One-paragraph project description.
- Build / test / dev commands.
- Architecture overview (subsystems, data flow, key dirs).
- Conventions worth knowing (naming, patterns, gotchas).
- Paths to entry points.

Use grep/glob/list_directory/read_file to explore. Cap ALTAI.md under 200 lines. Use write_file to create it (will go through normal approval).`;

const COMMANDS: readonly SlashCommandMeta[] = [
  { name: "new", invocation: "/new", label: "New chat", description: "Start a fresh task session.", aliases: ["clear"], category: "session", behavior: "action" },
  { name: "sessions", invocation: "/sessions", label: "Chat sessions", description: "Open recent tasks and session history.", aliases: ["history", "resume"], category: "session", behavior: "action" },
  { name: "rename", invocation: "/rename", label: "Rename chat", description: "Rename the active chat. Add the new title after the command.", category: "session", behavior: "action" },
  { name: "retry", invocation: "/retry", label: "Retry last turn", description: "Rewind and rerun the latest user request.", aliases: ["regenerate"], category: "session", behavior: "action" },
  { name: "stop", invocation: "/stop", label: "Stop agent", description: "Request cancellation of the active agent run.", aliases: ["cancel"], category: "session", behavior: "action" },
  { name: "compact", invocation: "/compact", label: "Compact context", description: "Summarize older conversation context.", aliases: ["smol", "condense", "summarize"], category: "session", behavior: "action" },
  { name: "init", invocation: "/init", label: "Initialize workspace", description: "Scan the workspace and draft an ALTAI.md project guide.", category: "workspace", behavior: "prompt" },
  { name: "index", invocation: "/index", label: "Map codebase", description: "Create a concise codebase map.", aliases: ["map"], category: "workspace", behavior: "prompt" },
  { name: "search", invocation: "/search", label: "Search workspace", description: "Find code or configuration across the workspace.", aliases: ["find"], category: "workspace", behavior: "prompt" },
  { name: "status", invocation: "/status", label: "Run details", description: "Open activity and details for the current run.", aliases: ["activity", "inspect"], category: "workspace", behavior: "action" },
  { name: "git-status", invocation: "/git-status", label: "Git status", description: "Inspect branch and working-tree state.", aliases: ["git"], category: "workspace", behavior: "prompt" },
  { name: "diff", invocation: "/diff", label: "Review diff", description: "Inspect working-tree changes and explain risks.", category: "workspace", behavior: "prompt" },
  { name: "plan", invocation: "/plan", label: "Plan mode", description: "Toggle plan-first mode. Use “off” to exit.", aliases: ["architect"], category: "code", behavior: "action" },
  { name: "explain", invocation: "/explain", label: "Explain code", description: "Explain code or behaviour without changing it.", aliases: ["ask"], category: "code", behavior: "prompt" },
  { name: "fix", invocation: "/fix", label: "Fix issue", description: "Investigate, fix the smallest safe change, and verify.", aliases: ["debug"], category: "code", behavior: "prompt" },
  { name: "refactor", invocation: "/refactor", label: "Refactor", description: "Improve structure while preserving behaviour.", category: "code", behavior: "prompt" },
  { name: "todo", invocation: "/todo", label: "Create task plan", description: "Turn a goal into an ordered checklist.", aliases: ["checklist"], category: "code", behavior: "prompt" },
  { name: "test", invocation: "/test", label: "Run tests", description: "Discover and run the relevant test command.", category: "quality", behavior: "prompt" },
  { name: "lint", invocation: "/lint", label: "Run lint", description: "Find/run project lint and fix actionable issues.", category: "quality", behavior: "prompt" },
  { name: "build", invocation: "/build", label: "Build project", description: "Run the production build and diagnose failures.", category: "quality", behavior: "prompt" },
  { name: "review", invocation: "/review", label: "Review changes", description: "Open change review, or ask for a scoped code review.", category: "quality", behavior: "action" },
  { name: "security", invocation: "/security", label: "Security review", description: "Audit the requested scope for security issues.", category: "quality", behavior: "prompt" },
  { name: "perf", invocation: "/perf", label: "Performance review", description: "Find likely performance bottlenecks.", aliases: ["performance"], category: "quality", behavior: "prompt" },
  { name: "docs", invocation: "/docs", label: "Update documentation", description: "Update docs for the requested change.", aliases: ["document"], category: "project", behavior: "prompt" },
  { name: "workflow", invocation: "/workflow", label: "Create workflow", description: "Design or update a reusable WORKFLOW.md process.", category: "project", behavior: "prompt" },
  { name: "research", invocation: "/research", label: "Research", description: "Research with primary sources and return cited findings.", category: "project", behavior: "prompt" },
  { name: "tasks", invocation: "/tasks", label: "Work", description: "Open Operations work (runs).", aliases: ["work"], category: "project", behavior: "action" },
  { name: "inbox", invocation: "/inbox", label: "Notifications", description: "Open the Operations inbox.", category: "project", behavior: "action" },
  { name: "automations", invocation: "/automations", label: "Scheduled", description: "Open Operations scheduled work.", aliases: ["schedule"], category: "project", behavior: "action" },
  { name: "models", invocation: "/models", label: "Model settings", description: "Focus model selection in Chat.", aliases: ["model"], category: "settings", behavior: "action" },
  { name: "permissions", invocation: "/permissions", label: "Permissions", description: "Use Chat permission mode controls.", aliases: ["permission"], category: "settings", behavior: "action" },
  { name: "mcp", invocation: "/mcp", label: "MCP", description: "See the MCP status strip when available.", aliases: ["mcps"], category: "settings", behavior: "action" },
  { name: "skills", invocation: "/skills", label: "Skills", description: "See the Skills strip when available.", category: "settings", behavior: "action" },
];

export const SLASH_COMMAND_INDEX: readonly SlashCommandMeta[] =
  Object.freeze(COMMANDS);

export function findSlashCommands(query = ""): readonly SlashCommandMeta[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return SLASH_COMMAND_INDEX;
  }
  return SLASH_COMMAND_INDEX.filter((command) =>
    [
      command.name,
      command.label,
      command.description,
      ...(command.aliases ?? []),
      command.category,
    ].some((value) => value.toLowerCase().includes(normalized)),
  );
}

export function resolveSlashCommand(
  name: string,
): SlashCommandMeta | undefined {
  const normalized = name.trim().toLowerCase();
  return SLASH_COMMAND_INDEX.find(
    (command) =>
      command.name === normalized || command.aliases?.includes(normalized),
  );
}

/**
 * Parse a full composer line (or selection) as a slash command.
 * Only whole-line leading `/name ...` is recognized (first character `/`).
 */
export function tryRunSlashCommand(input: string): SlashOutcome {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) {
    return { kind: "none" };
  }
  const [head, ...rest] = trimmed.slice(1).split(/\s+/);
  if (!head) {
    return { kind: "none" };
  }
  const command = resolveSlashCommand(head);
  if (!command) {
    return { kind: "none" };
  }
  const tail = rest.join(" ").trim();

  if (command.behavior === "prompt") {
    return {
      kind: "send-prompt",
      commandName: command.name,
      prompt: promptFor(command.name, tail),
    };
  }

  if (command.name === "review" && tail) {
    return {
      kind: "send-prompt",
      commandName: command.name,
      prompt: promptFor(command.name, tail),
    };
  }

  const toast = toastFor(command.name, tail);
  return {
    kind: "handled",
    action: command.name as SlashHostAction,
    tail,
    ...(toast ? { toast } : {}),
  };
}

function toastFor(name: string, tail: string): string | undefined {
  switch (name) {
    case "new":
      return "Started a new chat";
    case "sessions":
      return "Opened chat sessions";
    case "rename":
      return tail ? "Rename requested" : "Usage: /rename <new title>";
    case "retry":
      return "Retrying the last request";
    case "stop":
      return "Cancellation requested";
    case "compact":
      return "Compaction requested";
    case "status":
      return "Opened run details";
    case "plan":
      return tail === "off" || tail === "exit" ? "Plan mode off" : "Plan mode toggled";
    case "review":
      return "Opened change review";
    case "tasks":
      return "Opened Operations work";
    case "inbox":
      return "Opened Operations inbox";
    case "automations":
      return "Opened Operations scheduled";
    case "models":
      return "Use the model picker in the composer";
    case "permissions":
      return "Use the permission mode control in Chat";
    case "mcp":
      return "See MCP status when advertised by the host";
    case "skills":
      return "See Skills status when advertised by the host";
    default:
      return undefined;
  }
}

function promptFor(name: string, tail: string): string {
  const focus = tail ? `\n\nFocus from the user: ${tail}` : "";
  const prompts: Record<string, string> = {
    init: INIT_PROMPT,
    index:
      "Inspect this workspace without changing files. Produce a compact codebase map: entry points, major modules, data flow, build/test commands, conventions, and high-risk areas. Cite concrete paths for each conclusion.",
    search:
      "Search the workspace for the requested concept. Report the most relevant paths and lines, explain how they connect, and do not make changes unless explicitly asked.",
    "git-status":
      "Inspect the Git repository state. Summarize branch/upstream, changed and untracked files, staged versus unstaged work, and the safest next step. Do not modify Git state.",
    diff: "Inspect the current working-tree diff. Summarize intent, affected areas, likely regressions, and missing verification. Do not apply changes.",
    explain:
      "Explain the requested code or behaviour accurately. Read the relevant workspace files first, cite paths, and do not change files.",
    fix: "Investigate the reported issue first. Identify the root cause, make the smallest focused fix, then run the most relevant verification and report evidence.",
    refactor:
      "Inspect the requested scope and existing conventions. Propose a focused refactor, preserve behaviour, make changes only after understanding dependencies, and verify the result.",
    todo: "Break this task into an ordered, concrete checklist using the todo tool. Include discovery, implementation, verification, and any approval boundary.",
    test: "Discover the project’s relevant test command from its configuration and documentation. Run the smallest relevant test scope first, diagnose failures, and report exact results.",
    lint: "Discover the project lint command, run it for the relevant scope, fix clear issues when appropriate, and report the final command result.",
    build:
      "Discover the production build command, run it, diagnose failures if any, and report the exact verification result.",
    review:
      "Review the requested change scope for correctness, regressions, maintainability, and missing tests. Read the diff and surrounding code; do not modify files unless explicitly asked.",
    security:
      "Perform a focused security review of the requested scope. Look for auth, authorization, injection, data exposure, dependency, and unsafe execution issues. Report only evidence-backed findings with paths and severity.",
    perf: "Review the requested scope for measurable performance risks. Inspect hot paths, rendering, I/O, network, and algorithmic complexity; propose changes with expected impact and verification.",
    docs: "Inspect the requested feature or change and update the documentation that users or maintainers need. Keep claims tied to the actual implementation and verify links/commands where possible.",
    workflow:
      "Inspect existing project automation and WORKFLOW.md. Propose or update a reusable workflow with clear trigger, steps, validation, approval boundaries, and rollback notes.",
    research:
      "Research the requested topic using primary, current sources where possible. Separate facts from inference, cite sources, and translate findings into concrete project implications.",
  };
  return `${prompts[name] ?? "Handle the requested task carefully and verify the result."}${focus}`;
}

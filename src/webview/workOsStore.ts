/**
 * In-memory Work OS store for VS Code M1 until host work_* IPC lands.
 * Mirrors altai-app WorkItemDto / transition semantics (SCREENS.md).
 */

export type WorkItemDto = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  state: string;
  assigneeRef?: string | null;
  blocker?: string | null;
  revision: number;
  createdAtMs: number;
  updatedAtMs: number;
};

export type WorkListFilter =
  | "my_active"
  | "review"
  | "backlog"
  | "done";

const items = new Map<string, WorkItemDto>();

function now(): number {
  return Date.now();
}

function newId(prefix: string): string {
  return `${prefix}_${now()}_${Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0")}`;
}

export function listWork(filter: WorkListFilter): WorkItemDto[] {
  const all = [...items.values()].sort((a, b) => b.updatedAtMs - a.updatedAtMs);
  switch (filter) {
    case "my_active":
      return all.filter((item) =>
        ["ready", "in_progress", "in_review"].includes(item.state),
      );
    case "review":
      return all.filter((item) => item.state === "in_review");
    case "backlog":
      return all.filter((item) => item.state === "backlog");
    case "done":
      return all.filter((item) => item.state === "done");
  }
}

export function getWork(id: string): WorkItemDto | null {
  return items.get(id) ?? null;
}

export function createWork(input: {
  title: string;
  description?: string;
  acceptanceCriteria?: string;
}): WorkItemDto {
  const title = input.title.trim();
  if (!title) {
    throw new Error("title is required");
  }
  const created: WorkItemDto = {
    id: newId("work"),
    projectId: "vscode",
    title,
    description: input.description ?? "",
    acceptanceCriteria: input.acceptanceCriteria ?? "",
    state: "backlog",
    revision: 1,
    createdAtMs: now(),
    updatedAtMs: now(),
  };
  items.set(created.id, created);
  return created;
}

function bump(
  id: string,
  expectedRevision: number,
  nextState: string,
): WorkItemDto {
  const current = items.get(id);
  if (!current) {
    throw new Error(`work not found: ${id}`);
  }
  if (current.revision !== expectedRevision) {
    throw new Error("revision mismatch");
  }
  const updated: WorkItemDto = {
    ...current,
    state: nextState,
    revision: current.revision + 1,
    updatedAtMs: now(),
  };
  items.set(id, updated);
  return updated;
}

export function transitionWork(
  id: string,
  expectedRevision: number,
  nextState: string,
): WorkItemDto {
  return bump(id, expectedRevision, nextState);
}

export function startWork(id: string, expectedRevision: number): WorkItemDto {
  const current = items.get(id);
  if (!current) {
    throw new Error(`work not found: ${id}`);
  }
  if (current.revision !== expectedRevision) {
    throw new Error("revision mismatch");
  }
  let revision = current.revision;
  let state = current.state;
  if (state === "backlog") {
    const ready = bump(id, revision, "ready");
    revision = ready.revision;
    state = ready.state;
  }
  if (state === "ready" || state === "in_progress") {
    return bump(id, revision, "in_progress");
  }
  throw new Error(`cannot start from ${state}`);
}

export function readyForReview(
  id: string,
  expectedRevision: number,
): WorkItemDto {
  const current = items.get(id);
  if (!current || current.state !== "in_progress") {
    throw new Error("only in_progress work can enter review");
  }
  return bump(id, expectedRevision, "in_review");
}

export function reviewWork(
  id: string,
  expectedRevision: number,
  accept: boolean,
): WorkItemDto {
  const current = items.get(id);
  if (!current || current.state !== "in_review") {
    throw new Error("only in_review work can be Accepted or Returned");
  }
  return bump(id, expectedRevision, accept ? "done" : "ready");
}

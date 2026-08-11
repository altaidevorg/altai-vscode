/**
 * Local Work OS M1 presentational screens until @altai/agent-ui publishes
 * WorkList / WorkDetail / WorkInbox / NewWorkDialog (altai-app #691).
 */

import type { ReactNode } from "react";
import { useState } from "react";
import {
  SurfaceEmptyState,
  SurfaceInlineError,
  SurfaceLoadingState,
} from "@altai/agent-ui";

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export type WorkListFilterId = "my_active" | "review" | "backlog" | "done";

export type WorkListRow = {
  id: string;
  title: string;
  projectLabel: string;
  stateLabel: string;
  attemptLabel: string;
  updatedLabel: string;
};

export type WorkListProps = {
  status: "loading" | "ready" | "error";
  filter: WorkListFilterId;
  onFilterChange: (filter: WorkListFilterId) => void;
  rows: WorkListRow[];
  onOpenWork: (id: string) => void;
  onNewWork: () => void;
  onOpenInbox?: () => void;
  errorMessage?: string;
  onRetry?: () => void;
  className?: string;
};

const FILTERS: { id: WorkListFilterId; label: string }[] = [
  { id: "my_active", label: "My active" },
  { id: "review", label: "Review" },
  { id: "backlog", label: "Backlog" },
  { id: "done", label: "Done" },
];

const EMPTY: Record<
  WorkListFilterId,
  { title: string; description: string; showInbox?: boolean }
> = {
  my_active: {
    title: "Nothing active",
    description: "Create Work or check Inbox.",
    showInbox: true,
  },
  review: {
    title: "No Work waiting for review",
    description: "Completed attempts that need Accept or Return will show here.",
  },
  backlog: {
    title: "Backlog is empty",
    description: "Capture an outcome with New Work.",
  },
  done: {
    title: "No completed Work yet",
    description: "Accepted Work will appear here.",
  },
};

export function WorkList({
  status,
  filter,
  onFilterChange,
  rows,
  onOpenWork,
  onNewWork,
  onOpenInbox,
  errorMessage,
  onRetry,
  className,
}: WorkListProps) {
  return (
    <div
      className={cn(
        "altai-work-list flex h-full min-h-0 flex-col overflow-hidden bg-card",
        className,
      )}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-border-subtle px-3 py-2">
        <h2 className="min-w-0 flex-1 text-[13px] font-semibold text-foreground">
          Work
        </h2>
        <button
          type="button"
          onClick={onNewWork}
          className="inline-flex h-7 shrink-0 items-center rounded-md bg-foreground px-2.5 text-[11px] font-medium text-background transition-opacity hover:opacity-90"
        >
          New Work
        </button>
      </header>

      <div
        role="tablist"
        aria-label="Work filters"
        className="flex shrink-0 gap-1 overflow-x-auto border-b border-border-subtle px-3 py-2"
      >
        {FILTERS.map((item) => {
          const selected = item.id === filter;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onFilterChange(item.id)}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1 text-[10.5px] font-medium transition-colors",
                selected
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {status === "loading" ? (
          <SurfaceLoadingState>Loading Work…</SurfaceLoadingState>
        ) : null}
        {status === "error" ? (
          <SurfaceInlineError
            className="m-3"
            message={errorMessage ?? "Work list failed to load."}
            onDismiss={onRetry}
          />
        ) : null}
        {status === "ready" && rows.length === 0 ? (
          <EmptyWorkList
            filter={filter}
            onNewWork={onNewWork}
            onOpenInbox={onOpenInbox}
          />
        ) : null}
        {status === "ready" && rows.length > 0 ? (
          <ul aria-label="Work items" className="divide-y divide-border-subtle">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onOpenWork(row.id)}
                  className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                >
                  <span className="truncate text-[12px] font-medium text-foreground">
                    {row.title}
                  </span>
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-muted-foreground">
                    <span className="truncate">{row.projectLabel}</span>
                    <span>{row.stateLabel}</span>
                    <span>{row.attemptLabel}</span>
                    <span className="ml-auto tabular-nums">{row.updatedLabel}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function EmptyWorkList({
  filter,
  onNewWork,
  onOpenInbox,
}: {
  filter: WorkListFilterId;
  onNewWork: () => void;
  onOpenInbox?: () => void;
}) {
  const copy = EMPTY[filter];
  let actions: ReactNode = (
    <button
      type="button"
      onClick={onNewWork}
      className="inline-flex h-7 items-center rounded-md border border-border px-2.5 text-[11px] font-medium text-foreground hover:bg-muted"
    >
      New Work
    </button>
  );
  if (copy.showInbox && onOpenInbox) {
    actions = (
      <div className="flex gap-2">
        {actions}
        <button
          type="button"
          onClick={onOpenInbox}
          className="inline-flex h-7 items-center rounded-md px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Inbox
        </button>
      </div>
    );
  }
  return (
    <SurfaceEmptyState
      title={copy.title}
      description={copy.description}
      action={actions}
      className="border-0 bg-transparent"
    />
  );
}

export type WorkDetailPrimaryAction =
  | "ready"
  | "start"
  | "open_run"
  | "accept"
  | "return"
  | "reopen";

export type WorkDetailAttemptRow = {
  id: string;
  label: string;
  phaseLabel: string;
  onOpenRun?: () => void;
};

export type WorkDetailProps = {
  status: "loading" | "ready" | "error" | "not_found";
  title?: string;
  stateLabel?: string;
  projectLabel?: string;
  updatedLabel?: string;
  description?: string;
  acceptanceCriteria?: string;
  blocker?: string | null;
  sourceLabel?: string | null;
  onOpenSource?: () => void;
  primaryActions?: WorkDetailPrimaryAction[];
  onPrimaryAction?: (action: WorkDetailPrimaryAction) => void;
  onBack?: () => void;
  onEdit?: () => void;
  onCopyId?: () => void;
  onCancelWork?: () => void;
  attempts?: WorkDetailAttemptRow[];
  history?: { id: string; label: string }[];
  errorMessage?: string;
  onRetry?: () => void;
  className?: string;
};

const PRIMARY_LABEL: Record<WorkDetailPrimaryAction, string> = {
  ready: "Ready",
  start: "Start",
  open_run: "Open run",
  accept: "Accept",
  return: "Return",
  reopen: "Reopen",
};

export function WorkDetail({
  status,
  title,
  stateLabel,
  projectLabel,
  updatedLabel,
  description,
  acceptanceCriteria,
  blocker,
  sourceLabel,
  onOpenSource,
  primaryActions = [],
  onPrimaryAction,
  onBack,
  onEdit,
  onCopyId,
  onCancelWork,
  attempts = [],
  history = [],
  errorMessage,
  onRetry,
  className,
}: WorkDetailProps) {
  if (status === "loading") {
    return (
      <SurfaceLoadingState className={className}>Loading Work…</SurfaceLoadingState>
    );
  }
  if (status === "error") {
    return (
      <SurfaceInlineError
        className={cn("m-3", className)}
        message={errorMessage ?? "Work failed to load."}
        onDismiss={onRetry}
      />
    );
  }
  if (status === "not_found") {
    return (
      <SurfaceEmptyState
        className={cn("border-0 bg-transparent", className)}
        title="Work not found"
        description="It may have been removed or is in another project."
        action={
          onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-7 items-center rounded-md border border-border px-2.5 text-[11px] font-medium"
            >
              Back to Work
            </button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div
      className={cn(
        "altai-work-detail flex h-full min-h-0 flex-col overflow-hidden bg-card",
        className,
      )}
    >
      <header className="flex shrink-0 flex-col gap-2 border-b border-border-subtle px-3 py-2">
        <div className="flex items-start gap-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to Work list"
              className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              ←
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[13px] font-semibold text-foreground">
              {title}
            </h2>
            <p className="mt-0.5 flex flex-wrap gap-x-2 text-[10.5px] text-muted-foreground">
              {stateLabel ? <span>{stateLabel}</span> : null}
              {projectLabel ? <span>{projectLabel}</span> : null}
              {updatedLabel ? <span>{updatedLabel}</span> : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {primaryActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => onPrimaryAction?.(action)}
                className={cn(
                  "inline-flex h-7 items-center rounded-md px-2.5 text-[11px] font-medium",
                  action === "accept"
                    ? "bg-foreground text-background"
                    : action === "return"
                      ? "border border-border text-foreground hover:bg-muted"
                      : "bg-foreground text-background hover:opacity-90",
                )}
              >
                {PRIMARY_LABEL[action]}
              </button>
            ))}
            <OverflowMenu
              onEdit={onEdit}
              onCopyId={onCopyId}
              onCancelWork={onCancelWork}
            />
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
        <Section title="Description">
          <p className="whitespace-pre-wrap text-[12px] text-foreground/90">
            {description?.trim() ? description : "No description."}
          </p>
        </Section>
        <Section title="Acceptance criteria">
          <p className="whitespace-pre-wrap text-[12px] text-foreground/90">
            {acceptanceCriteria?.trim()
              ? acceptanceCriteria
              : "No acceptance criteria."}
          </p>
        </Section>
        {blocker ? (
          <Section title="Blocker">
            <p className="text-[12px] text-destructive">{blocker}</p>
          </Section>
        ) : null}
        {sourceLabel ? (
          <Section title="Source">
            {onOpenSource ? (
              <button
                type="button"
                onClick={onOpenSource}
                className="text-[12px] text-foreground underline-offset-2 hover:underline"
              >
                {sourceLabel}
              </button>
            ) : (
              <p className="text-[12px] text-muted-foreground">{sourceLabel}</p>
            )}
          </Section>
        ) : null}

        <Section title="Attempts">
          {attempts.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">No attempts yet.</p>
          ) : (
            <ul className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border">
              {attempts.map((attempt) => (
                <li
                  key={attempt.id}
                  className="flex items-center gap-2 px-2.5 py-2 text-[11px]"
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                    {attempt.label}
                  </span>
                  <span className="text-muted-foreground">
                    {attempt.phaseLabel}
                  </span>
                  {attempt.onOpenRun ? (
                    <button
                      type="button"
                      onClick={attempt.onOpenRun}
                      className="rounded-md px-2 py-1 text-foreground hover:bg-muted"
                    >
                      Open run
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {history.length > 0 ? (
          <Section title="History">
            <ul className="space-y-1">
              {history.map((event) => (
                <li key={event.id} className="text-[11px] text-muted-foreground">
                  {event.label}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function OverflowMenu({
  onEdit,
  onCopyId,
  onCancelWork,
}: {
  onEdit?: () => void;
  onCopyId?: () => void;
  onCancelWork?: () => void;
}) {
  if (!onEdit && !onCopyId && !onCancelWork) return null;
  return (
    <details className="relative">
      <summary
        aria-label="Work actions"
        className="flex size-7 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        ⋯
      </summary>
      <div className="absolute right-0 z-10 mt-1 min-w-36 rounded-md border border-border bg-card py-1 shadow-sm">
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="block w-full px-3 py-1.5 text-left text-[11px] hover:bg-muted"
          >
            Edit
          </button>
        ) : null}
        {onCopyId ? (
          <button
            type="button"
            onClick={onCopyId}
            className="block w-full px-3 py-1.5 text-left text-[11px] hover:bg-muted"
          >
            Copy ID
          </button>
        ) : null}
        {onCancelWork ? (
          <button
            type="button"
            onClick={onCancelWork}
            className="block w-full px-3 py-1.5 text-left text-[11px] text-destructive hover:bg-muted"
          >
            Cancel Work
          </button>
        ) : null}
      </div>
    </details>
  );
}

export type WorkInboxKind =
  | "review_required"
  | "approval"
  | "question"
  | "failed_attempt"
  | "blocked";

export type WorkInboxRow = {
  id: string;
  workId: string;
  kind: WorkInboxKind;
  title: string;
  why: string;
  ageLabel: string;
};

export type WorkInboxProps = {
  status: "loading" | "ready" | "error";
  rows: WorkInboxRow[];
  onOpenWork: (workId: string) => void;
  onGoToWork?: () => void;
  errorMessage?: string;
  onRetry?: () => void;
  className?: string;
};

const KIND_LABEL: Record<WorkInboxKind, string> = {
  review_required: "Review",
  approval: "Approval",
  question: "Question",
  failed_attempt: "Failed",
  blocked: "Blocked",
};

export function WorkInbox({
  status,
  rows,
  onOpenWork,
  onGoToWork,
  errorMessage,
  onRetry,
  className,
}: WorkInboxProps) {
  return (
    <div
      className={cn(
        "altai-work-inbox flex h-full min-h-0 flex-col overflow-hidden bg-card",
        className,
      )}
    >
      <header className="flex shrink-0 items-center border-b border-border-subtle px-3 py-2">
        <h2 className="text-[13px] font-semibold text-foreground">Inbox</h2>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {status === "loading" ? (
          <SurfaceLoadingState>Loading Inbox…</SurfaceLoadingState>
        ) : null}
        {status === "error" ? (
          <SurfaceInlineError
            className="m-3"
            message={errorMessage ?? "Inbox failed to load."}
            onDismiss={onRetry}
          />
        ) : null}
        {status === "ready" && rows.length === 0 ? (
          <SurfaceEmptyState
            title="Nothing needs you"
            description="Approvals, questions, and review-ready Work will appear here."
            action={
              onGoToWork ? (
                <button
                  type="button"
                  onClick={onGoToWork}
                  className="inline-flex h-7 items-center rounded-md border border-border px-2.5 text-[11px] font-medium"
                >
                  Go to Work
                </button>
              ) : undefined
            }
            className="border-0 bg-transparent"
          />
        ) : null}
        {status === "ready" && rows.length > 0 ? (
          <ul aria-label="Inbox" className="divide-y divide-border-subtle">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onOpenWork(row.workId)}
                  className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-muted/50"
                >
                  <span className="flex items-center gap-2 text-[10.5px] text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {KIND_LABEL[row.kind]}
                    </span>
                    <span className="ml-auto tabular-nums">{row.ageLabel}</span>
                  </span>
                  <span className="truncate text-[12px] font-medium text-foreground">
                    {row.title}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {row.why}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export type NewWorkDialogProps = {
  open: boolean;
  projectLabel: string;
  onClose: () => void;
  onCreate: (input: {
    title: string;
    description: string;
    acceptanceCriteria: string;
  }) => void;
  className?: string;
};

export function NewWorkDialog({
  open,
  projectLabel,
  onClose,
  onCreate,
  className,
}: NewWorkDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");

  if (!open) return null;

  const canCreate = title.trim().length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New Work"
      className={cn(
        "altai-new-work-dialog fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4",
        className,
      )}
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-sm">
        <h2 className="text-[13px] font-semibold text-foreground">New Work</h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Project: {projectLabel}
        </p>
        <label className="mt-3 block text-[10.5px] font-medium text-muted-foreground">
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[12px] text-foreground outline-none focus:border-ring"
            autoFocus
          />
        </label>
        <label className="mt-3 block text-[10.5px] font-medium text-muted-foreground">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="mt-1 w-full resize-y rounded-md border border-border bg-background px-2.5 py-1.5 text-[12px] text-foreground outline-none focus:border-ring"
          />
        </label>
        <label className="mt-3 block text-[10.5px] font-medium text-muted-foreground">
          Acceptance criteria
          <textarea
            value={acceptanceCriteria}
            onChange={(event) => setAcceptanceCriteria(event.target.value)}
            rows={3}
            className="mt-1 w-full resize-y rounded-md border border-border bg-background px-2.5 py-1.5 text-[12px] text-foreground outline-none focus:border-ring"
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 items-center rounded-md px-2.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canCreate}
            onClick={() => {
              onCreate({
                title: title.trim(),
                description: description.trim(),
                acceptanceCriteria: acceptanceCriteria.trim(),
              });
              setTitle("");
              setDescription("");
              setAcceptanceCriteria("");
            }}
            className="inline-flex h-7 items-center rounded-md bg-foreground px-2.5 text-[11px] font-medium text-background disabled:cursor-not-allowed disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

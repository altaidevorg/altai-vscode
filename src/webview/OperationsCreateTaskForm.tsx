/**
 * Host-owned create-task form for Operations Work/Runs.
 * Uses shared primary/secondary action chrome; transport stays on ports.
 */

import {
  CreateFormActions,
  PromptEditorSection,
  SurfacePrimaryAction,
  SurfaceSecondaryAction,
} from "@altai/agent-ui";
import { useEffect, useState } from "react";
import { validateTaskRunDraft } from "./taskRunDraft.js";

const TEMPLATES = [
  {
    label: "Explore",
    value:
      "Inspect this workspace without changing files. Summarize structure, entry points, and risks.",
  },
  {
    label: "Fix",
    value:
      "Investigate the reported issue, make the smallest focused fix, then run relevant verification.",
  },
  {
    label: "Test",
    value:
      "Discover the project test command, run the smallest relevant scope, and report results.",
  },
];

export type OperationsCreateTaskFormProps = {
  open: boolean;
  busy?: boolean;
  error?: string | null;
  initialTitle?: string;
  onOpen: () => void;
  onClose: () => void;
  onSubmit: (draft: { title: string; prompt: string }) => void | Promise<void>;
};

export function OperationsCreateTaskForm({
  open,
  busy = false,
  error = null,
  initialTitle = "",
  onOpen,
  onClose,
  onSubmit,
}: OperationsCreateTaskFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [prompt, setPrompt] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setPrompt("");
      setLocalError(null);
    }
  }, [open, initialTitle]);

  if (!open) {
    return (
      <div className="altai-ops-create-bar">
        <SurfacePrimaryAction type="button" onClick={onOpen}>
          New task
        </SurfacePrimaryAction>
      </div>
    );
  }

  const statusMessage = localError ?? error;
  const submitDisabled = busy;

  return (
    <form
      className="altai-ops-create-form"
      onSubmit={(event) => {
        event.preventDefault();
        const validated = validateTaskRunDraft({ title, prompt });
        if (!validated.ok) {
          setLocalError(validated.error);
          return;
        }
        setLocalError(null);
        void onSubmit(validated.draft);
      }}
    >
      <div className="altai-ops-create-form-header">
        <h2 className="altai-ops-create-form-title">New task run</h2>
        <SurfaceSecondaryAction type="button" onClick={onClose} disabled={busy}>
          Close
        </SurfaceSecondaryAction>
      </div>
      <label className="altai-ops-create-label" htmlFor="altai-ops-task-title">
        Title
        <input
          id="altai-ops-task-title"
          className="altai-ops-create-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={busy}
          maxLength={120}
          placeholder="Short name for this background run"
          autoComplete="off"
        />
      </label>
      <PromptEditorSection
        title="Instruction"
        description="What should the agent do in this workspace?"
        value={prompt}
        onChange={setPrompt}
        placeholder="Describe the work…"
        templates={TEMPLATES}
        textareaId="altai-ops-task-prompt"
        ariaLabel="Task instruction"
        maxLength={20_000}
        rows={6}
        size="task"
      />
      <CreateFormActions
        onCancel={onClose}
        submitLabel={busy ? "Creating…" : "Create task"}
        submitDisabled={submitDisabled}
        status={statusMessage}
        statusTone={statusMessage ? "destructive" : "muted"}
      />
    </form>
  );
}

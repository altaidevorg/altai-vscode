/**
 * Host-owned create-automation form for Operations Work / Scheduled.
 * Shared action chrome; transport stays on ports.createAutomation.
 * Optional skill chips when `skills.list` is advertised (parity with task form).
 */

import {
  CreateFormActions,
  PromptEditorSection,
  SurfacePrimaryAction,
  SurfaceSecondaryAction,
  TaskSkillChips,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import { useCallback, useEffect, useState } from "react";
import {
  AUTOMATION_INTERVAL_PRESETS,
  validateAutomationDraft,
  type AutomationDraft,
} from "./automationDraft.js";
import {
  composeTaskPromptWithSkills,
  toggleTaskSkillSelection,
} from "./taskRunDraft.js";

const TEMPLATES = [
  {
    label: "Health check",
    value:
      "Run a lightweight workspace health check. Summarize failures without changing files unless urgent.",
  },
  {
    label: "Tests",
    value:
      "Discover the project test command, run the smallest recurring scope that catches regressions, and report outcomes.",
  },
  {
    label: "Sync",
    value:
      "Review recent changes in this workspace and leave a short status summary for tomorrow.",
  },
];

export type OperationsCreateAutomationFormProps = {
  open: boolean;
  busy?: boolean;
  error?: string | null;
  initialTitle?: string;
  onOpen: () => void;
  onClose: () => void;
  onSubmit: (draft: AutomationDraft) => void | Promise<void>;
};

type SkillOption = { name: string; description?: string | null };

export function OperationsCreateAutomationForm({
  open,
  busy = false,
  error = null,
  initialTitle = "",
  onOpen,
  onClose,
  onSubmit,
}: OperationsCreateAutomationFormProps) {
  const ports = useHostPorts();
  const canListSkills = useCapability("skills.list");
  const [title, setTitle] = useState(initialTitle);
  const [prompt, setPrompt] = useState("");
  const [scheduleKind, setScheduleKind] = useState<"once" | "every">("every");
  const [everyMs, setEveryMs] = useState<number>(
    AUTOMATION_INTERVAL_PRESETS[1].everyMs,
  );
  const [onceAt, setOnceAt] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const loadSkills = useCallback(async () => {
    if (!canListSkills) {
      setSkills([]);
      return;
    }
    try {
      const next = await ports.mcpSkills.listSkills();
      setSkills(
        next.map((skill) => ({
          name: skill.name,
          ...(skill.description ? { description: skill.description } : {}),
        })),
      );
    } catch {
      setSkills([]);
    }
  }, [ports, canListSkills]);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setPrompt("");
      setScheduleKind("every");
      setEveryMs(AUTOMATION_INTERVAL_PRESETS[1].everyMs);
      setOnceAt("");
      setLocalError(null);
      setSelectedSkills([]);
      void loadSkills();
    }
  }, [open, initialTitle, loadSkills]);

  if (!open) {
    return (
      <div className="altai-ops-create-bar">
        <SurfacePrimaryAction type="button" onClick={onOpen}>
          New automation
        </SurfacePrimaryAction>
      </div>
    );
  }

  const statusMessage = localError ?? error;

  return (
    <form
      className="altai-ops-create-form"
      onSubmit={(event) => {
        event.preventDefault();
        const onceIso =
          scheduleKind === "once" && onceAt
            ? new Date(onceAt).toISOString()
            : onceAt;
        const withSkills = composeTaskPromptWithSkills(prompt, selectedSkills);
        const validated = validateAutomationDraft({
          title,
          prompt: withSkills,
          scheduleKind,
          onceAt: onceIso,
          everyMs,
        });
        if (!validated.ok) {
          setLocalError(validated.error);
          return;
        }
        setLocalError(null);
        void onSubmit(validated.draft);
      }}
    >
      <div className="altai-ops-create-form-header">
        <h2 className="altai-ops-create-form-title">New automation</h2>
        <SurfaceSecondaryAction type="button" onClick={onClose} disabled={busy}>
          Close
        </SurfaceSecondaryAction>
      </div>
      <label className="altai-ops-create-label" htmlFor="altai-ops-auto-title">
        Title
        <input
          id="altai-ops-auto-title"
          className="altai-ops-create-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={busy}
          maxLength={120}
          placeholder="Short name for this schedule"
          autoComplete="off"
        />
      </label>
      <fieldset className="altai-ops-create-fieldset" disabled={busy}>
        <legend className="altai-ops-create-legend">Schedule</legend>
        <label className="altai-ops-create-radio">
          <input
            type="radio"
            name="altai-ops-auto-kind"
            checked={scheduleKind === "every"}
            onChange={() => setScheduleKind("every")}
          />
          Repeat
        </label>
        <label className="altai-ops-create-radio">
          <input
            type="radio"
            name="altai-ops-auto-kind"
            checked={scheduleKind === "once"}
            onChange={() => setScheduleKind("once")}
          />
          Once
        </label>
        {scheduleKind === "every" ? (
          <label className="altai-ops-create-label" htmlFor="altai-ops-auto-every">
            Interval
            <select
              id="altai-ops-auto-every"
              className="altai-ops-create-input"
              value={String(everyMs)}
              onChange={(event) => setEveryMs(Number(event.target.value))}
            >
              {AUTOMATION_INTERVAL_PRESETS.map((preset) => (
                <option key={preset.everyMs} value={String(preset.everyMs)}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="altai-ops-create-label" htmlFor="altai-ops-auto-once">
            When
            <input
              id="altai-ops-auto-once"
              className="altai-ops-create-input"
              type="datetime-local"
              value={onceAt}
              onChange={(event) => setOnceAt(event.target.value)}
            />
          </label>
        )}
      </fieldset>
      <PromptEditorSection
        title="Instruction"
        description="What should the agent do when this schedule fires?"
        value={prompt}
        onChange={setPrompt}
        placeholder="Describe the recurring work…"
        templates={TEMPLATES}
        textareaId="altai-ops-auto-prompt"
        ariaLabel="Automation instruction"
        maxLength={20_000}
        rows={6}
        size="task"
      />
      {canListSkills && skills.length > 0 ? (
        <TaskSkillChips
          skills={skills}
          selected={selectedSkills}
          onToggle={(name) => {
            setSelectedSkills((prev) => toggleTaskSkillSelection(prev, name));
          }}
        />
      ) : null}
      <CreateFormActions
        onCancel={onClose}
        submitLabel={busy ? "Creating…" : "Create automation"}
        submitDisabled={busy}
        status={statusMessage}
        statusTone={statusMessage ? "destructive" : "muted"}
      />
    </form>
  );
}

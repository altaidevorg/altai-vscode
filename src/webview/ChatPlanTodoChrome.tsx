/**
 * PlanModeStrip + sticky TodoSummaryChip wired to HostPorts permission mode.
 */

import {
  PlanModeStrip,
  TodoSummaryChip,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import type { PermissionMode } from "@altai/host-contract";
import { useState } from "react";
import { formatHostUserError } from "../shared/hostUserError.js";
import type { ChatDisplayMessage } from "./chatDisplayMessage.js";
import {
  isPlanPermissionMode,
  latestTodosFromMessages,
  permissionModeAfterExitPlan,
} from "./chatPlanChrome.js";
import {
  countPendingEditDiffs,
  lastEditDiffMessage,
} from "./chatRunChrome.js";

export type ChatPlanTodoChromeProps = {
  permissionMode: PermissionMode | null;
  messages: readonly ChatDisplayMessage[];
  onModeChange?: (mode: PermissionMode | null) => void;
  onOpenFileError?: (message: string) => void;
};

export function ChatPlanTodoChrome({
  permissionMode,
  messages,
  onModeChange,
  onOpenFileError,
}: ChatPlanTodoChromeProps) {
  const ports = useHostPorts();
  const canUpdate = useCapability("settings.update");
  const canModes = useCapability("interactive.permissionModes");
  const canOpenDiff = useCapability("workspace.openDiff");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planActive = isPlanPermissionMode(permissionMode);
  const queueLen = countPendingEditDiffs(messages);
  const todos = latestTodosFromMessages(messages);

  if (!planActive && todos.length === 0) {
    return null;
  }

  const openReview = () => {
    const target = lastEditDiffMessage(messages);
    if (!target) {
      return;
    }
    const el = document.getElementById(`altai-msg-${target.id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (
      !canOpenDiff ||
      busy ||
      target.diffOriginalText === undefined ||
      target.diffModifiedText === undefined
    ) {
      return;
    }
    setBusy(true);
    void ports.workspace
      .openDiff({
        title: target.filePath
          ? `ALTAI · ${target.filePath}`
          : "ALTAI review",
        originalText: target.diffOriginalText,
        modifiedText: target.diffModifiedText,
        ...(target.filePath ? { path: target.filePath } : {}),
      })
      .catch((err: unknown) => {
        const message = formatHostUserError(err);
        setError(message);
        onOpenFileError?.(message);
      })
      .finally(() => {
        setBusy(false);
      });
  };

  return (
    <div className="altai-plan-todo-chrome">
      {planActive ? (
        <PlanModeStrip
          active
          queueLen={queueLen}
          onReview={openReview}
          onExit={() => {
            if (!canUpdate || !canModes || busy) {
              return;
            }
            setBusy(true);
            setError(null);
            const next = permissionModeAfterExitPlan();
            void ports.settings
              .setPermissionMode(next)
              .then((applied) => {
                onModeChange?.(applied);
              })
              .catch((err: unknown) => {
                setError(formatHostUserError(err));
              })
              .finally(() => {
                setBusy(false);
              });
          }}
        />
      ) : null}
      {todos.length > 0 ? (
        <div className="altai-todo-summary-row">
          <TodoSummaryChip todos={todos} />
        </div>
      ) : null}
      {error ? (
        <p className="altai-chat-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

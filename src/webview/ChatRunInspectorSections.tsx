/**
 * Run-inspector collapsible sections under Run details (approvals, todos,
 * changes, activity). Presentational only; approvals still flow through ports
 * in the respond callback.
 */

import {
  ActivityInspector,
  ApprovalsInspector,
  ChangesInspector,
  InspectorSection,
  TodosInspector,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import { useMemo } from "react";
import type { ChatDisplayMessage } from "./chatDisplayMessage.js";
import type { PendingToolApproval } from "./interactivePrompt.js";
import {
  buildRunInspectorSections,
  hasRunInspectorContent,
} from "./runInspectorChrome.js";

export type ChatRunInspectorSectionsProps = {
  messages: readonly ChatDisplayMessage[];
  approvals: readonly PendingToolApproval[];
  onApprovalsChange: (next: PendingToolApproval[]) => void;
  onOpenChangeReview?: () => void;
  inputTokens?: number;
  outputTokens?: number;
};

export function ChatRunInspectorSections({
  messages,
  approvals,
  onApprovalsChange,
  onOpenChangeReview,
  inputTokens = 0,
  outputTokens = 0,
}: ChatRunInspectorSectionsProps) {
  const ports = useHostPorts();
  const canApproval = useCapability("interactive.approval");
  const model = useMemo(
    () => buildRunInspectorSections({ approvals, messages }),
    [approvals, messages],
  );

  if (!hasRunInspectorContent(model)) {
    return null;
  }

  return (
    <div
      className="altai-run-inspector-sections space-y-2 px-2.5 pb-2"
      aria-label="Run inspector sections"
    >
      {model.approvals.length > 0 ? (
        <InspectorSection
          title="Approvals"
          summary={`${model.approvals.length} waiting`}
          count={model.approvals.length}
          defaultOpen
        >
          <ApprovalsInspector
            approvals={model.approvals}
            onRespond={(id, approved) => {
              if (!canApproval) {
                return;
              }
              const row = approvals.find((a) => a.approvalId === id);
              if (!row) {
                return;
              }
              void (async () => {
                try {
                  await ports.runtime.respondToApproval({
                    chatId: row.chatId,
                    runId: row.runId,
                    approvalId: row.approvalId,
                    decision: approved ? "approve" : "deny",
                  });
                  onApprovalsChange(
                    approvals.filter((a) => a.approvalId !== id),
                  );
                } catch {
                  // ChatInteractivePrompts remains primary surface for errors.
                }
              })();
            }}
          />
        </InspectorSection>
      ) : null}
      {model.todos && model.todos.total > 0 ? (
        <InspectorSection
          title="Todos"
          summary={`${model.todos.done}/${model.todos.total} done`}
          count={model.todos.total}
        >
          <TodosInspector
            done={model.todos.done}
            total={model.todos.total}
            todos={model.todos.todos}
          />
        </InspectorSection>
      ) : null}
      {model.changes.length > 0 && onOpenChangeReview ? (
        <InspectorSection
          title="Changes"
          summary={`${model.changes.length} proposed`}
          count={model.changes.length}
        >
          <ChangesInspector
            queue={model.changes}
            onOpenReview={onOpenChangeReview}
          />
        </InspectorSection>
      ) : null}
      {model.activity.length > 0 ? (
        <InspectorSection
          title="Activity"
          summary={`${model.activity.length} tool events`}
          count={model.activity.length}
        >
          <ActivityInspector
            events={model.activity}
            hasQuery={false}
            compact
            inputTokens={inputTokens}
            outputTokens={outputTokens}
            approvalsPending={model.approvals.length}
          />
        </InspectorSection>
      ) : null}
    </div>
  );
}

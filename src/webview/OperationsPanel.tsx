/**
 * VS Code mount of the shared Operations surfaces.
 *
 * Renders `OperationsNavigationShell` with the Overview view; Work/Inbox/Runs
 * routes stay inert until their canonical slices land. Data is aggregated
 * from the existing Work/Inbox host ports (`operationsOverview.ts`) — there
 * is no webview-owned store, and a canonical `OperationsSummary` projection
 * replaces this composition later.
 */

import {
  OperationsNavigationShell,
  OperationsOverview,
  useCapability,
  useHostPorts,
  useHostPortsContext,
  type OperationsView,
} from "@altai/agent-ui";
import { useCallback, useEffect, useState } from "react";
import {
  buildOperationsOverview,
  EMPTY_OPERATIONS_DATA,
  type OperationsOverviewData,
} from "./operationsOverview.js";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: OperationsOverviewData };

export function OperationsPanel() {
  const ports = useHostPorts();
  const { capabilities } = useHostPortsContext();
  const canTaskRuns = useCapability("work.taskRuns");
  const canAutomations = useCapability("work.automations");
  const canInbox = useCapability("inbox.notifications");
  const [view, setView] = useState<OperationsView>("overview");
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = useCallback(async () => {
    // Capabilities are null until runtime.initialize completes; the effect
    // re-runs when they arrive, so stay in the loading state until then.
    if (!capabilities) {
      return;
    }
    try {
      const [taskRuns, automations, notifications] = await Promise.all([
        canTaskRuns ? ports.work.listTaskRuns() : Promise.resolve([]),
        canAutomations ? ports.work.listAutomations() : Promise.resolve([]),
        canInbox ? ports.inbox.listNotifications() : Promise.resolve([]),
      ]);
      setState({
        status: "ready",
        data: { taskRuns, automations, notifications },
      });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [ports, capabilities, canTaskRuns, canAutomations, canInbox]);

  useEffect(() => {
    setState({ status: "loading" });
    void load();
  }, [load]);

  useEffect(
    () =>
      ports.events.subscribe((event) => {
        if (event.type === "lifecycle" || event.type === "notification") {
          void load();
        }
      }),
    [ports, load],
  );

  const viewModel = buildOperationsOverview(
    state.status === "ready" ? state.data : EMPTY_OPERATIONS_DATA,
  );

  return (
    <OperationsNavigationShell
      view={view}
      onViewChange={setView}
      availableViews={["overview"]}
    >
      <OperationsOverview
        status={
          state.status === "error"
            ? "error"
            : state.status === "ready"
              ? "ready"
              : "loading"
        }
        {...(state.status === "error"
          ? {
              errorMessage: state.message,
              onDismissError: () => {
                setState({ status: "loading" });
                void load();
              },
            }
          : {})}
        metrics={viewModel.metrics}
        attention={viewModel.attention}
        progressing={viewModel.progressing}
      />
    </OperationsNavigationShell>
  );
}

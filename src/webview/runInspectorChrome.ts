/**
 * Pure helpers mapping Chat webview state into run-inspector section props.
 * Shared implementation lives in `@altai/agent-ui` (A6.68).
 */

export {
  activityFromMessages,
  buildRunInspectorSections,
  changesFromMessages,
  hasRunInspectorContent,
  latestTodosFromMessages,
  mapApprovalsToInspectorItems as approvalsToInspectorItems,
  type ActivityInspectorEventView as ActivityInspectorEvent,
  type ApprovalsInspectorItemView as ApprovalsInspectorItem,
  type ChangesInspectorItemView as ChangesInspectorItem,
  type InspectorTodosModelView as InspectorTodosModel,
  type PendingApprovalLike,
  type RunInspectorMessageLike,
  type RunInspectorSectionsModelView as RunInspectorSectionsModel,
  type TodosInspectorItemView as TodosInspectorItem,
} from "@altai/agent-ui";

/**
 * Pure helpers for capability-gating and filtering the Chat model picker.
 * Shared implementation lives in `@altai/agent-ui` (A6.87).
 */

export {
  AUTO_MODEL_ID,
  canMountModelPicker,
  filterModels,
  modelIdForStartRun,
  modelTriggerLabel,
  resolveSelectedModelId,
  type ModelPickerFlags,
} from "@altai/agent-ui";

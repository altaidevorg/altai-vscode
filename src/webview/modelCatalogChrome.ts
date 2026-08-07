/**
 * Merge host model list with the Studio catalog.
 */

import type { ModelInfo } from "@altai/host-contract";
import { CATALOG_MODELS } from "../shared/modelCatalog.js";
import { AUTO_MODEL_ID } from "./modelPickerChrome.js";

/**
 * Prefer host entries, then fill gaps from the Studio catalog so the picker
 * always offers known models (still selected only via host config/update).
 */
export function mergeModelCatalog(
  hostModels: readonly ModelInfo[],
): ModelInfo[] {
  const byId = new Map<string, ModelInfo>();
  byId.set(AUTO_MODEL_ID, {
    id: AUTO_MODEL_ID,
    label: "Auto",
    providerId: "auto",
  });
  for (const model of CATALOG_MODELS) {
    byId.set(model.id, model);
  }
  for (const model of hostModels) {
    const id = model.id.trim();
    if (!id) {
      continue;
    }
    byId.set(id, {
      id,
      label: model.label?.trim() || id,
      providerId: model.providerId?.trim() || "unknown",
    });
  }
  return [...byId.values()].sort((a, b) => {
    if (a.id === AUTO_MODEL_ID) {
      return -1;
    }
    if (b.id === AUTO_MODEL_ID) {
      return 1;
    }
    const provider = a.providerId.localeCompare(b.providerId);
    if (provider !== 0) {
      return provider;
    }
    return a.label.localeCompare(b.label);
  });
}

/** Models usable now given connected (or keyless) providers. */
export function filterModelsByProviderKeys(
  models: readonly ModelInfo[],
  connectedProviderIds: ReadonlySet<string>,
): ModelInfo[] {
  return models.filter((model) => {
    if (model.id === AUTO_MODEL_ID) {
      return true;
    }
    if (model.providerId === "auto") {
      return true;
    }
    // Always show everything; the picker/UI can mark locked separately.
    // When no providers connected at all, still show full catalog.
    void connectedProviderIds;
    return true;
  });
}

export function providerIdForModel(
  modelId: string,
  models: readonly ModelInfo[],
): string | undefined {
  if (!modelId || modelId === AUTO_MODEL_ID) {
    return undefined;
  }
  return models.find((model) => model.id === modelId)?.providerId;
}

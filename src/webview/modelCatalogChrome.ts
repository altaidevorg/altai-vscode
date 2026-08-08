/**
 * Merge host model list with the Studio catalog.
 * Shared merge/filter rules live in `@altai/agent-ui` (A6.89); catalog rows
 * stay host-owned so secrets never land in the Webview package.
 */

import type { ModelInfo } from "@altai/host-contract";
import { mergeModelCatalog as packageMergeModelCatalog } from "@altai/agent-ui";
import { CATALOG_MODELS } from "../shared/modelCatalog.js";

export {
  filterModelsByProviderKeys,
  providerIdForModel,
  type CatalogModelEntry,
} from "@altai/agent-ui";

/**
 * Prefer host entries, then fill gaps from the Studio catalog so the picker
 * always offers known models (still selected only via host config/update).
 */
export function mergeModelCatalog(
  hostModels: readonly ModelInfo[],
): ModelInfo[] {
  return packageMergeModelCatalog(hostModels, CATALOG_MODELS);
}

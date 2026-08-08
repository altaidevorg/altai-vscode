/**
 * VS Code re-exports headless useComposerController from `@altai/agent-ui`
 * (A6.36). Hosts still inject HostPorts send/steer and slash catalogs.
 */

export {
  useComposerController,
  type ComposerCommandPick,
  type ComposerController,
  type UseComposerControllerOptions,
} from "@altai/agent-ui";

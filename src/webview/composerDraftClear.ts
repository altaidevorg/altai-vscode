/**
 * VS Code re-exports pure composer draft clearance from `@altai/agent-ui`
 * (A6.34). Hosts still own React state setters and HostPorts send/steer.
 */

export {
  clearComposerDraftAfterAccept,
  type ComposerDraftState,
} from "@altai/agent-ui";

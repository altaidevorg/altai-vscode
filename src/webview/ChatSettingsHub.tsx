/**
 * Collated Settings surface: reuses Chat chrome (provider, model, permission,
 * MCP, skills) without a second settings stack or new RPC.
 */

import {
  SurfaceEmptyState,
  SurfaceHeader,
  SurfaceSecondaryAction,
  useCapability,
} from "@altai/agent-ui";
import { ChatModelPickerChrome } from "./ChatModelPickerChrome.js";
import { ChatMcpStatusChrome } from "./ChatMcpStatusChrome.js";
import { ChatPermissionModeChrome } from "./ChatPermissionModeChrome.js";
import { ChatProviderStatusChrome } from "./ChatProviderStatusChrome.js";
import { ChatSkillsStatusChrome } from "./ChatSkillsStatusChrome.js";
import { listRecoveryActions } from "./hostRecoveryActions.js";
import { canMountModelPicker } from "./modelPickerChrome.js";
import { listSettingsHubSections } from "./settingsHubChrome.js";

export { listSettingsHubSections } from "./settingsHubChrome.js";

export type ChatSettingsHubProps = {
  extensionVersion?: string;
  hostStatusLabel?: string;
  requestWorkspace?: (method: string, params?: unknown) => Promise<unknown>;
};

export function ChatSettingsHub({
  extensionVersion,
  hostStatusLabel,
  requestWorkspace,
}: ChatSettingsHubProps) {
  const canProvider = useCapability("settings.providerStatus");
  const canListModels = useCapability("models.list");
  const canSelectModel = useCapability("models.select");
  const canGetSettings = useCapability("settings.get");
  const canPermission = useCapability("interactive.permissionModes");
  const canMcp = useCapability("mcp.list");
  const canSkills = useCapability("skills.list");
  const canModel = canMountModelPicker({
    list: canListModels,
    select: canSelectModel,
    settingsGet: canGetSettings,
  });

  const sections = listSettingsHubSections({
    canProvider,
    canModel,
    canPermission,
    canMcp,
    canSkills,
  });
  const recoveryActions = listRecoveryActions();

  return (
    <section className="altai-settings-hub" aria-label="ALTAI settings">
      <SurfaceHeader
        title="Settings"
        subtitle="Host capabilities control which controls appear. Secrets stay in the Extension Host."
      />
      {sections.length === 0 ? (
        <SurfaceEmptyState
          title="No settings available"
          description="Connect the ALTAI host and configure providers to unlock settings."
        />
      ) : (
        <div className="altai-settings-hub-sections space-y-3 p-3">
          {canProvider ? (
            <div className="altai-settings-hub-card">
              <h3 className="altai-settings-hub-heading text-[11px] font-semibold text-muted-foreground">
                Provider
              </h3>
              <ChatProviderStatusChrome />
            </div>
          ) : null}
          {canModel ? (
            <div className="altai-settings-hub-card">
              <h3 className="altai-settings-hub-heading text-[11px] font-semibold text-muted-foreground">
                Model
              </h3>
              <ChatModelPickerChrome />
            </div>
          ) : null}
          {canPermission ? (
            <div className="altai-settings-hub-card">
              <h3 className="altai-settings-hub-heading text-[11px] font-semibold text-muted-foreground">
                Permission mode
              </h3>
              <ChatPermissionModeChrome />
            </div>
          ) : null}
          {canMcp ? (
            <div className="altai-settings-hub-card">
              <h3 className="altai-settings-hub-heading text-[11px] font-semibold text-muted-foreground">
                MCP
              </h3>
              <ChatMcpStatusChrome />
            </div>
          ) : null}
          {canSkills ? (
            <div className="altai-settings-hub-card">
              <h3 className="altai-settings-hub-heading text-[11px] font-semibold text-muted-foreground">
                Skills
              </h3>
              <ChatSkillsStatusChrome />
            </div>
          ) : null}
        </div>
      )}
      <div className="altai-settings-hub-about space-y-1 border-t border-border-subtle p-3 text-[11px] text-muted-foreground">
        <h3 className="font-semibold text-foreground">About</h3>
        <p>
          Extension{" "}
          {extensionVersion?.trim() ? extensionVersion.trim() : "unknown"}
        </p>
        {hostStatusLabel ? <p>Host · {hostStatusLabel}</p> : null}
        {requestWorkspace ? (
          <div
            className="altai-ops-create-bar"
            style={{
              paddingTop: "0.5rem",
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            {recoveryActions.map((action) => (
              <SurfaceSecondaryAction
                key={action.command}
                type="button"
                onClick={() => {
                  void requestWorkspace("executeAltaiCommand", {
                    command: action.command,
                  }).catch(() => {
                    /* allowlisted; failures surface in Extension Host */
                  });
                }}
              >
                {action.label}
              </SurfaceSecondaryAction>
            ))}
          </div>
        ) : (
          <p>
            Use ALTAI: Run Diagnostics for compatibility pins and recovery
            hints.
          </p>
        )}
      </div>
    </section>
  );
}

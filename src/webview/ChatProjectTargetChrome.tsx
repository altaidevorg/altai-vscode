/**
 * Capability-gated workspace project chip under the composer.
 * Click reveals the folder in the VS Code Explorer (no project switcher yet).
 */

import { ChatProjectTarget, useCapability, useHostPorts } from "@altai/agent-ui";
import { useCallback, useEffect, useState } from "react";
import {
  canMountProjectTarget,
  projectTargetFromWorkspace,
  type ProjectTargetView,
} from "./projectTargetChrome.js";

export type ChatProjectTargetChromeProps = {
  /** Extension workspace adapter (revealInExplorer) — not on host-contract ports. */
  requestWorkspace: (method: string, params?: unknown) => Promise<unknown>;
};

export function ChatProjectTargetChrome({
  requestWorkspace,
}: ChatProjectTargetChromeProps) {
  const ports = useHostPorts();
  const canInfo = useCapability("workspace.info");
  const canShow = canMountProjectTarget({ workspaceInfo: canInfo });
  const [target, setTarget] = useState<ProjectTargetView>(() =>
    projectTargetFromWorkspace(null),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!canShow) {
      setTarget(projectTargetFromWorkspace(null));
      return;
    }
    try {
      const info = await ports.workspace.getWorkspace();
      setTarget(projectTargetFromWorkspace(info));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [ports, canShow]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canShow) {
    return null;
  }

  return (
    <div className="altai-project-target-host">
      {error ? (
        <p className="altai-chat-error px-3 pb-1" role="alert">
          {error}
        </p>
      ) : null}
      <ChatProjectTarget
        name={target.name}
        path={target.path}
        kind={target.kind}
        onChange={() => {
          void (async () => {
            if (busy) {
              return;
            }
            if (!target.rootUri) {
              setError("No workspace folder open");
              return;
            }
            setBusy(true);
            setError(null);
            try {
              await requestWorkspace("revealInExplorer", {
                uri: target.rootUri,
              });
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            } finally {
              setBusy(false);
            }
          })();
        }}
      />
    </div>
  );
}

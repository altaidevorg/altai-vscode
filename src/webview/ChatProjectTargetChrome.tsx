/**
 * Capability-gated workspace project chip under the composer.
 * Multi-root workspaces: click opens a QuickPick to change target; then reveal.
 * Single root: click reveals the folder in Explorer.
 */

import { ChatProjectTarget, useCapability, useHostPorts } from "@altai/agent-ui";
import { useCallback, useEffect, useState } from "react";
import {
  canMountProjectTarget,
  projectTargetFromWorkspace,
  retainPreferredRoot,
  type ProjectTargetView,
} from "./projectTargetChrome.js";

export type ChatProjectTargetChromeProps = {
  /** Extension workspace adapter (reveal / pick) — not on host-contract ports. */
  requestWorkspace: (method: string, params?: unknown) => Promise<unknown>;
  initialPreferredRootUri?: string | null;
  onPreferredRootUriChange?: (uri: string | null) => void;
};

export function ChatProjectTargetChrome({
  requestWorkspace,
  initialPreferredRootUri = null,
  onPreferredRootUriChange,
}: ChatProjectTargetChromeProps) {
  const ports = useHostPorts();
  const canInfo = useCapability("workspace.info");
  const canShow = canMountProjectTarget({ workspaceInfo: canInfo });
  const [preferredRootUri, setPreferredRootUri] = useState<string | null>(
    () => initialPreferredRootUri,
  );
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
      const next = retainPreferredRoot(preferredRootUri, info.roots);
      if (next !== preferredRootUri) {
        setPreferredRootUri(next);
        onPreferredRootUriChange?.(next);
      }
      setTarget(projectTargetFromWorkspace(info, next));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [ports, canShow, preferredRootUri, onPreferredRootUriChange]);

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
            setBusy(true);
            setError(null);
            try {
              let rootUri = target.rootUri;
              if (target.multiRoot) {
                const picked = await requestWorkspace("pickWorkspaceFolder", {});
                if (
                  picked &&
                  typeof picked === "object" &&
                  typeof (picked as { uri?: unknown }).uri === "string"
                ) {
                  const uri = (picked as { uri: string }).uri;
                  setPreferredRootUri(uri);
                  onPreferredRootUriChange?.(uri);
                  const info = await ports.workspace.getWorkspace();
                  setTarget(projectTargetFromWorkspace(info, uri));
                  rootUri = uri;
                } else if (picked === null) {
                  return;
                }
              }
              if (!rootUri) {
                setError("No workspace folder open");
                return;
              }
              await requestWorkspace("revealInExplorer", { uri: rootUri });
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

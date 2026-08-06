/**
 * Capability-gated Chat model picker using shared ComposerConfigTrigger + ModelOption.
 */

import {
  ComposerConfigTrigger,
  ModelOption,
  useCapability,
  useHostPorts,
} from "@altai/agent-ui";
import type { ModelInfo } from "@altai/host-contract";
import { AiBookIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AUTO_MODEL_ID,
  canMountModelPicker,
  filterModels,
  modelTriggerLabel,
  resolveSelectedModelId,
} from "./modelPickerChrome.js";

export type ChatModelPickerChromeProps = {
  /** Notify parent of selected model id (or null when unavailable). */
  onModelChange?: (modelId: string | null) => void;
};

export function ChatModelPickerChrome({
  onModelChange,
}: ChatModelPickerChromeProps) {
  const ports = useHostPorts();
  const canList = useCapability("models.list");
  const canSelect = useCapability("models.select");
  const canGet = useCapability("settings.get");
  const canShow = canMountModelPicker({
    list: canList,
    select: canSelect,
    settingsGet: canGet,
  });

  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedId, setSelectedId] = useState(AUTO_MODEL_ID);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!canShow) {
      setReady(false);
      onModelChange?.(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [settings, listed] = await Promise.all([
          ports.settings.getSettings(),
          ports.settings.listModels(),
        ]);
        if (cancelled) {
          return;
        }
        const nextSelected = resolveSelectedModelId(settings.defaultModelId);
        setModels(listed);
        setSelectedId(nextSelected);
        setReady(true);
        onModelChange?.(nextSelected);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
        setReady(false);
        onModelChange?.(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ports, canShow, onModelChange]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDoc = (event: MouseEvent) => {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const visible = useMemo(
    () => filterModels(models, search),
    [models, search],
  );

  const pick = useCallback(
    async (id: string) => {
      setError(null);
      try {
        const settings = await ports.settings.updateSettings({
          defaultModelId: id,
        });
        const next = resolveSelectedModelId(settings.defaultModelId);
        setSelectedId(next);
        onModelChange?.(next);
        setOpen(false);
        setSearch("");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [ports, onModelChange],
  );

  if (!canShow || !ready) {
    return error && canShow ? (
      <p className="altai-chat-error" role="alert">
        {error}
      </p>
    ) : null;
  }

  const triggerLabel = modelTriggerLabel(selectedId, models);

  return (
    <div className="altai-model-chrome" ref={rootRef}>
      <ComposerConfigTrigger
        icon={
          <HugeiconsIcon
            icon={AiBookIcon}
            size={12}
            strokeWidth={1.75}
            className="shrink-0"
          />
        }
        label={triggerLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
      />
      {open ? (
        <div className="altai-model-popover" role="listbox" aria-label="Models">
          <input
            className="altai-model-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search models…"
            aria-label="Search models"
            autoFocus
          />
          <div className="altai-model-options">
            <ModelOption
              modelLabel="Auto"
              detail="Host chooses a model"
              providerIcon={AiBookIcon}
              selected={selectedId === AUTO_MODEL_ID}
              active={false}
              showProvider
              onClick={() => {
                void pick(AUTO_MODEL_ID);
              }}
            />
            {visible.length === 0 ? (
              <p className="altai-shell-meta">No matching models.</p>
            ) : (
              visible.map((model) => (
                <ModelOption
                  key={model.id}
                  modelLabel={model.label}
                  detail={model.providerId}
                  providerIcon={AiBookIcon}
                  selected={selectedId === model.id}
                  active={false}
                  showProvider
                  onClick={() => {
                    void pick(model.id);
                  }}
                />
              ))
            )}
          </div>
        </div>
      ) : null}
      {error ? (
        <p className="altai-chat-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

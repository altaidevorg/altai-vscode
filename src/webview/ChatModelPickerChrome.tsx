/**
 * Capability-gated Chat model picker using shared ComposerConfigTrigger + ModelOption.
 */

import {
  ComposerConfigTrigger,
  formatHostUserError,
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
import {
  mergeModelCatalog,
  providerIdForModel,
} from "./modelCatalogChrome.js";

export type ChatModelPickerChromeProps = {
  /** Notify parent of selected model id (or null when unavailable). */
  onModelChange?: (modelId: string | null) => void;
  /**
   * `trigger` — compact composer popover (default).
   * `settings` — full expanded list for Settings Models section.
   */
  layout?: "trigger" | "settings";
};

export function ChatModelPickerChrome({
  onModelChange,
  layout = "trigger",
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
        setModels(mergeModelCatalog(listed));
        setSelectedId(nextSelected);
        setReady(true);
        onModelChange?.(nextSelected);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(formatHostUserError(err));
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
    const onDoc = (event: PointerEvent) => {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    };
    // pointerdown so we win the race vs other popovers that open on click.
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visible = useMemo(
    () => filterModels(models, search),
    [models, search],
  );

  const pick = useCallback(
    async (id: string) => {
      setError(null);
      try {
        const providerId = providerIdForModel(id, models);
        const settings = await ports.settings.updateSettings({
          defaultModelId: id,
          ...(providerId && providerId !== "auto" && providerId !== "unknown"
            ? { defaultProviderId: providerId }
            : {}),
        });
        const next = resolveSelectedModelId(settings.defaultModelId);
        setSelectedId(next);
        onModelChange?.(next);
        setOpen(false);
        setSearch("");
      } catch (err) {
        setError(formatHostUserError(err));
      }
    },
    [ports, onModelChange, models],
  );

  if (!canShow || !ready) {
    return error && canShow ? (
      <p className="altai-chat-error" role="alert">
        {error}
      </p>
    ) : null;
  }

  const triggerLabel = modelTriggerLabel(selectedId, models);

  if (layout === "settings") {
    return (
      <div className="altai-model-settings" aria-label="Default model">
        <div className="altai-settings-stack">
          <label className="altai-settings-row altai-settings-row--stacked">
            <div className="altai-settings-row-copy">
              <span className="altai-settings-row-title">Search models</span>
              <span className="altai-settings-row-desc">
                Filter by name or provider. Select a row to set the default for
                new runs.
              </span>
            </div>
            <div className="altai-settings-row-control">
              <input
                className="altai-settings-input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search models…"
                aria-label="Search models"
              />
            </div>
          </label>
          <div className="altai-model-settings-list" role="listbox" aria-label="Models">
            <button
              type="button"
              role="option"
              aria-selected={selectedId === AUTO_MODEL_ID}
              className={
                selectedId === AUTO_MODEL_ID
                  ? "altai-model-settings-option is-selected"
                  : "altai-model-settings-option"
              }
              onClick={() => {
                void pick(AUTO_MODEL_ID);
              }}
            >
              <span className="altai-settings-row-title">Auto</span>
              <span className="altai-settings-row-desc">Host chooses a model</span>
            </button>
            {visible.length === 0 ? (
              <p className="altai-shell-meta">No matching models.</p>
            ) : (
              visible.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  role="option"
                  aria-selected={selectedId === model.id}
                  className={
                    selectedId === model.id
                      ? "altai-model-settings-option is-selected"
                      : "altai-model-settings-option"
                  }
                  onClick={() => {
                    void pick(model.id);
                  }}
                >
                  <span className="altai-settings-row-title">{model.label}</span>
                  <span className="altai-settings-row-desc">{model.providerId}</span>
                </button>
              ))
            )}
          </div>
          <p className="altai-settings-row-desc">
            Selected: <strong>{triggerLabel}</strong>
          </p>
        </div>
        {error ? (
          <p className="altai-chat-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="altai-model-chrome" ref={rootRef} data-open={open ? "1" : "0"}>
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
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      />
      {open ? (
        <div
          className="altai-model-popover"
          role="listbox"
          aria-label="Models"
          onPointerDown={(event) => {
            // Keep focus/search interactions inside the popover from closing.
            event.stopPropagation();
          }}
        >
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

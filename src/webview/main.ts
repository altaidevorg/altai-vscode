import {
  HOST_STATUS_EVENT,
  type HostStatusPayload,
} from "../shared/messages.js";
import { parsePersistedWebviewState } from "../shared/webviewState.js";
import { WebviewClient } from "./WebviewClient.js";
import "./main.css";

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

function isHostStatusPayload(value: unknown): value is HostStatusPayload {
  const parsed = parsePersistedWebviewState({ hostStatus: value }).hostStatus;
  return parsed !== undefined;
}

function render(status: HostStatusPayload): void {
  const root = document.getElementById("root");
  if (!root) {
    return;
  }

  root.replaceChildren();

  const panel = document.createElement("main");
  panel.className = "altai-host-status";
  panel.setAttribute("role", "status");
  panel.setAttribute("aria-live", "polite");

  const brand = document.createElement("p");
  brand.className = "altai-brand";
  brand.textContent = "ALTAI";

  const title = document.createElement("h1");
  title.className = "altai-title";
  title.textContent = status.message;

  const detail = document.createElement("p");
  detail.className = "altai-detail";
  detail.textContent = `Extension ${status.extensionVersion} · status: ${status.status}`;

  panel.append(brand, title, detail);
  root.append(panel);
}

const client = new WebviewClient({
  vscodeApi: acquireVsCodeApi(),
});

function applyStatus(status: HostStatusPayload): void {
  render(status);
  client.setPersistedState({ hostStatus: status });
}

client.onEvent(HOST_STATUS_EVENT, (payload) => {
  if (isHostStatusPayload(payload)) {
    applyStatus(payload);
  }
});

const previous = client.getPersistedState().hostStatus;
if (isHostStatusPayload(previous)) {
  render(previous);
} else {
  render({
    status: "disconnected",
    message: "ALTAI host not connected",
    extensionVersion: "…",
  });
}

void client
  .request("host.getStatus")
  .then((result) => {
    if (isHostStatusPayload(result)) {
      applyStatus(result);
    }
  })
  .catch(() => {
    // Extension Host may not be ready yet; host.status events still update UI.
  });

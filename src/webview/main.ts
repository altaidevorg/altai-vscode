import {
  HOST_STATUS_EVENT,
  WEBVIEW_PROTOCOL_VERSION,
  type HostStatusPayload,
  type WebviewEvent,
  type WebviewRequest,
} from "../shared/messages.js";
import { parseWebviewMessage } from "../shared/validation.js";
import "./main.css";

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

type VsCodeApi = ReturnType<typeof acquireVsCodeApi>;

const vscodeApi: VsCodeApi = acquireVsCodeApi();

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

  vscodeApi.setState({ hostStatus: status });
}

function requestStatus(): void {
  const request: WebviewRequest = {
    protocolVersion: WEBVIEW_PROTOCOL_VERSION,
    type: "request",
    id: `req-${Date.now()}`,
    method: "host.getStatus",
  };
  vscodeApi.postMessage(request);
}

window.addEventListener("message", (event: MessageEvent) => {
  const message = parseWebviewMessage(event.data);
  if (!message || message.type !== "event") {
    return;
  }

  const webviewEvent = message as WebviewEvent;
  if (webviewEvent.event !== HOST_STATUS_EVENT) {
    return;
  }

  const payload = webviewEvent.payload as HostStatusPayload | undefined;
  if (
    !payload ||
    typeof payload.message !== "string" ||
    typeof payload.status !== "string" ||
    typeof payload.extensionVersion !== "string"
  ) {
    return;
  }

  render(payload);
});

const previous = vscodeApi.getState() as { hostStatus?: HostStatusPayload } | undefined;
if (previous?.hostStatus) {
  render(previous.hostStatus);
} else {
  render({
    status: "disconnected",
    message: "ALTAI host not connected",
    extensionVersion: "…",
  });
}

requestStatus();

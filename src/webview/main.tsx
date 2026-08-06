import { createRoot } from "react-dom/client";
import { AltaiApp } from "./AltaiApp.js";
import { WebviewClient } from "./WebviewClient.js";
// Styles are built by Tailwind CLI into dist/webview/main.css and loaded
// from the Webview HTML shell (not bundled into the JS entry).

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const client = new WebviewClient({
  vscodeApi: acquireVsCodeApi(),
});

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("ALTAI webview root element missing");
}

const previous = client.getPersistedState().hostStatus;
const extensionVersion =
  previous && typeof previous.extensionVersion === "string"
    ? previous.extensionVersion
    : "0.1.0";

createRoot(rootEl).render(
  <AltaiApp client={client} extensionVersion={extensionVersion} />,
);

/**
 * Pure Webview HTML document builder (no vscode import).
 */
export type WebviewHtmlDocumentInput = {
  cspSource: string;
  scriptSrc: string;
  styleSrc: string;
  nonce: string;
};

export function buildWebviewHtmlDocument(
  options: WebviewHtmlDocumentInput,
): string {
  const { cspSource, scriptSrc, styleSrc, nonce } = options;
  const csp = [
    `default-src 'none'`,
    `style-src ${cspSource} 'nonce-${nonce}'`,
    `script-src 'nonce-${nonce}'`,
    `img-src ${cspSource} data:`,
    `font-src ${cspSource}`,
    `connect-src 'none'`,
  ].join("; ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <link rel="stylesheet" href="${styleSrc}" nonce="${nonce}" />
  <title>ALTAI</title>
  <style nonce="${nonce}">
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
  </style>
</head>
<body>
  <div id="root" role="main" aria-label="ALTAI" data-altai-ui="history-menu"></div>
  <script type="module" nonce="${nonce}" src="${scriptSrc}"></script>
</body>
</html>`;
}

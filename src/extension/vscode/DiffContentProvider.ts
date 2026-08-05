import type * as vscode from "vscode";

const REVIEW_SCHEME = "altai-review";
const MAX_REVIEW_DOCUMENTS = 100;

/**
 * Keeps transient review text inside the Extension Host so the shared UI can
 * open VS Code's native diff editor without receiving filesystem access.
 */
export class DiffContentProvider implements vscode.TextDocumentContentProvider {
  private readonly documents = new Map<string, string>();
  private nextId = 0;

  constructor(private readonly api: typeof vscode) {}

  register(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      this.api.workspace.registerTextDocumentContentProvider(REVIEW_SCHEME, this),
    );
  }

  createUri(label: string, text: string): vscode.Uri {
    const id = `${Date.now().toString(36)}-${(++this.nextId).toString(36)}`;
    const safeLabel = label.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);
    const uri = this.api.Uri.from({
      scheme: REVIEW_SCHEME,
      path: `/${id}-${safeLabel || "review"}`,
    });
    this.documents.set(uri.toString(), text);
    this.prune();
    return uri;
  }

  provideTextDocumentContent(uri: vscode.Uri): string | undefined {
    return this.documents.get(uri.toString());
  }

  private prune(): void {
    while (this.documents.size > MAX_REVIEW_DOCUMENTS) {
      const oldest = this.documents.keys().next().value;
      if (oldest === undefined) {
        return;
      }
      this.documents.delete(oldest);
    }
  }
}

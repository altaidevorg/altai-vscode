/**
 * Reads only the published VS Code Git extension state. It deliberately does
 * not spawn git or extract real patch text; the agent service owns content
 * policy. A path/status summary is still provided as `patch` so the composer
 * can attach working-tree context without requesting file bodies.
 */

import type { GitDiffContext } from "@altai/host-contract" with { "resolution-mode": "import" };
import type * as vscode from "vscode";

// Keep this formatter local so Extension Host builds stay free of webview deps.
function formatGitDiffSummary(input: {
  branch?: string;
  files: readonly { path: string; status: string }[];
}): string | null {
  if (input.files.length === 0) {
    return null;
  }
  const head = input.branch?.trim()
    ? `Working tree changes on ${input.branch.trim()}`
    : "Working tree changes";
  const lines = input.files
    .map((file) => {
      const path = file.path.trim();
      const status = file.status.trim();
      if (!path) {
        return null;
      }
      return status ? `- ${status}  ${path}` : `- ${path}`;
    })
    .filter((line): line is string => Boolean(line));
  if (lines.length === 0) {
    return null;
  }
  return [`${head}:`, ...lines].join("\n");
}

type GitChange = {
  uri: vscode.Uri;
  status: number;
};

type GitRepository = {
  rootUri: vscode.Uri;
  state: {
    HEAD?: { name?: string };
    workingTreeChanges: readonly GitChange[];
    indexChanges: readonly GitChange[];
    mergeChanges: readonly GitChange[];
  };
};

type GitApi = {
  getRepository(uri: vscode.Uri): GitRepository | null;
  repositories: readonly GitRepository[];
};

type GitExtension = {
  getAPI(version: 1): GitApi;
};

export class GitDiffAdapter {
  constructor(private readonly api: typeof vscode) {}

  async getDiffContext(): Promise<GitDiffContext | null> {
    const git = await this.getGitApi();
    if (!git) {
      return null;
    }
    const target =
      this.api.window.activeTextEditor?.document.uri ??
      this.api.workspace.workspaceFolders?.[0]?.uri;
    const repository =
      (target ? git.getRepository(target) : null) ?? git.repositories[0];
    if (!repository) {
      return null;
    }

    const files = new Map<string, string>();
    for (const [group, changes] of [
      ["working-tree", repository.state.workingTreeChanges],
      ["index", repository.state.indexChanges],
      ["merge", repository.state.mergeChanges],
    ] as const) {
      for (const change of changes) {
        const relative = this.api.workspace.asRelativePath(change.uri, false);
        files.set(relative, `${group}:${change.status}`);
      }
    }
    const fileList = [...files].map(([path, status]) => ({ path, status }));
    const branch = repository.state.HEAD?.name;
    const summary = formatGitDiffSummary({
      ...(branch ? { branch } : {}),
      files: fileList,
    });
    if (!summary) {
      return null;
    }
    return {
      ...(branch ? { branch } : {}),
      files: fileList,
      patch: summary,
    };
  }

  private async getGitApi(): Promise<GitApi | null> {
    const extension = this.api.extensions.getExtension<GitExtension>("vscode.git");
    if (!extension) {
      return null;
    }
    try {
      const gitExtension = extension.isActive
        ? extension.exports
        : await extension.activate();
      return gitExtension.getAPI(1);
    } catch {
      return null;
    }
  }
}

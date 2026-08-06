import { createHash } from "node:crypto";
import {
  constants as fsConstants,
  existsSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { HostDiagnosticCode, type HostDiagnostic } from "./HostDiagnostics.js";
import { nativeHostFileName } from "./nativeTargets.js";

export const AGENT_HOST_PATH_ENV = "ALTAI_AGENT_HOST_PATH";

export type ResolvedHostBinary = {
  executablePath: string;
  source: "env" | "packaged";
};

export type ResolveHostResult =
  | { ok: true; binary: ResolvedHostBinary }
  | { ok: false; diagnostic: HostDiagnostic };

export type HostResolverOptions = {
  extensionPath: string;
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  arch?: string;
};

/**
 * Resolve the native agent host executable.
 * Prefers `ALTAI_AGENT_HOST_PATH`, else packaged resources/native/<platform>-<arch>/.
 *
 * Env override is an intentional local-debug escape hatch. It must be an absolute
 * path to a regular file with execute permission (Unix); relative / unsafe paths
 * are rejected.
 */
export function resolveHostBinary(options: HostResolverOptions): ResolveHostResult {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const override = env[AGENT_HOST_PATH_ENV]?.trim();
  if (override) {
    const validated = validateExecutableCandidate(override, {
      sourceLabel: AGENT_HOST_PATH_ENV,
      requireAbsolute: true,
      platform,
    });
    if (!validated.ok) {
      return validated;
    }
    return {
      ok: true,
      binary: { executablePath: validated.path, source: "env" },
    };
  }

  const arch = options.arch ?? process.arch;
  const platformKey = `${platform}-${arch}`;
  const fileName = nativeHostFileName(platform);
  const packaged = path.join(
    options.extensionPath,
    "resources",
    "native",
    platformKey,
    fileName,
  );
  const validated = validateExecutableCandidate(packaged, {
    sourceLabel: "packaged",
    requireAbsolute: false,
    platform,
  });
  if (!validated.ok) {
    return validated;
  }

  const digestPath = `${validated.path}.sha256`;
  if (existsSync(digestPath)) {
    const expected = readFileSync(digestPath, "utf8").trim().toLowerCase();
    const actual = createHash("sha256")
      .update(readFileSync(validated.path))
      .digest("hex");
    if (!/^[0-9a-f]{64}$/.test(expected) || expected !== actual) {
      return {
        ok: false,
        diagnostic: {
          code: HostDiagnosticCode.Corrupt,
          message: "ALTAI agent host binary failed integrity check",
          details: digestPath,
        },
      };
    }
  }

  return {
    ok: true,
    binary: { executablePath: validated.path, source: "packaged" },
  };
}

function validateExecutableCandidate(
  candidate: string,
  options: {
    sourceLabel: string;
    requireAbsolute: boolean;
    platform: NodeJS.Platform;
  },
):
  | { ok: true; path: string }
  | { ok: false; diagnostic: HostDiagnostic } {
  if (candidate.includes("\0")) {
    return {
      ok: false,
      diagnostic: {
        code: HostDiagnosticCode.Corrupt,
        message: "ALTAI agent host path is invalid",
        details: `${options.sourceLabel}: nul byte in path`,
      },
    };
  }

  if (options.requireAbsolute && !path.isAbsolute(candidate)) {
    return {
      ok: false,
      diagnostic: {
        code: HostDiagnosticCode.Corrupt,
        message: "ALTAI agent host override must be an absolute path",
        details: `${options.sourceLabel}=${candidate}`,
      },
    };
  }

  const resolved = canonicalize(candidate);
  if (!resolved || !existsSync(resolved)) {
    return {
      ok: false,
      diagnostic: {
        code: HostDiagnosticCode.Missing,
        message:
          options.sourceLabel === "packaged"
            ? "Packaged ALTAI agent host binary not found. For local debug, set ALTAI_AGENT_HOST_PATH to an absolute altai-cli binary (see .vscode/launch.json)."
            : "ALTAI agent host binary not found",
        details:
          options.sourceLabel === AGENT_HOST_PATH_ENV
            ? `${AGENT_HOST_PATH_ENV}=${candidate}`
            : candidate,
      },
    };
  }

  let stats;
  try {
    stats = statSync(resolved);
  } catch {
    return {
      ok: false,
      diagnostic: {
        code: HostDiagnosticCode.Missing,
        message: "ALTAI agent host binary not accessible",
        details: resolved,
      },
    };
  }

  if (!stats.isFile()) {
    return {
      ok: false,
      diagnostic: {
        code: HostDiagnosticCode.Corrupt,
        message: "ALTAI agent host path is not a regular file",
        details: resolved,
      },
    };
  }

  if (options.platform !== "win32") {
    const executable =
      (stats.mode & fsConstants.S_IXUSR) !== 0 ||
      (stats.mode & fsConstants.S_IXGRP) !== 0 ||
      (stats.mode & fsConstants.S_IXOTH) !== 0;
    if (!executable) {
      return {
        ok: false,
        diagnostic: {
          code: HostDiagnosticCode.Corrupt,
          message: "ALTAI agent host binary is not executable",
          details: resolved,
        },
      };
    }
  }

  return { ok: true, path: resolved };
}

function canonicalize(candidate: string): string | undefined {
  try {
    // Prefer native realpath when available (symlink resolution).
    if (typeof realpathSync.native === "function") {
      return realpathSync.native(candidate);
    }
    return realpathSync(candidate);
  } catch {
    // Path may not exist yet — still return an absolute path for diagnostics.
  }
  try {
    return path.resolve(candidate);
  } catch {
    return undefined;
  }
}

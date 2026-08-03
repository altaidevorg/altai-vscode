import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { HostDiagnosticCode, type HostDiagnostic } from "./HostDiagnostics.js";

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
 */
export function resolveHostBinary(options: HostResolverOptions): ResolveHostResult {
  const env = options.env ?? process.env;
  const override = env[AGENT_HOST_PATH_ENV]?.trim();
  if (override) {
    const resolved = canonicalize(override);
    if (!resolved || !existsSync(resolved)) {
      return {
        ok: false,
        diagnostic: {
          code: HostDiagnosticCode.Missing,
          message: "ALTAI agent host binary not found",
          details: `${AGENT_HOST_PATH_ENV}=${override}`,
        },
      };
    }
    return {
      ok: true,
      binary: { executablePath: resolved, source: "env" },
    };
  }

  const platform = options.platform ?? process.platform;
  const arch = options.arch ?? process.arch;
  const platformKey = `${platform}-${arch}`;
  const fileName = platform === "win32" ? "altai-agent-host.exe" : "altai-agent-host";
  const packaged = path.join(
    options.extensionPath,
    "resources",
    "native",
    platformKey,
    fileName,
  );
  const resolved = canonicalize(packaged);
  if (!resolved || !existsSync(resolved)) {
    return {
      ok: false,
      diagnostic: {
        code: HostDiagnosticCode.Missing,
        message: "Packaged ALTAI agent host binary not found",
        details: packaged,
      },
    };
  }

  const digestPath = `${resolved}.sha256`;
  if (existsSync(digestPath)) {
    const expected = readFileSync(digestPath, "utf8").trim().toLowerCase();
    const actual = createHash("sha256").update(readFileSync(resolved)).digest("hex");
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
    binary: { executablePath: resolved, source: "packaged" },
  };
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

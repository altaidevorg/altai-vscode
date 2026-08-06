/**
 * Supported native agent-host packaging targets.
 * Layout: resources/native/<target>/altai-agent-host[.exe][+.sha256]
 */
export const SUPPORTED_NATIVE_TARGETS = [
  "darwin-arm64",
  "darwin-x64",
  "linux-x64",
  "win32-x64",
] as const;

export type NativeTarget = (typeof SUPPORTED_NATIVE_TARGETS)[number];

export function isSupportedNativeTarget(value: string): value is NativeTarget {
  return (SUPPORTED_NATIVE_TARGETS as readonly string[]).includes(value);
}

/**
 * Map Node platform+arch to a packaging target key.
 * Returns undefined when the platform is not a release target.
 */
export function platformArchToTarget(
  platform: string,
  arch: string,
): NativeTarget | undefined {
  const key = `${platform}-${arch}`;
  return isSupportedNativeTarget(key) ? key : undefined;
}

export function nativeHostFileName(platform: string): string {
  return platform === "win32" ? "altai-agent-host.exe" : "altai-agent-host";
}

/** Relative directory under the extension root for a target. */
export function packagedNativeDirRelative(target: NativeTarget): string {
  return `resources/native/${target}`;
}

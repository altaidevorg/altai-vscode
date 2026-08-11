/**
 * Host methods belong to one native-host generation. A restart, workspace
 * switch, or failed readiness transition must never leave the previous
 * process's method list available to the webview.
 */
export class NativeCapabilitySnapshot {
  private generation = 0;
  private methods: readonly string[] = [];

  /** Invalidate the current host generation and fail closed. */
  clear(): number {
    this.generation += 1;
    this.methods = [];
    return this.generation;
  }

  /** Start fetching the exact advertised list for a newly Ready host. */
  beginReady(): number {
    return this.clear();
  }

  /** Commit only the response belonging to the current host generation. */
  commit(generation: number, methods: readonly string[]): boolean {
    if (generation !== this.generation) return false;
    this.methods = [...methods];
    return true;
  }

  list(): readonly string[] {
    return this.methods;
  }
}

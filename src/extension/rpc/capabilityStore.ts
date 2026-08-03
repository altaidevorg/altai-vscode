/**
 * Capabilities advertised by the native host during `initialize`.
 * Full UI gating lands with later tasks; TASK-006 only stores the list.
 */

export class CapabilityStore {
  private capabilities: readonly string[] = [];
  private protocolMin = 0;
  private protocolMax = 0;

  clear(): void {
    this.capabilities = [];
    this.protocolMin = 0;
    this.protocolMax = 0;
  }

  setFromInitialize(result: unknown): void {
    if (!isRecord(result)) {
      this.clear();
      return;
    }
    const caps = result.capabilities;
    this.capabilities = Array.isArray(caps)
      ? caps.filter((item): item is string => typeof item === "string")
      : [];
    this.protocolMin =
      typeof result.protocol_min === "number" ? result.protocol_min : 0;
    this.protocolMax =
      typeof result.protocol_max === "number" ? result.protocol_max : 0;
  }

  list(): readonly string[] {
    return this.capabilities;
  }

  has(capability: string): boolean {
    return this.capabilities.includes(capability);
  }

  protocolRange(): { min: number; max: number } {
    return { min: this.protocolMin, max: this.protocolMax };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

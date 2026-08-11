import { describe, expect, it } from "vitest";
import { NativeCapabilitySnapshot } from "../../src/webview/nativeCapabilitySnapshot.js";

const ATTEMPT_QUARTET = [
  "work/start-run",
  "work/attempts/list",
  "run/replay",
  "run/cancel",
];

describe("NativeCapabilitySnapshot", () => {
  it("starts empty and publishes the exact Ready-host Attempt quartet", () => {
    const snapshot = new NativeCapabilitySnapshot();

    expect(snapshot.list()).toEqual([]);
    const ready = snapshot.beginReady();
    expect(snapshot.commit(ready, ATTEMPT_QUARTET)).toBe(true);
    expect(snapshot.list()).toEqual(ATTEMPT_QUARTET);
  });

  it("clears a full host before a restarted host publishes a partial snapshot", () => {
    const snapshot = new NativeCapabilitySnapshot();
    const full = snapshot.beginReady();
    snapshot.commit(full, ATTEMPT_QUARTET);

    snapshot.clear();
    expect(snapshot.list()).toEqual([]);
    const partial = snapshot.beginReady();
    expect(snapshot.commit(partial, ["work/start-run"])).toBe(true);
    expect(snapshot.list()).toEqual(["work/start-run"]);
  });

  it("cannot let a late old-host response overwrite the current generation", () => {
    const snapshot = new NativeCapabilitySnapshot();
    const oldHost = snapshot.beginReady();
    const currentHost = snapshot.beginReady();

    expect(snapshot.commit(currentHost, ["run/replay"])).toBe(true);
    expect(snapshot.commit(oldHost, ATTEMPT_QUARTET)).toBe(false);
    expect(snapshot.list()).toEqual(["run/replay"]);
  });
});

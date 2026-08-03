import { describe, expect, it } from "vitest";
import {
  encodeFrame,
  FrameDecoder,
  FrameError,
} from "../../src/extension/rpc/frameCodec.js";

describe("frameCodec", () => {
  it("accepts partial and multiple frames", () => {
    const first = encodeFrame(Buffer.from('{"one":1}', "utf8"));
    const second = encodeFrame(Buffer.from('{"two":2}', "utf8"));
    const decoder = new FrameDecoder();

    expect(decoder.push(first.subarray(0, 9))).toEqual([]);
    const rest = Buffer.concat([first.subarray(9), second]);
    const frames = decoder.push(rest);
    expect(frames.map((f) => f.toString("utf8"))).toEqual([
      '{"one":1}',
      '{"two":2}',
    ]);
  });

  it("rejects missing Content-Length", () => {
    const decoder = new FrameDecoder();
    try {
      decoder.push(Buffer.from("Not-Length: 1\r\n\r\nX", "utf8"));
      expect.fail("expected FrameError");
    } catch (error) {
      expect(error).toBeInstanceOf(FrameError);
      expect((error as FrameError).code).toBe("missing_content_length");
    }
  });

  it("rejects oversized frames", () => {
    const decoder = new FrameDecoder({
      maxHeaderBytes: 1024,
      maxFrameBytes: 4,
    });
    expect(() =>
      decoder.push(Buffer.from("Content-Length: 10\r\n\r\n0123456789", "utf8")),
    ).toThrow(/exceeds configured limit/);
  });

  it("rejects oversized headers before body arrives", () => {
    const decoder = new FrameDecoder({
      maxHeaderBytes: 16,
      maxFrameBytes: 1024,
    });
    expect(() =>
      decoder.push(Buffer.from("Content-Length: 1" + "x".repeat(40), "utf8")),
    ).toThrow(FrameError);
  });
});

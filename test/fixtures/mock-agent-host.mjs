#!/usr/bin/env node
/**
 * Minimal Content-Length stdio host for TASK-006 integration tests.
 * Implements initialize (protocol 1) and shutdown.
 *
 * Env:
 *   ALTAI_MOCK_HOST_CRASH=1  — exit(1) after initialize responds
 *   ALTAI_MOCK_HOST_BAD_FRAME=1 — write a corrupt frame then exit
 */

import { createInterface } from "node:readline";

const crashAfterInit = process.env.ALTAI_MOCK_HOST_CRASH === "1";
const badFrame = process.env.ALTAI_MOCK_HOST_BAD_FRAME === "1";

let buffer = Buffer.alloc(0);
let shuttingDown = false;

function writeFrame(obj) {
  const body = Buffer.from(JSON.stringify(obj), "utf8");
  const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "utf8");
  process.stdout.write(Buffer.concat([header, body]));
}

function handleMessage(message) {
  if (!message || message.jsonrpc !== "2.0") {
    return;
  }

  if (message.method === "initialize") {
    if (badFrame) {
      process.stdout.write("Not-Length: 1\r\n\r\nx");
      process.exit(1);
      return;
    }
    writeFrame({
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocol_min: 1,
        protocol_max: 1,
        capabilities: ["stdio.serve", "sessions.create"],
      },
    });
    if (crashAfterInit) {
      setTimeout(() => process.exit(1), 20);
    }
    return;
  }

  if (message.method === "shutdown") {
    shuttingDown = true;
    writeFrame({
      jsonrpc: "2.0",
      id: message.id,
      result: { ok: true },
    });
    setTimeout(() => process.exit(0), 10);
    return;
  }
}

process.stdin.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  for (;;) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd < 0) {
      break;
    }
    const header = buffer.subarray(0, headerEnd).toString("utf8");
    const match = /Content-Length:\s*(\d+)/i.exec(header);
    if (!match) {
      process.stderr.write("mock-host: missing Content-Length\n");
      process.exit(2);
    }
    const length = Number(match[1]);
    const total = headerEnd + 4 + length;
    if (buffer.length < total) {
      break;
    }
    const body = buffer.subarray(headerEnd + 4, total).toString("utf8");
    buffer = buffer.subarray(total);
    try {
      handleMessage(JSON.parse(body));
    } catch (error) {
      process.stderr.write(`mock-host: bad json: ${error}\n`);
    }
  }
});

process.stdin.on("end", () => {
  if (!shuttingDown) {
    process.exit(0);
  }
});

// Keep process alive for stdio.
createInterface({ input: process.stdin, crlfDelay: Infinity });
process.stderr.write("mock-agent-host ready\n");

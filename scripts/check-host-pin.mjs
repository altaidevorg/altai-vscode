#!/usr/bin/env node
/**
 * Validate resources/native/PIN.json against COMPATIBILITY pins.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pinPath = path.join(root, "resources", "native", "PIN.json");
const compatPath = path.join(root, "src", "extension", "compatibility.ts");

if (!existsSync(pinPath)) {
  console.error("missing resources/native/PIN.json");
  process.exit(1);
}

const pin = JSON.parse(readFileSync(pinPath, "utf8"));
const compatSrc = readFileSync(compatPath, "utf8");

const agentHostMatch = compatSrc.match(/agentHost:\s*"([^"]+)"/);
const protocolMatch = compatSrc.match(/protocol:\s*(\d+)/);

if (!agentHostMatch || !protocolMatch) {
  console.error("could not parse COMPATIBILITY from compatibility.ts");
  process.exit(1);
}

const findings = [];
if (typeof pin.agentHost !== "string" || !pin.agentHost) {
  findings.push("PIN.agentHost invalid");
}
if (pin.protocolMajor !== Number(protocolMatch[1])) {
  findings.push(
    `protocol mismatch: COMPATIBILITY=${protocolMatch[1]} PIN=${pin.protocolMajor}`,
  );
}
if (pin.agentHost !== agentHostMatch[1]) {
  findings.push(
    `agentHost mismatch: COMPATIBILITY=${agentHostMatch[1]} PIN=${pin.agentHost}`,
  );
}

if (findings.length) {
  console.error("Host pin check failed:");
  for (const f of findings) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `Host pin check passed (agentHost=${pin.agentHost}, protocol=${pin.protocolMajor}).`,
);

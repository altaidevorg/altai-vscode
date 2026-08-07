# ALTAI Architecture Overview

This document explains the main ALTAI components, including `altai-core`,
`altai-agent-service`, IsanAgent, the command-line interface, the shared UI,
and the VS Code extension.

## The Most Important Distinction

ALTAI is the product, integration, and orchestration layer. IsanAgent is the
underlying AI agent engine.

`altai-core` should not be thought of as the agent's brain. It provides common
configuration, policy, workspace, event, and persistence primitives. The
reasoning loop and tool execution belong to IsanAgent.

```text
ALTAI Desktop / VS Code / Terminal
                 |
          Host adapters
                 |
       altai-agent-service
                 |
             IsanAgent
        +--------+---------+
        |        |         |
      Models    Tools   MCP / Skills

Shared foundation: altai-core
Host communication: altai-protocol
```

## `altai-core`

`altai-core` is ALTAI's shared, Tauri-independent Rust foundation. It contains
logic that must behave consistently across the Desktop application, CLI, and
other hosts.

Its responsibilities include:

- resolving workspace paths and ALTAI/IsanAgent state locations;
- merging configuration layers and tracking configuration precedence;
- mapping ALTAI permission modes to shell and edit policies;
- resolving context-compaction preferences;
- defining versioned event envelopes;
- maintaining the durable SQLite event journal;
- defining terminal palettes, themes, and layout settings.

It does not render a UI, call model providers, run an agent reasoning loop, or
depend on Tauri.

Source: `altai-app/src-tauri/crates/altai-core`

## `altai-agent-service`

`altai-agent-service` is the host-neutral service boundary between ALTAI and
IsanAgent. It owns the long-lived agent lifecycle and ensures that Desktop,
VS Code, and future hosts do not implement separate agent runtimes.

Its responsibilities include:

- creating, caching, and stopping IsanAgent instances;
- coordinating active and queued runs;
- routing user messages to the correct runtime;
- steering and cancelling runs;
- handling manual and automatic context compaction;
- mapping IsanAgent events into ALTAI event contracts;
- persisting events and supporting replay after a UI reload;
- applying permission modes and workspace-specific services;
- cleaning up stale runtimes when the active workspace changes.

The service deliberately knows nothing about Tauri, a specific UI, or
stdin/stdout transport.

Source: `altai-app/src-tauri/crates/altai-agent-service`

## IsanAgent

IsanAgent is the actual provider-independent agent engine embedded by ALTAI.
It is responsible for capabilities such as:

- communicating with model providers;
- executing the agent reasoning and iteration loop;
- invoking shell, file, and other tools;
- integrating MCP servers and skills;
- producing lifecycle and telemetry events;
- supporting approvals and clarification requests;
- maintaining agent conversation state.

ALTAI Desktop embeds IsanAgent as a Rust crate. The VS Code extension does not
depend on IsanAgent directly; it communicates through ALTAI's service and
protocol layers.

## `altai-cli`

`altai-cli` is ALTAI's terminal product and one of its machine-facing hosts.

Important modes include:

```text
altai-cli                         Interactive IsanAgent TUI
altai-cli -p "Fix the tests"      One-shot headless run
altai-cli serve --stdio ...       ALTAI JSON-RPC agent host
altai-cli acp                     ACP server for editors such as Zed
altai-cli doctor                  Installation and runtime diagnostics
altai-cli journal ...             Durable event-journal inspection
```

Interactive agent sessions start directly from `altai-cli`; there is no
separate `agent` subcommand or agent engine.

Source: `altai-app/src-tauri/crates/altai-cli`

## `altai-agent-host`

`altai-agent-host` describes the native process role used by clients such as
the VS Code extension. The current VS Code compatibility path starts
`altai-cli serve --stdio`; release packaging may provide a dedicated
`altai-agent-host` executable with the same role.

The VS Code path is:

```text
VS Code Webview
      |
      | typed postMessage
      v
VS Code Extension Host
      |
      | JSON-RPC 2.0 over stdio
      v
altai-cli serve --stdio / altai-agent-host
      |
      v
altai-agent-service
      |
      v
IsanAgent
```

The extension starts the native host only for a trusted workspace. Provider
credentials, shell access, MCP, skills, and durable runtime state remain
outside the Webview.

## `altai-protocol`

`altai-protocol` defines the versioned wire contract between a client host and
the native ALTAI agent host.

It provides:

- JSON-RPC message validation;
- `Content-Length` frame encoding and decoding;
- protocol-version negotiation;
- message schemas and error codes;
- run-event sequence validation.

The Rust contract lives in `altai-app/src-tauri/crates/altai-protocol`. A
corresponding TypeScript package is used by JavaScript and Webview-facing code.

## `@altai/agent-ui`

`@altai/agent-ui` is the shared React agent interface for ALTAI Desktop and the
VS Code Webview. The goal is to maintain one component tree rather than a
separate chat implementation for every host.

The shared UI includes or is intended to include:

- chat history and the message composer;
- approval and clarification cards;
- plans, tool calls, and edit diffs;
- run inspection and replay;
- Work, Runs, Scheduled, and Inbox surfaces;
- settings, model selection, and permission controls;
- attachments, context chips, slash commands, and snippets.

The package must not import Tauri or VS Code APIs. It operates only through
the ports exposed by `@altai/host-contract`.

## `@altai/host-contract`

`@altai/host-contract` defines the product-neutral boundary between the shared
UI and its host environment.

The contract covers areas such as:

- agent runtime operations;
- workspace and editor access;
- settings and provider status;
- event subscriptions;
- capability discovery.

The host returns a capability document during initialization. A shared UI
control should be enabled only when its required backend capability is
available.

## `altai-vscode`

`altai-vscode` is a thin VS Code-specific host. It is not intended to become a
second ALTAI frontend or to contain another implementation of the agent loop.

Its responsibilities include:

- registering the Activity Bar container and ALTAI Webview;
- enforcing VS Code Workspace Trust;
- resolving and managing the native host process;
- transporting JSON-RPC messages over stdio;
- bridging typed messages between the Webview and Extension Host;
- implementing VS Code-specific editor, workspace, terminal, and diff ports;
- exposing host diagnostics and lifecycle commands.

### Current implementation status

The extension is an **internal-channel (0.1.0)** thin VS Code host:

- trust-gated native host lifecycle, stdio JSON-RPC, capability storage, and
  diagnostics with recovery hints;
- Webview mounts `@altai/agent-ui` via `HostPortsProvider` (no second chat UI);
- capability-gated Chat (sessions, run stream, permission mode, model picker,
  provider status, approvals/clarifications, change review, run inspector,
  checkpoints, slash commands including attach/recovery, `#` snippets, copy
  transcript, draft restore, multi-root chip preference) and Operations
  (overview, Work, Runs, Inbox, Scheduled, skill chips on compose forms,
  deep-links including compose task/automation);
- Command palette / keybindings: side panel, Settings, Ask About selection /
  active file / working tree / terminal, Operations deep-links, diagnostics and
  provider connect/clear (credentials stay in Extension Host);
- Settings surface (provider, model, MCP, skills, About) plus allowlisted
  recovery actions (logs / diagnostics / restart / version; Manage Workspace
  Trust when host is untrusted; Copy diagnostic);
- Status-bar attention badge (Inbox when count > 0);
- packaging audit, single-target VSIX tooling, fixture package CI, secret and
  license scans, CHANGELOG / RELEASE gates;
- Extension Host status bar: host lifecycle (non-ready) and Operations
  attention (Inbox when count > 0);
- Command palette / Explorer / terminal context menus for Ask About * and
  recovery deep-links; slash attach helpers for composer context chips.

Remaining external gates for alpha+: signed native hosts per target, published
shared npm packages, Remote e2e automation, deeper Desktop settings parity
(hooks/agents context), and true auto-model routing. See
[FEATURE_MATRIX.md](FEATURE_MATRIX.md) and [RELEASE.md](RELEASE.md).

## Agent Profiles in `.altai/agents/`

Files in `.altai/agents/` define agent profiles rather than separate runtimes.
A profile can specify a role or persona, model preference, permission mode,
skills, and orchestration behavior. Examples include profiles such as `coder`,
`reviewer`, or `test-engineer`.

At execution time, ALTAI applies the selected profile through
`altai-agent-service` to an IsanAgent runtime.

## `altai-collaboration`

`altai-collaboration` contains transport- and database-independent domain
contracts for human and agent collaboration.

It models concepts such as:

- human and agent actors;
- work items and their lifecycle states;
- delegations to agents;
- execution specifications;
- permission modes;
- links between delegations and agent runs.

It is currently a domain-model crate, not a standalone collaboration server.

## Responsibility Summary

| Component | Primary responsibility |
|---|---|
| `altai-core` | Shared configuration, policy, workspace, event, journal, and terminal primitives |
| `altai-agent-service` | Long-lived runtime lifecycle, run coordination, event delivery, persistence, and replay |
| IsanAgent | Model interaction, reasoning loop, tools, MCP, skills, and agent execution |
| `altai-cli` | Interactive terminal UI, one-shot execution, diagnostics, ACP, and stdio host |
| `altai-agent-host` | Native machine-facing process used by clients such as VS Code |
| `altai-protocol` | Versioned JSON-RPC messages and framing |
| `@altai/agent-ui` | Shared React agent experience for Desktop and VS Code |
| `@altai/host-contract` | Host-independent UI ports and capabilities |
| `altai-vscode` | VS Code integration, Webview bridge, trust, and native-host lifecycle |
| `.altai/agents/` | Agent profiles and orchestration roles |
| `altai-collaboration` | Shared human-agent work and delegation domain contracts |

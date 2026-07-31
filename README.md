# ALTAI for Visual Studio Code

The official ALTAI extension for Visual Studio Code, powered by the shared
ALTAI UI and IsanAgent runtime.

This repository is intentionally a thin VS Code host. Shared chat UI, protocol
types, and the agent runtime are developed in
[`altaidevorg/altai-app`](https://github.com/altaidevorg/altai-app); the agent
engine is developed in
[`altaidevorg/isanagent`](https://github.com/altaidevorg/isanagent).

Development has not started yet. The implementation sequence, repository
boundaries, acceptance criteria, and first Cursor tasks are defined in the
[engineering plan](docs/ENGINEERING_PLAN.md).

The repository also includes an always-on
[Cursor Project Rule](.cursor/rules/altai-engineering.mdc) that protects the
shared-UI and host boundaries while the plan is implemented.

## Core rule

The VS Code extension must render the same shared `AiSidePanel` React package
as ALTAI Desktop. Do not create a second chat UI or copy Desktop JSX/CSS into
this repository.

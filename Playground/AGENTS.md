# AGENTS.md

## Purpose

This repo is a 6502 learning playground and reusable Blazor workbench.

The goals are:

- Make it fast to tinker with small 6502 assembly programs.
- Assemble source directly in the browser through real cc65 tooling.
- Inspect and edit CPU state, memory, and eventually execution traces without leaving the page.
- Keep the core workbench reusable so it can later be embedded in the CV2 NES ROM editor.

## Product Context

The primary user is learning 6502 assembly through small exercises. A typical lesson provides:

- starting register values
- starting memory contents
- a target memory/register outcome
- a small program to write, assemble, load, step, and inspect

The app should feel like a workshop bench, not a marketing site. Keep the first screen useful: editor, registers, controls, and memory.

## Collaboration Agreement

- Favor incremental, working slices over broad rewrites.
- Keep `Home.razor` as a host for reusable components, not a pile of page logic.
- Prefer existing wasm-ready tooling over handwritten JavaScript implementations.
- Use JavaScript only as a narrow browser/runtime bridge when Blazor cannot call a tool directly.
- Preserve educational value. The app should make CPU and memory behavior inspectable instead of hiding it.

## Working Style

- Read `current-status.md` before substantial work.
- Update `current-status.md` after meaningful implementation, design decisions, or toolchain discoveries.
- Update `README.md` when assembler, memory layout, CPU state, execution, or reuse assumptions change.
- Keep components small enough that CV2 can adopt the workbench later without taking the whole playground shell.
- Prefer clear state models and explicit byte/address formatting over clever UI code.

## Current Technical Direction

Near-term:

1. Build a reusable `Cpu6502Workbench` component.
2. Use the wasm-ready cc65 `ca65` and `ld65` artifacts from `C:\repos\cc65-wasm`.
3. Use Monaco as the source editor, but keep the bridge small and reusable.
4. Load assembled bytes at `$0600` by default and set PC to `$0600`.
5. Keep memory initialized to `$00`.

Next:

- Continue hardening the floooh/chips `m6502.h` execution bridge.
- Add instruction/cycle stepping polish, per-cycle visualizer traces, disassembly, breakpoints, richer source decorations, and lesson goal checks.
- Treat `BRK` as a stop sentinel for now; full interrupt semantics can come later.
- Keep deployment as a standalone Blazor WebAssembly static site behind nginx unless server-side features are intentionally added later.

## Reuse Boundary

Reusable workbench code should live outside the app page shell. The intended boundary is:

- reusable components and models in a workbench project
- static cc65 tool assets behind a small interop wrapper
- `Home.razor` only hosts the workbench

CV2 should eventually be able to reference or copy the workbench without inheriting unrelated playground routing or layout choices.

## Definitions

- `load address`: the CPU address where assembled bytes are written into emulated memory.
- `PC`: program counter, initialized to the load address after assemble/load for the learning workflow.
- `MEMFS`: Emscripten's in-memory filesystem used by the browser-hosted cc65 tools.
- `page`: a 256-byte memory view aligned to an address like `$0600`.
- `instruction budget`: the maximum number of instructions Run asks the CPU module to execute before returning control to the UI.

## Session Rule

`current-status.md` is the living project memory. Append to the session log instead of rewriting history. If a session changes the toolchain, emulator assumptions, memory model, or reusable component boundary, record it before wrapping up.

`README.md` is the under-the-hood explainer. Keep it trustworthy as the learning notebook for how the app assembles, loads, and eventually executes 6502 code.

# Current Status

Last updated: 2026-06-25
Branch: `main`

## Mission

Build a browser-based 6502 learning playground in Blazor that can later be embedded as a reusable component inside the CV2 NES ROM editor.

The app should let the user type assembly, assemble it in-browser, load it into memory, inspect/edit registers and memory, and eventually single-step execution while watching memory changes.

## Decisions So Far

- The first default load address is `$0600`.
- Memory reset fill is `$00`.
- The source editor is now Monaco with a lightweight 6502 tokenizer, current-PC source-line decoration, and local 6502 instruction hover docs.
- The CPU visualizer is optional and hosted in a popup route at `/cpu-visualizer`.
- The first assembler path uses the user's wasm-ready cc65 build from `C:\repos\cc65-wasm`.
- `Home.razor` should only host the reusable workbench component.
- The emulator core is floooh/chips `m6502.h`, vendored from upstream commit `9371bfcb8478aec05ad10a1293206363373c1489`.
- The browser CPU module is a no-`main` Emscripten library built from WSL2, not a CLI-style program.
- The memory editor should behave like a single structured hex surface: fixed spacing and addresses are not editable, while selected bytes accept two-nibble edits.
- `BRK` is currently a stop sentinel for Step/Run rather than a fully emulated interrupt workflow.
- Deployment currently treats the app as a standalone Blazor WebAssembly static site behind nginx.
- The first production path is `/6502/`, served from `/var/www/ben-rush.net/6502/` through an nginx `alias`.
- Reusable workbench JavaScript module imports are versioned with cache-busting query strings so deployed browsers do not reuse stale `_content/Playground.Workbench/...` modules.

## Verified Repo Snapshot

The repo currently contains a standalone Blazor WebAssembly solution:

- `Playground.slnx`
- `Playground.Client`: standalone WebAssembly app shell
- `Playground.Workbench`: reusable workbench/component library

The initial app was accidentally created as a hosted Blazor Web App before being converted to standalone WebAssembly.

## Current First Slice

Target:

1. project docs in the same spirit as `cv2` and `wrfv3`
2. reusable workbench component
3. cc65 assemble/load bridge
4. editable 64K memory model and paged hex editor
5. register panel scaffold
6. instruction stepping and run-to-`BRK`
7. Monaco source editor with ca65-listing-based line mapping

Status: implemented and browser-verified. The memory editor is currently paged by 256-byte blocks, with one focusable hex surface per page.

Out of scope for this slice:

- cycle-level memory change tracking
- breakpoints/traps
- lesson-goal checking
- per-cycle CPU trace streaming into the visualizer

## Open Questions

- Should reusable components eventually be published as a local NuGet package or referenced as projects by CV2?
- How much of CV2 Patch Lab's cc65 wrapper should be shared directly versus duplicated temporarily?

## Session Log

### 2026-06-23

- Agreed on the first implementation slice: docs, reusable component shell, cc65 assemble/load, editable 64K memory, and register panel.
- Confirmed defaults: load at `$0600`, fill memory with `$00`, plain textbox first, vendored cc65 wasm assets.
- Decided a fork of floooh/chips is not needed for the first slice. When emulator work starts, a pinned vendored source file or small third-party source folder should be enough unless local changes are required.
- Added `Playground.Workbench`, a reusable Razor class library referenced by the WebAssembly client.
- Replaced the template `Home.razor` body with a `Cpu6502Workbench` component.
- Vendored cc65 wasm assets from `C:\repos\cc65-wasm\wasm\dist` into `Playground.Workbench/wwwroot/toolchain/cc65`.
- Added a cc65 JS module bridge that runs `ca65` and `ld65` through Emscripten MEMFS and returns flat output bytes plus diagnostics to Blazor.
- Added a first 64K memory model, paged hex editor, and register panel scaffold.
- Browser verification assembled the default snippet into six bytes at `$0600`: `A9 2A 8D 00 02 00`, reported `Loaded`, and showed range `$0600-$0605`.
- Browser verification also confirmed direct hex memory edits update the underlying byte model. This caught an initial `change`-event-only edit path, which was switched to `input` for better hex editor behavior.
- Switched the first workbench UI to a dark charcoal tool palette with muted green controls, amber program-byte marks, and red changed-byte marks. Browser verification confirmed dark backgrounds/colors were active and no console errors were present.
- Replaced the individual memory byte text inputs with a single focusable hex surface that renders non-editable row/address/spacing structure and selectable byte tokens.
- Added memory-surface keyboard behavior: click a byte, type two hex nibbles to set it, use arrow keys/PageUp/PageDown/Home/End/Tab to navigate, and Backspace/Delete to clear the selected byte to `$00`.
- Browser verification confirmed assemble/load still emits `A9 2A 8D 00 02 00`, the memory surface contains no nested input fields, typing `FF` into `$0610` and `A9` into `$0611` updates the underlying byte model, selection advances, and console warnings/errors are clean.
- Tightened shared hex input normalization in the workbench, register panel, and memory page controls so `$0000`/`0x0000` remain valid instead of being normalized to an empty string.
- Vendored floooh/chips `m6502.h` plus license under `Playground.Workbench/ThirdParty/chips`, pinned to commit `9371bfcb8478aec05ad10a1293206363373c1489`.
- Added a no-`main` C wrapper in `Playground.Workbench/Native/m6502` and built it with the user's WSL2 Emscripten SDK from `/home/brush/repos/emsdk`.
- Added generated `m6502.js`/`m6502.wasm` browser assets and a small JS bridge that copies the 64K memory image, sets registers, executes one instruction or an instruction budget, and returns changed memory addresses.
- Added `M6502CpuClient`, execution request/result models, and Step/Run/Pause controls to the reusable workbench.
- Browser verification confirmed the default program can assemble/load, Step `LDA #$2A` to set A=`2A` and PC=`$0602`, Step `STA $0200` to write `$2A` at `$0200` and advance PC to `$0605`, and Run from reset stops at `BRK` with A=`2A`, PC=`$0605`, 2 instructions, 6 cycles, and no console warnings/errors.
- Added Monaco editor assets to `Playground.Workbench`, replaced the source textarea with a reusable `MonacoSourceEditor`, and registered a lightweight `asm6502` tokenizer.
- Updated the cc65 wrapper to emit a `ca65` listing file and return parsed address-to-source-line mappings alongside output bytes and diagnostics.
- Added current-PC source-line tracking in `Cpu6502Workbench`; after assemble/load the editor marks line 4 (`lda #$2A`), after the first Step it marks line 5 (`sta $0200`), and after the second Step it marks line 6 (`brk`).
- Browser verification confirmed Monaco renders the real default source, assemble/load still emits `A9 2A 8D 00 02 00`, Step moves A to `$2A` and PC to `$0602`, the next Step writes `$2A` to `$0200` and PC to `$0605`, the active source marker advances correctly, and console warnings/errors remain clean.
- Added a pencil icon next to the Memory heading that opens a generic memory import panel.
- The memory import parser accepts forgiving address/value pairs such as `$0010 = $07`, `0010 = 07`, `0x0010 = 0x07`, `$0010: $07`, `0010 07`, and `$0010,$07`; parser errors show a simple red message and do not apply partial changes.
- Browser verification confirmed importing `$0010 = $07`, `$0011 = $03`, `$0012 = $00` writes those bytes, jumps the memory view to the `$0000` page, closes the panel, marks the imported cells changed, and leaves console warnings/errors clean. A bad line keeps the panel open and shows `There was a parser error.`
- Added a reusable SVG-based `Cpu6502Visualizer` component and `/cpu-visualizer` route.
- Added a BroadcastChannel bridge so the main workbench can open the popup from an icon next to `Assemble & Load` and send CPU visualization messages.
- The first visualizer slice highlights functional regions rather than claiming transistor-level die accuracy: PC, IR, decoder, registers, A, flags, ALU, bus interface, memory, and address/data/control/memory buses.
- Browser verification confirmed the visualizer route hydrates, the workbench icon sends the current CPU state, Assemble & Load sends a `Load` update with bus `$0600/$A9`, Step `LDA #$2A` sends PC `$0602` and A `$2A`, Step `STA $0200` sends a write bus state `$0200 = $2A`, and both windows remain console-clean.
- Added a first deploy slice modeled after the existing repo patterns: `tools/deploy-6502-playground.ps1` published locally, staged the app and deploy assets, uploaded through WSL `rsync`, and activated a temporary ASP.NET Core-hosted deployment over ssh.
- Converted the app from the accidental ASP.NET Core-hosted Blazor Web App shape to a standalone Blazor WebAssembly app.
- Moved the app shell, routes, layout, and static `index.html`/`app.css` into `Playground.Client`; removed the server host project from `Playground.slnx`.
- Replaced the service-based deploy with a static deploy: publish `Playground.Client`, stage published `wwwroot`, rewrite `<base href="/">` to `/6502/`, rsync to `/var/www/ben-rush.net/6502/`, and use an nginx `alias` fallback.

### 2026-06-24

- Added vendored 6502 instruction documentation for all 56 documented NMOS 6502 mnemonics under `Playground.Workbench/wwwroot/toolchain/monaco/6502-instruction-docs.js`.
- Registered a Monaco hover provider for `asm6502` instructions. Hover cards show operation, touched registers/flags/memory, addressing modes, opcodes, byte counts, cycles, notes, and a reference link.
- Hover detection ignores mnemonics inside comments and label definitions.
- Verified the instruction data module has all expected mnemonics, `dotnet build` succeeds, and browser smoke testing shows the `LDA - Load Accumulator` hover with no console warnings/errors.

### 2026-06-25

- Checked the deployed `/6502/` site after Monaco hover docs were added. The remote files and deploy manifest were current, which pointed to stale browser-cached JavaScript modules rather than a missing deploy.
- Added centralized workbench static asset versioning through `WorkbenchStaticAssets`.
- Versioned the Blazor `IJSRuntime import()` paths for Monaco, cc65, m6502, and the CPU visualizer channel.
- Versioned Monaco's local instruction docs import and propagated the same asset version into cc65 and m6502 sibling JavaScript/WebAssembly loads so future nested asset changes do not keep serving old cached files.
- Updated the static deploy script to stamp staged `index.html` with a build-specific query string on `app.css`, `Playground.Client.styles.css`, and `_framework/blazor.webassembly.js`, and to record `BuildVersion` in `deploy-manifest.txt`.

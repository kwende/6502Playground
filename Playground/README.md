# 6502 Playground

This repo is a Blazor-based 6502 assembly playground.

Its job is to make small 6502 exercises quick:

1. type assembly source
2. assemble it in the browser
3. load the bytes into a 64K memory image
4. inspect and edit registers and memory
5. eventually single-step instructions and watch changes happen

## Mental Model

The app is built around a reusable workbench component rather than page-specific code.

`Home.razor` should host the workbench. The workbench owns the learning workflow: source text, assembler calls, memory, register state, and eventually execution controls.

## Current First Slice

The initial implementation provides the foundation:

- reusable component shell
- Monaco-based 6502 source editor
- cc65 `ca65`/`ld65` wasm bridge
- editable 64K memory model
- paged hex memory editor with a single focusable hex surface
- register panel scaffold
- 6502 instruction stepping and run-to-`BRK` execution
- source-line highlighting for the current PC after assemble/step/run

The first default program load address is `$0600`, and memory starts filled with `$00`.

## Assembler Toolchain

The assembler path uses the wasm-ready cc65 build from:

```text
C:\repos\cc65-wasm\wasm\dist
```

The vendored browser assets are:

- `ca65.js`
- `ca65.wasm`
- `ld65.js`
- `ld65.wasm`

Blazor calls a small JavaScript module that:

1. creates a fresh Emscripten runtime for `ca65`
2. writes source into MEMFS
3. runs `ca65` to produce an object file and listing file
4. creates a fresh Emscripten runtime for `ld65`
5. links that object file into flat bytes
6. returns the output bytes, diagnostics, listing text, and source-line mappings to .NET

The assembler and linker logic is cc65 running in WebAssembly. JavaScript is only the bridge between Blazor and the Emscripten module runtime.

## Source Editor

The source editor uses vendored Monaco assets from `monaco-editor`.

The current editor bridge:

- registers a lightweight `asm6502` language tokenizer
- keeps source text in the reusable workbench component
- applies a line-number/glyph decoration for the source line mapped to the current PC
- updates that decoration after assemble/load, Step, and Run
- shows hover documentation for the 56 documented NMOS 6502 mnemonics

Source-line mapping comes from the `ca65` listing file. The wrapper parses listing offsets and adds the current load address so `$0600`, `$0602`, and `$0605` can map back to the default `lda`, `sta`, and `brk` lines.

Instruction hover data is vendored locally in:

```text
Playground.Workbench/wwwroot/toolchain/monaco/6502-instruction-docs.js
```

The data is a compact local summary, cross-checked against Obelisk-style 6502 references. Hover cards show the mnemonic name, operation, touched registers/flags/memory, addressing modes, opcodes, byte counts, cycles, and a reference link. This keeps the playground useful offline and avoids needing to search for `ADC`, `BIT`, or branch semantics while working through a lesson.

## Default Assembly Layout

For learning snippets, the workbench wraps source in a simple linker config:

```text
MEMORY {
    CODE: start = $0600, size = $FA00, type = ro, file = %O;
}

SEGMENTS {
    CODE: load = CODE, type = ro;
}
```

User source should put executable code in the `CODE` segment:

```asm
.segment "CODE"
start:
    lda #$2A
    sta $0200
```

After a successful assemble/load, emitted bytes are copied into the 64K memory image starting at `$0600`, and PC is set to `$0600`.

## Memory Model

The playground owns a 64K byte array for the full 16-bit 6502 address range.

The first memory editor view shows one 256-byte page at a time:

- 16 rows
- 16 bytes per row
- fixed hexadecimal byte spacing
- ASCII preview column
- direct byte editing by selecting a byte and typing two nibbles
- keyboard navigation across bytes and pages
- a memory import panel for pasting address/value pairs

The current Blazor implementation renders byte tokens inside one focusable memory surface. Spacing and row structure are not editable, which keeps it closer to Visual Studio's memory window than a grid of individual text inputs. Edited and loaded bytes are marked visually, and the model is ready for later CPU write tracking, where bytes changed during a step can be highlighted for the current cycle or instruction.

The memory import panel is intentionally generic. It accepts address/value pairs such as:

```text
$0010 = $07
$0011 = $03
$0012 = $00
```

It also accepts small formatting variations like `0010 = 07`, `0x0010 = 0x07`, `$0010: $07`, `0010 07`, and `$0010,$07`. Invalid input shows a simple parser error and does not apply partial changes.

## Register Model

The first register panel exposes:

- PC
- A
- X
- Y
- SP
- P/status flags
- cycle count

PC is set to the load address after a successful assemble/load. Step and Run update these registers from the browser-hosted CPU core after execution.

## Execution Core

Execution uses `floooh/chips` `m6502.h`, vendored at:

```text
Playground.Workbench/ThirdParty/chips
```

Pinned upstream commit:

```text
9371bfcb8478aec05ad10a1293206363373c1489
```

The browser module is built from:

```text
Playground.Workbench/Native/m6502/m6502_wrapper.c
```

The wrapper has no `main`. It is compiled as a WebAssembly library with exported functions for copying memory, setting registers, stepping instructions, running an instruction budget, and reporting changed memory addresses.

Current execution behavior:

- `Step`: execute one instruction unless PC points at `BRK`
- `Run`: repeatedly execute instruction budgets until paused or PC points at `BRK`
- `Pause`: stop the run loop after the current instruction budget finishes
- `BRK`: treated as a stop sentinel for the learning workflow, not yet as a full interrupt instruction

Why `m6502.h` fits:

- C header library
- dependency-light
- cycle-stepped
- browser/WebAssembly friendly
- explicit memory bus reads and writes

That bus shape is useful for the memory editor because it can report exactly which byte changed on a CPU tick.

## CPU Visualizer

The workbench has an optional CPU visualizer button next to `Assemble & Load`.

Clicking it opens:

```text
/cpu-visualizer
```

The visualizer is a separate Blazor route with a reusable SVG-based `Cpu6502Visualizer` component. It is intentionally a functional, die-inspired teaching diagram rather than a transistor-accurate 6502 die.

The main workbench sends messages to the popup with `BroadcastChannel` through:

```text
Playground.Workbench/wwwroot/toolchain/visualizer/cpu-visualizer-channel.js
```

Current messages include:

- phase/summary text
- register snapshot
- approximate bus address/data/read-write state
- memory writes from the last CPU operation
- functional units to highlight, such as PC, decoder, registers, A, flags, ALU, bus interface, memory, and buses

This first slice uses the execution information already available from the wrapper. It does not yet stream every internal `m6502_tick()` pin state. A later tracing slice can extend the C wrapper to return per-cycle records for richer bus animation.

## Build

```powershell
dotnet build Playground.slnx
```

Run from:

```text
C:\repos\6502Playground\Playground
```

Run the standalone WebAssembly app locally:

```powershell
dotnet run --project .\Playground.Client\Playground.Client.csproj
```

Rebuild the m6502 WebAssembly module from WSL2:

```bash
source /home/brush/repos/emsdk/emsdk_env.sh
cd /mnt/c/repos/6502Playground/Playground/Playground.Workbench/Native/m6502
bash ./build-wasm.sh
```

Generated assets are written to:

```text
Playground.Workbench/wwwroot/toolchain/m6502
```

## Deployment

The current app deploys as a standalone Blazor WebAssembly static site behind nginx. There is no Kestrel process and no systemd service.

The deploy script is:

```powershell
.\tools\deploy-6502-playground.ps1 -RemoteTarget user@www.ben-rush.net
```

Defaults:

- public path: `/6502/`
- remote web root: `/var/www/ben-rush.net/6502/`
- nginx mode: static `alias` with fallback to `/6502/index.html`

The script publishes `Playground.Client`, stages the published `wwwroot` assets, rewrites the staged `<base href="/">` to `<base href="/6502/">`, uploads over ssh/rsync through WSL, syncs the remote web root, and reloads nginx when available.

Deployment details live in:

```text
deploy/README.md
deploy/nginx/6502playground.conf.example
```

The nginx shape is:

```nginx
location = /6502 {
    return 301 /6502/;
}

location /6502/ {
    alias /var/www/ben-rush.net/6502/;
    index index.html;
    try_files $uri $uri/ /6502/index.html;
}
```

## Project Memory

- `AGENTS.md`: collaboration rules and current direction
- `current-status.md`: serialized status and session log
- `README.md`: under-the-hood explanation

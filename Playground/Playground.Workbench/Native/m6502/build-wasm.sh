#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
workbench_dir="$(cd "$script_dir/../.." && pwd)"
out_dir="$workbench_dir/wwwroot/toolchain/m6502"

mkdir -p "$out_dir"

emcc "$script_dir/m6502_wrapper.c" \
  -O2 \
  --no-entry \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s ENVIRONMENT=web \
  -s ALLOW_MEMORY_GROWTH=0 \
  -s INITIAL_MEMORY=16777216 \
  -s EXPORTED_FUNCTIONS='["_cpu_memory_ptr","_cpu_changed_addresses_ptr","_cpu_clear_changed_addresses","_cpu_changed_count","_cpu_set_registers","_cpu_step_instruction","_cpu_run_instruction_budget","_cpu_get_last_status","_cpu_get_last_step_ticks","_cpu_get_last_run_ticks","_cpu_get_cycles","_cpu_is_halted","_cpu_get_pc","_cpu_get_a","_cpu_get_x","_cpu_get_y","_cpu_get_s","_cpu_get_p"]' \
  -s EXPORTED_RUNTIME_METHODS='["HEAPU8","HEAPU16"]' \
  -o "$out_dir/m6502.js"

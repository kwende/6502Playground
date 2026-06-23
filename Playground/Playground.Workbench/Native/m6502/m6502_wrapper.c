#include <stdbool.h>
#include <stdint.h>
#include <string.h>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

#define CHIPS_IMPL
#include "../../ThirdParty/chips/m6502.h"

#define CPU_MEMORY_SIZE 0x10000
#define CPU_MAX_CHANGED_ADDRESSES 0x10000
#define CPU_STATUS_OK 0
#define CPU_STATUS_BREAK 1
#define CPU_STATUS_TICK_LIMIT 2

static m6502_t cpu;
static uint64_t pins;
static uint8_t memory[CPU_MEMORY_SIZE];
static uint8_t changed_flags[CPU_MEMORY_SIZE];
static uint16_t changed_addresses[CPU_MAX_CHANGED_ADDRESSES];
static uint32_t changed_count;
static uint32_t total_cycles;
static uint32_t last_step_ticks;
static uint32_t last_run_ticks;
static uint32_t last_status = CPU_STATUS_OK;
static bool initialized;
static bool halted;

static void remember_write(uint16_t address) {
    if (!changed_flags[address]) {
        changed_flags[address] = 1;
        changed_addresses[changed_count++] = address;
    }
}

static void prefetch(uint16_t pc) {
    pins = M6502_SYNC;
    M6502_SET_ADDR(pins, pc);
    M6502_SET_DATA(pins, memory[pc]);
    m6502_set_pc(&cpu, pc);
}

static void ensure_initialized(void) {
    if (!initialized) {
        pins = m6502_init(&cpu, &(m6502_desc_t) {
            .bcd_disabled = false,
        });
        prefetch(0x0600);
        initialized = true;
    }
}

static void tick_once(void) {
    pins = m6502_tick(&cpu, pins);
    total_cycles++;

    const uint16_t address = M6502_GET_ADDR(pins);
    if (pins & M6502_RW) {
        M6502_SET_DATA(pins, memory[address]);
    }
    else {
        memory[address] = M6502_GET_DATA(pins);
        remember_write(address);
    }
}

EMSCRIPTEN_KEEPALIVE
uint8_t* cpu_memory_ptr(void) {
    ensure_initialized();
    return memory;
}

EMSCRIPTEN_KEEPALIVE
uint16_t* cpu_changed_addresses_ptr(void) {
    ensure_initialized();
    return changed_addresses;
}

EMSCRIPTEN_KEEPALIVE
void cpu_clear_changed_addresses(void) {
    changed_count = 0;
    memset(changed_flags, 0, sizeof(changed_flags));
}

EMSCRIPTEN_KEEPALIVE
uint32_t cpu_changed_count(void) {
    return changed_count;
}

EMSCRIPTEN_KEEPALIVE
void cpu_set_registers(uint32_t pc, uint32_t a, uint32_t x, uint32_t y, uint32_t s, uint32_t p, uint32_t cycles) {
    ensure_initialized();

    m6502_set_a(&cpu, (uint8_t) a);
    m6502_set_x(&cpu, (uint8_t) x);
    m6502_set_y(&cpu, (uint8_t) y);
    m6502_set_s(&cpu, (uint8_t) s);
    m6502_set_p(&cpu, (uint8_t) (p | M6502_XF));
    total_cycles = cycles;
    halted = false;
    last_status = CPU_STATUS_OK;
    last_step_ticks = 0;
    last_run_ticks = 0;

    prefetch((uint16_t) pc);
}

EMSCRIPTEN_KEEPALIVE
uint32_t cpu_step_instruction(uint32_t max_ticks) {
    ensure_initialized();

    last_step_ticks = 0;

    if (halted || memory[m6502_pc(&cpu)] == 0x00) {
        halted = true;
        last_status = CPU_STATUS_BREAK;
        return last_status;
    }

    const uint32_t tick_limit = max_ticks == 0 ? 64 : max_ticks;
    for (uint32_t i = 0; i < tick_limit; i++) {
        tick_once();
        last_step_ticks++;

        if (pins & M6502_SYNC) {
            last_status = CPU_STATUS_OK;
            return last_status;
        }
    }

    last_status = CPU_STATUS_TICK_LIMIT;
    return last_status;
}

EMSCRIPTEN_KEEPALIVE
uint32_t cpu_run_instruction_budget(uint32_t instruction_budget, uint32_t max_ticks_per_instruction) {
    ensure_initialized();

    last_run_ticks = 0;
    uint32_t instructions_executed = 0;
    const uint32_t budget = instruction_budget == 0 ? 1 : instruction_budget;

    for (uint32_t i = 0; i < budget; i++) {
        const uint32_t status = cpu_step_instruction(max_ticks_per_instruction);
        last_run_ticks += last_step_ticks;

        if (status != CPU_STATUS_OK) {
            return instructions_executed;
        }

        instructions_executed++;
    }

    last_status = CPU_STATUS_OK;
    return instructions_executed;
}

EMSCRIPTEN_KEEPALIVE
uint32_t cpu_get_last_status(void) {
    return last_status;
}

EMSCRIPTEN_KEEPALIVE
uint32_t cpu_get_last_step_ticks(void) {
    return last_step_ticks;
}

EMSCRIPTEN_KEEPALIVE
uint32_t cpu_get_last_run_ticks(void) {
    return last_run_ticks;
}

EMSCRIPTEN_KEEPALIVE
uint32_t cpu_get_cycles(void) {
    return total_cycles;
}

EMSCRIPTEN_KEEPALIVE
uint32_t cpu_is_halted(void) {
    return halted ? 1 : 0;
}

EMSCRIPTEN_KEEPALIVE
uint32_t cpu_get_pc(void) {
    return m6502_pc(&cpu);
}

EMSCRIPTEN_KEEPALIVE
uint32_t cpu_get_a(void) {
    return m6502_a(&cpu);
}

EMSCRIPTEN_KEEPALIVE
uint32_t cpu_get_x(void) {
    return m6502_x(&cpu);
}

EMSCRIPTEN_KEEPALIVE
uint32_t cpu_get_y(void) {
    return m6502_y(&cpu);
}

EMSCRIPTEN_KEEPALIVE
uint32_t cpu_get_s(void) {
    return m6502_s(&cpu);
}

EMSCRIPTEN_KEEPALIVE
uint32_t cpu_get_p(void) {
    return m6502_p(&cpu);
}

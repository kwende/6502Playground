import createM6502 from "./m6502.js";

const memorySize = 0x10000;
const defaultMaxTicksPerInstruction = 64;

let modulePromise;

export async function stepInstruction(request = {}) {
    const module = await getModule();
    prepareCpu(module, request);
    module._cpu_clear_changed_addresses();

    const status = module._cpu_step_instruction(normalizePositiveNumber(request.maxTicksPerInstruction, defaultMaxTicksPerInstruction));
    return collectResult(module, status, status === 0 ? 1 : 0, module._cpu_get_last_step_ticks());
}

export async function runInstructions(request = {}) {
    const module = await getModule();
    prepareCpu(module, request);
    module._cpu_clear_changed_addresses();

    const instructionBudget = normalizePositiveNumber(request.instructionBudget, 64);
    const maxTicksPerInstruction = normalizePositiveNumber(request.maxTicksPerInstruction, defaultMaxTicksPerInstruction);
    const instructionsExecuted = module._cpu_run_instruction_budget(instructionBudget, maxTicksPerInstruction);
    return collectResult(module, module._cpu_get_last_status(), instructionsExecuted, module._cpu_get_last_run_ticks());
}

async function getModule() {
    modulePromise ??= createM6502({
        locateFile: (path) => new URL(`./${path}`, import.meta.url).href,
    });

    return modulePromise;
}

function prepareCpu(module, request) {
    const memoryBytes = request.memoryBytes;
    if (!memoryBytes || memoryBytes.length !== memorySize) {
        throw new Error(`CPU execution requires a ${memorySize}-byte memory image.`);
    }

    const memoryPtr = module._cpu_memory_ptr();
    module.HEAPU8.set(memoryBytes, memoryPtr);

    const registers = request.registers ?? {};
    module._cpu_set_registers(
        normalizeWord(registers.programCounter),
        normalizeByte(registers.accumulator),
        normalizeByte(registers.x),
        normalizeByte(registers.y),
        normalizeByte(registers.stackPointer, 0xFF),
        normalizeByte(registers.status, 0x20),
        normalizePositiveNumber(registers.cycleCount, 0));
}

function collectResult(module, status, instructionsExecuted, ticksExecuted) {
    return {
        status,
        statusText: getStatusText(status),
        halted: module._cpu_is_halted() !== 0,
        instructionsExecuted,
        ticksExecuted,
        registers: {
            programCounter: module._cpu_get_pc(),
            accumulator: module._cpu_get_a(),
            x: module._cpu_get_x(),
            y: module._cpu_get_y(),
            stackPointer: module._cpu_get_s(),
            status: module._cpu_get_p(),
            cycleCount: module._cpu_get_cycles(),
        },
        memoryChanges: collectMemoryChanges(module),
    };
}

function collectMemoryChanges(module) {
    const memoryPtr = module._cpu_memory_ptr();
    const changesPtr = module._cpu_changed_addresses_ptr();
    const count = module._cpu_changed_count();
    const changes = [];

    for (let index = 0; index < count; index++) {
        const address = module.HEAPU16[(changesPtr >> 1) + index];
        changes.push({
            address,
            value: module.HEAPU8[memoryPtr + address],
        });
    }

    return changes;
}

function getStatusText(status) {
    switch (status) {
        case 0:
            return "Ok";
        case 1:
            return "Break";
        case 2:
            return "TickLimit";
        default:
            return "Unknown";
    }
}

function normalizeByte(value, fallback = 0) {
    const number = Number.isFinite(value) ? value : fallback;
    return number & 0xFF;
}

function normalizeWord(value, fallback = 0x0600) {
    const number = Number.isFinite(value) ? value : fallback;
    return number & 0xFFFF;
}

function normalizePositiveNumber(value, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
        return fallback;
    }

    return Math.floor(number);
}

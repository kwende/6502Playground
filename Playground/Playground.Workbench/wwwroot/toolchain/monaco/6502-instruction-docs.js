// Local 6502 instruction hover data, summarized from public reference tables
// such as Obelisk 6502 and NesDev's Obelisk mirror. Keep this file factual,
// compact, and offline-friendly so the playground remains a static WASM app.

const referenceUrl = "https://www.nesdev.org/obelisk-6502-guide/reference.html";

const pageCross = "+1 if page crossed";
const branchCycles = "+1 if branch taken, +2 if page crossed";

function doc(title, summary, operation, touches, modes, notes = []) {
    return {
        title,
        summary,
        operation,
        touches,
        modes,
        notes,
        referenceUrl,
    };
}

function mode(name, syntax, opcode, bytes, cycles, notes = "") {
    return { name, syntax, opcode, bytes, cycles, notes };
}

export const instructionDocs = {
    ADC: doc(
        "Add with Carry",
        "Adds a memory value and the carry flag to the accumulator.",
        "A = A + M + C",
        "A, C, Z, V, N",
        [
            mode("Immediate", "#$nn", "$69", 2, "2"),
            mode("Zero Page", "$nn", "$65", 2, "3"),
            mode("Zero Page,X", "$nn,X", "$75", 2, "4"),
            mode("Absolute", "$nnnn", "$6D", 3, "4"),
            mode("Absolute,X", "$nnnn,X", "$7D", 3, "4", pageCross),
            mode("Absolute,Y", "$nnnn,Y", "$79", 3, "4", pageCross),
            mode("(Indirect,X)", "($nn,X)", "$61", 2, "6"),
            mode("(Indirect),Y", "($nn),Y", "$71", 2, "5", pageCross),
        ],
        ["Decimal mode changes the arithmetic result when D is set."]
    ),
    AND: doc(
        "Logical AND",
        "Bitwise ANDs a memory value with the accumulator.",
        "A = A & M",
        "A, Z, N",
        [
            mode("Immediate", "#$nn", "$29", 2, "2"),
            mode("Zero Page", "$nn", "$25", 2, "3"),
            mode("Zero Page,X", "$nn,X", "$35", 2, "4"),
            mode("Absolute", "$nnnn", "$2D", 3, "4"),
            mode("Absolute,X", "$nnnn,X", "$3D", 3, "4", pageCross),
            mode("Absolute,Y", "$nnnn,Y", "$39", 3, "4", pageCross),
            mode("(Indirect,X)", "($nn,X)", "$21", 2, "6"),
            mode("(Indirect),Y", "($nn),Y", "$31", 2, "5", pageCross),
        ]
    ),
    ASL: doc(
        "Arithmetic Shift Left",
        "Shifts the accumulator or memory left one bit. Bit 7 moves into carry; bit 0 becomes 0.",
        "A/M = A/M << 1",
        "A or memory, C, Z, N",
        [
            mode("Accumulator", "A", "$0A", 1, "2"),
            mode("Zero Page", "$nn", "$06", 2, "5"),
            mode("Zero Page,X", "$nn,X", "$16", 2, "6"),
            mode("Absolute", "$nnnn", "$0E", 3, "6"),
            mode("Absolute,X", "$nnnn,X", "$1E", 3, "7"),
        ]
    ),
    BCC: doc("Branch if Carry Clear", "Branches when C is 0.", "if C == 0: PC += offset", "PC", [mode("Relative", "label", "$90", 2, "2", branchCycles)]),
    BCS: doc("Branch if Carry Set", "Branches when C is 1.", "if C == 1: PC += offset", "PC", [mode("Relative", "label", "$B0", 2, "2", branchCycles)]),
    BEQ: doc("Branch if Equal", "Branches when Z is 1.", "if Z == 1: PC += offset", "PC", [mode("Relative", "label", "$F0", 2, "2", branchCycles)]),
    BIT: doc(
        "Bit Test",
        "Tests bits in memory against A. Z reflects A & M; N and V copy bits 7 and 6 of memory.",
        "Z = (A & M) == 0; N = M7; V = M6",
        "Z, V, N",
        [
            mode("Zero Page", "$nn", "$24", 2, "3"),
            mode("Absolute", "$nnnn", "$2C", 3, "4"),
        ]
    ),
    BMI: doc("Branch if Minus", "Branches when N is 1.", "if N == 1: PC += offset", "PC", [mode("Relative", "label", "$30", 2, "2", branchCycles)]),
    BNE: doc("Branch if Not Equal", "Branches when Z is 0.", "if Z == 0: PC += offset", "PC", [mode("Relative", "label", "$D0", 2, "2", branchCycles)]),
    BPL: doc("Branch if Positive", "Branches when N is 0.", "if N == 0: PC += offset", "PC", [mode("Relative", "label", "$10", 2, "2", branchCycles)]),
    BRK: doc("Break", "Forces an interrupt-style break. The playground currently treats BRK as a stop sentinel.", "push PC/P; set I; jump via $FFFE/$FFFF", "PC, SP, P, stack memory", [mode("Implied", "", "$00", 1, "7")]),
    BVC: doc("Branch if Overflow Clear", "Branches when V is 0.", "if V == 0: PC += offset", "PC", [mode("Relative", "label", "$50", 2, "2", branchCycles)]),
    BVS: doc("Branch if Overflow Set", "Branches when V is 1.", "if V == 1: PC += offset", "PC", [mode("Relative", "label", "$70", 2, "2", branchCycles)]),
    CLC: doc("Clear Carry", "Clears the carry flag.", "C = 0", "C", [mode("Implied", "", "$18", 1, "2")]),
    CLD: doc("Clear Decimal", "Clears decimal mode.", "D = 0", "D", [mode("Implied", "", "$D8", 1, "2")]),
    CLI: doc("Clear Interrupt Disable", "Allows maskable interrupts.", "I = 0", "I", [mode("Implied", "", "$58", 1, "2")]),
    CLV: doc("Clear Overflow", "Clears the overflow flag.", "V = 0", "V", [mode("Implied", "", "$B8", 1, "2")]),
    CMP: doc(
        "Compare Accumulator",
        "Compares A with memory by subtracting without storing the result.",
        "A - M",
        "C, Z, N",
        [
            mode("Immediate", "#$nn", "$C9", 2, "2"),
            mode("Zero Page", "$nn", "$C5", 2, "3"),
            mode("Zero Page,X", "$nn,X", "$D5", 2, "4"),
            mode("Absolute", "$nnnn", "$CD", 3, "4"),
            mode("Absolute,X", "$nnnn,X", "$DD", 3, "4", pageCross),
            mode("Absolute,Y", "$nnnn,Y", "$D9", 3, "4", pageCross),
            mode("(Indirect,X)", "($nn,X)", "$C1", 2, "6"),
            mode("(Indirect),Y", "($nn),Y", "$D1", 2, "5", pageCross),
        ]
    ),
    CPX: doc(
        "Compare X",
        "Compares X with memory by subtracting without storing the result.",
        "X - M",
        "C, Z, N",
        [mode("Immediate", "#$nn", "$E0", 2, "2"), mode("Zero Page", "$nn", "$E4", 2, "3"), mode("Absolute", "$nnnn", "$EC", 3, "4")]
    ),
    CPY: doc(
        "Compare Y",
        "Compares Y with memory by subtracting without storing the result.",
        "Y - M",
        "C, Z, N",
        [mode("Immediate", "#$nn", "$C0", 2, "2"), mode("Zero Page", "$nn", "$C4", 2, "3"), mode("Absolute", "$nnnn", "$CC", 3, "4")]
    ),
    DEC: doc(
        "Decrement Memory",
        "Subtracts one from a memory byte.",
        "M = M - 1",
        "memory, Z, N",
        [mode("Zero Page", "$nn", "$C6", 2, "5"), mode("Zero Page,X", "$nn,X", "$D6", 2, "6"), mode("Absolute", "$nnnn", "$CE", 3, "6"), mode("Absolute,X", "$nnnn,X", "$DE", 3, "7")]
    ),
    DEX: doc("Decrement X", "Subtracts one from X.", "X = X - 1", "X, Z, N", [mode("Implied", "", "$CA", 1, "2")]),
    DEY: doc("Decrement Y", "Subtracts one from Y.", "Y = Y - 1", "Y, Z, N", [mode("Implied", "", "$88", 1, "2")]),
    EOR: doc(
        "Exclusive OR",
        "Bitwise XORs a memory value with the accumulator.",
        "A = A ^ M",
        "A, Z, N",
        [
            mode("Immediate", "#$nn", "$49", 2, "2"),
            mode("Zero Page", "$nn", "$45", 2, "3"),
            mode("Zero Page,X", "$nn,X", "$55", 2, "4"),
            mode("Absolute", "$nnnn", "$4D", 3, "4"),
            mode("Absolute,X", "$nnnn,X", "$5D", 3, "4", pageCross),
            mode("Absolute,Y", "$nnnn,Y", "$59", 3, "4", pageCross),
            mode("(Indirect,X)", "($nn,X)", "$41", 2, "6"),
            mode("(Indirect),Y", "($nn),Y", "$51", 2, "5", pageCross),
        ]
    ),
    INC: doc(
        "Increment Memory",
        "Adds one to a memory byte.",
        "M = M + 1",
        "memory, Z, N",
        [mode("Zero Page", "$nn", "$E6", 2, "5"), mode("Zero Page,X", "$nn,X", "$F6", 2, "6"), mode("Absolute", "$nnnn", "$EE", 3, "6"), mode("Absolute,X", "$nnnn,X", "$FE", 3, "7")]
    ),
    INX: doc("Increment X", "Adds one to X.", "X = X + 1", "X, Z, N", [mode("Implied", "", "$E8", 1, "2")]),
    INY: doc("Increment Y", "Adds one to Y.", "Y = Y + 1", "Y, Z, N", [mode("Implied", "", "$C8", 1, "2")]),
    JMP: doc(
        "Jump",
        "Sets the program counter to a new address.",
        "PC = target",
        "PC",
        [mode("Absolute", "$nnnn", "$4C", 3, "3"), mode("Indirect", "($nnnn)", "$6C", 3, "5")],
        ["Original 6502 indirect JMP has the well-known page-wrap bug at addresses ending in $FF."]
    ),
    JSR: doc("Jump to Subroutine", "Pushes the return address, then jumps to the target address.", "push return; PC = target", "PC, SP, stack memory", [mode("Absolute", "$nnnn", "$20", 3, "6")]),
    LDA: doc(
        "Load Accumulator",
        "Loads a value into A.",
        "A = M",
        "A, Z, N",
        [
            mode("Immediate", "#$nn", "$A9", 2, "2"),
            mode("Zero Page", "$nn", "$A5", 2, "3"),
            mode("Zero Page,X", "$nn,X", "$B5", 2, "4"),
            mode("Absolute", "$nnnn", "$AD", 3, "4"),
            mode("Absolute,X", "$nnnn,X", "$BD", 3, "4", pageCross),
            mode("Absolute,Y", "$nnnn,Y", "$B9", 3, "4", pageCross),
            mode("(Indirect,X)", "($nn,X)", "$A1", 2, "6"),
            mode("(Indirect),Y", "($nn),Y", "$B1", 2, "5", pageCross),
        ]
    ),
    LDX: doc(
        "Load X",
        "Loads a value into X.",
        "X = M",
        "X, Z, N",
        [mode("Immediate", "#$nn", "$A2", 2, "2"), mode("Zero Page", "$nn", "$A6", 2, "3"), mode("Zero Page,Y", "$nn,Y", "$B6", 2, "4"), mode("Absolute", "$nnnn", "$AE", 3, "4"), mode("Absolute,Y", "$nnnn,Y", "$BE", 3, "4", pageCross)]
    ),
    LDY: doc(
        "Load Y",
        "Loads a value into Y.",
        "Y = M",
        "Y, Z, N",
        [mode("Immediate", "#$nn", "$A0", 2, "2"), mode("Zero Page", "$nn", "$A4", 2, "3"), mode("Zero Page,X", "$nn,X", "$B4", 2, "4"), mode("Absolute", "$nnnn", "$AC", 3, "4"), mode("Absolute,X", "$nnnn,X", "$BC", 3, "4", pageCross)]
    ),
    LSR: doc(
        "Logical Shift Right",
        "Shifts the accumulator or memory right one bit. Bit 0 moves into carry; bit 7 becomes 0.",
        "A/M = A/M >> 1",
        "A or memory, C, Z, N",
        [mode("Accumulator", "A", "$4A", 1, "2"), mode("Zero Page", "$nn", "$46", 2, "5"), mode("Zero Page,X", "$nn,X", "$56", 2, "6"), mode("Absolute", "$nnnn", "$4E", 3, "6"), mode("Absolute,X", "$nnnn,X", "$5E", 3, "7")],
        ["N is always cleared because bit 7 of the result is 0."]
    ),
    NOP: doc("No Operation", "Consumes cycles without changing registers or memory.", "no change", "none", [mode("Implied", "", "$EA", 1, "2")]),
    ORA: doc(
        "Logical OR",
        "Bitwise ORs a memory value into the accumulator.",
        "A = A | M",
        "A, Z, N",
        [
            mode("Immediate", "#$nn", "$09", 2, "2"),
            mode("Zero Page", "$nn", "$05", 2, "3"),
            mode("Zero Page,X", "$nn,X", "$15", 2, "4"),
            mode("Absolute", "$nnnn", "$0D", 3, "4"),
            mode("Absolute,X", "$nnnn,X", "$1D", 3, "4", pageCross),
            mode("Absolute,Y", "$nnnn,Y", "$19", 3, "4", pageCross),
            mode("(Indirect,X)", "($nn,X)", "$01", 2, "6"),
            mode("(Indirect),Y", "($nn),Y", "$11", 2, "5", pageCross),
        ]
    ),
    PHA: doc("Push Accumulator", "Pushes A onto the stack.", "stack[SP] = A; SP--", "SP, stack memory", [mode("Implied", "", "$48", 1, "3")]),
    PHP: doc("Push Processor Status", "Pushes processor status onto the stack.", "stack[SP] = P; SP--", "SP, stack memory", [mode("Implied", "", "$08", 1, "3")]),
    PLA: doc("Pull Accumulator", "Pulls a byte from the stack into A.", "SP++; A = stack[SP]", "A, SP, Z, N", [mode("Implied", "", "$68", 1, "4")]),
    PLP: doc("Pull Processor Status", "Pulls processor status from the stack.", "SP++; P = stack[SP]", "P, SP", [mode("Implied", "", "$28", 1, "4")]),
    ROL: doc(
        "Rotate Left",
        "Rotates accumulator or memory left through carry.",
        "old C -> bit 0; bit 7 -> C",
        "A or memory, C, Z, N",
        [mode("Accumulator", "A", "$2A", 1, "2"), mode("Zero Page", "$nn", "$26", 2, "5"), mode("Zero Page,X", "$nn,X", "$36", 2, "6"), mode("Absolute", "$nnnn", "$2E", 3, "6"), mode("Absolute,X", "$nnnn,X", "$3E", 3, "7")]
    ),
    ROR: doc(
        "Rotate Right",
        "Rotates accumulator or memory right through carry.",
        "old C -> bit 7; bit 0 -> C",
        "A or memory, C, Z, N",
        [mode("Accumulator", "A", "$6A", 1, "2"), mode("Zero Page", "$nn", "$66", 2, "5"), mode("Zero Page,X", "$nn,X", "$76", 2, "6"), mode("Absolute", "$nnnn", "$6E", 3, "6"), mode("Absolute,X", "$nnnn,X", "$7E", 3, "7")]
    ),
    RTI: doc("Return from Interrupt", "Restores processor status and program counter from the stack.", "P = pull; PC = pull word", "P, PC, SP", [mode("Implied", "", "$40", 1, "6")]),
    RTS: doc("Return from Subroutine", "Pulls the return address from the stack, then continues after the JSR.", "PC = pull word + 1", "PC, SP", [mode("Implied", "", "$60", 1, "6")]),
    SBC: doc(
        "Subtract with Carry",
        "Subtracts memory and the inverse of carry from the accumulator.",
        "A = A - M - (1 - C)",
        "A, C, Z, V, N",
        [
            mode("Immediate", "#$nn", "$E9", 2, "2"),
            mode("Zero Page", "$nn", "$E5", 2, "3"),
            mode("Zero Page,X", "$nn,X", "$F5", 2, "4"),
            mode("Absolute", "$nnnn", "$ED", 3, "4"),
            mode("Absolute,X", "$nnnn,X", "$FD", 3, "4", pageCross),
            mode("Absolute,Y", "$nnnn,Y", "$F9", 3, "4", pageCross),
            mode("(Indirect,X)", "($nn,X)", "$E1", 2, "6"),
            mode("(Indirect),Y", "($nn),Y", "$F1", 2, "5", pageCross),
        ],
        ["Carry works like not-borrow: set C before ordinary subtraction.", "Decimal mode changes the arithmetic result when D is set."]
    ),
    SEC: doc("Set Carry", "Sets the carry flag.", "C = 1", "C", [mode("Implied", "", "$38", 1, "2")]),
    SED: doc("Set Decimal", "Sets decimal mode.", "D = 1", "D", [mode("Implied", "", "$F8", 1, "2")]),
    SEI: doc("Set Interrupt Disable", "Disables maskable interrupts.", "I = 1", "I", [mode("Implied", "", "$78", 1, "2")]),
    STA: doc(
        "Store Accumulator",
        "Stores A into memory.",
        "M = A",
        "memory",
        [mode("Zero Page", "$nn", "$85", 2, "3"), mode("Zero Page,X", "$nn,X", "$95", 2, "4"), mode("Absolute", "$nnnn", "$8D", 3, "4"), mode("Absolute,X", "$nnnn,X", "$9D", 3, "5"), mode("Absolute,Y", "$nnnn,Y", "$99", 3, "5"), mode("(Indirect,X)", "($nn,X)", "$81", 2, "6"), mode("(Indirect),Y", "($nn),Y", "$91", 2, "6")],
        ["Store instructions do not update flags."]
    ),
    STX: doc("Store X", "Stores X into memory.", "M = X", "memory", [mode("Zero Page", "$nn", "$86", 2, "3"), mode("Zero Page,Y", "$nn,Y", "$96", 2, "4"), mode("Absolute", "$nnnn", "$8E", 3, "4")], ["Store instructions do not update flags."]),
    STY: doc("Store Y", "Stores Y into memory.", "M = Y", "memory", [mode("Zero Page", "$nn", "$84", 2, "3"), mode("Zero Page,X", "$nn,X", "$94", 2, "4"), mode("Absolute", "$nnnn", "$8C", 3, "4")], ["Store instructions do not update flags."]),
    TAX: doc("Transfer A to X", "Copies A into X.", "X = A", "X, Z, N", [mode("Implied", "", "$AA", 1, "2")]),
    TAY: doc("Transfer A to Y", "Copies A into Y.", "Y = A", "Y, Z, N", [mode("Implied", "", "$A8", 1, "2")]),
    TSX: doc("Transfer Stack Pointer to X", "Copies SP into X.", "X = SP", "X, Z, N", [mode("Implied", "", "$BA", 1, "2")]),
    TXA: doc("Transfer X to A", "Copies X into A.", "A = X", "A, Z, N", [mode("Implied", "", "$8A", 1, "2")]),
    TXS: doc("Transfer X to Stack Pointer", "Copies X into SP.", "SP = X", "SP", [mode("Implied", "", "$9A", 1, "2")], ["TXS does not update flags."]),
    TYA: doc("Transfer Y to A", "Copies Y into A.", "A = Y", "A, Z, N", [mode("Implied", "", "$98", 1, "2")]),
};

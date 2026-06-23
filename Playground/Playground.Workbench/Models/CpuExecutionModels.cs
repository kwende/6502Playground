namespace Playground.Workbench.Models;

public sealed class Cpu6502ExecutionRequest
{
    public byte[] MemoryBytes { get; set; } = [];

    public Cpu6502RegisterSnapshot Registers { get; set; } = new();

    public int InstructionBudget { get; set; } = 1;

    public int MaxTicksPerInstruction { get; set; } = 64;
}

public sealed class Cpu6502ExecutionResult
{
    public Cpu6502ExecutionStatus Status { get; set; }

    public string StatusText { get; set; } = string.Empty;

    public bool Halted { get; set; }

    public int InstructionsExecuted { get; set; }

    public int TicksExecuted { get; set; }

    public Cpu6502RegisterSnapshot Registers { get; set; } = new();

    public Cpu6502MemoryChange[] MemoryChanges { get; set; } = [];
}

public sealed class Cpu6502RegisterSnapshot
{
    public ushort ProgramCounter { get; set; }

    public byte Accumulator { get; set; }

    public byte X { get; set; }

    public byte Y { get; set; }

    public byte StackPointer { get; set; }

    public byte Status { get; set; }

    public ulong CycleCount { get; set; }
}

public sealed class Cpu6502MemoryChange
{
    public ushort Address { get; set; }

    public byte Value { get; set; }
}

public enum Cpu6502ExecutionStatus
{
    Ok = 0,
    Break = 1,
    TickLimit = 2,
    Unknown = 255
}

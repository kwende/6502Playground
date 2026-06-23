namespace Playground.Workbench.Models;

public sealed class Cpu6502State
{
    public ushort ProgramCounter { get; set; } = 0x0600;

    public byte Accumulator { get; set; }

    public byte X { get; set; }

    public byte Y { get; set; }

    public byte StackPointer { get; set; } = 0xFF;

    public byte Status { get; set; } = 0x20;

    public ulong CycleCount { get; set; }

    public void Reset(ushort programCounter)
    {
        ProgramCounter = programCounter;
        Accumulator = 0;
        X = 0;
        Y = 0;
        StackPointer = 0xFF;
        Status = 0x20;
        CycleCount = 0;
    }

    public bool GetFlag(Cpu6502Flag flag) => (Status & (byte)flag) != 0;

    public void SetFlag(Cpu6502Flag flag, bool enabled)
    {
        Status = enabled
            ? (byte)(Status | (byte)flag)
            : (byte)(Status & ~(byte)flag);
    }
}

[Flags]
public enum Cpu6502Flag : byte
{
    Carry = 0x01,
    Zero = 0x02,
    InterruptDisable = 0x04,
    Decimal = 0x08,
    Break = 0x10,
    Unused = 0x20,
    Overflow = 0x40,
    Negative = 0x80
}

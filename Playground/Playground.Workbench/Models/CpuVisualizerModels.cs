namespace Playground.Workbench.Models;

public sealed class CpuVisualizerMessage
{
    public string Type { get; set; } = "cpu-state";

    public int Sequence { get; set; }

    public string Phase { get; set; } = string.Empty;

    public string Summary { get; set; } = string.Empty;

    public Cpu6502RegisterSnapshot Registers { get; set; } = new();

    public CpuVisualizerBusSnapshot Bus { get; set; } = new();

    public CpuVisualizerMemoryChange[] MemoryChanges { get; set; } = [];

    public string[] ActiveUnits { get; set; } = [];
}

public sealed class CpuVisualizerBusSnapshot
{
    public ushort Address { get; set; }

    public byte Data { get; set; }

    public bool IsWrite { get; set; }

    public bool Sync { get; set; }

    public string Operation { get; set; } = "read";
}

public sealed class CpuVisualizerMemoryChange
{
    public ushort Address { get; set; }

    public byte Value { get; set; }
}

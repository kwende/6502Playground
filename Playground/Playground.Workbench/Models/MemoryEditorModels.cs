namespace Playground.Workbench.Models;

public sealed class MemoryEditorMessage
{
    public string Kind { get; set; } = "state";

    public int Sequence { get; set; }

    public int PageStart { get; set; }

    public ushort? ProgramStart { get; set; }

    public int ProgramLength { get; set; }

    public int[] MemoryBytes { get; set; } = [];

    public int[] ChangedAddresses { get; set; } = [];

    public MemoryEditorByteChange[] ByteChanges { get; set; } = [];
}

public sealed class MemoryEditorByteChange
{
    public int Address { get; set; }

    public byte Value { get; set; }
}

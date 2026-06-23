namespace Playground.Workbench.Models;

public sealed class Cc65AssemblyRequest
{
    public string Source { get; set; } = string.Empty;

    public string? LinkerConfig { get; set; }

    public ushort LoadAddress { get; set; }

    public string[] Ca65Args { get; set; } = [];

    public string[] Ld65Args { get; set; } = [];
}

public sealed class Cc65AssemblyResult
{
    public bool Success { get; set; }

    public string? Error { get; set; }

    public string DiagnosticText { get; set; } = string.Empty;

    public int ObjectByteLength { get; set; }

    public int OutputByteLength { get; set; }

    public int[] OutputBytes { get; set; } = [];

    public string ListingText { get; set; } = string.Empty;

    public Cc65SourceLineMapping[] SourceLineMappings { get; set; } = [];
}

public sealed class Cc65SourceLineMapping
{
    public ushort Address { get; set; }

    public int LineNumber { get; set; }

    public int ByteCount { get; set; }

    public string SourceText { get; set; } = string.Empty;
}

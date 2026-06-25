namespace Playground.Workbench;

public static class WorkbenchStaticAssets
{
    public const string Version = "20260625-memory-popout-1";

    public static string WithVersion(string path)
    {
        var separator = path.Contains('?') ? "&" : "?";
        return $"{path}{separator}v={Version}";
    }
}

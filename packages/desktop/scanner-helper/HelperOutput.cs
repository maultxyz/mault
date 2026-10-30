using System.Text.Json;

namespace MaultScannerHelper;

public static class HelperOutput
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);
    private static readonly object WriteLock = new();

    public static void Write(object message)
    {
        var line = JsonSerializer.Serialize(message, SerializerOptions);
        lock (WriteLock)
        {
            Console.Out.WriteLine(line);
            Console.Out.Flush();
        }
    }

    public static void WriteError(string reason, string message) =>
        Write(new ErrorMessage("error", reason, message));
}

public sealed record ScannerSummary(string ScannerId, string Name, string Driver, bool HasFeeder, bool HasFlatbed);

public sealed record ScannersMessage(string Type, IReadOnlyList<ScannerSummary> Scanners);

public sealed record PageMessage(
    string Type,
    int PageIndex,
    string FilePath,
    string PaperSource,
    double ScanWidthMm,
    double ScanHeightMm);

public sealed record SessionReadyMessage(string Type);

public sealed record FinishedMessage(string Type, int PageCount);

public sealed record ErrorMessage(string Type, string Reason, string Message);

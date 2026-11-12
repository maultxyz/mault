using NAPS2.Scan;

namespace MaultScannerHelper;

public sealed record PaperSources(bool SupportsFeeder, bool SupportsFlatbed);

public sealed record FeederCapabilities(decimal WidthMm, bool SupportsDuplex);

public sealed record ListedScanner(ScanDevice Device, PaperSources? PaperSources);

public static class ScannerListing
{
    public static List<ScannerSummary> Summarize(IReadOnlyList<ListedScanner> listedScanners) =>
        listedScanners.Select(scanner => new ScannerSummary(
            scanner.Device.ID,
            scanner.Device.Name,
            "wia",
            scanner.PaperSources?.SupportsFeeder ?? true,
            scanner.PaperSources?.SupportsFlatbed ?? true)).ToList();
}

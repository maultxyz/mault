using System.Text.RegularExpressions;
using NAPS2.Scan;

namespace MaultScannerHelper;

public sealed record PaperSources(bool SupportsFeeder, bool SupportsFlatbed);

public sealed record ListedScanner(ScanDevice Device, Driver Driver, PaperSources? PaperSources);

public static partial class ScannerListing
{
    private const int MinimumModelKeyLength = 4;

    public static List<ScannerSummary> Summarize(IReadOnlyList<ListedScanner> listedScanners)
    {
        var wiaScanners = listedScanners.Where(scanner => scanner.Driver == Driver.Wia).ToList();
        return listedScanners
            .Select(scanner => ToSummary(scanner, scanner.PaperSources ?? MatchingWiaPaperSources(scanner, wiaScanners)))
            .ToList();
    }

    private static PaperSources? MatchingWiaPaperSources(ListedScanner scanner, IReadOnlyList<ListedScanner> wiaScanners) =>
        scanner.Driver == Driver.Twain
            ? wiaScanners
                .Where(wiaScanner => wiaScanner.PaperSources is not null && IsSameModel(scanner.Device.Name, wiaScanner.Device.Name))
                .Select(wiaScanner => wiaScanner.PaperSources)
                .FirstOrDefault()
            : null;

    private static ScannerSummary ToSummary(ListedScanner scanner, PaperSources? paperSources) => new(
        scanner.Device.ID,
        scanner.Device.Name,
        ScanArguments.DriverName(scanner.Driver),
        paperSources?.SupportsFeeder ?? true,
        paperSources?.SupportsFlatbed ?? true);

    private static bool IsSameModel(string twainName, string wiaName)
    {
        var twainModelKey = ModelKey(twainName);
        var wiaModelKey = ModelKey(wiaName);
        if (twainModelKey.Length < MinimumModelKeyLength || wiaModelKey.Length < MinimumModelKeyLength) return false;
        return twainModelKey.EndsWith(wiaModelKey, StringComparison.Ordinal) ||
               wiaModelKey.EndsWith(twainModelKey, StringComparison.Ordinal);
    }

    private static string ModelKey(string deviceName)
    {
        var parenthesizedModel = ParenthesizedModelPattern().Match(deviceName);
        var modelName = parenthesizedModel.Success ? parenthesizedModel.Groups[1].Value : deviceName;
        var alphanumericModel = NonAlphanumericPattern().Replace(modelName.ToLowerInvariant(), "");
        return alphanumericModel.EndsWith("series", StringComparison.Ordinal)
            ? alphanumericModel[..^"series".Length]
            : alphanumericModel;
    }

    [GeneratedRegex(@"\(([^()]+)\)\s*$")]
    private static partial Regex ParenthesizedModelPattern();

    [GeneratedRegex("[^a-z0-9]")]
    private static partial Regex NonAlphanumericPattern();
}

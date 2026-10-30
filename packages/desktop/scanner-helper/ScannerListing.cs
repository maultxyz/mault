using System.Text.RegularExpressions;
using NAPS2.Scan;

namespace MaultScannerHelper;

public sealed record PaperSources(bool SupportsFeeder, bool SupportsFlatbed);

public sealed record ListedScanner(ScanDevice Device, Driver Driver, PaperSources? PaperSources);

public static partial class ScannerListing
{
    private const int MinimumModelKeyLength = 4;

    public static List<ScannerSummary> MergeDriversOfSameScanner(IReadOnlyList<ListedScanner> listedScanners)
    {
        var wiaScanners = listedScanners.Where(scanner => scanner.Driver == Driver.Wia).ToList();
        var mergedWiaScanners = new HashSet<ListedScanner>();
        var summaries = new List<ScannerSummary>();

        foreach (var scanner in listedScanners.Where(scanner => scanner.Driver != Driver.Wia))
        {
            var sameWiaScanner = scanner.Driver == Driver.Twain
                ? wiaScanners.FirstOrDefault(wiaScanner =>
                    !mergedWiaScanners.Contains(wiaScanner) && IsSameModel(scanner.Device.Name, wiaScanner.Device.Name))
                : null;
            if (sameWiaScanner is null)
            {
                summaries.Add(ToSummary(scanner, scanner.PaperSources));
                continue;
            }

            mergedWiaScanners.Add(sameWiaScanner);
            var keptScanner = scanner.PaperSources is null && sameWiaScanner.PaperSources is not null
                ? sameWiaScanner
                : scanner;
            summaries.Add(ToSummary(keptScanner, scanner.PaperSources ?? sameWiaScanner.PaperSources));
        }

        summaries.AddRange(wiaScanners
            .Where(wiaScanner => !mergedWiaScanners.Contains(wiaScanner))
            .Select(wiaScanner => ToSummary(wiaScanner, wiaScanner.PaperSources)));
        return summaries;
    }

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

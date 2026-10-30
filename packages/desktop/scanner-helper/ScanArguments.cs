using NAPS2.Scan;

namespace MaultScannerHelper;

public sealed record ScanArguments(Driver Driver, string ScannerId, string ScannerName, string OutputDirectory)
{
    public static ScanArguments Parse(IReadOnlyList<string> arguments)
    {
        var values = new Dictionary<string, string>();
        for (var index = 0; index + 1 < arguments.Count; index += 2)
        {
            values[arguments[index]] = arguments[index + 1];
        }

        return new ScanArguments(
            ParseDriver(Require(values, "--driver")),
            Require(values, "--scanner-id"),
            Require(values, "--scanner-name"),
            Require(values, "--output-dir"));
    }

    public static Driver ParseDriver(string driverName) => driverName switch
    {
        "twain" => Driver.Twain,
        "wia" => Driver.Wia,
        _ => throw new ArgumentException($"Unsupported driver: {driverName}"),
    };

    public static string DriverName(Driver driver) => driver == Driver.Twain ? "twain" : "wia";

    private static string Require(IReadOnlyDictionary<string, string> values, string name) =>
        values.TryGetValue(name, out var value) && value.Length > 0
            ? value
            : throw new ArgumentException($"Missing argument: {name}");
}

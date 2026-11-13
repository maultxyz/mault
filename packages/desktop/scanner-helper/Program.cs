using System.Globalization;
using NAPS2.Images;
using NAPS2.Images.Gdi;
using NAPS2.Scan;

namespace MaultScannerHelper;

public static class Program
{
    private const int ScanDpi = 300;
    private const int FlatbedPreviewDpi = 100;
    private const int JpegQuality = 92;
    private const decimal DefaultFeederWidthMm = 216m;
    private const decimal CardFeedHeightMm = 127m;
    private static readonly PageSize DefaultFlatbedGlass = new(216m, 297m, PageSizeUnit.Millimetre);

    public static async Task<int> Main(string[] arguments)
    {
        using var scanningContext = new ScanningContext(new GdiImageContext());
        var controller = new ScanController(scanningContext);
        try
        {
            return arguments.FirstOrDefault() switch
            {
                "list" => await ListScanners(controller),
                "scan" => await Scan(controller, ScanArguments.Parse(arguments.Skip(1).ToList())),
                "session" => await RunSession(controller, ScanArguments.Parse(arguments.Skip(1).ToList())),
                var command => throw new ArgumentException($"Unknown command: {command}"),
            };
        }
        catch (Exception error)
        {
            HelperOutput.WriteError(ScanErrorReasons.FromException(error), error.Message);
            return 1;
        }
    }

    private static async Task<int> ListScanners(ScanController controller)
    {
        var listedScanners = new List<ListedScanner>();
        try
        {
            foreach (var device in await controller.GetDeviceList(Driver.Wia))
            {
                listedScanners.Add(new ListedScanner(device, await ReadPaperSources(controller, device)));
            }
        }
        catch (Exception error)
        {
            Console.Error.WriteLine($"Listing WIA scanners failed: {error.Message}");
        }

        HelperOutput.Write(new ScannersMessage("scanners", ScannerListing.Summarize(listedScanners)));
        return 0;
    }

    private static async Task<PaperSources?> ReadPaperSources(
        ScanController controller,
        ScanDevice device)
    {
        try
        {
            var caps = await controller.GetCaps(device, CancellationToken.None);
            var paperSourceCaps = caps.PaperSourceCaps;
            if (paperSourceCaps is null) return null;
            return new PaperSources(paperSourceCaps.SupportsFeeder, paperSourceCaps.SupportsFlatbed);
        }
        catch (Exception error)
        {
            Console.Error.WriteLine($"Reading capabilities of {device.Name} failed: {error.Message}");
            return null;
        }
    }

    private static async Task<FeederCapabilities> ReadFeederCapabilities(ScanController controller, ScanDevice device)
    {
        try
        {
            var caps = await controller.GetCaps(device, CancellationToken.None);
            return new FeederCapabilities(
                caps.FeederCaps?.PageSizeCaps?.ScanArea?.WidthInMm ?? DefaultFeederWidthMm,
                caps.PaperSourceCaps?.SupportsDuplex ?? false);
        }
        catch (Exception error)
        {
            Console.Error.WriteLine($"Reading the feeder capabilities of {device.Name} failed: {error.Message}");
            return new FeederCapabilities(DefaultFeederWidthMm, false);
        }
    }

    private static async Task<PageSize> ReadFlatbedGlass(ScanController controller, ScanDevice device)
    {
        try
        {
            var caps = await controller.GetCaps(device, CancellationToken.None);
            return caps.FlatbedCaps?.PageSizeCaps?.ScanArea ?? DefaultFlatbedGlass;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine($"Reading the flatbed size of {device.Name} failed: {error.Message}");
            return DefaultFlatbedGlass;
        }
    }

    private static async Task<int> Scan(ScanController controller, ScanArguments scanArguments)
    {
        Directory.CreateDirectory(scanArguments.OutputDirectory);
        using var cancellation = new CancellationTokenSource();
        _ = Task.Run(() => CancelWhenParentStops(cancellation));

        var options = CreateFeederOptions(
            scanArguments,
            (await ReadFeederCapabilities(controller, CreateDevice(scanArguments))).WidthMm,
            scansBothSides: false);
        var pageCount = 0;
        try
        {
            await foreach (var image in controller.Scan(options, cancellation.Token))
            {
                using (image)
                {
                    SavePage(image, scanArguments.OutputDirectory, pageCount, options);
                    pageCount++;
                }
            }
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception error)
        {
            HelperOutput.WriteError(ScanErrorReasons.FromException(error), error.Message);
        }

        HelperOutput.Write(new FinishedMessage("finished", pageCount));
        return 0;
    }

    private static async Task<int> RunSession(ScanController controller, ScanArguments scanArguments)
    {
        Directory.CreateDirectory(scanArguments.OutputDirectory);
        var device = CreateDevice(scanArguments);
        PageSize? flatbedGlass = null;
        FeederCapabilities? feederCapabilities = null;
        var pageCount = 0;
        HelperOutput.Write(new SessionReadyMessage("ready"));
        while (Console.In.ReadLine() is { } line)
        {
            var commandParts = line.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var command = commandParts.FirstOrDefault();
            if (command == "close") break;

            ScanOptions options;
            var faceIsBackOfSheet = false;
            if (command == "feed")
            {
                faceIsBackOfSheet = commandParts.ElementAtOrDefault(1) == "back";
                feederCapabilities ??= await ReadFeederCapabilities(controller, device);
                options = CreateFeederOptions(
                    scanArguments,
                    feederCapabilities.WidthMm,
                    scansBothSides: feederCapabilities.SupportsDuplex || faceIsBackOfSheet);
                options.WiaOptions = new WiaOptions { WiaApiVersion = WiaApiVersion.Wia10 };
            }
            else if (command == "flatbed" && commandParts.Length == 2 &&
                     decimal.TryParse(commandParts[1], NumberStyles.Number, CultureInfo.InvariantCulture, out var scanHeightMm))
            {
                flatbedGlass ??= await ReadFlatbedGlass(controller, device);
                options = CreateFlatbedOptions(scanArguments, flatbedGlass, scanHeightMm, ScanDpi);
            }
            else if (command == "preview")
            {
                flatbedGlass ??= await ReadFlatbedGlass(controller, device);
                options = CreateFlatbedOptions(scanArguments, flatbedGlass, flatbedGlass.HeightInMm, FlatbedPreviewDpi);
            }
            else
            {
                HelperOutput.WriteError("unknown", $"Unknown session command: {line.Trim()}");
                continue;
            }

            if (await ScanOneSheet(controller, options, scanArguments.OutputDirectory, pageCount, faceIsBackOfSheet)) pageCount++;
        }

        return 0;
    }

    private static async Task<bool> ScanOneSheet(
        ScanController controller,
        ScanOptions options,
        string outputDirectory,
        int pageIndex,
        bool faceIsBackOfSheet)
    {
        using var cancellation = new CancellationTokenSource();
        var sideCount = options.PaperSource == PaperSource.Duplex ? 2 : 1;
        var sideFilePaths = new List<string>();
        var deliveredSideCount = 0;
        void CancelOnceSheetIsDelivered(object? sender, PageEndEventArgs pageEnd)
        {
            if (Interlocked.Increment(ref deliveredSideCount) >= sideCount) cancellation.Cancel();
        }

        controller.PageEnd += CancelOnceSheetIsDelivered;
        try
        {
            await foreach (var image in controller.Scan(options, cancellation.Token))
            {
                using (image)
                {
                    var side = sideFilePaths.Count == 0 ? "front" : "back";
                    sideFilePaths.Add(SaveImage(image, outputDirectory, pageIndex, side));
                }

                if (sideFilePaths.Count < sideCount) continue;
                cancellation.Cancel();
                break;
            }
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception error)
        {
            HelperOutput.WriteError(ScanErrorReasons.FromException(error), error.Message);
            return false;
        }
        finally
        {
            controller.PageEnd -= CancelOnceSheetIsDelivered;
        }

        if (sideFilePaths.Count == 0)
        {
            HelperOutput.WriteError("feeder_empty", "The scanner did not feed a card");
            return false;
        }

        var faceIndex = faceIsBackOfSheet && sideFilePaths.Count > 1 ? 1 : 0;
        var otherSideFilePath = sideFilePaths.Count > 1 ? sideFilePaths[1 - faceIndex] : null;
        WritePageMessage(sideFilePaths[faceIndex], pageIndex, options, otherSideFilePath);
        return true;
    }

    private static ScanDevice CreateDevice(ScanArguments scanArguments) =>
        new(scanArguments.Driver, scanArguments.ScannerId, scanArguments.ScannerName);

    private static ScanOptions CreateFeederOptions(
        ScanArguments scanArguments,
        decimal feederWidthMm,
        bool scansBothSides) => new()
    {
        Driver = scanArguments.Driver,
        Device = CreateDevice(scanArguments),
        PaperSource = scansBothSides ? PaperSource.Duplex : PaperSource.Feeder,
        Dpi = ScanDpi,
        PageSize = new PageSize(feederWidthMm, CardFeedHeightMm, PageSizeUnit.Millimetre),
        PageAlign = HorizontalAlign.Center,
        BitDepth = BitDepth.Color,
        Quality = JpegQuality,
    };

    private static ScanOptions CreateFlatbedOptions(
        ScanArguments scanArguments,
        PageSize flatbedGlass,
        decimal scanHeightMm,
        int dpi) => new()
    {
        Driver = scanArguments.Driver,
        Device = CreateDevice(scanArguments),
        PaperSource = PaperSource.Flatbed,
        Dpi = dpi,
        PageSize = new PageSize(
            flatbedGlass.WidthInMm,
            Math.Clamp(scanHeightMm, 1m, flatbedGlass.HeightInMm),
            PageSizeUnit.Millimetre),
        PageAlign = HorizontalAlign.Left,
        BitDepth = BitDepth.Color,
        Quality = JpegQuality,
    };

    private static void SavePage(ProcessedImage image, string outputDirectory, int pageIndex, ScanOptions options) =>
        WritePageMessage(SaveImage(image, outputDirectory, pageIndex, "front"), pageIndex, options, null);

    private static string SaveImage(ProcessedImage image, string outputDirectory, int pageIndex, string sheetSide)
    {
        var suffix = sheetSide == "back" ? "-back" : "";
        var filePath = Path.Combine(outputDirectory, $"page-{pageIndex + 1:D5}{suffix}.jpg");
        image.Save(filePath, ImageFileFormat.Jpeg, new ImageSaveOptions { Quality = JpegQuality });
        return filePath;
    }

    private static void WritePageMessage(
        string filePath,
        int pageIndex,
        ScanOptions options,
        string? otherSideFilePath) =>
        HelperOutput.Write(new PageMessage(
            "page",
            pageIndex,
            filePath,
            options.PaperSource == PaperSource.Flatbed ? "flatbed" : "feeder",
            (double)options.PageSize!.WidthInMm,
            (double)options.PageSize.HeightInMm,
            otherSideFilePath));

    private static void CancelWhenParentStops(CancellationTokenSource cancellation)
    {
        while (Console.In.ReadLine() is { } line)
        {
            if (line.Trim() == "stop") break;
        }

        cancellation.Cancel();
    }
}

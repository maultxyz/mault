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
    private const decimal CardFeedWidthMm = 76m;
    private const decimal CardFeedHeightMm = 102m;
    private static readonly PageSize DefaultFlatbedGlass = new(216m, 297m, PageSizeUnit.Millimetre);
    private static readonly Driver[] ListedDrivers = [Driver.Twain, Driver.Wia];

    public static async Task<int> Main(string[] arguments)
    {
        using var scanningContext = new ScanningContext(new GdiImageContext());
        scanningContext.SetUpWin32Worker();
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
        foreach (var driver in ListedDrivers)
        {
            try
            {
                foreach (var device in await controller.GetDeviceList(driver))
                {
                    listedScanners.Add(new ListedScanner(
                        device,
                        driver,
                        await ReadPaperSources(controller, device)));
                }
            }
            catch (Exception error)
            {
                Console.Error.WriteLine($"Listing {driver} scanners failed: {error.Message}");
            }
        }

        HelperOutput.Write(new ScannersMessage("scanners", ScannerListing.MergeDriversOfSameScanner(listedScanners)));
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

        var options = CreateFeederOptions(scanArguments);
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
        var pageCount = 0;
        HelperOutput.Write(new SessionReadyMessage("ready"));
        while (Console.In.ReadLine() is { } line)
        {
            var commandParts = line.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var command = commandParts.FirstOrDefault();
            if (command == "close") break;

            ScanOptions options;
            if (command == "feed")
            {
                options = CreateFeederOptions(scanArguments);
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

            if (await ScanOnePage(controller, options, scanArguments.OutputDirectory, pageCount)) pageCount++;
        }

        return 0;
    }

    private static async Task<bool> ScanOnePage(
        ScanController controller,
        ScanOptions options,
        string outputDirectory,
        int pageIndex)
    {
        using var cancellation = new CancellationTokenSource();
        try
        {
            await foreach (var image in controller.Scan(options, cancellation.Token))
            {
                using (image)
                {
                    SavePage(image, outputDirectory, pageIndex, options);
                }

                cancellation.Cancel();
                return true;
            }

            HelperOutput.WriteError("feeder_empty", "The scanner did not feed a card");
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception error)
        {
            HelperOutput.WriteError(ScanErrorReasons.FromException(error), error.Message);
        }

        return false;
    }

    private static ScanDevice CreateDevice(ScanArguments scanArguments) =>
        new(scanArguments.Driver, scanArguments.ScannerId, scanArguments.ScannerName);

    private static ScanOptions CreateFeederOptions(ScanArguments scanArguments) => new()
    {
        Driver = scanArguments.Driver,
        Device = CreateDevice(scanArguments),
        PaperSource = PaperSource.Feeder,
        Dpi = ScanDpi,
        PageSize = new PageSize(CardFeedWidthMm, CardFeedHeightMm, PageSizeUnit.Millimetre),
        PageAlign = HorizontalAlign.Center,
        BitDepth = BitDepth.Color,
        AutoCrop = true,
        AutoDeskew = true,
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

    private static void SavePage(ProcessedImage image, string outputDirectory, int pageIndex, ScanOptions options)
    {
        var filePath = Path.Combine(outputDirectory, $"page-{pageIndex + 1:D5}.jpg");
        image.Save(filePath, ImageFileFormat.Jpeg, new ImageSaveOptions { Quality = JpegQuality });
        HelperOutput.Write(new PageMessage(
            "page",
            pageIndex,
            filePath,
            options.PaperSource == PaperSource.Flatbed ? "flatbed" : "feeder",
            (double)options.PageSize!.WidthInMm,
            (double)options.PageSize.HeightInMm));
    }

    private static void CancelWhenParentStops(CancellationTokenSource cancellation)
    {
        while (Console.In.ReadLine() is { } line)
        {
            if (line.Trim() == "stop") break;
        }

        cancellation.Cancel();
    }
}

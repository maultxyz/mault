using NAPS2.Scan.Exceptions;

namespace MaultScannerHelper;

public static class ScanErrorReasons
{
    public static string FromException(Exception error) => error switch
    {
        DevicePaperJamException => "paper_jam",
        DeviceFeederEmptyException => "feeder_empty",
        DeviceCoverOpenException => "cover_open",
        NoFeederSupportException => "no_feeder",
        DeviceBusyException or DeviceWarmingUpException => "scanner_busy",
        DeviceOfflineException or DeviceNotFoundException or DeviceCommunicationException => "scanner_offline",
        DeviceException or ScanDriverException => "scanner_error",
        _ => "unknown",
    };
}

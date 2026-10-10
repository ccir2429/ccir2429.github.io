namespace TimestampBlazor.Services;

/// <summary>Mirrors the <c>window.CFG</c> object from the original config.js.</summary>
public sealed class AppConfig
{
    public string DbUrl { get; set; } = "";
    public string ApiKey { get; set; } = "";
    public string AdminEmail { get; set; } = "";
    public string ChannelId { get; set; } = "";
    public bool ChatEnabled { get; set; }
}

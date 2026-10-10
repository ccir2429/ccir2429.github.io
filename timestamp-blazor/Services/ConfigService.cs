using Microsoft.JSInterop;

namespace TimestampBlazor.Services;

/// <summary>Loads window.CFG via JS interop (no BCL equivalent for reading globals set by config.js).</summary>
public sealed class ConfigService(IJSRuntime js)
{
    private AppConfig? _cached;

    public async Task<AppConfig> GetAsync()
    {
        return _cached ??= await js.InvokeAsync<AppConfig>("timestampInterop.getConfig");
    }
}

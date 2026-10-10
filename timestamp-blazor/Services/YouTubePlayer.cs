using Microsoft.JSInterop;

namespace TimestampBlazor.Services;

/// <summary>
/// Wraps YouTube iframe mounting + postMessage time relay (wwwroot/js/youtube-interop.js),
/// which has no BCL/Blazor equivalent.
/// </summary>
public sealed class YouTubePlayer(IJSRuntime js) : IDisposable
{
    private DotNetObjectReference<YouTubePlayer>? _selfRef;

    /// <summary>Raised whenever the embedded player reports its current playback time (seconds).</summary>
    public event Action<double>? TimeReceived;

    public async Task MountAsync(string containerElementId, string embedPathAndQuery)
    {
        _selfRef ??= DotNetObjectReference.Create(this);
        await js.InvokeVoidAsync("timestampInterop.ytMount", containerElementId, embedPathAndQuery, _selfRef);
    }

    [JSInvokable]
    public void OnPlayerTime(double currentTime) => TimeReceived?.Invoke(currentTime);

    public void Dispose()
    {
        _selfRef?.Dispose();
        _selfRef = null;
    }
}

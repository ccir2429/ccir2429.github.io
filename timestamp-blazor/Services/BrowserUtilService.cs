using Microsoft.JSInterop;

namespace TimestampBlazor.Services;

/// <summary>Clipboard + file-download helpers (no BCL equivalent in the browser sandbox).</summary>
public sealed class BrowserUtilService(IJSRuntime js)
{
    public async Task<bool> CopyToClipboardAsync(string text)
        => await js.InvokeAsync<bool>("timestampInterop.clipboardWrite", text);

    public async Task DownloadTextAsync(string filename, string text)
        => await js.InvokeVoidAsync("timestampInterop.downloadText", filename, text);

    public async Task AutocompleteFillAsync(string inputId, string typedValue, string suggestion)
        => await js.InvokeVoidAsync("timestampInterop.autocompleteFill", inputId, typedValue, suggestion);
}

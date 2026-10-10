using System.Text.Json;
using Microsoft.JSInterop;

namespace TimestampBlazor.Services;

/// <summary>Thin wrapper over localStorage/sessionStorage (no BCL equivalent in Blazor WASM).</summary>
public sealed class LocalStore(IJSRuntime js)
{
    public async Task<T?> GetAsync<T>(string key, bool session = false)
    {
        var raw = await js.InvokeAsync<string?>("timestampInterop.storageGet", session, key);
        if (string.IsNullOrEmpty(raw)) return default;
        try { return JsonSerializer.Deserialize<T>(raw); }
        catch { return default; }
    }

    public async Task<string> GetStringAsync(string key, bool session = false)
    {
        var raw = await js.InvokeAsync<string?>("timestampInterop.storageGet", session, key);
        return raw ?? "";
    }

    public async Task SetAsync<T>(string key, T value, bool session = false)
    {
        var json = JsonSerializer.Serialize(value);
        await js.InvokeVoidAsync("timestampInterop.storageSet", session, key, json);
    }

    public async Task SetStringAsync(string key, string value, bool session = false)
    {
        await js.InvokeVoidAsync("timestampInterop.storageSet", session, key, value);
    }
}

using System.Text.Json.Nodes;
using Microsoft.JSInterop;

namespace TimestampBlazor.Services;

/// <summary>
/// Wraps a Firebase Realtime Database "streaming" endpoint (EventSource) and keeps a local
/// JSON tree in sync by replaying "put"/"patch" events, mirroring the original index.js/viewer.js
/// <c>applyEv</c> logic. EventSource itself has no BCL equivalent, so the actual streaming lives
/// in wwwroot/js/sse-interop.js; this class only owns the merge algorithm and C# event surface.
/// </summary>
public sealed class SseClient : IAsyncDisposable
{
    private readonly IJSRuntime _js;
    private readonly string _handle = Guid.NewGuid().ToString("N");
    private DotNetObjectReference<SseClient>? _selfRef;
    private bool _started;

    public JsonObject Root { get; } = new();

    public event Action? Updated;
    public event Action? Opened;
    public event Action? Errored;

    public SseClient(IJSRuntime js) => _js = js;

    public async Task StartAsync(string url)
    {
        await StopAsync();
        Root.Clear();
        _selfRef = DotNetObjectReference.Create(this);
        _started = true;
        await _js.InvokeVoidAsync("timestampInterop.sseOpen", _handle, url, _selfRef);
    }

    public async Task StopAsync()
    {
        if (!_started) return;
        _started = false;
        await _js.InvokeVoidAsync("timestampInterop.sseClose", _handle);
        _selfRef?.Dispose();
        _selfRef = null;
    }

    [JSInvokable]
    public void OnSseEvent(string eventType, string path, string dataJson)
    {
        JsonNode? data = null;
        try { data = string.IsNullOrEmpty(dataJson) || dataJson == "null" ? null : JsonNode.Parse(dataJson); }
        catch { /* ignore malformed payloads, mirrors original try/catch */ }

        ApplyEvent(Root, path, data, merge: eventType == "patch");
        Updated?.Invoke();
    }

    [JSInvokable]
    public void OnSseOpen() => Opened?.Invoke();

    [JSInvokable]
    public void OnSseError() => Errored?.Invoke();

    /// <summary>Direct port of the original JS <c>applyEv(root, path, data, merge)</c>.</summary>
    public static void ApplyEvent(JsonObject root, string path, JsonNode? data, bool merge)
    {
        var seg = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (seg.Length == 0)
        {
            if (merge)
            {
                if (data is JsonObject dobj)
                    foreach (var (k, v) in dobj.ToArray())
                    {
                        if (v is null) root.Remove(k);
                        else root[k] = v.DeepClone();
                    }
            }
            else
            {
                var keys = root.Select(kv => kv.Key).ToList();
                foreach (var k in keys) root.Remove(k);
                if (data is JsonObject dobj2)
                    foreach (var (k, v) in dobj2) root[k] = v?.DeepClone();
            }
            return;
        }

        JsonObject o = root;
        for (var i = 0; i < seg.Length - 1; i++)
        {
            if (o[seg[i]] is not JsonObject child)
            {
                child = new JsonObject();
                o[seg[i]] = child;
            }
            o = child;
        }
        var last = seg[^1];
        if (merge && data is JsonObject dmerge)
        {
            if (o[last] is not JsonObject target)
            {
                target = new JsonObject();
                o[last] = target;
            }
            foreach (var (k, v) in dmerge.ToArray())
            {
                if (v is null) target.Remove(k);
                else target[k] = v.DeepClone();
            }
        }
        else if (data is null)
        {
            o.Remove(last);
        }
        else
        {
            o[last] = data.DeepClone();
        }
    }

    public async ValueTask DisposeAsync() => await StopAsync();
}

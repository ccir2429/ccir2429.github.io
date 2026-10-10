// EventSource has no BCL equivalent in Blazor WASM; this bridges Firebase's
// streaming "put"/"patch" events back into C# via DotNetObjectReference.
window.timestampInterop = window.timestampInterop || {};
window.timestampInterop._sources = {};

window.timestampInterop.sseOpen = function (handle, url, dotnetRef) {
    const es = new EventSource(url);
    window.timestampInterop._sources[handle] = es;
    ['put', 'patch'].forEach(ev => es.addEventListener(ev, e => {
        try {
            const m = JSON.parse(e.data);
            dotnetRef.invokeMethodAsync('OnSseEvent', ev, m.path, JSON.stringify(m.data));
        } catch (x) { }
    }));
    es.onopen = () => dotnetRef.invokeMethodAsync('OnSseOpen');
    es.onerror = () => dotnetRef.invokeMethodAsync('OnSseError');
};

window.timestampInterop.sseClose = function (handle) {
    const es = window.timestampInterop._sources[handle];
    if (es) { es.close(); delete window.timestampInterop._sources[handle]; }
};

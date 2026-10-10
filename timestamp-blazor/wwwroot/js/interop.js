// Interop helpers that have no BCL/Blazor equivalent: reading window.CFG,
// localStorage/sessionStorage access, and clipboard writes.
window.timestampInterop = window.timestampInterop || {};

window.timestampInterop.getConfig = function () {
    const c = window.CFG || {};
    return {
        dbUrl: c.dbUrl || '',
        apiKey: c.apiKey || '',
        adminEmail: c.adminEmail || '',
        channelId: c.channelId || '',
        chatEnabled: !!c.chatEnabled
    };
};

window.timestampInterop.storageGet = function (session, key) {
    try { return (session ? sessionStorage : localStorage).getItem(key); }
    catch (e) { return null; }
};

window.timestampInterop.storageSet = function (session, key, value) {
    try { (session ? sessionStorage : localStorage).setItem(key, value); }
    catch (e) { }
};

window.timestampInterop.clipboardWrite = async function (text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) { return false; }
};

window.timestampInterop.downloadText = function (filename, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
};

// Ghost-text autocomplete: fills the remainder of a matching suggestion and
// selects it, mirroring the previous vanilla-JS behavior (requires direct
// access to input selection APIs, which Blazor does not expose).
window.timestampInterop.autocompleteFill = function (inputId, value, hit) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.value = hit;
    el.setSelectionRange(value.length, hit.length);
};

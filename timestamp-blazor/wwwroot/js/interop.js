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

// Global record hotkeys (Left Ctrl+F5 = inregistreaza, Left Ctrl+F6 = inregistreaza aprox).
// Registered on window so they work regardless of focused element, and
// preventDefault is required so the browser doesn't reload (Ctrl+F5) or open
// its own shortcut (Ctrl+F6). Left Ctrl is tracked separately via event.code
// so the right Ctrl key does not trigger the hotkeys.
window.timestampInterop.registerRecordHotkeys = function (dotNetRef) {
    let leftCtrlDown = false;
    const handler = function (e) {
        if (e.code === 'ControlLeft') leftCtrlDown = true;
        if (!leftCtrlDown) return;
        if (e.key === 'F5') {
            e.preventDefault();
            dotNetRef.invokeMethodAsync('OnRecordHotkey', false);
        } else if (e.key === 'F6') {
            e.preventDefault();
            dotNetRef.invokeMethodAsync('OnRecordHotkey', true);
        }
    };
    const upHandler = function (e) {
        if (e.code === 'ControlLeft') leftCtrlDown = false;
    };
    window.addEventListener('keydown', handler);
    window.addEventListener('keyup', upHandler);
    window.timestampInterop._recordHotkeyHandler = handler;
    window.timestampInterop._recordHotkeyUpHandler = upHandler;
};

window.timestampInterop.unregisterRecordHotkeys = function () {
    if (window.timestampInterop._recordHotkeyHandler) {
        window.removeEventListener('keydown', window.timestampInterop._recordHotkeyHandler);
        window.timestampInterop._recordHotkeyHandler = null;
    }
    if (window.timestampInterop._recordHotkeyUpHandler) {
        window.removeEventListener('keyup', window.timestampInterop._recordHotkeyUpHandler);
        window.timestampInterop._recordHotkeyUpHandler = null;
    }
};

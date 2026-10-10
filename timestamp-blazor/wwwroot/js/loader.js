// Ferestrele dinamice de script se încarcă după ce Blazor randează markup-ul (vezi Home.razor / Viewer.razor).
window.timestampInterop = {
    scriptsLoaded: false,
    viewerScriptsLoaded: false,
    loadScripts: function () {
        if (window.timestampInterop.scriptsLoaded) return;
        window.timestampInterop.scriptsLoaded = true;
        const load = (src) => new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.body.appendChild(s);
        });
        load('js/config.js').then(() => load('js/index.js'));
    },
    loadViewerScripts: function () {
        if (window.timestampInterop.viewerScriptsLoaded) return;
        window.timestampInterop.viewerScriptsLoaded = true;
        const load = (src) => new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.body.appendChild(s);
        });
        load('js/config.js').then(() => load('js/viewer.js'));
    }
};

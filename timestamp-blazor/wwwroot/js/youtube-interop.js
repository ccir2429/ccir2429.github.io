// YouTube iframe embedding + postMessage listening has no BCL equivalent; this mounts
// the iframe into a container element and relays player "currentTime" back to C#.
window.timestampInterop = window.timestampInterop || {};
window.timestampInterop._yt = { beat: null, dotnetRef: null, frame: null };

window.timestampInterop.ytMount = function (containerId, path, dotnetRef) {
    const yt = window.timestampInterop._yt;
    clearInterval(yt.beat);
    if (!yt.listenerAttached) {
        yt.listenerAttached = true;
        window.addEventListener('message', e => {
            if (e.origin !== 'https://www.youtube.com') return;
            let d = e.data;
            try { if (typeof d === 'string') d = JSON.parse(d); } catch (x) { return; }
            if (d && (d.event === 'infoDelivery' || d.event === 'initialDelivery') && d.info && typeof d.info.currentTime === 'number') {
                const ref = window.timestampInterop._yt.dotnetRef;
                window.timestampInterop._yt.lastSeenAt = Date.now();
                if (ref) ref.invokeMethodAsync('OnPlayerTime', d.info.currentTime);
            }
        });
    }
    yt.dotnetRef = dotnetRef;
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const f = document.createElement('iframe');
    f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";
    f.allowFullscreen = true;
    f.src = `https://www.youtube.com/embed/${path}enablejsapi=1&mute=1&autoplay=1&playsinline=1&origin=${encodeURIComponent(location.origin)}`;
    container.appendChild(f);
    yt.frame = f;
    const listen = () => {
        try {
            f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
            f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'], id: 1, channel: 'widget' }), '*');
        } catch (e) { }
    };
    f.onload = listen;
    yt.lastSeenAt = 0;
    yt.beat = setInterval(() => {
        if (Date.now() - (yt.lastSeenAt || 0) > 3000) listen();
    }, 1500);
};

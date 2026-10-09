const $ = id => document.getElementById(id);
const DB = ((window.CFG && CFG.dbUrl) || '').replace(/\/+$/, '');
const PWOK = /^[A-Za-z0-9_-]{8,}$/;
const mk = st => ({ get(k) { try { return st.getItem(k) || '' } catch (e) { return '' } }, set(k, v) { try { st.setItem(k, v) } catch (e) { } } });
const ls = mk(window.localStorage), ses = mk(window.sessionStorage);
// identificator unic per sesiune (per filă)
let cid = ses.get('v_cid');
if (!cid) { cid = Array.from(crypto.getRandomValues(new Uint8Array(12)), x => (x % 36).toString(36)).join(''); ses.set('v_cid', cid) }
const say = m => { $('ss').textContent = m };
function applyEv(root, path, data, merge) {
    const seg = path.split('/').filter(Boolean);
    if (!seg.length) {
        if (merge) { for (const k in data) { if (data[k] === null) delete root[k]; else root[k] = data[k] } }
        else { for (const k in root) delete root[k]; if (data && typeof data === 'object') Object.assign(root, data) }
        return
    }
    let o = root;
    for (let i = 0; i < seg.length - 1; i++) { if (!o[seg[i]] || typeof o[seg[i]] !== 'object') o[seg[i]] = {}; o = o[seg[i]] }
    const last = seg[seg.length - 1];
    if (merge && data && typeof data === 'object') {
        if (!o[last] || typeof o[last] !== 'object') o[last] = {};
        for (const k in data) { if (data[k] === null) delete o[last][k]; else o[last][k] = data[k] }
    } else if (data === null) delete o[last]; else o[last] = data;
}

/* notițe + banner: fără parolă */
let lastBanner = '';
if (!DB) { $('st').textContent = 'Lipsește dbUrl în config.js.' }
else {
    const pub = {};
    const es = new EventSource(DB + '/notes/live/pub.json');
    ['put', 'patch'].forEach(ev => es.addEventListener(ev, e => {
        try {
            const m = JSON.parse(e.data); applyEv(pub, m.path, m.data, ev === 'patch');
            $('t').value = typeof pub.text === 'string' ? pub.text : ''; $('st').textContent = 'Live: se actualizează automat';
            const b = pub.banner;
            if (b && typeof b.m === 'string') { if (b.id !== lastBanner) { lastBanner = b.id || ''; $('btxt').textContent = b.m; $('banner').hidden = false } }
            else { lastBanner = ''; $('banner').hidden = true }
        } catch (x) { }
    }));
    es.onerror = () => { $('st').textContent = 'Conexiune întreruptă, se reconectează…' };
}
$('bx').onclick = () => { $('banner').hidden = true };

/* chat: necesită parola echipei */
let thread = {}, chatES = null, pwd = '';
$('nick').value = ls.get('v_nick');
function render() {
    const cv = $('cv'); cv.textContent = '';
    const list = Object.entries((thread && thread.msgs) || {}).filter(([, x]) => x && typeof x.m === 'string').sort((a, b) => (a[1].at || 0) - (b[1].at || 0));
    if (!list.length) { const p = document.createElement('p'); p.textContent = 'Scrie primul mesaj către echipă.'; cv.appendChild(p) }
    for (const [, x] of list) {
        const d = document.createElement('div'), who = document.createElement('small');
        d.className = 'bub' + (x.f === 'v' ? ' me' : ''); who.textContent = x.f === 'v' ? 'Tu' : 'Echipă';
        d.append(who, document.createTextNode(x.m)); cv.appendChild(d);
    }
    cv.scrollTop = cv.scrollHeight;
}
async function enter() {
    const k = $('pw').value.trim();
    if (!DB) { say('Lipsește dbUrl în config.js.'); return }
    if (!PWOK.test(k)) { say('Parola nu este validă.'); return }
    try {
        const r = await fetch(DB + '/chat/' + k + '/' + cid + '.json');
        if (r.status === 401 || r.status === 403) { say('Parolă greșită.'); return }
        if (!r.ok) { say('Eroare de conectare (' + r.status + ').'); return }
    } catch (e) { say('Fără conexiune.'); return }
    pwd = k; ses.set('v_pw', k); say('');
    $('lock').hidden = true; $('room').hidden = false;
    if (!$('nick').value.trim()) $('set').open = true;
    if (chatES) chatES.close();
    thread = {}; render();
    chatES = new EventSource(DB + '/chat/' + k + '/' + cid + '.json');
    ['put', 'patch'].forEach(ev => chatES.addEventListener(ev, e => {
        try { const m = JSON.parse(e.data); applyEv(thread, m.path, m.data, ev === 'patch'); render() } catch (x) { }
    }));
    chatES.onerror = () => say('Conexiune chat întreruptă, se reconectează…');
    chatES.onopen = () => say('');
}
async function send() {
    const m = $('msg').value.trim(), n = $('nick').value.trim() || 'Anonim';
    if (!m) { say('Scrie un mesaj.'); return }
    ls.set('v_nick', n === 'Anonim' ? '' : n);
    const id = cid.slice(0, 6) + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const body = { meta: { n, at: (thread.meta && thread.meta.at) || Date.now() } };
    body['msgs/' + id] = { f: 'v', m, at: Date.now() };
    $('send').disabled = true;
    try {
        const r = await fetch(DB + '/chat/' + pwd + '/' + cid + '.json', { method: 'PATCH', body: JSON.stringify(body) });
        if (r.ok) { $('msg').value = ''; say('') }
        else say('Eroare ' + r.status + ': ' + (await r.text()).slice(0, 120) + (r.status === 401 ? ' (parola nu se potrivește cu regulile Firebase)' : ''));
    } catch (e) { say('Fără conexiune.') }
    $('send').disabled = false;
}
$('enter').onclick = enter;
$('pw').addEventListener('keydown', e => { if (e.key === 'Enter') enter() });
$('send').onclick = send;
$('msg').addEventListener('keydown', e => { if (e.key === 'Enter') send() });
const CHAT_ON = !!(window.CFG && CFG.chatEnabled); // chatul este ascuns cât timp chatEnabled e false în config.js
if (!CHAT_ON) $('chat').hidden = true;
else if (ses.get('v_pw')) { $('pw').value = ses.get('v_pw'); enter() }
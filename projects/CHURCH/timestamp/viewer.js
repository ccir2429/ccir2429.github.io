const $ = id => document.getElementById(id);
const CFG0 = window.CFG || {};
const DB = (CFG0.dbUrl || '').replace(/\/+$/, '');
const KEYOK = /^[A-Za-z0-9_-]{6,40}$/;
const mk = st => ({ get(k) { try { return st.getItem(k) || '' } catch (e) { return '' } }, set(k, v) { try { st.setItem(k, v) } catch (e) { } } });
const ls = mk(window.localStorage), ses = mk(window.sessionStorage);
// identificator unic per sesiune (per filă), ca să-ți recunoști mesajele
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

/* notițe rapide + alertă: mereu vizibile, fără parolă */
let lastAlert = '';
if (!DB) { $('st').textContent = 'Lipsește dbUrl în config.js.' }
else {
    const pub = {};
    const es = new EventSource(DB + '/pub.json');
    ['put', 'patch'].forEach(ev => es.addEventListener(ev, e => {
        try {
            const m = JSON.parse(e.data); applyEv(pub, m.path, m.data, ev === 'patch');
            const n = pub.notes;
            if (n && typeof n.text === 'string') { $('t').value = n.text; $('st').textContent = 'Live: se actualizează automat' }
            else { $('t').value = ''; $('st').textContent = 'Notițele nu sunt partajate momentan.' }
            const b = pub.alert;
            if (b && typeof b.m === 'string') { if (b.id !== lastAlert) { lastAlert = b.id || ''; $('btxt').textContent = b.m; $('banner').hidden = false } }
            else { lastAlert = ''; $('banner').hidden = true }
        } catch (x) { }
    }));
    es.onerror = () => { $('st').textContent = 'Conexiune întreruptă, se reconectează…' };
}
$('bx').onclick = () => { $('banner').hidden = true };

/* chat: doar dacă chatEnabled în config.js; cere poreclă și parola echipei */
const CHAT_ON = !!CFG0.chatEnabled;
let msgs = {}, chatES = null, key = '';
$('nick').value = ls.get('v_nick');
function render() {
    const cv = $('cv'); cv.textContent = '';
    const list = Object.entries(msgs).filter(([, x]) => x && typeof x.m === 'string').sort((a, b) => (a[1].at || 0) - (b[1].at || 0));
    if (!list.length) { const p = document.createElement('p'); p.textContent = 'Scrie primul mesaj către echipă.'; cv.appendChild(p) }
    for (const [, x] of list) {
        const mine = x.f === 'v' && x.c === cid;
        const d = document.createElement('div'), who = document.createElement('small');
        d.className = 'bub' + (mine ? ' me' : ''); who.textContent = mine ? 'Tu' : (x.f === 'm' ? 'Echipă' : (x.n || 'Anonim'));
        d.append(who, document.createTextNode(x.m)); cv.appendChild(d);
    }
    cv.scrollTop = cv.scrollHeight;
}
async function enter() {
    const n = $('nick').value.trim(), k = $('pw').value.trim();
    if (!DB) { say('Lipsește dbUrl în config.js.'); return }
    if (!n) { say('Introdu o poreclă.'); return }
    if (!KEYOK.test(k)) { say('Parola nu este validă.'); return }
    try {
        const r = await fetch(DB + '/chats/' + k + '/msgs.json?shallow=true');
        if (r.status === 401 || r.status === 403) { say('Parolă greșită.'); return }
        if (!r.ok) { say('Eroare de conectare (' + r.status + ').'); return }
    } catch (e) { say('Fără conexiune.'); return }
    key = k; ls.set('v_nick', n); ses.set('v_pw', k); say('');
    $('lock').hidden = true; $('room').hidden = false;
    if (chatES) chatES.close();
    msgs = {}; render();
    chatES = new EventSource(DB + '/chats/' + k + '/msgs.json');
    ['put', 'patch'].forEach(ev => chatES.addEventListener(ev, e => {
        try { const m = JSON.parse(e.data); applyEv(msgs, m.path, m.data, ev === 'patch'); render() } catch (x) { }
    }));
    chatES.onerror = () => say('Conexiune chat întreruptă, se reconectează…');
    chatES.onopen = () => say('');
}
async function send() {
    const m = $('msg').value.trim(), n = ls.get('v_nick') || $('nick').value.trim() || 'Anonim';
    if (!m) { say('Scrie un mesaj.'); return }
    const id = cid.slice(0, 6) + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    $('send').disabled = true;
    try {
        const r = await fetch(DB + '/chats/' + key + '/msgs/' + id + '.json', { method: 'PUT', body: JSON.stringify({ f: 'v', n, c: cid, m, at: Date.now() }) });
        if (r.ok) { $('msg').value = ''; say('') }
        else say('Eroare ' + r.status + ': ' + (await r.text()).slice(0, 120));
    } catch (e) { say('Fără conexiune.') }
    $('send').disabled = false;
}
$('enter').onclick = enter;
['nick', 'pw'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') enter() }));
$('send').onclick = send;
$('msg').addEventListener('keydown', e => { if (e.key === 'Enter') send() });
if (!CHAT_ON) $('chat').hidden = true;
else if (ses.get('v_pw') && ls.get('v_nick')) { $('pw').value = ses.get('v_pw'); enter() }
const $ = id => document.getElementById(id);
const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch (e) { return d } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) { } }
};
let localActs = store.get('cl_acts', []), localPersons = store.get('cl_persons', []), chapters = store.get('cl_chapters', []);
let defPerson = store.get('cl_slujitor', '');
let fileActs = [], filePersons = [], slujMap = {}, acts = [], persons = [];
const collator = new Intl.Collator('ro', { sensitivity: 'base' });
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const norm = s => s.trim().replace(/\s+/g, ' ');
const lower = s => s.toLowerCase();

/* ---------- time ---------- */
let playerT = null, playerSeen = 0, manual = null; // manual={base,at}
function fmt(t) {
    t = Math.max(0, Math.floor(t)); const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60;
    const p = n => String(n).padStart(2, '0'); return h ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`
}
function parseT(s) {
    const p = s.trim().split(':').map(Number); if (!p.length || p.some(n => isNaN(n) || n < 0)) return null;
    return p.reduce((a, n) => a * 60 + n, 0)
}
function now() {
    if (playerT !== null && Date.now() - playerSeen < 3000) return playerT;
    if (manual) return manual.base + (Date.now() - manual.at) / 1000;
    return null;
}
setInterval(() => {
    const t = now(), live = playerT !== null && Date.now() - playerSeen < 3000;
    $('clock').textContent = t === null ? '--:--' : fmt(t);
    $('src').textContent = t === null ? 'Fără sursă de timp' : live ? 'Timp din player YouTube' : 'Ceas manual';
    $('src').className = 'src' + (t !== null ? ' ok' : '');
}, 250);
window.addEventListener('message', e => {
    if (e.origin !== 'https://www.youtube.com') return;
    let d = e.data; try { if (typeof d === 'string') d = JSON.parse(d) } catch (x) { return }
    if (d && d.event === 'infoDelivery' && d.info && typeof d.info.currentTime === 'number') { playerT = d.info.currentTime; playerSeen = Date.now() }
    if (d && d.event === 'initialDelivery' && d.info && typeof d.info.currentTime === 'number') { playerT = d.info.currentTime; playerSeen = Date.now() }
});
$('mgo').onclick = () => { const b = parseT($('mstart').value); if (b === null) { say('Timp de start invalid.'); return } manual = { base: b, at: Date.now() } };
$('mstop').onclick = () => { manual = null };

/* ---------- player ---------- */
function vidId(s) {
    s = s.trim(); if (/^[\w-]{11}$/.test(s)) return s;
    const m = s.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/|\/shorts\/)([\w-]{11})/); return m ? m[1] : null
}
let beat = null, mode = 'channel', lastLoad = 0;
function mount(path) {
    lastLoad = Date.now();
    const f = document.createElement('iframe');
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true;
    f.src = `https://www.youtube.com/embed/${path}enablejsapi=1&mute=1&autoplay=1&playsinline=1&origin=${encodeURIComponent(location.origin)}`;
    $('vid').innerHTML = ''; $('vid').appendChild(f); playerT = null; playerSeen = 0;
    clearInterval(beat);
    const listen = () => {
        try {
            f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
            f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'], id: 1, channel: 'widget' }), '*')
        } catch (e) { }
    };
    f.onload = listen; beat = setInterval(() => { if (Date.now() - playerSeen > 3000) listen() }, 1500);
}
function chanId() { const c = ((window.CFG && CFG.channelId) || store.get('cl_chan', '') || '').trim(); return /^UC[\w-]{22}$/.test(c) ? c : '' }
function loadChannel() {
    const c = chanId();
    if (!c) { say('Lipsește ID-ul canalului: setează channelId în config.js sau lipește-l (UC…) în câmpul de link.'); return false }
    mode = 'channel'; mount('live_stream?channel=' + c + '&'); return true;
}
$('load').onclick = () => {
    const v = $('url').value.trim(), ch = v.match(/UC[\w-]{22}/);
    if (!v) { loadChannel(); return }
    if (ch) { store.set('cl_chan', ch[0]); loadChannel(); return }
    const id = vidId(v); if (!id) { say('Link YouTube invalid.'); return }
    mode = 'video'; mount(id + '?');
};
// dacă transmisiunea canalului nu a pornit încă, reîncearcă din minut în minut
setInterval(() => { if (mode === 'channel' && Date.now() - playerSeen > 60000 && Date.now() - lastLoad > 60000) loadChannel() }, 15000);
$('url').addEventListener('keydown', e => { if (e.key === 'Enter') $('load').click() });

/* ---------- liste (fișiere .txt + adăugiri locale) ---------- */
async function loadTxt(name) {
    try {
        const r = await fetch(name, { cache: 'no-store' }); if (!r.ok) return null;
        return (await r.text()).replace(/^\uFEFF/, '').split(/\r?\n/).map(norm).filter(l => l && !l.startsWith('#'))
    }
    catch (e) { return null }
}
function uniq(arr) { const seen = new Set(), out = []; for (const v of arr) { const k = lower(v); if (v && !seen.has(k)) { seen.add(k); out.push(v) } } return out.sort(collator.compare) }
function mergeLists() {
    acts = uniq([...fileActs, ...Object.values(slujMap).map(x => x.name), ...localActs]);
    persons = uniq([...filePersons, ...Object.values(slujMap).map(x => x.person), defPerson, ...localPersons]);
}
const inFile = (kind, v) => kind === 'acts' ? [...fileActs, ...Object.values(slujMap).map(x => x.name)].some(x => lower(x) === lower(v)) : [...filePersons, defPerson, ...Object.values(slujMap).map(x => x.person)].some(x => x && lower(x) === lower(v));
function addLocal(kind, v) {
    v = norm(v); if (!v) return;
    const loc = kind === 'acts' ? localActs : localPersons;
    if (inFile(kind, v) || loc.some(x => lower(x) === lower(v))) return;
    loc.push(v); loc.sort(collator.compare); store.set(kind === 'acts' ? 'cl_acts' : 'cl_persons', loc);
}
const rule = act => { const r = slujMap[lower(act)]; return r ? (r.person || defPerson) : '' };
function renderLists() {
    mergeLists();
    $('acts').innerHTML = acts.map(a => `<option value="${esc(a)}">`).join('');
    $('persons').innerHTML = persons.map(a => `<option value="${esc(a)}">`).join('');
    const li = (arr, k) => arr.map(v => inFile(k, v) || (k === 'acts' && slujMap[lower(v)])
        ? `<li><span>${esc(v)}</span><span class="hd">din fișier</span></li>`
        : `<li><span>${esc(v)}</span><button data-rm="${k}" data-v="${esc(v)}" aria-label="Șterge ${esc(v)}">×</button></li>`).join('') || '<li class="s">Goală</li>';
    $('lacts').innerHTML = li(acts, 'acts'); $('lpersons').innerHTML = li(persons, 'persons');
    const g = Object.values(slujMap).sort((x, y) => collator.compare(x.name, y.name));
    $('lgroups').innerHTML = g.map(x => { const p = x.person || defPerson; return `<li><span>${esc(x.name)} → ${p ? esc(p) : '<em>(persoană nesetată)</em>'}</span></li>` }).join('') || '<li class="s">Nicio slujbă în Slujbe_slujitor.txt</li>';
}
document.addEventListener('click', e => {
    const t = e.target;
    if (t.dataset.add) { const k = t.dataset.add, inp = k === 'acts' ? $('nact') : $('nper'); addLocal(k, inp.value); inp.value = ''; renderLists() }
    if (t.dataset.rm) {
        const k = t.dataset.rm, loc = k === 'acts' ? localActs : localPersons, i = loc.findIndex(x => x === t.dataset.v);
        if (i >= 0) { loc.splice(i, 1); store.set(k === 'acts' ? 'cl_acts' : 'cl_persons', loc); renderLists() }
    }
});
$('slujitor').value = defPerson;
$('slujitor').addEventListener('change', () => { defPerson = norm($('slujitor').value); store.set('cl_slujitor', defPerson); renderLists() });
async function loadFiles() {
    const [a, p, sl] = await Promise.all([loadTxt('Slujbe.txt'), loadTxt('Persoane.txt'), loadTxt('Slujbe_slujitor.txt')]);
    fileActs = a || []; filePersons = p || []; slujMap = {};
    for (const l of sl || []) { const [x, y] = l.split('|').map(norm); if (x) slujMap[lower(x)] = { name: x, person: y || '' } }
    const miss = [a ? '' : 'Slujbe.txt', p ? '' : 'Persoane.txt', sl ? '' : 'Slujbe_slujitor.txt'].filter(Boolean);
    $('fstat').textContent = miss.length ? 'Nu am putut citi: ' + miss.join(', ') + ' (verifică că sunt în același folder cu pagina).' : 'Liste încărcate din fișiere.';
    renderLists();
}

/* ---------- chapters ---------- */
function line(c) { return `${fmt(c.t)}${c.approx ? ' (aprox)' : ''}${c.act ? ' - ' + c.act : ''}${c.person ? ' - ' + c.person : ''}${c.details ? ' - ' + c.details : ''}` }
function renderOut() { $('out').value = chapters.map(line).join('\n'); store.set('cl_chapters', chapters) }
function renderChapters() {
    chapters.sort((a, b) => a.t - b.t);
    $('list').innerHTML = chapters.length ? `<div class="ch hd"><span>Timp</span><span title="aprox">~</span><span>Slujbă</span><span>Persoană</span><span>Detalii</span><span></span></div>` +
        chapters.map((c, i) => `<div class="ch" data-i="${i}"><input type="text" data-f="t" value="${fmt(c.t)}" aria-label="Timp"><input type="checkbox" data-f="approx" ${c.approx ? 'checked' : ''} aria-label="Aproximativ">
      <input type="text" data-f="act" value="${esc(c.act)}" aria-label="Slujbă"><input type="text" data-f="person" value="${esc(c.person)}" aria-label="Persoană">
      <input type="text" data-f="details" value="${esc(c.details)}" placeholder="detalii" aria-label="Detalii"><button class="del" data-del="${i}" aria-label="Șterge capitol">×</button></div>`).join('')
        : '<p class="s">Niciun capitol încă. Apasă inregistreaza în timpul transmisiunii.</p>';
    renderOut();
}
$('list').addEventListener('input', e => {
    const f = e.target.dataset.f; if (!f || f === 't') return;
    const c = chapters[+e.target.closest('.ch').dataset.i]; c[f] = f === 'approx' ? e.target.checked : e.target.value; renderOut()
});
$('list').addEventListener('change', e => {
    const f = e.target.dataset.f; if (f !== 't') return;
    const c = chapters[+e.target.closest('.ch').dataset.i], v = parseT(e.target.value); if (v !== null) c.t = v; renderChapters()
});
$('list').addEventListener('click', e => { if (e.target.dataset.del !== undefined) { chapters.splice(+e.target.dataset.del, 1); renderChapters() } });

let mt; function say(m) { $('msg').textContent = m; clearTimeout(mt); mt = setTimeout(() => $('msg').textContent = '', 4000) }
function record(approx) {
    const t = now();
    if (t === null) { say('Nu există timp: încarcă videoclipul și pornește-l, sau pornește ceasul manual.'); return }
    const act = norm($('act').value);
    if (!act) { say('Introdu o slujbă.'); return }
    let person = norm($('person').value);
    if (!person) person = rule(act);
    addLocal('acts', act); if (person) addLocal('persons', person); renderLists();
    chapters.push({ t: Math.floor(t), approx, act, person, details: '' }); renderChapters();
    say(`Înregistrat ${fmt(t)}${approx ? ' (aprox)' : ''} - ${act}${person ? ' - ' + person : ''}`);
    $('act').value = ''; $('person').value = ''; $('act').focus();
}
$('rec').onclick = () => record(false); $('recA').onclick = () => record(true);
const fold = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function autoComplete(id, getList) {
    const el = $(id);
    el.addEventListener('input', e => {
        if (e.inputType && e.inputType.startsWith('delete')) return;
        const v = el.value;
        if (!v || el.selectionStart !== v.length) return;
        const f = fold(v);
        const hit = getList().find(x => fold(x).length > f.length && fold(x).startsWith(f));
        if (!hit) return;
        el.value = hit;
        el.setSelectionRange(v.length, hit.length);
    });
}
autoComplete('act', () => acts);
autoComplete('person', () => persons);
['act', 'person'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); record(e.shiftKey) } }));

$('copy').onclick = async () => { try { await navigator.clipboard.writeText($('out').value); say('Copiat.') } catch (e) { $('out').select(); document.execCommand('copy'); say('Copiat.') } };
$('dl').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([$('out').value + '\n'], { type: 'text/plain' })); a.download = 'capitole.txt'; a.click() };
$('clr').onclick = () => { if (chapters.length && confirm('Ștergi toate capitolele?')) { chapters = []; renderChapters() } };

renderLists(); renderChapters();
loadFiles();
loadChannel(); // ultimul pas: say() și restul variabilelor există deja

/* ---------- Firebase: notițe partajate + alertă + chat echipă ---------- */
const CFG0 = window.CFG || {};
const DB = (CFG0.dbUrl || '').replace(/\/+$/, '');
const CHAT_ON = !!CFG0.chatEnabled;
if (!CHAT_ON) $('chatsec').hidden = true;

const KEYOK = /^[A-Za-z0-9_-]{6,40}$/;
const ses = {
    get(k) { try { return sessionStorage.getItem(k) || '' } catch (e) { return '' } },
    set(k, v) { try { sessionStorage.setItem(k, v) } catch (e) { }
    }
};
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const key = () => $('key').value.trim();
const sync = m => { $('sync').textContent = m };
const tst = m => { $('tstat').textContent = m };

function applyEv(root, path, data, merge) {
    const seg = path.split('/').filter(Boolean);
    if (!seg.length) {
        if (merge) { for (const k in data) { if (data[k] === null) delete root[k]; else root[k] = data[k] } }
        else { for (const k in root) delete root[k]; if (data && typeof data === 'object') Object.assign(root, data) }
        return;
    }
    let o = root;
    for (let i = 0; i < seg.length - 1; i++) { if (!o[seg[i]] || typeof o[seg[i]] !== 'object') o[seg[i]] = {}; o = o[seg[i]] }
    const last = seg[seg.length - 1];
    if (merge && data && typeof data === 'object') {
        if (!o[last] || typeof o[last] !== 'object') o[last] = {};
        for (const k in data) { if (data[k] === null) delete o[last][k]; else o[last][k] = data[k] }
    } else if (data === null) delete o[last]; else o[last] = data;
}

async function db(method, path, body) {
    const r = await fetch(DB + path + '.json', { method, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!r.ok) throw new Error(r.status + ' ' + (await r.text()).slice(0, 120));
    return r.json().catch(() => null);
}

/* notițe rapide (trimise către viewer la /pub/notes) */
let saveT = null;
async function pushNotes() {
    if (!DB) { sync('Lipsește dbUrl în config.js.'); return }
    if (!KEYOK.test(key())) { sync('Introdu parola echipei (minim 6 caractere).'); return }
    try { await db('PUT', '/pub/notes', { text: $('notes').value, at: Date.now() }); sync('Notițe partajate live') }
    catch (e) { sync('Eroare la partajare: ' + e.message) }
}
$('notes').addEventListener('input', () => { clearTimeout(saveT); saveT = setTimeout(pushNotes, 400) });
$('key').addEventListener('input', () => { ses.set('cl_team_key', key()); connectChat() });

/* alertă pentru toți viewerii */
$('bsend').onclick = async () => {
    const m = $('btxt').value.trim();
    if (!m) { tst('Scrie textul bannerului.'); return }
    if (!DB) { tst('Lipsește dbUrl în config.js.'); return }
    try { await db('PUT', '/pub/alert', { m: m.slice(0, 300), id: rid(), at: Date.now() }); $('btxt').value = ''; tst('Banner trimis.') }
    catch (e) { tst('Eroare: ' + e.message) }
};
$('bclr').onclick = async () => {
    if (!DB) { tst('Lipsește dbUrl în config.js.'); return }
    try { await db('DELETE', '/pub/alert'); tst('Banner retras.') }
    catch (e) { tst('Eroare: ' + e.message) }
};

/* chat echipă (aceeași structură ca viewer.js: /chats/<key>/msgs) */
let chatES = null;
let msgs = {};
function renderTeam() {
    const host = $('team');
    host.innerHTML = '';
    const log = document.createElement('div');
    log.className = 'cv';
    log.id = 'teamlog';

    const list = Object.entries(msgs)
        .filter(([, x]) => x && typeof x.m === 'string')
        .sort((a, b) => (a[1].at || 0) - (b[1].at || 0));

    if (!list.length) {
        const p = document.createElement('div');
        p.className = 's';
        p.textContent = 'Niciun mesaj încă pentru această parolă.';
        log.appendChild(p);
    } else {
        for (const [, x] of list) {
            const d = document.createElement('div');
            d.className = 'bub' + (x.f === 'm' ? ' m' : '');
            const who = document.createElement('small');
            who.textContent = x.f === 'm' ? 'Echipă' : (x.n || 'Vizitator');
            d.append(who, document.createTextNode(x.m));
            log.appendChild(d);
        }
    }

    const row = document.createElement('div');
    row.className = 'row';
    row.style.marginTop = '6px';
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.id = 'teamreply';
    inp.maxLength = 500;
    inp.placeholder = 'Răspuns către chat';
    const btn = document.createElement('button');
    btn.id = 'teamsend';
    btn.textContent = 'Trimite';
    row.append(inp, btn);

    host.append(log, row);

    const send = async () => {
        const k = key();
        const m = inp.value.trim();
        if (!m) { tst('Scrie un mesaj.'); return }
        if (!KEYOK.test(k)) { tst('Parola echipei nu este validă.'); return }
        btn.disabled = true;
        try {
            const id = rid();
            await db('PUT', '/chats/' + k + '/msgs/' + id, { f: 'm', n: 'Echipă', m, at: Date.now() });
            inp.value = '';
            tst('');
        } catch (e) { tst('Eroare trimitere: ' + e.message) }
        btn.disabled = false;
    };

    btn.onclick = send;
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') send() });
    log.scrollTop = log.scrollHeight;
}

function connectChat() {
    if (!CHAT_ON) return;
    const k = key();
    msgs = {};
    renderTeam();
    if (chatES) { chatES.close(); chatES = null; }
    if (!DB) { tst('Lipsește dbUrl în config.js.'); return; }
    if (!KEYOK.test(k)) { tst('Introdu parola echipei pentru chat.'); return; }

    chatES = new EventSource(DB + '/chats/' + k + '/msgs.json');
    ['put', 'patch'].forEach(ev => chatES.addEventListener(ev, e => {
        try {
            const m = JSON.parse(e.data);
            applyEv(msgs, m.path, m.data, ev === 'patch');
            renderTeam();
        } catch (x) { }
    }));
    chatES.onerror = () => tst('Conexiune chat întreruptă, se reconectează…');
    chatES.onopen = () => tst('');
}

$('tclr').onclick = async () => {
    const k = key();
    if (!KEYOK.test(k)) { tst('Introdu parola echipei pentru chat.'); return; }
    if (!confirm('Ștergi tot chatul pentru această parolă?')) return;
    try {
        await db('DELETE', '/chats/' + k);
        msgs = {};
        renderTeam();
        tst('Chat șters.');
    } catch (e) {
        tst('Eroare: ' + e.message);
    }
};

if (ses.get('cl_team_key')) $('key').value = ses.get('cl_team_key');
renderTeam();
connectChat();
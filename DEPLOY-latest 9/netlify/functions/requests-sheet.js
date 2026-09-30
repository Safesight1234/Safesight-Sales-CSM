/* ===========================================================================
   requests-sheet — reads the published Google Sheet "Brochure/Demo aanvragen"
   (all tabs, as .xlsx) and returns every brochure / demo / contact request as
   JSON for the Marketing tab. Server-side, so no CORS or login issues.
   GET /.netlify/functions/requests-sheet   -> { ok, fetchedAt, requests:[...] }
   =========================================================================== */
const zlib = require('zlib');

const SHEET = process.env.REQUESTS_SHEET_URL ||
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vS8nAh53EcQN5ywtF7iIcBpMmH6h3Px1ox400QaS1Zpy2wZ8g-zzXtF5GBnsTUHk7IabrDKW4nnOFcj/pub?output=xlsx';
const RH = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' };
let memo = null;              // { t, body } — 5 min in-memory cache per warm instance

function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('not an xlsx');
  const n = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16); const files = {};
  for (let k = 0; k < n; k++) {
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const nl = buf.readUInt16LE(p + 28), el = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), lho = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nl).toString('utf8'); p += 46 + nl + el + cl;
    const lnl = buf.readUInt16LE(lho + 26), lel = buf.readUInt16LE(lho + 28);
    const data = buf.slice(lho + 30 + lnl + lel, lho + 30 + lnl + lel + csize);
    files[name] = () => (method === 0 ? data : zlib.inflateRawSync(data)).toString('utf8');
  }
  return files;
}
const unxml = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, c) => String.fromCharCode(+c)).replace(/&amp;/g, '&');
const colIdx = ref => { let n = 0; for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };

function readBook(buf) {
  const f = unzip(buf);
  const ss = [];
  if (f['xl/sharedStrings.xml']) {
    for (const si of f['xl/sharedStrings.xml']().match(/<si>[\s\S]*?<\/si>/g) || [])
      ss.push(unxml((si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('')));
  }
  const rels = {};
  for (const m of (f['xl/_rels/workbook.xml.rels']() || '').matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) rels[m[1]] = m[2];
  const sheets = {};
  for (const m of f['xl/workbook.xml']().matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
    let t = rels[m[2]]; if (!t) continue; t = t.startsWith('/') ? t.slice(1) : 'xl/' + t;
    if (!f[t]) continue;
    const rows = [];
    for (const r of f[t]().match(/<row[^>]*>[\s\S]*?<\/row>|<row[^>]*\/>/g) || []) {
      const row = [];
      for (const c of r.match(/<c [^>]*\/>|<c [^>]*>[\s\S]*?<\/c>/g) || []) {
        const ref = (c.match(/ r="([A-Z]+\d+)"/) || [])[1]; if (!ref) continue;
        const ty = (c.match(/ t="([^"]+)"/) || [])[1];
        const v = (c.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        let val = '';
        if (ty === 's') val = ss[+v] || '';
        else if (ty === 'inlineStr') val = unxml((c.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []).map(x => x.replace(/<[^>]+>/g, '')).join(''));
        else if (v != null) val = (ty === 'str' || isNaN(+v)) ? unxml(v) : +v;
        row[colIdx(ref)] = val;
      }
      rows.push(row);
    }
    sheets[unxml(m[1])] = rows;
  }
  return sheets;
}

function toDate(v) {
  if (typeof v === 'number' && v > 30000 && v < 60000) return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10);
  const s = String(v || '').trim();
  let m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0].slice(0, 10);
  return null;
}
const kindOf = t => { t = String(t || '').toLowerCase(); if (t.includes('demo')) return 'Demo'; if (t.includes('bouw') || t.includes('construction')) return 'Construction brochure'; if (t.includes('contact')) return 'Contact form'; return 'General brochure'; };

function extract(sheets) {
  const out = [], seen = new Set();
  for (const [name, rows] of Object.entries(sheets)) {
    if (!/brochure|demo/i.test(name) || /rvs|partner|data|dashboard/i.test(name)) continue;
    const hi = rows.findIndex(r => r && r.some(c => /^datum$/i.test(String(c || '').trim())) && r.some(c => /bedrijfsnaam/i.test(String(c || ''))));
    if (hi < 0) continue;
    const H = rows[hi].map(c => String(c || '').trim().toLowerCase());
    const col = re => H.findIndex(h => re.test(h));
    const ci = { d: col(/^datum$/), co: col(/bedrijfsnaam/), t: col(/^download$|demo \/ brochure|brochure of demo|^type$/), c: col(/^land$/), g: col(/goede lead/), n: col(/naam aanvrager/), camp: col(/marketing campagne/) };
    for (const r of rows.slice(hi + 1)) {
      if (!r) continue;
      const date = toDate(r[ci.d]); const company = String(r[ci.co] == null ? '' : r[ci.co]).trim();
      if (!date || !company) continue;
      const nm = ci.n >= 0 ? String(r[ci.n] || '').trim() : '';
      const k = date + '|' + company.toLowerCase() + '|' + nm.toLowerCase();
      if (seen.has(k)) continue; seen.add(k);
      out.push({ date, y: +date.slice(0, 4), company, kind: kindOf(ci.t >= 0 ? r[ci.t] : ''), country: ci.c >= 0 ? String(r[ci.c] || '').trim() : '',
        good: ci.g >= 0 ? String(r[ci.g] || '').trim() : '', campaign: ci.camp >= 0 ? String(r[ci.camp] || '').trim() : '' });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

exports.handler = async function () {
  try {
    if (memo && Date.now() - memo.t < 5 * 60 * 1000) return { statusCode: 200, headers: RH, body: memo.body };
    const res = await fetch(SHEET, { redirect: 'follow' });
    if (!res.ok) return { statusCode: 502, headers: RH, body: JSON.stringify({ ok: false, error: 'sheet_http_' + res.status }) };
    const buf = Buffer.from(await res.arrayBuffer());
    const requests = extract(readBook(buf));
    const body = JSON.stringify({ ok: true, fetchedAt: new Date().toISOString(), count: requests.length, requests });
    memo = { t: Date.now(), body };
    return { statusCode: 200, headers: RH, body };
  } catch (e) {
    return { statusCode: 500, headers: RH, body: JSON.stringify({ ok: false, error: String(e && e.message || e) }) };
  }
};

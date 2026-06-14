/* ============================================================================
   finance.js — reads the published finance Google Sheet and returns the two
   figures the Financials tab needs:
       ARR total       = cell C6
       Total Safesight = cell L6
   No auth / no Teamleader — the sheet is published to the web as CSV.
   GET /.netlify/functions/finance
   ============================================================================ */

const SHEET_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSXNWmYIOdt1L9BptFGEZPIPrNumIzgm6Nc74P-fQtkwFOsIq89OLQe7NWNKDNK5TqBw9MdsaHMVL-K/pub?gid=1113282903&single=true&output=csv';

// split one CSV line, honoring quoted fields
function parseCsvLine(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else {
      if (c === ',') { out.push(cur); cur = ''; }
      else if (c === '"') q = true;
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

// parse a money string in either EU ("€ 412.046,50") or US ("412,046.50") format
function parseNum(s) {
  if (s == null) return 0;
  s = String(s).replace(/[^0-9.,-]/g, '');
  if (!s) return 0;
  const lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.');
  const dec = lastComma > lastDot ? ',' : (lastDot > lastComma ? '.' : '');
  if (dec) {
    const thou = dec === ',' ? '.' : ',';
    s = s.split(thou).join('').replace(dec, '.');
  }
  return parseFloat(s) || 0;
}

exports.handler = async function () {
  try {
    const res = await fetch(SHEET_CSV, { redirect: 'follow' });
    if (!res.ok) throw new Error('sheet fetch ' + res.status);
    const text = await res.text();
    const rows = text.split(/\r?\n/).map(parseCsvLine);
    const row6 = rows[5] || [];     // sheet row 6  (0-indexed 5)
    const c6 = row6[2];             // column C
    const l6 = row6[11];            // column L
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' },
      body: JSON.stringify({
        arrTotal: parseNum(c6),
        totalSafesight: parseNum(l6),
        raw: { c6: c6 || null, l6: l6 || null },
        fetchedAt: new Date().toISOString(),
      }),
    };
  } catch (e) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: e.message }) };
  }
};

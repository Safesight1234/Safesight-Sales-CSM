/* ============================================================
   Finance export — builds a real .xlsx (no library) matching the
   Safesight finance format: 3 sheets — Goals, New Bookings, Churn.
   Exposes window.exportFinance({ quarters, monthIdx, year, label, filename }).
   Amounts are in euros, integers (rounded), matching the sample file.
   ============================================================ */
(function () {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  /* ---- xml helpers ---- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function colName(n) { let s = ''; n++; while (n) { n--; s = String.fromCharCode(65 + n % 26) + s; n = Math.floor(n / 26); } return s; }
  function cellXml(ref, val) {
    if (typeof val === 'number' && isFinite(val)) return `<c r="${ref}"><v>${val}</v></c>`;
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(val)}</t></is></c>`;
  }
  function sheetXml(rows) {
    let body = '';
    rows.forEach((row, ri) => {
      let cells = '';
      row.forEach((val, ci) => { if (val === null || val === undefined || val === '') return; cells += cellXml(colName(ci) + (ri + 1), val); });
      body += `<row r="${ri + 1}">${cells}</row>`;
    });
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
  }

  /* ---- zip (stored, no compression) ---- */
  const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
  function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function cat(arrs) { let n = 0; arrs.forEach(a => n += a.length); const o = new Uint8Array(n); let p = 0; arrs.forEach(a => { o.set(a, p); p += a.length; }); return o; }
  const u16 = n => new Uint8Array([n & 255, (n >> 8) & 255]);
  const u32 = n => new Uint8Array([n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255]);
  function zip(files) {
    const enc = new TextEncoder(); const local = []; const central = []; let offset = 0;
    files.forEach(f => {
      const name = enc.encode(f.name); const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data; const crc = crc32(data);
      const lh = cat([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data]);
      local.push(lh);
      central.push(cat([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
      offset += lh.length;
    });
    let cSize = 0; central.forEach(c => cSize += c.length);
    const eocd = cat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cSize), u32(offset), u16(0)]);
    return new Blob([...local, ...central, eocd], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  function buildWorkbook(sheetDefs) {
    const files = [];
    files.push({ name: '[Content_Types].xml', data:
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheetDefs.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` });
    files.push({ name: '_rels/.rels', data:
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` });
    files.push({ name: 'xl/workbook.xml', data:
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetDefs.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` });
    files.push({ name: 'xl/_rels/workbook.xml.rels', data:
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetDefs.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheetDefs.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` });
    files.push({ name: 'xl/styles.xml', data:
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>` });
    sheetDefs.forEach((s, i) => files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s.rows) }));
    return zip(files);
  }

  /* ---- assemble the finance data for a scope ---- */
  window.exportFinance = function ({ quarters, monthIdx, year, label, filename }) {
    const D = window.DATA;
    const ownV = window.ownValue, dealMonth = window.dealMonth;
    const inMonth = d => monthIdx == null || dealMonth(d) === monthIdx;

    const won = quarters.flatMap(q => D.quarters[q].won).filter(inMonth);
    let churn = quarters.flatMap(q => D.quarters[q].churn);
    if (monthIdx != null) churn = churn.filter(c => c.when === MONTHS[monthIdx] || c.when === MONTHS_FULL[monthIdx]);

    const achNL = window.sumOwn(won, 'New logo');
    const achUP = window.sumOwn(won, 'Upsell');
    const achC = achNL + achUP;
    const goalNL = window.goalSum(quarters, 'newLogo');
    const goalUP = window.goalSum(quarters, 'upsell');
    const goalC = window.goalSum(quarters, 'combined');
    const vrow = (cat, goal, ach) => [cat, goal, Math.round(ach), (ach - goal).toFixed(2), goal ? ((ach - goal) / goal * 100).toFixed(1) + '%' : '—'];

    const goalsRows = [
      ['Category', 'Goal', 'Achieved', 'Variance', 'Variance %'],
      vrow('New Logo', goalNL, achNL),
      vrow('Upsell', goalUP, achUP),
      vrow('Combined', goalC, achC),
    ];

    const bookingRows = [['Title', 'Customer Name', 'Date Closed', 'Item Name', 'Amount (Euros)', 'Sales Rep', 'Industry', 'Bookings Type']];
    won.forEach(d => bookingRows.push([
      d.name, d.customer || '', d.refused || '', d.name, Math.round(ownV(d)),
      d.owner || '', d.industry || '', d.type === 'Upsell' ? 'Upsell' : 'New Logo',
    ]));

    const churnRows = [['Customer Name', 'Month ARR gets impacted', 'Item Name', 'Amount (Euros)']];
    churn.forEach(c => churnRows.push([c.customer || '', c.when || '', c.reason || '', Math.round(c.value || 0)]));

    const blob = buildWorkbook([
      { name: 'Goals', rows: goalsRows },
      { name: 'New Bookings', rows: bookingRows },
      { name: 'Churn', rows: churnRows },
    ]);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = (filename || 'safesight-export') + '.xlsx';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { won: won.length, churn: churn.length };
  };
})();

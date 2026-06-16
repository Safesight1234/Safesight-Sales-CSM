/* ============================================================================
   tl-peek.js — read-only diagnostic. Reports:
     • how many deals were captured, and how many company names are cached
     • any deal whose title contains the ?q= search term (default "PEC")
       with its pipeline, status, dates, and key custom fields
   Visit: /.netlify/functions/tl-peek?q=PEC
   Changes nothing.
   ============================================================================ */
const { connectLambda } = require('@netlify/blobs');
const { tlApi } = require('./_lib/teamleader');

const PIPE = { newLogo: '93cea99a-85d8-0778-a440-5829fa542693', upsell: '71b71c5d-edc5-0fe1-a146-e1928c32b843' };
const CF = { vlChurn: '2b144baa-1314-08a0-905a-d2e4c708e0d4', contractEnd: '1be6a084-9641-0845-895e-f61f97164e06', contractStart: '1a867bdf-4156-0d5c-ba5d-2c9108966114' };
const cfVal = (d, id) => { const f = (d.custom_fields || []).find(x => x.definition && x.definition.id === id); return f ? f.value : null; };

exports.handler = async function (event) {
  connectLambda(event);
  const q = ((event.queryStringParameters || {}).q || 'PEC').toLowerCase();
  try {
    const matches = [];
    let total = 0, page = 1, rows;
    do {
      const j = await tlApi('deals.list', { page: { size: 100, number: page }, sort: [{ field: 'created_at', order: 'desc' }] });
      rows = j.data || [];
      total += rows.length;
      for (const d of rows) {
        if ((d.title || '').toLowerCase().includes(q)) {
          let detail = null;
          try { const r = await tlApi('deals.info', { id: d.id }); const f = r.data;
            detail = { vlChurn: cfVal(f, CF.vlChurn), contractEnd: cfVal(f, CF.contractEnd), contractStart: cfVal(f, CF.contractStart) }; } catch (e) {}
          matches.push({
            title: d.title, status: d.status,
            pipeline: d.pipeline && d.pipeline.id,
            pipelineIsUpsell: d.pipeline && d.pipeline.id === PIPE.upsell,
            pipelineIsNewLogo: d.pipeline && d.pipeline.id === PIPE.newLogo,
            estClose: d.estimated_closing_date, closedAt: d.closed_at, created: d.created_at,
            customerType: d.lead && d.lead.customer && d.lead.customer.type,
            detail,
          });
        }
      }
      page++;
    } while (rows.length === 100 && page < 12);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalDealsScanned: total, query: q, matchCount: matches.length, matches, knownPipelines: PIPE }, null, 2) };
  } catch (e) {
    return { statusCode: 500, body: 'Error: ' + e.message };
  }
};

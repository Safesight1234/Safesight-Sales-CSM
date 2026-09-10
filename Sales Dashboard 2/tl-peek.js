/* ============================================================================
   tl-peek.js — read-only diagnostic. Two modes:

     /.netlify/functions/tl-peek?defs=1
        → every custom-field definition (id + label), so we can see the exact
          id behind "Startdate" / "Duration (in months)".

     /.netlify/functions/tl-peek?q=PEC
        → deals whose title contains the search term, with pipeline, status,
          dates AND every custom field on the deal (label + id + value).

   Changes nothing.
   ============================================================================ */
const { connectLambda } = require('@netlify/blobs');
const { tlApi, tlList } = require('./_lib/teamleader');

const PIPE = { newLogo: '93cea99a-85d8-0778-a440-5829fa542693', upsell: '71b71c5d-edc5-0fe1-a146-e1928c32b843' };

async function allDefs() {
  const rows = await tlList('customFieldDefinitions.list', {});
  return (rows || []).map(d => ({ id: d.id, label: d.label, type: d.type, context: d.context }));
}

exports.handler = async function (event) {
  connectLambda(event);
  const qs = event.queryStringParameters || {};
  try {
    let defs = [];
    try { defs = await allDefs(); } catch (e) { defs = [{ error: 'customFieldDefinitions.list failed: ' + e.message }]; }
    const labelOf = {}; defs.forEach(d => { if (d.id) labelOf[d.id] = d.label; });

    if (qs.defs) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ definitionCount: defs.length, definitions: defs }, null, 2) };
    }

    const q = (qs.q || 'PEC').toLowerCase();
    const matches = [];
    let total = 0, page = 1, rows;
    do {
      const j = await tlApi('deals.list', { page: { size: 100, number: page }, sort: [{ field: 'created_at', order: 'desc' }] });
      rows = j.data || [];
      total += rows.length;
      for (const d of rows) {
        if ((d.title || '').toLowerCase().includes(q)) {
          let fields = null;
          try {
            const r = await tlApi('deals.info', { id: d.id });
            fields = (r.data.custom_fields || []).map(f => ({
              id: f.definition && f.definition.id,
              label: labelOf[f.definition && f.definition.id] || '(label unknown)',
              value: f.value,
            }));
          } catch (e) { fields = [{ error: e.message }]; }
          matches.push({
            title: d.title, status: d.status,
            pipeline: d.pipeline && d.pipeline.id,
            pipelineIsUpsell: d.pipeline && d.pipeline.id === PIPE.upsell,
            pipelineIsNewLogo: d.pipeline && d.pipeline.id === PIPE.newLogo,
            estClose: d.estimated_closing_date, closedAt: d.closed_at, created: d.created_at,
            customFields: fields,
          });
        }
      }
      page++;
    } while (rows.length === 100 && page < 12);

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalDealsScanned: total, query: q, matchCount: matches.length, definitionCount: defs.length, matches, knownPipelines: PIPE }, null, 2) };
  } catch (e) {
    return { statusCode: 500, body: 'Error: ' + e.message };
  }
};

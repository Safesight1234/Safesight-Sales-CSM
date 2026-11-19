const { connectLambda } = require('@netlify/blobs');
const { tlList, tlApi } = require('./_lib/teamleader');

exports.handler = async function (event) {
  connectLambda(event);
  try {
    // 1) all custom field labels + their id codes
    const defs = await tlList('customFieldDefinitions.list', {});
    const customFields = defs.map(d => ({ id: d.id, label: d.label }));

    // 2) group deals by pipeline so we can match id codes to your 3 pipeline names
    const deals = await tlList('deals.list', {});
    const byPipeline = {};
    deals.forEach(d => {
      const pid = (d.pipeline && d.pipeline.id) || 'none';
      byPipeline[pid] = byPipeline[pid] || { count: 0, statusCounts: {}, sampleTitles: [] };
      byPipeline[pid].count++;
      byPipeline[pid].statusCounts[d.status] = (byPipeline[pid].statusCounts[d.status] || 0) + 1;
      if (byPipeline[pid].sampleTitles.length < 6) byPipeline[pid].sampleTitles.push(d.title);
    });

    // 3) one real WON deal with its custom fields filled in
    const wonDeal = deals.find(d => d.status === 'won') || deals[0];
    let wonDealCustomFields = null;
    try {
      const r = await tlApi('deals.info', { id: wonDeal.id });
      wonDealCustomFields = { title: r.data.title, pipeline: r.data.pipeline, custom_fields: r.data.custom_fields };
    } catch (e) { wonDealCustomFields = { error: e.message }; }

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customFields, byPipeline, wonDealCustomFields }, null, 2) };
  } catch (e) {
    return { statusCode: 500, body: 'Error: ' + e.message };
  }
};

const { connectLambda } = require('@netlify/blobs');
const { tlList, tlApi } = require('./_lib/teamleader');

exports.handler = async function (event) {
  connectLambda(event);
  try {
    const defs = await tlList('customFieldDefinitions.list', {});
    const customFields = defs.map(function (d) { return { id: d.id, label: d.label }; });

    const deals = await tlList('deals.list', {});
    const byPipeline = {};
    deals.forEach(function (d) {
      const pid = (d.pipeline && d.pipeline.id) || 'none';
      byPipeline[pid] = byPipeline[pid] || { count: 0, statusCounts: {}, sampleTitles: [] };
      byPipeline[pid].count++;
      byPipeline[pid].statusCounts[d.status] = (byPipeline[pid].statusCounts[d.status] || 0) + 1;
      if (byPipeline[pid].sampleTitles.length < 6) byPipeline[pid].sampleTitles.push(d.title);
    });

    const wonDeal = deals.find(function (d) { return d.status === 'won'; }) || deals[0];
    let wonDealCustomFields;
    try {
      const r = await tlApi('deals.info', { id: wonDeal.id });
      wonDealCustomFields = { title: r.data.title, pipeline: r.data.pipeline, custom_fields: r.data.custom_fields };
    } catch (e) { wonDealCustomFields = { error: e.message }; }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customFields: customFields, byPipeline: byPipeline, wonDealCustomFields: wonDealCustomFields }, null, 2)
    };
  } catch (e) {
    return { statusCode: 500, body: 'Error: ' + e.message };
  }
}

onst { connectLambda } = require('@netlify/blobs');
const { tlList, tlApi } = require('./_lib/teamleader');

exports.handler = async function (event) {
  connectLambda(event);
  try {
    const deals = await tlList('deals.list', {});
    const byPipeline = {};
    deals.forEach(d => {
      const pid = (d.pipeline && d.pipeline.id) || 'none';
      byPipeline[pid] = byPipeline[pid] || { count: 0, statusCounts: {}, sampleTitles: [] };
      byPipeline[pid].count++;
      byPipeline[pid].statusCounts[d.status] = (byPipeline[pid].statusCounts[d.status] || 0) + 1;
      if (byPipeline[pid].sampleTitles.length < 8) byPipeline[pid].sampleTitles.push(d.title);
    });
    let phaseNames = null;
    try { const p = await tlList('dealPhases.list', {}); phaseNames = {}; p.forEach(x => phaseNames[x.id] = x.name); }
    catch (e) { phaseNames = { error: e.message }; }
    let oneDealFull = null;
    try { const r = await tlApi('deals.info', { id: deals[0].id }); oneDealFull = r.data; }
    catch (e) { oneDealFull = { error: e.message }; }
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalDeals: deals.length, byPipeline, phaseNames, oneDealFull }, null, 2) };
  } catch (e) {
    return { statusCode: 500, body: 'Error: ' + e.message };
  }
};

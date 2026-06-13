const { connectLambda } = require('@netlify/blobs');
const { tlList } = require('./_lib/teamleader');

exports.handler = async function (event) {
  connectLambda(event);
  try {
    const deals = await tlList('deals.list', { sort: [{ field: 'created_at', order: 'desc' }] });
    const phasesSeen = [...new Set(deals.map(d => d.current_phase && (d.current_phase.name || d.current_phase.id)).filter(Boolean))];
    const statuses = [...new Set(deals.map(d => d.status))];
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalDeals: deals.length, statuses, phasesSeen, firstThreeDeals: deals.slice(0, 3) }, null, 2),
    };
  } catch (e) {
    return { statusCode: 500, body: 'Error: ' + e.message };
  }
};

const service = require('../services/finance.service');
async function transactions(req, res) {
  try { res.setHeader('Cache-Control', 'no-store'); res.json(await service.transactions(req.user, req.query)); }
  catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not load payment transactions.' }); }
}
async function exportTransactions(req, res) {
  try {
    const result = await service.transactions(req.user, req.query, true);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send('\uFEFF' + result.csv);
  } catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not export payment transactions.' }); }
}
module.exports = { transactions, exportTransactions };

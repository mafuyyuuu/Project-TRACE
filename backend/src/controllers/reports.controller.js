const reportsService = require('../services/reports.service');

/** Thin HTTP layer for /api/reports. */

function fail(res, err, logLabel, fallbackMessage) {
  console.error(`${logLabel}:`, err);
  res.status(err.status || 500).json({ error: err.status ? err.message : fallbackMessage });
}

/**
 * Send a generated CSV as a download.
 *
 * The BOM makes Excel open UTF-8 correctly — without it, accented names in the
 * student list render as mojibake, which is the single most common complaint
 * about CSV exports opened on Windows.
 */
function sendCsv(res, { filename, csv }) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + csv);
}

async function documentReport(req, res) {
  try {
    res.json(await reportsService.getDocumentReport(req.user, req.query));
  } catch (err) {
    fail(res, err, 'Document report error', 'Failed to generate report.');
  }
}

async function exportStudents(req, res) {
  try {
    const result = await reportsService.exportStudentsCsv(req.user, req.query.category || 'all', req.query);
    sendCsv(res, result);
  } catch (err) {
    fail(res, err, 'Student export error', 'Failed to export students.');
  }
}

async function exportDocuments(req, res) {
  try {
    sendCsv(res, await reportsService.exportDocumentsCsv(req.user, req.query));
  } catch (err) {
    fail(res, err, 'Document export error', 'Failed to export documents.');
  }
}

async function analytics(req, res) {
  try {
    res.json(await reportsService.getEfficiencyAnalytics(req.user, req.query));
  } catch (err) {
    fail(res, err, 'Analytics error', 'Failed to compute analytics.');
  }
}

async function filterOptions(req,res) {
  try { res.json(await require('../services/reportFilters.service').options(req.user)); }
  catch(err) { fail(res,err,'Report options error','Could not load report options.'); }
}

async function exportPdf(req,res) {
  try {
    const {filename,bytes}=await require('../services/reportPdf.service').generate(req.user,req.params.kind,req.query);
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);
    res.setHeader('Cache-Control','private, no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.send(bytes);
  } catch(err) {fail(res,err,'PDF report error','Could not generate the PDF report. Try again.');}
}
async function aiEvaluation(req, res) {
  try { res.json(await require('../services/aiEvaluation.service').evaluate(req.user, req.query)); }
  catch (err) { fail(res, err, 'AI evaluation error', 'Could not load AI evaluation.'); }
}
module.exports = { aiEvaluation, exportPdf, filterOptions, documentReport, exportStudents, exportDocuments, analytics };

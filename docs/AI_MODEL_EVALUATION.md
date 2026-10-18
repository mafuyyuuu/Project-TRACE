# AI and model evaluation

Admins can open **Efficiency Analytics → AI & Model Evaluation** (`?tab=admin-analytics&analytics=ai`). The authenticated `/api/reports/ai-evaluation` route and its service both enforce the admin role. No new environment variables, Python dependencies or schema migrations are required. Restart the backend and deploy the matching frontend. Existing live demand forecasts, per-document-type filtering, and rolling-origin validation remain available.

## Counts and provenance

Reports count matching `documents` rows. One request bundle may have multiple document rows; each document may have several `step_logs` events. Activity and global Security Log views load only the latest 100 events; personal security history has a separate limit of 20. The new page shows the total activity count separately.

The mock generator creates `TRC-MOCK-` tracking numbers and, when run directly, 10,000 documents dated January 2020 through July 20, 2026. The page queries the actual count, earliest/latest Manila dates, recognized synthetic count, unmarked count and saved intake OCR sample count. Unmarked is not proof of real institutional provenance. Scores on generated records demonstrate the evaluation process, not accuracy on real PLP demand.

## Historical archive evaluation

Choose all documents, recognized synthetic only, or unmarked records; choose the last day E of a seven-day test period. Empty means yesterday in Manila. Invalid calendar dates and incomplete/future dates are rejected. Test days are E−6 through E. Training ends E−8, with E−7 skipped as a simulated incomplete current day, matching the existing live forecast's tomorrow-through-day-seven horizon. Training uses up to 90 complete calendar days and starts no earlier than the selected cohort's first known record. The archive evaluation requires at least 28 preceding calendar days with some training demand and some recorded test demand. Existing rolling-origin validation retains its own minimums.

SQL groups `documents.created_at` by timestamp epoch plus Manila UTC+8 and uses exclusive epoch bounds, independently of database session timezone. Each document row counts once, regardless of eventual outcome. Gaps become zero recorded requests; missing imports or collection outages may instead mean missing observations. Verify coverage before interpreting zeros as actual demand.

Only training aggregates, the simulated current day and timezone go to the existing Prophet endpoint. Held-out actuals remain in Node. The archive uses the same Python `forecaster.predict_counts` configuration as live demand forecasts, and reuses Node's deployed weekday fallback, output validation and error formulas. Predictions must match the exact seven target dates and weekday labels and contain finite nonnegative integer volumes. Missing/unusable Prophet output leaves its metrics unmeasured while the baseline remains available.

MAE is mean absolute daily error (documents/day); RMSE gives large misses more weight. WAPE is total absolute error divided by total recorded test requests × 100, undefined at zero actual total. These are errors, not accuracy percentages. MAE improvement is `(baseline MAE − Prophet MAE) / baseline MAE × 100`; negative means Prophet did worse, and baseline MAE zero leaves the percentage undefined. Both errors stay visible.

One archived period is diagnostic evidence. Repeat over representative periods and independently verified real records before claiming deployment accuracy. The browser labels the loaded cohort and date boundaries separately from draft controls; failed refreshes retain prior results and editable drafts. AI explanations remain readable when measurements are unavailable.

## Why these approaches

EasyOCR supplies pretrained detection/recognition in the existing local Python/CPU pipeline. Tesseract, cloud OCR and custom neural OCR are alternatives, not benchmarked losers. Saved intake `ocr_confidence_score` is the share of expected fields found, not confidence in their correctness. The all-record average and non-null sample count do not measure all OCR attempts. Recognition accuracy, character/word error rates, field exact-match accuracy and ID false acceptance/rejection require human-labeled ground truth, which is not currently available for evaluation.

Prophet is a practical initial model for daily trend and weekly seasonality in the existing Python service. Daily and yearly seasonality are disabled. ARIMA/SARIMA, Random Forest with lag/calendar features, neural models and the weekday baseline are valid alternatives. Only Prophet versus the weekday baseline is measured here; broad superiority claims are unsupported.

Workflow/support rules provide traceable suggestions from measured aggregates; n8n routing is rule-based automation. The earlier four-example Random Forest demonstration has been retired from active advice. Current rules have no ML accuracy score. Evaluate suggestions using labeled bottleneck precision/recall, staff acceptance and subsequent turnaround outcomes.

Primary references: [EasyOCR API](https://www.jaided.ai/easyocr/documentation/), [Prophet diagnostics](https://facebook.github.io/prophet/docs/diagnostics.html), [SARIMAX](https://www.statsmodels.org/stable/generated/statsmodels.tsa.statespace.sarimax.SARIMAX.html), [Random Forest](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html).

## Verification on October 18, 2026

Integrated against dev `d3d3f19`. Backend suite: 1,862 tests. Frontend suite excluding the localhost upload integration suite: 1,227 tests; the four upload tests run separately with localhost permission. ESLint and production build pass. Python forecast/analytics checks: 11 tests. Browser checks cover 320, 375, 768 and 1280 px in light/dark themes plus 200% text at 320 px; tables scroll inside focusable regions.

A read-only check of the configured local database found 10,032 document rows: 10,000 recognized synthetic and 32 unmarked. This is a local snapshot, not a claim about the deployed database. A genuine Prophet run on the synthetic archive ending July 20 used April 14–July 12 for training, skipped July 13 and tested July 14–20 (22 recorded requests). Prophet MAE was 2.5714 versus baseline 2.1429, or 20% higher error. These scores describe generated data only. The browser preview used aggregate output from that run; no live user records or account changes were used for verification.

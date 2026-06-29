UPDATE crypto_mentions m
SET report_date = '2026-06-29',
    week_number = sub.wk,
    year = 2026
FROM (
  SELECT week_number AS wk
  FROM crypto_mentions
  WHERE report_date = '2026-06-29'
  LIMIT 1
) sub
WHERE m.submission_id = (
  SELECT id FROM crypto_report_submissions ORDER BY created_at DESC LIMIT 1
)
AND m.report_date = '2026-06-28';
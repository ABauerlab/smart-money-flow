-- Adds source-file identity to crypto_report_submissions so automated ingestion
-- (Make.com watching a Drive folder) can be deduped by file id, and so each
-- submission ("round") can report the exact export timestamp instead of only
-- the calendar date.
alter table public.crypto_report_submissions
  add column if not exists source_file_id text,
  add column if not exists source_file_name text,
  add column if not exists source_modified_time timestamptz;

create unique index if not exists crypto_report_submissions_source_file_id_key
  on public.crypto_report_submissions (source_file_id)
  where source_file_id is not null;

create index if not exists crypto_mentions_access_report_idx
  on public.crypto_mentions (access_code, report_date, submission_id);

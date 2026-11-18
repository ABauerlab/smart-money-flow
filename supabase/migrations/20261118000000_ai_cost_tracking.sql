-- AI cost observability and dedup for periodic reports.
-- ai_input_hash: SHA-256 of period + top-20 ranking (scores), used by analyze-csv to
--   skip the AI call when nothing relevant changed since the last valid analysis.
-- ai_truncated: true when the model stopped at the output token cap (finishReason MAX_TOKENS).
-- token columns: real usageMetadata values returned by the model for that report.
alter table public.crypto_periodic_reports
  add column if not exists ai_model_used text,
  add column if not exists ai_input_hash text,
  add column if not exists ai_prompt_tokens integer,
  add column if not exists ai_output_tokens integer,
  add column if not exists ai_cached_tokens integer,
  add column if not exists ai_truncated boolean not null default false;

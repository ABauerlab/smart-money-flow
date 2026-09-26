-- Replaces the "any string is a valid access code" model with a real allow-list:
-- crypto-analysis now rejects any code that isn't an active row in access_codes,
-- and logs both failed and mutating-successful attempts to access_audit_log for
-- security visibility. A dedicated, tighter per-IP rate limit (see badCodeRateLimit
-- in the edge function) also applies specifically to wrong codes.

create table if not exists public.access_codes (
  code text primary key,
  client_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_used_at timestamptz
);

create table if not exists public.access_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ip text,
  access_code_attempted text,
  action text,
  success boolean not null
);

create index if not exists access_audit_log_created_idx on public.access_audit_log (created_at desc);
create index if not exists access_audit_log_ip_idx on public.access_audit_log (ip, created_at desc);

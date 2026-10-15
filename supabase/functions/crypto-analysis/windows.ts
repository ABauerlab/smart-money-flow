// Pure date-window and summing logic for crypto-analysis, kept free of Deno/URL
// imports so it can be unit tested (see src/test/windows.test.ts).

// Crypto trades 24/7, so the daily/weekly/monthly report cycle rolls over at
// 21:00 Brasília time (lined up with the VPS's daily Ásia session) instead of
// local midnight — any moment at or after 21:00 belongs to the NEXT calendar
// day's business date. Weekly closes with that Sunday's 21:00 rollover, and
// monthly closes with the 21:00 rollover of the month's last day, both for
// free since they're derived from this same adjusted date.
export function businessDateBR(instant: Date): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '0';
  const y = Number(get('year')), mo = Number(get('month')), d = Number(get('day')), h = Number(get('hour'));
  const base = new Date(Date.UTC(y, mo - 1, d));
  if (h >= 21) base.setUTCDate(base.getUTCDate() + 1);
  return base;
}

export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Monday->Sunday window for the week containing `ref` (crypto trades every day,
// so the week runs the full 7 days and closes with Sunday's 21:00 rollover —
// pass a businessDateBR-adjusted `ref` so that rollover is already baked in).
export function getWeekRange(ref: Date): { start: Date; end: Date } {
  const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  const dow = d.getUTCDay() || 7; // 1=Mon..7=Sun
  const monday = new Date(d); monday.setUTCDate(d.getUTCDate() - (dow - 1));
  const sunday = new Date(monday); sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: monday, end: sunday };
}

// Week-of-month index (1..5), based on the calendar day of the week's Monday.
// Not capped: a Monday on the 29th-31st is a genuine 5th week, and capping it to 4
// gave two different weeks the same "SEMANA 4" label in the weekly list.
export function weekOfMonth(d: Date): number {
  return Math.ceil(d.getUTCDate() / 7);
}

export function fmtDate(d: Date): string { return d.toISOString().split('T')[0]; }

export const MONTHS_PT = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];

// Sum the REPETIÇÃO column per symbol; tie-break by most recent date/time.
export function sumMentions(mentions: any[]): { symbol: string; count: number }[] {
  const agg: Record<string, { count: number; last: string }> = {};
  for (const m of mentions) {
    const sym = String(m.symbol || '').toUpperCase();
    if (!sym) continue;
    const rep = Number(m.repetition);
    const value = Number.isFinite(rep) && rep > 0 ? rep : 1;
    const stamp = `${m.report_date || ''} ${m.report_time || ''}`.trim();
    if (!agg[sym]) agg[sym] = { count: 0, last: '' };
    agg[sym].count += value;
    if (stamp > agg[sym].last) agg[sym].last = stamp;
  }
  return Object.entries(agg)
    .map(([symbol, v]) => ({ symbol, count: v.count, last: v.last }))
    .sort((a, b) => (b.count - a.count) || (b.last > a.last ? 1 : -1))
    .map(({ symbol, count }) => ({ symbol, count }));
}

// Resolve a date window from periodType + windowIndex (relative to "now").
// periodType: 'daily' | 'weekly' | 'monthly'
// windowIndex semantics:
//   daily   : 0 = today (current 21:00-21:00 business day), 1 = the previous one, ... up to ~30
//   weekly  : 0 = current week (Mon-Sun, closing Sunday 21:00); 1..N = previous weeks
//   monthly : 0 = current month (closing the last day's 21:00); 1..N = previous calendar months
export function resolveWindow(periodType: string, windowIndex: number, now = new Date()): { start: string; end: string; label: string } {
  const idx = Math.max(0, Math.min(60, Number(windowIndex) || 0));
  const businessNow = businessDateBR(now);
  if (periodType === 'daily') {
    const d = new Date(businessNow);
    d.setUTCDate(d.getUTCDate() - idx);
    const s = fmtDate(d);
    return { start: s, end: s, label: idx === 0 ? 'Hoje' : `D-${idx}` };
  }
  if (periodType === 'weekly') {
    const ref = new Date(businessNow); ref.setUTCDate(ref.getUTCDate() - idx * 7);
    const { start, end } = getWeekRange(ref);
    const wom = weekOfMonth(start);
    const label = `SEMANA ${wom} - ${MONTHS_PT[start.getUTCMonth()]}`;
    return { start: fmtDate(start), end: fmtDate(end), label };
  }
  // monthly
  const y = businessNow.getUTCFullYear();
  const m = businessNow.getUTCMonth() - idx;
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 0));
  return { start: fmtDate(start), end: fmtDate(end), label: `${MONTHS_PT[start.getUTCMonth()]} ${start.getUTCFullYear()}` };
}


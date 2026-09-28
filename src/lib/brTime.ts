// Every timestamp shown in the UI must read as Brasília time (America/Sao_Paulo),
// regardless of the viewer's own device timezone — the product, its data (VPS,
// Make.com) and its audience are all Brazil-based. Plain toLocaleString calls use
// the browser's local timezone instead, which silently shows the wrong time for
// anyone outside UTC-3. These helpers pin the timezone explicitly.

const TZ = 'America/Sao_Paulo';

export function formatBRTime(date: Date | string, opts: Intl.DateTimeFormatOptions = {}): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ, ...opts });
}

export function formatBRDate(date: Date | string, opts: Intl.DateTimeFormatOptions = {}): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', { timeZone: TZ, ...opts });
}

export function formatBRDateTime(date: Date | string, opts: Intl.DateTimeFormatOptions = {}): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-BR', { timeZone: TZ, ...opts });
}
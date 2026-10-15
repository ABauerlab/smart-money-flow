// Content fingerprint for manual CSV uploads. The Make.com/VPS automation already
// dedupes by Drive file id, but a person re-sending the same file in the "Enviar"
// tab had no protection: every repeat doubled that round's counts. The fingerprint
// is stored as the round's source_file_id (which already has a unique index), so
// identical content for the same access code and report date is ingested only once.

export interface FingerprintRow {
  symbol: string;
  repetition: number;
  time?: string | null;
  rank?: number | null;
}

export async function manualUploadFingerprint(
  accessCode: string,
  reportDate: string,
  rows: FingerprintRow[],
): Promise<string> {
  // Order-independent: the same set of rows in a different order is the same file.
  const canonical = rows
    .map(r => `${r.symbol}|${r.repetition}|${r.time ?? ''}|${r.rank ?? ''}`)
    .sort()
    .join('\n');
  const bytes = new TextEncoder().encode(`${accessCode}\n${reportDate}\n${canonical}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `manual:${hex}`;
}

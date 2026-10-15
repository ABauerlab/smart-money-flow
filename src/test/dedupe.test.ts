import { describe, it, expect } from "vitest";
import { manualUploadFingerprint } from "../../supabase/functions/crypto-analysis/dedupe";

const rows = [
  { symbol: "BTC", repetition: 3, time: "05:00:00", rank: 1 },
  { symbol: "ETH", repetition: 2, time: "05:00:00", rank: 2 },
];

describe("manualUploadFingerprint", () => {
  it("is identical for the same content, regardless of row order", async () => {
    const a = await manualUploadFingerprint("1234", "2026-10-15", rows);
    const b = await manualUploadFingerprint("1234", "2026-10-15", [...rows].reverse());
    expect(a).toBe(b);
    expect(a).toMatch(/^manual:[0-9a-f]{64}$/);
  });

  it("changes with content, date or access code", async () => {
    const base = await manualUploadFingerprint("1234", "2026-10-15", rows);
    expect(await manualUploadFingerprint("1234", "2026-10-16", rows)).not.toBe(base);
    expect(await manualUploadFingerprint("9999", "2026-10-15", rows)).not.toBe(base);
    expect(await manualUploadFingerprint("1234", "2026-10-15", [{ ...rows[0], repetition: 4 }, rows[1]])).not.toBe(base);
  });
});

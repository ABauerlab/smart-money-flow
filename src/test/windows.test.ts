import { describe, it, expect } from "vitest";
import { businessDateBR, resolveWindow, sumMentions, fmtDate } from "../../supabase/functions/crypto-analysis/windows";

// Brasília is UTC-3 all year (no DST), so 21:00 BRT = 00:00 UTC of the next day.
const brt = (iso: string) => new Date(`${iso}-03:00`);

describe("businessDateBR (21h Brasília rollover)", () => {
  it("keeps the calendar date before 21:00", () => {
    expect(fmtDate(businessDateBR(brt("2026-10-15T20:59:00")))).toBe("2026-10-15");
  });
  it("moves to the next day at 21:00", () => {
    expect(fmtDate(businessDateBR(brt("2026-10-15T21:00:00")))).toBe("2026-10-16");
    expect(fmtDate(businessDateBR(brt("2026-10-15T23:59:00")))).toBe("2026-10-16");
  });
  it("rolls over month and year boundaries", () => {
    expect(fmtDate(businessDateBR(brt("2026-10-31T21:30:00")))).toBe("2026-11-01");
    expect(fmtDate(businessDateBR(brt("2026-12-31T22:00:00")))).toBe("2027-01-01");
  });
});

describe("resolveWindow weekly (Mon-Sun, closes Sunday 21h)", () => {
  it("Wednesday is inside the week of that Monday", () => {
    const w = resolveWindow("weekly", 0, brt("2026-10-14T12:00:00"));
    expect(w).toMatchObject({ start: "2026-10-12", end: "2026-10-18", label: "SEMANA 2 - OUTUBRO" });
  });
  it("Sunday 20:59 is still the closing week; 21:00 starts the next one", () => {
    expect(resolveWindow("weekly", 0, brt("2026-10-18T20:59:00")).start).toBe("2026-10-12");
    expect(resolveWindow("weekly", 0, brt("2026-10-18T21:00:00")).start).toBe("2026-10-19");
  });
  it("windowIndex walks back one week at a time", () => {
    expect(resolveWindow("weekly", 1, brt("2026-10-14T12:00:00")).start).toBe("2026-10-05");
    expect(resolveWindow("weekly", 1, brt("2026-10-14T12:00:00")).label).toBe("SEMANA 1 - OUTUBRO");
  });
  it("a Monday on the 29th-31st is a real 5th week, not a second 'SEMANA 4'", () => {
    const w = resolveWindow("weekly", 0, brt("2026-06-30T12:00:00"));
    expect(w.start).toBe("2026-06-29");
    expect(w.label).toBe("SEMANA 5 - JUNHO");
    expect(resolveWindow("weekly", 1, brt("2026-06-30T12:00:00")).label).toBe("SEMANA 4 - JUNHO");
  });
});

describe("resolveWindow daily and monthly", () => {
  it("daily follows the business date", () => {
    expect(resolveWindow("daily", 0, brt("2026-10-15T22:00:00"))).toMatchObject({ start: "2026-10-16", end: "2026-10-16", label: "Hoje" });
    expect(resolveWindow("daily", 2, brt("2026-10-15T10:00:00")).start).toBe("2026-10-13");
  });
  it("monthly covers the whole calendar month and closes at the last day's 21h", () => {
    expect(resolveWindow("monthly", 0, brt("2026-10-15T10:00:00"))).toMatchObject({ start: "2026-10-01", end: "2026-10-31", label: "OUTUBRO 2026" });
    expect(resolveWindow("monthly", 0, brt("2026-10-31T21:00:00")).start).toBe("2026-11-01");
    expect(resolveWindow("monthly", 1, brt("2026-01-10T10:00:00"))).toMatchObject({ start: "2025-12-01", end: "2025-12-31" });
  });
});

describe("sumMentions", () => {
  it("sums REPETIÇÃO per symbol, treats invalid repetition as 1 and sorts descending", () => {
    const out = sumMentions([
      { symbol: "btc", repetition: 3, report_date: "2026-10-12", report_time: "05:00" },
      { symbol: "BTC", repetition: 2, report_date: "2026-10-13", report_time: "05:00" },
      { symbol: "ETH", repetition: 0 },
      { symbol: "", repetition: 9 },
      { symbol: "SOL", repetition: 7 },
    ]);
    expect(out).toEqual([{ symbol: "SOL", count: 7 }, { symbol: "BTC", count: 5 }, { symbol: "ETH", count: 1 }]);
  });
  it("breaks ties by the most recent date/time", () => {
    const out = sumMentions([
      { symbol: "AAA", repetition: 2, report_date: "2026-10-12", report_time: "05:00" },
      { symbol: "BBB", repetition: 2, report_date: "2026-10-14", report_time: "10:30" },
    ]);
    expect(out.map(r => r.symbol)).toEqual(["BBB", "AAA"]);
  });
});

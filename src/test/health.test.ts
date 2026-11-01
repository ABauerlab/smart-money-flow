import { describe, it, expect } from "vitest";
import {
  evaluateHealth, needsReportRepair, pickReportIds, STALE_AFTER_MINUTES, ANALYSIS_GRACE_MINUTES,
} from "../../supabase/functions/crypto-analysis/health";

const base = {
  checks: [{ window: "Hoje", aggregateTotal: 10, rowsTotal: 10 }],
  minutesSinceLastRound: 60,
  dailyTotal: 10,
  dailyReportsWithAnalysis: 1,
};
const codes = (i: Parameters<typeof evaluateHealth>[0]) => evaluateHealth(i).map(p => p.code);

describe("evaluateHealth", () => {
  it("is healthy when everything lines up", () => {
    expect(evaluateHealth(base)).toEqual([]);
  });
  it("reports a database failure as the only problem", () => {
    expect(codes({ ...base, dbError: "boom" })).toEqual(["db_unreachable"]);
  });
  it("flags totals that do not reconcile", () => {
    expect(codes({ ...base, checks: [{ window: "Hoje", aggregateTotal: 10, rowsTotal: 9 }] })).toEqual(["aggregate_mismatch"]);
  });
  it("flags a stale pipeline and a missing round", () => {
    expect(codes({ ...base, minutesSinceLastRound: STALE_AFTER_MINUTES + 1 })).toContain("stale");
    expect(codes({ ...base, minutesSinceLastRound: null, dailyTotal: 0 })).toEqual(["no_round"]);
  });
  it("flags a daily report without AI analysis only after the grace period", () => {
    const noAi = { ...base, dailyReportsWithAnalysis: 0 };
    expect(codes({ ...noAi, minutesSinceLastRound: ANALYSIS_GRACE_MINUTES - 1 })).toEqual([]);
    expect(codes({ ...noAi, minutesSinceLastRound: ANALYSIS_GRACE_MINUTES + 1 })).toEqual(["report_without_analysis"]);
  });
  it("does not demand an analysis for a day with no data yet", () => {
    expect(codes({ ...base, dailyTotal: 0, dailyReportsWithAnalysis: 0 })).toEqual([]);
  });
});

describe("needsReportRepair", () => {
  const now = Date.parse("2026-11-01T12:00:00Z");
  it("repairs a window with data and no analysis", () => {
    expect(needsReportRepair({ total: 5, withAnalysis: 0, lastCreatedAt: null }, now)).toBe(true);
    expect(needsReportRepair({ total: 5, withAnalysis: 0, lastCreatedAt: "2026-11-01T11:00:00Z" }, now)).toBe(true);
  });
  it("leaves healthy or empty windows alone", () => {
    expect(needsReportRepair({ total: 5, withAnalysis: 1, lastCreatedAt: null }, now)).toBe(false);
    expect(needsReportRepair({ total: 0, withAnalysis: 0, lastCreatedAt: null }, now)).toBe(false);
  });
  it("respects the cooldown after a recent attempt", () => {
    expect(needsReportRepair({ total: 5, withAnalysis: 0, lastCreatedAt: "2026-11-01T11:58:00Z" }, now)).toBe(false);
  });
});

describe("pickReportIds", () => {
  const w = (id: string, start = "2026-11-01") => ({ id, period_type: "daily", period_start: start, period_end: start });
  it("keeps the newest report per window", () => {
    expect(pickReportIds([w("b"), w("a")], new Set(["a", "b"]))).toEqual(["b"]);
  });
  it("prefers an older report WITH analysis over a newer empty one", () => {
    expect(pickReportIds([w("empty"), w("good")], new Set(["good"]))).toEqual(["good"]);
  });
  it("falls back to the newest empty report when none has analysis", () => {
    expect(pickReportIds([w("n"), w("o")], new Set())).toEqual(["n"]);
  });
  it("keeps window order (newest first) and caps the list", () => {
    const idx = [w("a", "2026-11-03"), w("b", "2026-11-02"), w("c", "2026-11-01")];
    expect(pickReportIds(idx, new Set(["a", "b", "c"]), 2)).toEqual(["a", "b"]);
  });
});

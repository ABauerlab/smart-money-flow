import { describe, it, expect } from "vitest";
import {
  resolveGeminiModel, resolveFallbackModel, resolveMaxOutputTokens, resolveDedupeTtlHours, isWithinTtl, isSearchGroundingEnabled,
  extractGeminiUsage, extractGatewayUsage, rankingInputHash, DEFAULT_GEMINI_MODEL,
} from "../../supabase/functions/crypto-analysis/ai";

const mk = (n: number, bump = 0) =>
  Array.from({ length: n }, (_, i) => ({ symbol: `C${i}`, count: n - i + (i === 0 ? bump : 0) }));

describe("model / flags", () => {
  it("defaults and strips google/ prefix", () => {
    expect(resolveGeminiModel(undefined)).toBe(DEFAULT_GEMINI_MODEL);
    expect(resolveGeminiModel("  ")).toBe(DEFAULT_GEMINI_MODEL);
    expect(resolveGeminiModel("google/gemini-x")).toBe("gemini-x");
    expect(resolveFallbackModel(undefined)).toBe("google/gemini-2.5-flash");
    expect(resolveFallbackModel("google/other")).toBe("google/other");
  });
  it("grounding is off unless exactly 'true'", () => {
    expect(isSearchGroundingEnabled(undefined)).toBe(false);
    expect(isSearchGroundingEnabled("false")).toBe(false);
    expect(isSearchGroundingEnabled("1")).toBe(false);
    expect(isSearchGroundingEnabled(" TRUE ")).toBe(true);
  });
});

describe("limits and TTL", () => {
  it("max output tokens: default 4500, only positive integers accepted", () => {
    expect(resolveMaxOutputTokens(undefined)).toBe(4500);
    expect(resolveMaxOutputTokens("6000")).toBe(6000);
    for (const bad of ["abc", "0", "-5", "1.5", ""]) expect(resolveMaxOutputTokens(bad)).toBe(4500);
  });
  it("dedupe TTL: default 6, 0 allowed, junk falls back", () => {
    expect(resolveDedupeTtlHours(undefined)).toBe(6);
    expect(resolveDedupeTtlHours("2")).toBe(2);
    expect(resolveDedupeTtlHours("0")).toBe(0);
    expect(resolveDedupeTtlHours("x")).toBe(6);
    expect(resolveDedupeTtlHours("-1")).toBe(6);
  });
  it("isWithinTtl", () => {
    const now = Date.parse("2026-11-18T12:00:00Z");
    expect(isWithinTtl("2026-11-18T07:00:00Z", 6, now)).toBe(true);
    expect(isWithinTtl("2026-11-18T06:00:00Z", 6, now)).toBe(false);
    expect(isWithinTtl("2026-11-18T11:59:00Z", 0, now)).toBe(false);
    expect(isWithinTtl(null, 6, now)).toBe(false);
    expect(isWithinTtl("garbage", 6, now)).toBe(false);
  });
});

describe("usage extraction", () => {
  it("reads Gemini usageMetadata and tolerates missing fields", () => {
    expect(extractGeminiUsage({ usageMetadata: { promptTokenCount: 7000, candidatesTokenCount: 1800, cachedContentTokenCount: 6000 } }))
      .toEqual({ promptTokens: 7000, outputTokens: 1800, cachedTokens: 6000 });
    expect(extractGeminiUsage({})).toEqual({ promptTokens: 0, outputTokens: 0, cachedTokens: 0 });
  });
  it("reads OpenAI-style usage", () => {
    expect(extractGatewayUsage({ usage: { prompt_tokens: 5, completion_tokens: 2, prompt_tokens_details: { cached_tokens: 3 } } }))
      .toEqual({ promptTokens: 5, outputTokens: 2, cachedTokens: 3 });
  });
});

describe("rankingInputHash", () => {
  it("is stable, order independent and ignores rows beyond top 20", async () => {
    const a = await rankingInputHash("daily", "2026-11-18", "2026-11-18", mk(30));
    const b = await rankingInputHash("daily", "2026-11-18", "2026-11-18", [...mk(30)].reverse());
    const c = await rankingInputHash("daily", "2026-11-18", "2026-11-18", [...mk(30).slice(0, 22), { symbol: "ZZ", count: 0 }]);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(b);
    expect(a).toBe(c);
  });
  it("changes with a top-20 score, period or type", async () => {
    const base = await rankingInputHash("daily", "2026-11-18", "2026-11-18", mk(30));
    expect(await rankingInputHash("daily", "2026-11-18", "2026-11-18", mk(30, 1))).not.toBe(base);
    expect(await rankingInputHash("daily", "2026-11-19", "2026-11-19", mk(30))).not.toBe(base);
    expect(await rankingInputHash("weekly", "2026-11-18", "2026-11-18", mk(30))).not.toBe(base);
  });
});

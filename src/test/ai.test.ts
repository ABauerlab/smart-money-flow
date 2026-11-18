import { describe, it, expect } from "vitest";
import {
  resolveGeminiModel, gatewayModelName, isSearchGroundingEnabled,
  extractGeminiUsage, extractGatewayUsage, rankingInputHash, DEFAULT_GEMINI_MODEL,
} from "../../supabase/functions/crypto-analysis/ai";

const mk = (n: number, bump = 0) =>
  Array.from({ length: n }, (_, i) => ({ symbol: `C${i}`, count: n - i + (i === 0 ? bump : 0) }));

describe("model / flags", () => {
  it("defaults and strips google/ prefix", () => {
    expect(resolveGeminiModel(undefined)).toBe(DEFAULT_GEMINI_MODEL);
    expect(resolveGeminiModel("  ")).toBe(DEFAULT_GEMINI_MODEL);
    expect(resolveGeminiModel("google/gemini-x")).toBe("gemini-x");
    expect(gatewayModelName("gemini-x")).toBe("google/gemini-x");
  });
  it("grounding is off unless exactly 'true'", () => {
    expect(isSearchGroundingEnabled(undefined)).toBe(false);
    expect(isSearchGroundingEnabled("false")).toBe(false);
    expect(isSearchGroundingEnabled("1")).toBe(false);
    expect(isSearchGroundingEnabled(" TRUE ")).toBe(true);
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

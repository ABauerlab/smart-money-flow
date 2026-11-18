// Pure helpers for the AI call (no Deno globals, no network), so they can be unit-tested
// from vitest. The network code lives in index.ts.

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
export const AI_TEMPERATURE = 0.2;
export const AI_MAX_OUTPUT_TOKENS = 2500;
// How many top assets (and their scores) feed the dedup hash.
export const HASH_TOP_N = 20;

export interface AIUsage {
  promptTokens: number;
  outputTokens: number;
  cachedTokens: number;
}

export const EMPTY_USAGE: AIUsage = { promptTokens: 0, outputTokens: 0, cachedTokens: 0 };

export function addUsage(a: AIUsage, b: AIUsage): AIUsage {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cachedTokens: a.cachedTokens + b.cachedTokens,
  };
}

/** Model id as the official Gemini API expects it (no "google/" prefix). */
export function resolveGeminiModel(envValue: string | undefined | null): string {
  const v = (envValue ?? '').trim().replace(/^google\//, '');
  return v || DEFAULT_GEMINI_MODEL;
}

/** Same model, named the way the Lovable gateway expects it. */
export function gatewayModelName(model: string): string {
  return `google/${model}`;
}

/** Search grounding is opt-in: only the literal string "true" enables it. */
export function isSearchGroundingEnabled(envValue: string | undefined | null): boolean {
  return (envValue ?? '').trim().toLowerCase() === 'true';
}

/** Real token counts from Gemini's usageMetadata (missing fields count as 0). */
export function extractGeminiUsage(data: any): AIUsage {
  const u = data?.usageMetadata ?? {};
  return {
    promptTokens: Number(u.promptTokenCount) || 0,
    outputTokens: Number(u.candidatesTokenCount) || 0,
    cachedTokens: Number(u.cachedContentTokenCount) || 0,
  };
}

/** Token counts from an OpenAI-compatible response (Lovable gateway). */
export function extractGatewayUsage(data: any): AIUsage {
  const u = data?.usage ?? {};
  return {
    promptTokens: Number(u.prompt_tokens) || 0,
    outputTokens: Number(u.completion_tokens) || 0,
    cachedTokens: Number(u.prompt_tokens_details?.cached_tokens) || 0,
  };
}

/**
 * SHA-256 of what actually drives the screening: the period and the top-N assets with
 * their scores. Insensitive to rows beyond the top N and to input order ties are broken by
 * symbol so the same ranking always yields the same hash.
 */
export async function rankingInputHash(
  periodType: string,
  periodStart: string,
  periodEnd: string,
  ranking: { symbol: string; count: number }[],
): Promise<string> {
  const top = [...ranking]
    .sort((a, b) => b.count - a.count || a.symbol.localeCompare(b.symbol))
    .slice(0, HASH_TOP_N)
    .map(r => [r.symbol, r.count]);
  const payload = JSON.stringify({ periodType, periodStart, periodEnd, top });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

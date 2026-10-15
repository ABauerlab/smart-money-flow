import { describe, it, expect } from "vitest";
import { fetchAllRows, PAGE_SIZE } from "../../supabase/functions/crypto-analysis/pagination";

// Fake PostgREST: honours .range(from, to) but, like Supabase, never returns more
// than `maxRows` rows per request (default project limit is 1000), without any error.
function fakeTable<T>(rows: T[], maxRows = 1000) {
  const calls: Array<[number, number]> = [];
  const build = (from: number, to: number) => {
    calls.push([from, to]);
    const slice = rows.slice(from, to + 1).slice(0, maxRows);
    return Promise.resolve({ data: slice, error: null });
  };
  return { build, calls };
}

const mentions = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i, repetition: 1 + (i % 9) }));
const sum = (rs: { repetition: number }[]) => rs.reduce((s, r) => s + r.repetition, 0);

describe("fetchAllRows", () => {
  it("reads past the 1000-row PostgREST cap (the frozen weekly sum bug)", async () => {
    const rows = mentions(3200);
    const { build } = fakeTable(rows);
    const got = await fetchAllRows(build);
    expect(got).toHaveLength(3200);
    expect(sum(got)).toBe(sum(rows));
    // A bare .select() would have stopped at the cap and under-counted:
    expect(sum(rows.slice(0, 1000))).toBeLessThan(sum(rows));
  });

  it("does not duplicate or skip rows when the server cap is below the page size", async () => {
    const rows = mentions(2345);
    const { build } = fakeTable(rows, 400);
    const got = await fetchAllRows(build);
    expect(got.map(r => r.id)).toEqual(rows.map(r => r.id));
  });

  it("handles an exact multiple of the page size and an empty table", async () => {
    expect(await fetchAllRows(fakeTable(mentions(PAGE_SIZE * 2)).build)).toHaveLength(PAGE_SIZE * 2);
    expect(await fetchAllRows(fakeTable([]).build)).toEqual([]);
  });

  it("propagates query errors instead of returning a partial sum", async () => {
    await expect(
      fetchAllRows(() => Promise.resolve({ data: null, error: { message: "boom" } })),
    ).rejects.toThrow("boom");
  });
});

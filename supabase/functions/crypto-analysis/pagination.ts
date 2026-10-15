// Supabase/PostgREST caps every query at `max_rows` (1000 by default), silently:
// no error, no flag, the response just stops at 1000 rows. A weekly window with
// 4 reports/day x ~170 assets holds several thousand crypto_mentions rows, so any
// plain `.select()` over a window under-counts once the week passes ~1000 rows and
// the summed total "freezes" at whatever those first 1000 rows add up to.
//
// This helper reads a query to the end in pages. It advances by the number of rows
// actually returned (not by the requested page size) so it stays correct even if the
// project's max_rows is configured below PAGE_SIZE, and it stops on the first empty
// page. A stable unique sort key is required so pages never overlap or skip rows.

export const PAGE_SIZE = 1000;
// Hard ceiling (500 pages = 500k rows) so a bug can never turn into an endless loop.
const MAX_PAGES = 500;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

// `buildPage(from, to)` must return the query for that inclusive row range, already
// ordered by a unique column (e.g. `.order('id').range(from, to)`).
export async function fetchAllRows<T>(buildPage: (from: number, to: number) => PageResult<T>): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await buildPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return all;
    all.push(...data);
    from += data.length;
  }
  throw new Error('Limite de paginação excedido ao ler as menções.');
}

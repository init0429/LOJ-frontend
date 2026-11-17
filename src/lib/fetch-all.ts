// Supabase는 한 번에 최대 1000행(프로젝트 설정 max_rows)까지만 돌려주고, 넘치는 행은
// 오류 없이 잘라 버린다. 행이 계속 늘어나는 표(제출 등)를 전부 읽어야 할 때는 이 함수로
// 페이지를 나눠 끝까지 읽는다. 정렬 기준이 고유해야 페이지 경계에서 행이 겹치거나
// 빠지지 않으므로, 쿼리에 order를 꼭 붙일 것.
const PAGE_SIZE = 1000;

interface PageResult<T> {
  data: T[] | null;
  error: unknown;
}

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<{ data: T[]; error: unknown }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) return { data: rows, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return { data: rows, error: null };
  }
}

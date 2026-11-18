/** solved.ac 태그(tags 표의 한 행) */
export interface Tag {
  key: string;
  name_ko: string;
  name_en: string | null;
  aliases: string[];
}

const fold = (text: string) => text.toLowerCase().replace(/[\s_-]+/g, "");

/**
 * 관리자 화면의 태그 찾기. 한국어·영어 이름, key, 다른 이름에서 찾는다.
 * key가 똑같으면 맨 앞, 이름이 그 말로 시작하면 그다음, 들어 있기만 하면 그 뒤에 둔다.
 */
export function searchTags(tags: Tag[], query: string, exclude: string[] = [], limit = 8): Tag[] {
  const q = fold(query);
  if (!q) return [];
  const skip = new Set(exclude);
  const scored: { tag: Tag; score: number }[] = [];
  for (const tag of tags) {
    if (skip.has(tag.key)) continue;
    const names = [tag.name_ko, tag.name_en ?? "", tag.key, ...tag.aliases].map(fold);
    let score = 0;
    if (fold(tag.key) === q) score = 3;
    else if (names.some((name) => name.startsWith(q))) score = 2;
    else if (names.some((name) => name.includes(q))) score = 1;
    if (score) scored.push({ tag, score });
  }
  scored.sort((a, b) => b.score - a.score || a.tag.name_ko.localeCompare(b.tag.name_ko, "ko"));
  return scored.slice(0, limit).map((item) => item.tag);
}

/** BOJ 문제 번호 칸의 값. 1 이상 9,999,999 이하의 정수가 아니면 null */
export function parseBojId(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d{1,7}$/.test(trimmed)) return null;
  const id = Number(trimmed);
  return id >= 1 ? id : null;
}

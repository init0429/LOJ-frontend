// 채점기와 같은 규칙으로 두 출력을 줄마다 비교한다. 앞뒤 빈 줄과 줄 끝 공백(\r 포함)은
// 채점기도 무시하므로 화면에서도 다르다고 표시하지 않는다.

export interface OutputLine {
  text: string;
  /** 상대편 같은 번호의 줄과 같은지 */
  same: boolean;
}

export interface OutputDiff {
  actual: OutputLine[];
  expected: OutputLine[];
  /** 처음으로 다른 줄의 번호(1부터). 두 출력이 같으면 null */
  firstDifference: number | null;
}

export function outputLines(text: string): string[] {
  const trimmed = text.trim();
  return trimmed === "" ? [] : trimmed.split("\n").map((line) => line.trimEnd());
}

export function compareOutputs(actual: string, expected: string): OutputDiff {
  const mine = outputLines(actual);
  const theirs = outputLines(expected);
  const mark = (lines: string[], other: string[]) =>
    lines.map((text, index) => ({ text, same: other[index] === text }));
  let firstDifference: number | null = null;
  for (let index = 0; index < Math.max(mine.length, theirs.length); index += 1) {
    if (mine[index] !== theirs[index]) {
      firstDifference = index + 1;
      break;
    }
  }
  return { actual: mark(mine, theirs), expected: mark(theirs, mine), firstDifference };
}

/** 오답일 때 어디가 다른지 한 문장으로. 같으면 빈 문자열 */
export function describeDifference(diff: OutputDiff): string {
  const line = diff.firstDifference;
  if (line === null) return "";
  const mine = diff.actual.length;
  const theirs = diff.expected.length;
  if (mine === 0) return "출력이 없습니다.";
  if (line <= mine && line <= theirs) return `${line}번째 줄부터 다릅니다.`;
  if (mine < theirs) return `내 출력은 ${mine}줄에서 끝났습니다. 기대한 출력은 ${theirs}줄입니다.`;
  return `기대한 출력은 ${theirs}줄인데 내 출력은 ${mine}줄입니다.`;
}

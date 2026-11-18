// 이름 바꾸기. DB(profiles_username_valid)와 같은 규칙으로 미리 검사해 안내한다.

export const USERNAME_MAX = 20;
/** 이름이 바뀌었음을 머리줄 같은 다른 화면에 알리는 이벤트 */
export const PROFILE_EVENT = "loj-profile";

/** 앞뒤 공백을 떼어 낸 이름, 또는 쓸 수 없는 까닭 */
export function normalizeUsername(raw: string): { name: string } | { error: string } {
  const name = raw.trim();
  if (!name) return { error: "이름을 적어 주세요." };
  // DB의 char_length처럼 글자(코드 포인트) 수로 센다.
  if ([...name].length > USERNAME_MAX) return { error: `이름은 ${USERNAME_MAX}자까지 쓸 수 있습니다.` };
  if (/[\u0000-\u001f\u007f-\u009f]/.test(name)) return { error: "이름에 쓸 수 없는 문자가 있습니다." };
  return { name };
}

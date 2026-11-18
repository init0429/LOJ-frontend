import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** 브라우저에서 그리기 시작했는지. localStorage처럼 서버에 없는 값을 읽는 부분을 이 뒤로 미룬다. */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

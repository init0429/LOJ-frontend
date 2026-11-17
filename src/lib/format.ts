/** 2000 -> "2초", 1500 -> "1.5초" */
export const formatSeconds = (ms: number) => `${Number((ms / 1000).toFixed(2))}초`;

const dateTime = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "11월 17일 오후 3:05" */
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

/** 남은 시간을 "01:23:45"로 */
export const formatCountdown = (ms: number) => {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
};

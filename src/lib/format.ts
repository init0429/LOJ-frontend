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

const timeOnly = new Intl.DateTimeFormat("ko-KR", { hour: "numeric", minute: "2-digit" });

/** "11월 17일 오후 3:00부터 오후 5:00까지". 날짜가 넘어가면 끝나는 날짜도 적는다. */
export const formatRange = (startIso: string, endIso: string) => {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = start.toDateString() === end.toDateString();
  return `${dateTime.format(start)}부터 ${sameDay ? timeOnly.format(end) : dateTime.format(end)}까지`;
};

/** 시작까지 남은 시간을 "3일 뒤", "2시간 뒤", "곧"처럼 대략 알려 준다. */
export const formatUntil = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "곧";
  if (minutes < 60) return `${minutes}분 뒤`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 뒤`;
  return `${Math.floor(hours / 24)}일 뒤`;
};

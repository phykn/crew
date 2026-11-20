const pad = (n: number) => String(n).padStart(2, '0');

// The record keeps UTC ISO times, so slicing the string would show UTC; these read it in the user's time zone
export function clock(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function stamp(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${clock(iso)}`;
}

// Runs last seconds to hours; past a minute the seconds stop mattering much
export function duration(seconds: number) {
  const s = Math.round(seconds);
  if (s < 60) return `${s}초`;
  if (s < 3600) return `${Math.floor(s / 60)}분 ${s % 60}초`;
  return `${Math.floor(s / 3600)}시간 ${Math.floor((s % 3600) / 60)}분`;
}

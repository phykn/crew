import { t } from './lang';

const pad = (n: number) => String(n).padStart(2, '0');

// The record keeps UTC ISO times, so slicing the string would show UTC; these read it in the user's time zone
export function clock(iso: string, seconds = false) {
  const d = new Date(iso);
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return seconds ? `${hm}:${pad(d.getSeconds())}` : hm;
}

export function stamp(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${clock(iso)}`;
}

// Runs last seconds to hours; past a minute the seconds stop mattering much
export function duration(seconds: number) {
  const s = Math.round(seconds);
  if (s < 60) return t('time.s', { s });
  if (s < 3600) return t('time.ms', { m: Math.floor(s / 60), s: s % 60 });
  return t('time.hm', { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60) });
}

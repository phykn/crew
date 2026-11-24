import { useSyncExternalStore } from 'react';
import { josa, particle } from './korean';
import { KO, LANG_NAMES, type Key } from './ko';
import { EN } from './en';

export type Lang = 'ko' | 'en';
export type { Key };

let current: Lang = 'ko';
const listeners = new Set<() => void>();

export const lang = () => current;

export function setLang(next: Lang) {
  current = next;
  document.documentElement.lang = next;
  listeners.forEach((f) => f());
}

// The window rerenders from the top when the language changes, so every t() below reads the new one
export function useLang() {
  return useSyncExternalStore((f) => (listeners.add(f), () => listeners.delete(f)), lang);
}

type Particle = Parameters<typeof josa>[1];

// A word by key in the window's language: "{name}" fills in a value, "{name|을}" adds the Korean particle that fits it, and "{name|~을}" the particle alone
export function t(key: Key, vars: Record<string, string | number> = {}) {
  const text = current === 'en' ? EN[key] : KO[key];
  return text.replace(/\{(\w+)(?:\|(~?)([^}]+))?\}/g, (_, name: string, alone: string, p?: string) => {
    const value = String(vars[name] ?? '');
    if (!p || current !== 'ko') return alone ? '' : value;
    return alone ? particle(value, p as Particle) : josa(value, p as Particle);
  });
}

// A key built from a code, such as a role or a record line; one the dictionary lacks shows as the code itself
export function tOr(key: string, vars: Record<string, string | number> = {}) {
  return key in KO ? t(key as Key, vars) : key.slice(key.lastIndexOf('.') + 1);
}

export const LANGS: { value: Lang; label: string }[] = [
  { value: 'en', label: LANG_NAMES.en },
  { value: 'ko', label: LANG_NAMES.ko },
];

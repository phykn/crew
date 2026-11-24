// Korean particles depend on whether the word before them ends in a consonant, so a name filled in at runtime picks its own
const PAIRS = { 을: ['을', '를'], 이: ['이', '가'], 은: ['은', '는'], 과: ['과', '와'], 으로: ['으로', '로'] } as const;
// How each digit is read: its final consonant, 0 for none, 8 for ㄹ
const DIGIT_FINAL = [21, 8, 0, 16, 0, 0, 1, 8, 8, 0];

function finalOf(word: string): number {
  // Closing quotes and brackets, and the ellipsis of a cut title, are not read aloud
  const last =
    word
      .trim()
      .replace(/["'”’)\]…]+$/, '')
      .at(-1) ?? '';
  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28;
  if (/\d/.test(last)) return DIGIT_FINAL[Number(last)];
  return 0;
}

export function josa(word: string, kind: keyof typeof PAIRS): string {
  return word + particle(word, kind);
}

// The particle alone, for when something such as a bracket comes between the word and it
export function particle(word: string, kind: keyof typeof PAIRS): string {
  const final = finalOf(word);
  const [after, plain] = PAIRS[kind];
  // ㄹ takes 로, not 으로
  const consonant = kind === '으로' ? final !== 0 && final !== 8 : final !== 0;
  return consonant ? after : plain;
}

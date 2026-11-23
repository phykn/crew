// What an in-process tool answers
export const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });

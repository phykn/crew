import { z } from 'zod';
import type { TaskStatus } from './backend/domain/records';

// How calls outside the guard's plain allow are handled: asked on a card, allowed at once, or not checked at all
export const MODES = ['manual', 'auto', 'bypass'] as const;
export type Mode = (typeof MODES)[number];

// A picture the user attaches to a message, kept as base64 the way Claude takes it
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;
export type Image = { mediaType: (typeof IMAGE_TYPES)[number]; data: string };
// A sent picture's address; the window loads it only when shown, so the message list stays small
export const IMAGE_SCHEME = 'crew-image';
// The send time keeps the address unique: a deleted message's id can be given again, and the window caches by address
export const imageUrl = (messageId: number, n: number, sentAt: string) =>
  `${IMAGE_SCHEME}://message/${messageId}/${n}?at=${encodeURIComponent(sentAt)}`;

export const MODELS = ['haiku', 'sonnet', 'opus'] as const;

// The shipped crew in legend order, each with the model it starts on
export const MEMBERS: Record<string, { model: (typeof MODELS)[number] }> = {
  interpreter: { model: 'sonnet' },
  conductor: { model: 'opus' },
  researcher: { model: 'sonnet' },
  coder: { model: 'sonnet' },
  writer: { model: 'sonnet' },
  reviewer: { model: 'opus' },
  proofreader: { model: 'sonnet' },
  tester: { model: 'haiku' },
  images: { model: 'sonnet' },
  librarian: { model: 'sonnet' },
};
// The names the window shows, handed over at start: members' roles and starting nicknames, workflows', and approval modes'
export const Names = z.object({
  roles: z.record(z.string(), z.string()),
  nicknames: z.record(z.string(), z.string()),
  workflows: z.record(z.string(), z.object({ label: z.string(), steps: z.record(z.string(), z.string()) })),
  modes: z.record(z.string(), z.string()),
});
export type Names = z.infer<typeof Names>;
// Something the screen words in the user's language: what happened, as a code, with the values it needs
export type Say = { code: string; [arg: string]: unknown };
// A copy's key is its original's key with the task and step after a dash
export const baseKey = (key: string) => key.split('-')[0];

// A task in these states is being driven: it can be stopped, and what is added to it joins without a new drive
export const ACTIVE: readonly TaskStatus[] = ['queued', 'running', 'reviewing', 'fixing', 'waiting'];

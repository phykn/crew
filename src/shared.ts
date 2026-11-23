import type { TaskStatus } from './backend/domain/records';

// How calls outside the guard's plain allow are handled: asked on a card, allowed at once, or not checked at all
export const MODES = ['manual', 'auto', 'bypass'] as const;
export type Mode = (typeof MODES)[number];
export const MODE_LABELS: Record<Mode, string> = { manual: '묻기', auto: '자동', bypass: '전부' };

// A picture the user attaches to a message, kept as base64 the way Claude takes it
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;
export type Image = { mediaType: (typeof IMAGE_TYPES)[number]; data: string };
// A sent picture's address; the window loads it only when shown, so the message list stays small
export const IMAGE_SCHEME = 'crew-image';
// The send time keeps the address unique: a deleted message's id can be given again, and the window caches by address
export const imageUrl = (messageId: number, n: number, sentAt: string) =>
  `${IMAGE_SCHEME}://message/${messageId}/${n}?at=${encodeURIComponent(sentAt)}`;

export const MODELS = ['haiku', 'sonnet', 'opus'] as const;

// A task in these states is being driven: it can be stopped, and what is added to it joins without a new drive
export const ACTIVE: readonly TaskStatus[] = ['queued', 'running', 'reviewing', 'fixing', 'waiting'];

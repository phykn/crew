import type { TaskStatus } from './backend/db';

// How calls outside the guard's plain allow are handled: asked on a card, allowed at once, or not checked at all
export const MODES = ['manual', 'auto', 'bypass'] as const;
export type Mode = (typeof MODES)[number];
export const MODE_LABELS: Record<Mode, string> = { manual: '묻기', auto: '자동', bypass: '전부' };

// A picture the user attaches to a message, kept as base64 the way Claude takes it
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;
export type Image = { mediaType: (typeof IMAGE_TYPES)[number]; data: string };

export const MODELS = ['haiku', 'sonnet', 'opus'] as const;

// A task in these states is being driven: it can be stopped, and what is added to it joins without a new drive
export const ACTIVE: readonly TaskStatus[] = ['queued', 'running', 'reviewing', 'fixing', 'waiting'];

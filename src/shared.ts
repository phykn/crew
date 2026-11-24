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

// The shipped crew in legend order: each member's name on screen, starting nickname, and starting model
type Lineup = { role: string; nickname: string; model: (typeof MODELS)[number] };
export const MEMBERS: Record<string, Lineup> = {
  interpreter: { role: '통역', nickname: '모아', model: 'sonnet' },
  conductor: { role: '지휘', nickname: '다온', model: 'opus' },
  researcher: { role: '조사', nickname: '누리', model: 'sonnet' },
  coder: { role: '코드 작성', nickname: '모루', model: 'sonnet' },
  writer: { role: '문서 작성', nickname: '글비', model: 'sonnet' },
  reviewer: { role: '코드 검토', nickname: '세린', model: 'opus' },
  proofreader: { role: '문서 검토', nickname: '바름', model: 'sonnet' },
  tester: { role: '시험', nickname: '시우', model: 'haiku' },
  images: { role: '이미지', nickname: '빛나', model: 'sonnet' },
};
// Each shipped workflow's name on screen, and its steps' names
export const WORKFLOW_LABELS: Record<string, { label: string; steps: Record<string, string> }> = {
  code: {
    label: '코드 변경',
    steps: { plan: '계획', plan_review: '계획 검토', develop: '코드 작성', review: '코드 검토', test: '시험' },
  },
  doc: { label: '문서 작성', steps: { write: '문서 작성', review: '문서 검토' } },
  improve: { label: '개선 제안', steps: { structure: '구조 검토' } },
  research: { label: '조사', steps: { research: '조사' } },
};
// A copy's key is its original's key with the task and step after a dash
export const baseKey = (key: string) => key.split('-')[0];

// A task in these states is being driven: it can be stopped, and what is added to it joins without a new drive
export const ACTIVE: readonly TaskStatus[] = ['queued', 'running', 'reviewing', 'fixing', 'waiting'];

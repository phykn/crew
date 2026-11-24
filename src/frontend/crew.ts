import type { Key } from './ko';

// How each shipped member looks in the camp: its name tag's color, and the sprite parts as head, upper, lower
export const LOOKS: Record<string, { color: string; look: [string, string, string] }> = {
  interpreter: { color: '#ff4b3e', look: ['hat', 'robe', 'gown'] },
  conductor: { color: '#9aa5ff', look: ['hair', 'armor', 'wraps'] },
  researcher: { color: '#e0a96d', look: ['hat', 'vest', 'greaves'] },
  coder: { color: '#2ee0c4', look: ['hood', 'tunic', 'boots'] },
  writer: { color: '#b8e04a', look: ['hat', 'tunic', 'wraps'] },
  reviewer: { color: '#c77dff', look: ['helm', 'armor', 'greaves'] },
  proofreader: { color: '#3d8bff', look: ['braids', 'vest', 'gown'] },
  tester: { color: '#ffd23f', look: ['helm', 'vest', 'boots'] },
  images: { color: '#ff6fb5', look: ['hood', 'robe', 'wraps'] },
  librarian: { color: '#8fd16a', look: ['braids', 'robe', 'boots'] },
};

// Each skill and MCP server of the crew folder as the permissions window shows it
export const KIT: Record<string, { icon: string; label: Key; use: Key }> = {
  brief: { icon: 'list', label: 'kit.brief', use: 'kit.brief.use' },
  plan: {
    icon: 'sparkle',
    label: 'kit.plan',
    use: 'kit.plan.use',
  },
  research: {
    icon: 'book',
    label: 'kit.research',
    use: 'kit.research.use',
  },
  code: { icon: 'code', label: 'kit.code', use: 'kit.code.use' },
  conventions: {
    icon: 'ruler',
    label: 'kit.conventions',
    use: 'kit.conventions.use',
  },
  write: { icon: 'scroll', label: 'kit.write', use: 'kit.write.use' },
  'plan-review': {
    icon: 'clipboard',
    label: 'kit.planReview',
    use: 'kit.planReview.use',
  },
  'code-review': {
    icon: 'eye',
    label: 'kit.codeReview',
    use: 'kit.codeReview.use',
  },
  'doc-review': { icon: 'palette', label: 'kit.docReview', use: 'kit.docReview.use' },
  verify: {
    icon: 'bug',
    label: 'kit.test',
    use: 'kit.test.use',
  },
  wiki: {
    icon: 'book',
    label: 'kit.wiki',
    use: 'kit.wiki.use',
  },
  image: { icon: 'image', label: 'kit.image', use: 'kit.image.use' },
  verdict: {
    icon: 'check',
    label: 'kit.report',
    use: 'kit.report.use',
  },
  browser: {
    icon: 'browser',
    label: 'kit.browser',
    use: 'kit.browser.use',
  },
  app: { icon: 'list', label: 'kit.app', use: 'kit.app.use' },
};

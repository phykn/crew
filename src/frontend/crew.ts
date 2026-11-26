import type { Key } from './ko';

// Each shipped member's name tag color in the camp; how they look is their figure in camp/art/people/
export const COLORS: Record<string, string> = {
  interpreter: '#ff4b3e',
  conductor: '#9aa5ff',
  researcher: '#e0a96d',
  coder: '#2ee0c4',
  writer: '#b8e04a',
  reviewer: '#c77dff',
  proofreader: '#3d8bff',
  tester: '#ffd23f',
  images: '#ff6fb5',
  librarian: '#8fd16a',
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

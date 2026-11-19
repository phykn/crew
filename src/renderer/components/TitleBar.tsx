import * as Menu from '@radix-ui/react-dropdown-menu';
import { call } from '../api';

// The app's own menu sits by its name: the explorer of projects and sessions, and quitting
export function TitleBar({ onExplorer }: { onExplorer: () => void }) {
  return (
    <header className="titlebar">
      <svg className="logo" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 1c1 3 4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 0-5 0-7z" fill="#f59e0b" />
        <path d="M8 8c1 1 2 2 2 3.5a2 2 0 0 1-4 0C6 10 7 9 8 8z" fill="#fde68a" />
        <path d="M3 14l10-2M3 12l10 2" stroke="#8b5a2b" strokeWidth="1.4" />
      </svg>
      <span className="title">AI Crew</span>
      <Menu.Root>
        <Menu.Trigger className="title-menu" aria-label="앱 메뉴">
          <svg viewBox="0 0 20 20" className="icon" aria-hidden="true">
            <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2.2" />
          </svg>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content className="menu" sideOffset={6} align="start">
            <Menu.Item className="menu-item" onSelect={onExplorer}>
              탐색기
            </Menu.Item>
            <Menu.Separator className="menu-separator" />
            <Menu.Item className="menu-item" onSelect={() => call('app.quit')}>
              종료
            </Menu.Item>
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
    </header>
  );
}

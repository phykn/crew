import { call } from '../api';
import { LANGS, type Lang, lang, setLang, t } from '../lang';
import { names } from '../locale';
import { Segmented } from '../ui/Segmented';

declare const __APP_VERSION__: string;

// The main process words nothing, so a language change only hands it the names the window now shows
async function pick(next: Lang) {
  setLang(next);
  await call('lang.write', next);
  await call('crew.names', names());
}

export function TitleBar() {
  return (
    <header className="titlebar">
      <svg className="logo" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 1c1 3 4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 0-5 0-7z" className="flame" />
        <path d="M8 8c1 1 2 2 2 3.5a2 2 0 0 1-4 0C6 10 7 9 8 8z" className="flame-core" />
        <path d="M3 14l10-2M3 12l10 2" className="logs" strokeWidth="1.4" />
      </svg>
      <span className="name">
        <span className="title">crew</span>
        <span className="version">v{__APP_VERSION__}</span>
      </span>
      <div className="titlebar-lang">
        <Segmented label={t('lang.label')} size="sm" even value={lang()} options={LANGS} onChange={pick} />
      </div>
    </header>
  );
}

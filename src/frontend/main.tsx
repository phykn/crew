import { createRoot } from 'react-dom/client';
import { App } from './App';
import { Gallery } from './Gallery';
import './tokens.css';
import './styles.css';
import { call } from './api';
import { names, roleName, say } from './locale';
import { setLang } from './lang';
import type { Say } from '../shared';

// The main process names what came; the window words it and hands it back to show while the user is elsewhere
window.crew.on('notify', (p) => {
  const n = p as { text?: string; say?: Say | null };
  void call('window.notify', { title: roleName('interpreter'), body: n.say ? say(n.say) : (n.text ?? '') });
});

// The language and the names it gives are in place before anything shows, so no screen opens in the other language
void (async () => {
  setLang(await call('lang.read'));
  await call('crew.names', names());
  // Set only by the main process when started with CREW_GALLERY=1
  createRoot(document.getElementById('root')!).render(location.hash === '#gallery' ? <Gallery /> : <App />);
})();

import { createRoot } from 'react-dom/client';
import { App } from './App';
import { Gallery } from './Gallery';
import './tokens.css';
import './styles.css';
import { call } from './api';
import { NAMES, ROLE_NAMES, say } from './locale';
import type { Say } from '../shared';

// Sent before anything shows, so the first screens already read the names the window uses
void call('crew.names', NAMES);

// The main process names what came; the window words it and hands it back to show while the user is elsewhere
window.crew.on('notify', (p) => {
  const n = p as { text?: string; say?: Say | null };
  void call('window.notify', { title: ROLE_NAMES.interpreter, body: n.say ? say(n.say) : (n.text ?? '') });
});

// Set only by the main process when started with CREW_GALLERY=1
createRoot(document.getElementById('root')!).render(location.hash === '#gallery' ? <Gallery /> : <App />);

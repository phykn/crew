import { createRoot } from 'react-dom/client';
import { App } from './App';
import { Gallery } from './Gallery';
import './tokens.css';
import './styles.css';

// Set only by the main process when started with CREW_GALLERY=1
createRoot(document.getElementById('root')!).render(location.hash === '#gallery' ? <Gallery /> : <App />);

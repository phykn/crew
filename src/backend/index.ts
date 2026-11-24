import { app } from 'electron';
import path from 'node:path';
import { start } from './start';

// Tests point CREW_DB at a scratch file and CREW_SCRIPT at a scripted crew, so they never touch the real record or Claude
start(
  process.env.CREW_DB || path.join(app.getPath('userData'), 'crew.db'),
  app.isPackaged ? path.join(process.resourcesPath, 'crew') : path.join(app.getAppPath(), 'crew'),
  process.env.CREW_SCRIPT,
);

import { normalize } from 'node:path';
import fs from 'node:fs';

export function viteTouchGlobalScss(options = {}) {
  const defaultWatchedPaths = ['/src/components/'];
  const defaultGlobalScssPath = '/src/styles/index.scss';

  let watchedPaths = options.watchedPaths || defaultWatchedPaths;

  if (typeof watchedPaths === 'string') {
    watchedPaths = [watchedPaths];
  }

  const normalizedWatchedPaths = watchedPaths.map((path) => normalize(path));

  const globalScssPath = normalize(
    process.cwd() + (options.globalScssPath || defaultGlobalScssPath)
  );

  return {
    name: 'vite-plugin-touch-global-scss',
    configureServer(server) {
      const touchGlobalScss = (filePath) => {
        const normalizedPath = normalize(filePath);

        const isWatched = normalizedWatchedPaths.some((path) =>
          normalizedPath.includes(path)
        );

        if (!isWatched || !filePath.endsWith('.scss')) {
          return;
        }

        const now = new Date();
        fs.utimesSync(globalScssPath, now, now);
      };

      server.watcher.on('add', touchGlobalScss);
    },
  };
}

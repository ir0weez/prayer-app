// v241: the suite gains component-render tests (the Bible Books
// screen mounts under react-native-web), so vitest needs the same
// path aliases Metro/tsconfig use ('@/' → repo root, '@shared/' →
// shared/) and the automatic JSX runtime the app sources rely on
// (they never import React). Nothing else changes: test discovery,
// environment and timeouts stay at vitest defaults, exactly as the
// suite ran before this file existed.
import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL as NodeURL } from 'node:url';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: [
      { find: /^@\//, replacement: fileURLToPath(new NodeURL('./', import.meta.url)) },
      { find: /^@shared\//, replacement: fileURLToPath(new NodeURL('./shared/', import.meta.url)) },
    ],
  },
});

import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
const headers = Object.fromEntries(
  readFileSync(new URL('./public/_headers', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => line.startsWith('  '))
    .map((line) => {
      const separator = line.indexOf(':');
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }),
);
export default defineConfig({
  preview: { headers },
  plugins: [react()],
  test: { include: ['tests/**/*.test.ts'] },
});

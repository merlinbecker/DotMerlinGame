import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __BUILD_VERSION__: JSON.stringify('test'),
  },
  test: {
    environment: 'jsdom',
    include: ['tests/{unit,contract,roundtrip,boot-state,tooling}/**/*.test.{ts,tsx}'],
    typecheck: {
      enabled: true,
      include: ['tests/contract/**/*.test-d.ts'],
      tsconfig: './tsconfig.node.json',
    },
  },
});

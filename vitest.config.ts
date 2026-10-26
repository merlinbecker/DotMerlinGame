import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify('0.0.0-test'),
    __BUILD_VERSION__: JSON.stringify('test'),
  },
  test: {
    environment: 'jsdom',
    globalSetup: ['tests/support/inspection-fixtures.setup.ts'],
    include: ['tests/{unit,contract,roundtrip,boot-state,tooling,emulator}/**/*.test.{ts,tsx}'],
    typecheck: {
      enabled: true,
      include: ['tests/contract/**/*.test-d.ts'],
      tsconfig: './tsconfig.node.json',
    },
  },
});

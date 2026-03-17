import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/types/vitest.config.ts',
  'packages/shared/vitest.config.ts',
  'packages/core/vitest.config.ts',
  'packages/ui/vitest.config.ts',
  'packages/server/vitest.config.ts',
]);

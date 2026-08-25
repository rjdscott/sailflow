import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import svelteConfig from './svelte.config.js';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      '.idea',
      '.claude',
      'docs',
      'scripts',
      'tests',
      'playwright-report',
      'test-results',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs.recommended,
  {
    // TypeScript already checks for undefined globals; no-undef duplicates
    // that check and misses DOM globals (document, localStorage, ...) since
    // it isn't aware of the "DOM" lib. See typescript-eslint's own guidance.
    rules: {
      'no-undef': 'off',
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        svelteConfig,
      },
    },
  },
  {
    // ADR 0003: the UI reaches the physics core only through the worker
    // protocol. `src/core/types` is the one exception — it's the shared,
    // DOM-free data contract both sides speak.
    files: ['src/ui/**/*.{ts,svelte}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/core/**', '!**/core/types'],
              message:
                'src/ui may only import src/core/types. Talk to the solver through src/worker/protocol instead.',
            },
          ],
        },
      ],
    },
  },
);

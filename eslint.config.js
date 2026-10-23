import js from '@eslint/js';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import path, { dirname } from 'path';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import("eslint").Linter.Config} */
export const viteTSConfig = [
  // Ignore files and folders
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/.next/**',
      '**/.vite/**',
      '**/.output/**',
      '**/.cache/**',
      '**/.storybook-static/**',
      'src/components/common/TinyEditor/index.tsx',
      'src/services/01_axios/index.ts',
      'src/services/02_fetch/index.ts',
      '**/*.test.ts',
      '**/*.spec.ts',
    ],
  },

  // JavaScript files
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
    ...js.configs.recommended,
  },

  // TypeScript base config (not type-aware)
  ...tseslint.configs.recommended,
  // JSX/TSX files
  {
    files: ['**/*.{jsx,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
    plugins: {
      react: pluginReact,
      'react-hooks': pluginReactHooks,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...(pluginReact.configs?.recommended?.rules ?? {}),
      ...(pluginReactHooks.configs?.recommended?.rules ?? {}),
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off', // ✅ tắt hoàn toàn
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      ...(pluginReactHooks.configs?.recommended?.rules ?? {}),
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Shared globals
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        process: 'readonly',
      },
    },
  },

  // TypeScript path aliases
  {
    settings: {
      'import/resolver': {
        typescript: {
          project: path.resolve(__dirname, './tsconfig.json'),
        },
      },
    },
  },
];

export default viteTSConfig;

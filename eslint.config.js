import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  // Backend Express (Node) y configs CommonJS: globals de Node en vez de navegador.
  // QUÉ MODIFICAR SI: agregas otra carpeta Node, añade su patrón aquí.
  {
    files: ['server/**/*.js', 'tailwind.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
])

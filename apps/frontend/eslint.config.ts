import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";
import prettier from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-config-prettier";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      react: pluginReact,
      prettier,
    },
    rules: {
      // ✅ ESLint rules
      "no-unused-vars": "warn",
      "no-console": "warn",

      // ✅ React rules
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",

      // ✅ Prettier formatting
      "prettier/prettier": "warn",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },

  // ✅ TypeScript recommended configs
  ...tseslint.configs.recommended,

  // ✅ React recommended configs
  pluginReact.configs.flat.recommended,

  // ✅ Prettier last, disables conflicting rules
  eslintConfigPrettier,
]);

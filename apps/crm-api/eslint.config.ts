import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import prettier from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-config-prettier";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.node, // ✅ Backend = Node
      },
    },
    plugins: {
      prettier,
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off", // Allowed in backend logs
      "prettier/prettier": "warn",
    },
  },

  // ✅ TypeScript recommended configs
  ...tseslint.configs.recommended,

  // ✅ Prettier last
  eslintConfigPrettier,
]);

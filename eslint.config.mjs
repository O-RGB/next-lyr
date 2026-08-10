import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-extra-non-null-assertion": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@next/next/no-sync-scripts": "warn",
      "no-var": "warn",
      "prefer-const": "warn",
      "react/display-name": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "build/**",
    "node_modules/**",
    "out/**",
    "next-env.d.ts",
    "public/**",
  ]),
]);

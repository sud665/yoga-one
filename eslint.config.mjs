import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Serwist service worker bundle — minified, not source.
    "public/sw*",
    // Second checkout of this same project, left in place after its branch was
    // merged. The patterns above are root-anchored, so its own .next/ output
    // and generated service worker are otherwise linted as if they were source
    // — thousands of errors from files nobody wrote.
    ".worktrees/**",
  ]),
]);

export default eslintConfig;

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // AGENTS.md rule 3: service-role client never reaches pages or components.
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    ignores: ["app/api/**", "app/**/actions.ts"],
    rules: {
      "no-restricted-imports": ["error", { paths: [
        { name: "@/lib/supabase/admin", message: "Service role only in API routes, webhooks, cron and server actions after a guard." },
      ] }],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "lib/supabase/types.ts"]),
]);

export default eslintConfig;

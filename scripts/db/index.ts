/**
 * Database migration commands
 */

import type { ScriptCategory } from "../types";

export const category: ScriptCategory = {
    name: "Database",
    description: "Run SQL migrations against a project database (e.g. Supabase)",
    commands: [
        {
            key: "1",
            description: "Run migrations (choose database)",
            action: "tsx scripts/db/migration.ts",
        },
        {
            key: "2",
            description: "Preview pending Supabase migrations (dry run)",
            action: "tsx scripts/db/migration.ts supabase --dry-run",
        },
        {
            key: "3",
            description: "Run Supabase migrations directly",
            action: "tsx scripts/db/migration.ts supabase",
        },
    ],
};

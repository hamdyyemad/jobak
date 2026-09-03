#!/usr/bin/env node
/**
 * Database migration runner
 *
 * Applies the numbered SQL files under db/<target>/ in order. The 000_*.sql
 * files create two tracking tables — `_migrations` for schema/feature files
 * and `_seed_migrations` for anything with "seed" in its filename — so
 * re-runs only apply what's new, and seed history can be queried separately
 * from schema history.
 *
 * Usage:
 *   tsx scripts/db/migration.ts              interactive: asks which DB, then runs
 *   tsx scripts/db/migration.ts supabase      run migrations for db/supabase directly
 *   tsx scripts/db/migration.ts supabase --dry-run   list pending files without applying
 */

import * as readline from "readline";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { Client } from "pg";

// Each entry maps a picker label to the folder under db/ and the env var
// holding its Postgres connection string. Add a new DB by adding a row here —
// the picker and the "does db/<target> exist" check both key off this list.
const TARGETS = [
    {
        key: "supabase",
        label: "Supabase",
        dir: "supabase",
        envVar: "SUPABASE_DB_URL",
    },
] as const;

type Target = (typeof TARGETS)[number];

function loadDotEnv() {
    const envPath = join(process.cwd(), ".env");
    try {
        const content = readFileSync(envPath, "utf-8");
        content.split("\n").forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) return;
            const [key, ...rest] = trimmed.split("=");
            if (key && rest.length > 0 && !process.env[key.trim()]) {
                process.env[key.trim()] = rest.join("=").trim();
            }
        });
    } catch {
        // .env not present — rely on the real environment
    }
}

function askQuestion(rl: readline.Interface, question: string): Promise<string> {
    return new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));
}

async function pickTarget(): Promise<Target> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log("\nWhich database do you want to migrate?\n");
    TARGETS.forEach((t, i) => console.log(`  [${i + 1}] ${t.label}`));
    const choice = await askQuestion(rl, "\nSelect a database: ");
    rl.close();

    const index = parseInt(choice, 10) - 1;
    const target = TARGETS[index];
    if (!target) {
        throw new Error(`Invalid selection: "${choice}"`);
    }
    return target;
}

function resolveTarget(name: string): Target {
    const target = TARGETS.find((t) => t.key === name || t.label.toLowerCase() === name.toLowerCase());
    if (!target) {
        const known = TARGETS.map((t) => t.key).join(", ");
        throw new Error(`Unknown database "${name}". Known: ${known}`);
    }
    return target;
}

function listMigrationFiles(dbDir: string): string[] {
    if (!existsSync(dbDir)) {
        throw new Error(`No migrations folder found at ${dbDir}`);
    }
    return readdirSync(dbDir)
        .filter((f) => f.endsWith(".sql"))
        .sort(); // numeric prefixes (001_, 002_, ...) sort correctly as strings
}

// A file is a "seed" if its name (after the numeric prefix) contains "seed" —
// e.g. 002_seed_sources.sql. Everything else is a schema/feature migration.
// This only decides which tracking table records it; run order is unaffected.
function trackingTableFor(filename: string): "_migrations" | "_seed_migrations" {
    return /seed/i.test(filename) ? "_seed_migrations" : "_migrations";
}

async function getAppliedMigrations(client: Client, table: "_migrations" | "_seed_migrations"): Promise<Set<string>> {
    const result = await client.query<{ filename: string }>(`SELECT filename FROM ${table};`);
    return new Set(result.rows.map((r) => r.filename));
}

async function runMigrations(target: Target, dryRun: boolean) {
    const dbDir = join(process.cwd(), "db", target.dir);
    const files = listMigrationFiles(dbDir);

    if (files.length === 0) {
        console.log(`No .sql files found in db/${target.dir}.`);
        return;
    }

    const connectionString = process.env[target.envVar];
    if (!connectionString) {
        throw new Error(
            `${target.envVar} is not set. Add it to .env — it's the Postgres connection string ` +
                `from your Supabase project's Database settings (not the API URL/anon key).`
        );
    }

    const client = new Client({ connectionString });
    await client.connect();

    try {
        // The 000_*.sql files themselves create _migrations/_seed_migrations,
        // so they must run before either table can be queried. They are
        // idempotent (CREATE TABLE IF NOT EXISTS) and tiny, so just run them
        // unconditionally ahead of the tracked loop below.
        for (const file of files.filter((f) => f.startsWith("000_"))) {
            await client.query(readFileSync(join(dbDir, file), "utf-8"));
        }

        const appliedMigrations = await getAppliedMigrations(client, "_migrations");
        const appliedSeeds = await getAppliedMigrations(client, "_seed_migrations");

        const trackedFiles = files.filter((f) => !f.startsWith("000_"));
        const pending = trackedFiles.filter((f) => {
            const table = trackingTableFor(f);
            const applied = table === "_seed_migrations" ? appliedSeeds : appliedMigrations;
            return !applied.has(f);
        });

        if (pending.length === 0) {
            console.log(`\ndb/${target.dir} is up to date — nothing to apply.`);
            return;
        }

        console.log(`\nPending migrations for ${target.label} (db/${target.dir}):`);
        pending.forEach((f) => console.log(`  - ${f}`));

        if (dryRun) {
            console.log("\n--dry-run: no changes applied.");
            return;
        }

        for (const file of pending) {
            const table = trackingTableFor(file);
            const sql = readFileSync(join(dbDir, file), "utf-8");
            process.stdout.write(`\nApplying ${file} ... `);
            await client.query("BEGIN");
            try {
                await client.query(sql);
                await client.query(`INSERT INTO ${table} (filename) VALUES ($1);`, [file]);
                await client.query("COMMIT");
                console.log("ok");
            } catch (error) {
                await client.query("ROLLBACK");
                console.log("FAILED");
                throw error;
            }
        }

        console.log(`\nDone — applied ${pending.length} migration(s).`);
    } finally {
        await client.end();
    }
}

async function main() {
    loadDotEnv();

    const args = process.argv.slice(2);
    const dryRun = args.includes("--dry-run");
    const targetArg = args.find((a) => !a.startsWith("--"));

    const target = targetArg ? resolveTarget(targetArg) : await pickTarget();

    console.log(`\nTarget: ${target.label} → db/${target.dir}`);

    await runMigrations(target, dryRun);
}

main().catch((error) => {
    console.error("\nMigration failed:", error instanceof Error ? error.message : error);
    process.exit(1);
});

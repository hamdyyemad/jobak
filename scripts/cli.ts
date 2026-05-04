#!/usr/bin/env node
/**
 * Interactive CLI Menu for Project Scripts
 * 
 * This script provides an interactive menu to discover and execute
 * available scripts in the project.
 * 
 * Each subfolder in scripts/ should have an index.ts that exports
 * a 'category' object defining its commands.
 * 
 * Usage:
 *   pnpm scripts
 */

import * as readline from "readline";
import { execSync } from "child_process";
import { readdirSync, statSync, existsSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import type { ScriptCategory, Command } from "./types";

/**
 * Auto-discover script categories by scanning subdirectories
 * Each directory with an index.ts file is loaded as a category
 */
async function discoverScripts(): Promise<ScriptCategory[]> {
    const scriptsDir = join(process.cwd(), "scripts");
    const discovered: ScriptCategory[] = [];

    try {
        const entries = readdirSync(scriptsDir);

        for (const entry of entries) {
            const fullPath = join(scriptsDir, entry);
            const stat = statSync(fullPath);

            // Skip non-directories and special folders
            if (!stat.isDirectory() || entry === "node_modules" || entry.startsWith(".")) {
                continue;
            }

            // Check if index.ts exists
            const indexPath = join(fullPath, "index.ts");
            if (!existsSync(indexPath)) {
                continue;
            }

            try {
                // Dynamically import the category from index.ts using file:// URL
                const absoluteIndexPath = join(process.cwd(), "scripts", entry, "index.ts");
                const fileUrl = pathToFileURL(absoluteIndexPath).href;
                const module = await import(fileUrl);

                if (module.category) {
                    discovered.push(module.category);
                }
            } catch (error) {
                console.log(
                    colors.dim +
                    `⚠ Error loading ${entry}: ${error instanceof Error ? error.message : String(error)}` +
                    colors.reset
                );
            }
        }
    } catch (error) {
        console.error("Error discovering scripts:", error);
    }

    return discovered;
}

// Terminal colors
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
};

function printHeader() {
    console.log("\n" + "=".repeat(60));
    console.log(
        colors.bright +
        colors.cyan +
        "🚀 Project Scripts CLI" +
        colors.reset
    );
    console.log("=".repeat(60) + "\n");
}

function printMainMenu(categories: ScriptCategory[]) {
    console.log(colors.bright + "Available Functionalities:" + colors.reset);
    console.log();

    categories.forEach((category, index) => {
        console.log(
            `${colors.green}[${index + 1}]${colors.reset} ${colors.bright}${category.name}${colors.reset}`
        );
        console.log(`    ${colors.dim}${category.description}${colors.reset}`);
        console.log();
    });

    console.log(`${colors.yellow}[0]${colors.reset} Exit\n`);
}

function printCategoryMenu(category: ScriptCategory) {
    console.log("\n" + "-".repeat(60));
    console.log(
        colors.bright + colors.magenta + `📦 ${category.name}` + colors.reset
    );
    console.log(colors.dim + category.description + colors.reset);
    console.log("-".repeat(60) + "\n");

    category.commands.forEach((command) => {
        console.log(
            `${colors.green}[${command.key}]${colors.reset} ${command.description}`
        );
    });

    console.log(`\n${colors.yellow}[b]${colors.reset} Back to main menu`);
    console.log(`${colors.yellow}[0]${colors.reset} Exit\n`);
}

function executeCommand(command: Command, input?: string) {
    const fullCommand = input ? `${command.action} "${input}"` : command.action;

    console.log(
        `\n${colors.blue}➤ Executing:${colors.reset} ${colors.dim}${fullCommand}${colors.reset}\n`
    );

    try {
        execSync(fullCommand, { stdio: "inherit", shell: true });
        console.log(
            `\n${colors.green}✓ Command completed successfully${colors.reset}\n`
        );
    } catch (error) {
        console.log(`\n${colors.yellow}⚠ Command finished with errors${colors.reset}\n`);
    }
}

function askQuestion(rl: readline.Interface, question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

async function showCategoryMenu(
    rl: readline.Interface,
    category: ScriptCategory
): Promise<boolean> {
    while (true) {
        printCategoryMenu(category);

        const choice = await askQuestion(
            rl,
            `${colors.cyan}Select an option:${colors.reset} `
        );

        if (choice === "0") {
            return true; // Exit program
        }

        if (choice.toLowerCase() === "b") {
            return false; // Back to main menu
        }

        const command = category.commands.find((cmd) => cmd.key === choice);

        if (!command) {
            console.log(`${colors.yellow}Invalid option. Please try again.${colors.reset}\n`);
            continue;
        }

        let input: string | undefined;
        if (command.needsInput && command.inputPrompt) {
            input = await askQuestion(
                rl,
                `${colors.cyan}${command.inputPrompt}:${colors.reset} `
            );

            if (!input) {
                console.log(`${colors.yellow}Input required. Operation cancelled.${colors.reset}\n`);
                continue;
            }
        }

        executeCommand(command, input);

        // Ask if user wants to continue
        const continueChoice = await askQuestion(
            rl,
            `${colors.cyan}Press Enter to continue...${colors.reset} `
        );
    }
}

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const categories = await discoverScripts();

    if (categories.length === 0) {
        console.log(`\n${colors.yellow}No script categories found.${colors.reset}`);
        console.log(`${colors.dim}Create a folder in scripts/ with an index.ts file to get started.${colors.reset}\n`);
        rl.close();
        process.exit(0);
    }

    printHeader();

    while (true) {
        printMainMenu(categories);

        const choice = await askQuestion(
            rl,
            `${colors.cyan}Select a functionality:${colors.reset} `
        );

        if (choice === "0") {
            console.log(`\n${colors.green}👋 Goodbye!${colors.reset}\n`);
            rl.close();
            process.exit(0);
        }

        const index = parseInt(choice) - 1;

        if (index < 0 || index >= categories.length || isNaN(index)) {
            console.log(`${colors.yellow}Invalid option. Please try again.${colors.reset}\n`);
            continue;
        }

        const shouldExit = await showCategoryMenu(rl, categories[index]);

        if (shouldExit) {
            console.log(`\n${colors.green}👋 Goodbye!${colors.reset}\n`);
            rl.close();
            process.exit(0);
        }
    }
}

// Run if called directly
if (require.main === module) {
    main().catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });
}

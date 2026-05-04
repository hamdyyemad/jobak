/**
 * TEMPLATE: Copy this file when creating a new script category
 * 
 * Steps to use:
 * 1. Copy this file to: scripts/your-category-name/index.ts
 * 2. Update the category object below
 * 3. Create your script files
 * 4. Run `pnpm scripts` to see your new category!
 */

import type { ScriptCategory } from "../types";

export const category: ScriptCategory = {
    // The name that appears in the main menu
    name: "Your Category Name",

    // A brief description shown under the name
    description: "What this category does",

    // Array of commands available in this category
    commands: [
        {
            // The key users press to select this command (can be numbers or letters)
            key: "1",

            // Description of what this command does
            description: "First command description",

            // The shell command to execute
            // Usually points to a script in this same folder
            action: "tsx scripts/your-category/your-script.ts command1",
        },
        {
            key: "2",
            description: "Command that needs user input",
            action: "tsx scripts/your-category/your-script.ts command2",

            // Set to true if this command needs user input
            needsInput: true,

            // Prompt text shown to the user
            inputPrompt: "Enter your value",
        },
        {
            key: "3",
            description: "Another command",
            action: "tsx scripts/your-category/your-script.ts command3",
        },
    ],
};

// Example usage in your-script.ts:
/*
#!/usr/bin/env node

const command = process.argv[2];
const input = process.argv[3];

switch (command) {
  case "command1":
    console.log("Running command 1");
    break;
  
  case "command2":
    console.log(`Running command 2 with input: ${input}`);
    break;
  
  case "command3":
    console.log("Running command 3");
    break;
  
  default:
    console.log("Unknown command");
}
*/

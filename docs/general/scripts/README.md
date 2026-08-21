# Project Scripts

Interactive CLI for managing project scripts and utilities.

## Usage

Run the interactive menu:

```bash
pnpm scripts
```

This will show you all available functionalities and their commands.

## Architecture

The CLI uses a **modular architecture** where each functionality is self-contained:

```
scripts/
├── cli.ts                 # Main CLI that discovers and loads categories
├── types.ts              # Shared TypeScript interfaces
├── README.md             # This file
└── encryption/           # Example category
    ├── index.ts          # Defines commands for this category
    └── manage-encryption.ts
```

### How it works

1. **`cli.ts`** scans the `scripts/` directory for subfolders
2. For each folder with an `index.ts` file, it dynamically imports it
3. Each `index.ts` exports a `category` object that defines:
   - Category name and description
   - All available commands
4. The CLI builds the menu automatically from these definitions

This means **the CLI grows automatically** as you add new folders with `index.ts` files!

## Current Functionalities

### 🔐 Encryption
Manage API key encryption using AES-256-GCM

- Generate new encryption secret
- Validate current encryption secret
- Encrypt an API key
- Decrypt an encrypted value
- Run encryption test

## Adding New Functionalities

Adding a new script category is simple and requires **NO changes to cli.ts**!

### Step 1: Create a new folder

Create a subfolder under `scripts/` with your functionality name:

```bash
mkdir scripts/database
```

### Step 2: Create index.ts

Create an `index.ts` file that exports a `category` object:

```typescript
// scripts/database/index.ts
import type { ScriptCategory } from "../types";

export const category: ScriptCategory = {
  name: "Database",
  description: "Database management and migrations",
  commands: [
    {
      key: "1",
      description: "Run migrations",
      action: "tsx scripts/database/migrate.ts",
    },
    {
      key: "2",
      description: "Seed database",
      action: "tsx scripts/database/seed.ts",
      needsInput: true,
      inputPrompt: "Enter environment (dev/prod)",
    },
    {
      key: "3",
      description: "Backup database",
      action: "tsx scripts/database/backup.ts",
    },
  ],
};
```

### Step 3: Add your script files

Create the actual script files referenced in your commands:

```typescript
// scripts/database/migrate.ts
#!/usr/bin/env node

console.log("Running migrations...");
// Your migration logic here
```

### Step 4: Run the CLI

That's it! Your new category will automatically appear:

```bash
pnpm scripts
```

```
Available Functionalities:

[1] Encryption
    Manage API key encryption (AES-256-GCM)

[2] Database
    Database management and migrations

[0] Exit
```

## Command Configuration

Each command in the `commands` array supports:

```typescript
{
  key: string;              // The number/letter to select this command
  description: string;      // What the command does
  action: string;           // The shell command to execute
  needsInput?: boolean;     // Whether this command needs user input
  inputPrompt?: string;     // Prompt text if needsInput is true
}
```

### Example: Command with Input

```typescript
{
  key: "3",
  description: "Encrypt an API key",
  action: "tsx scripts/encryption/manage-encryption.ts encrypt",
  needsInput: true,
  inputPrompt: "Enter the API key to encrypt",
}
```

When selected, the CLI will:
1. Show the prompt: "Enter the API key to encrypt:"
2. Wait for user input
3. Execute: `tsx scripts/encryption/manage-encryption.ts encrypt "user-input"`

### Example: Simple Command

```typescript
{
  key: "1",
  description: "Generate new encryption secret",
  action: "tsx scripts/encryption/manage-encryption.ts generate-secret",
}
```

When selected, executes immediately without prompting.

## Tips for Creating New Categories

✅ **DO:**
- Keep each category focused on one area (e.g., encryption, database, deployment)
- Use clear, descriptive command names
- Add help/info commands where appropriate
- Handle errors gracefully in your scripts
- Use the `needsInput` option for commands that require parameters

❌ **DON'T:**
- Mix unrelated commands in one category
- Forget to export the `category` object from index.ts
- Use duplicate key values within a category

## Optional: Direct npm Scripts

If you want quick access without the interactive menu, add to `package.json`:

```json
{
  "scripts": {
    "db": "tsx scripts/database/migrate.ts"
  }
}
```

Then run: `pnpm db`

## Examples

### Running encryption commands

Via interactive menu:
```bash
pnpm scripts
# Select [1] Encryption
# Select desired command
```

Direct command (if defined in package.json):
```bash
pnpm encrypt generate-secret
pnpm encrypt encrypt "your-api-key"
```

## Development

The CLI is built with:
- Node.js `readline` for interactive input
- `child_process.execSync` for running commands
- Dynamic imports for loading category definitions
- TypeScript for type safety

## Troubleshooting

### "No script categories found"

Make sure your folder has an `index.ts` file that exports a `category` object:

```typescript
export const category: ScriptCategory = { ... };
```

### "Error loading [category]"

Check that:
1. Your `index.ts` is valid TypeScript
2. You're importing types correctly: `import type { ScriptCategory } from "../types"`
3. The `category` object follows the correct structure

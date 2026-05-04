# Quick Start: Adding a New Script Category

This guide shows you how to add a new category to the interactive CLI in under 2 minutes.

## Example: Adding a "Database" category

### 1. Create the folder structure

```bash
mkdir scripts/database
```

### 2. Create index.ts

Copy and modify the template:

```typescript
// scripts/database/index.ts
import type { ScriptCategory } from "../types";

export const category: ScriptCategory = {
  name: "Database",
  description: "Database management tools",
  commands: [
    {
      key: "1",
      description: "Run migrations",
      action: "tsx scripts/database/db-tools.ts migrate",
    },
    {
      key: "2",
      description: "Seed database",
      action: "tsx scripts/database/db-tools.ts seed",
    },
    {
      key: "3",
      description: "Backup to file",
      action: "tsx scripts/database/db-tools.ts backup",
      needsInput: true,
      inputPrompt: "Enter backup filename",
    },
  ],
};
```

### 3. Create your script

```typescript
// scripts/database/db-tools.ts
#!/usr/bin/env node

const command = process.argv[2];
const input = process.argv[3];

switch (command) {
  case "migrate":
    console.log("🔄 Running database migrations...");
    // Your migration logic
    break;

  case "seed":
    console.log("🌱 Seeding database...");
    // Your seeding logic
    break;

  case "backup":
    console.log(`💾 Backing up to ${input}...`);
    // Your backup logic
    break;

  default:
    console.log("Usage: pnpm tsx db-tools.ts [migrate|seed|backup]");
}
```

### 4. Test it!

```bash
pnpm scripts
```

You'll now see:

```
Available Functionalities:

[1] Encryption
    Manage API key encryption (AES-256-GCM)

[2] Database
    Database management tools

[0] Exit
```

## That's it!

No need to modify `cli.ts` or any other files. The CLI automatically discovers your new category.

## Tips

- **Copy the template**: Start with `scripts/index.template.ts` as a base
- **Test incrementally**: Create one command first, test it, then add more
- **Keep it simple**: Each command should do one thing well
- **Use colors**: Add colors to your script output for better UX
- **Handle errors**: Wrap your logic in try-catch blocks

## Next Steps

- Read the full [README.md](README.md) for advanced features
- Look at [scripts/encryption/](encryption/) for a complete example
- Add your new script to `package.json` for quick access (optional)

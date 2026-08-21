/**
 * Encryption Management Index
 * 
 * Defines all encryption-related commands and their configurations
 */

import type { ScriptCategory } from "../types";

export const category: ScriptCategory = {
    name: "Encryption",
    description: "Manage API key encryption (AES-256-GCM)",
    commands: [
        {
            key: "1",
            description: "Generate new encryption secret",
            action: "tsx scripts/encryption/manage-encryption.ts generate-secret",
        },
        {
            key: "2",
            description: "Validate current encryption secret",
            action: "tsx scripts/encryption/manage-encryption.ts validate-secret",
        },
        {
            key: "3",
            description: "Encrypt an API key",
            action: "tsx scripts/encryption/manage-encryption.ts encrypt",
            needsInput: true,
            inputPrompt: "Enter the API key to encrypt",
        },
        {
            key: "4",
            description: "Decrypt an encrypted value",
            action: "tsx scripts/encryption/manage-encryption.ts decrypt",
            needsInput: true,
            inputPrompt: "Enter the encrypted value to decrypt",
        },
        {
            key: "5",
            description: "Run encryption test",
            action: "tsx scripts/encryption/manage-encryption.ts test",
        },
    ],
};

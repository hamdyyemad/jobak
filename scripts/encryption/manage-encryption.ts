#!/usr/bin/env node
/**
 * Encryption Management Script
 * 
 * This script provides utilities for managing API key encryption using AES-256-GCM.
 * 
 * Usage:
 *   pnpm tsx scripts/manage-encryption.ts generate-secret
 *   pnpm tsx scripts/manage-encryption.ts encrypt <api-key>
 *   pnpm tsx scripts/manage-encryption.ts decrypt <encrypted-value>
 *   pnpm tsx scripts/manage-encryption.ts validate-secret
 * 
 * Encryption Algorithm Details:
 * - Algorithm: AES-256-GCM (Galois/Counter Mode)
 * - Key Size: 256 bits (32 bytes)
 * - IV Size: 96 bits (12 bytes, randomly generated per encryption)
 * - Format: {ivHex}:{ciphertextHex}
 * - Key Source: ENCRYPTION_SECRET environment variable (64 hex characters)
 */

import crypto from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

// Load .env.local file if it exists
try {
    const envPath = join(process.cwd(), ".env");
    const envContent = readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
            const value = valueParts.join("=").trim();
            if (!process.env[key.trim()]) {
                process.env[key.trim()] = value;
            }
        }
    });
} catch (error) {
    // .env.local doesn't exist or can't be read, that's okay
}

const ALG = "AES-GCM";
const KEY_LENGTH = 32; // 32 bytes = 256 bits
const IV_LENGTH = 12; // 12 bytes = 96 bits

// Helper Functions
function hexToBuffer(hex: string): ArrayBuffer {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes.buffer as ArrayBuffer;
}

function bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

async function getKey(secret?: string): Promise<CryptoKey> {
    const encryptionSecret = secret || process.env.ENCRYPTION_SECRET;
    if (!encryptionSecret || encryptionSecret.length !== 64) {
        throw new Error("ENCRYPTION_SECRET must be a 64-char hex string (32 bytes)");
    }
    return crypto.subtle.importKey(
        "raw",
        hexToBuffer(encryptionSecret),
        { name: ALG, length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

// Core Functions
async function generateSecret(): Promise<string> {
    const buffer = crypto.getRandomValues(new Uint8Array(KEY_LENGTH));
    return bufferToHex(buffer.buffer as ArrayBuffer);
}

async function encrypt(plaintext: string, secret?: string): Promise<string> {
    const key = await getKey(secret);
    const ivBuffer = crypto.getRandomValues(new Uint8Array(IV_LENGTH)).buffer as ArrayBuffer;
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt(
        { name: ALG, iv: ivBuffer },
        key,
        encoded
    );
    return `${bufferToHex(ivBuffer)}:${bufferToHex(ciphertext)}`;
}

async function decrypt(encrypted: string, secret?: string): Promise<string> {
    const [ivHex, ciphertextHex] = encrypted.split(":");
    if (!ivHex || !ciphertextHex) {
        throw new Error("Invalid encrypted key format. Expected format: {ivHex}:{ciphertextHex}");
    }
    const key = await getKey(secret);
    const plaintext = await crypto.subtle.decrypt(
        { name: ALG, iv: hexToBuffer(ivHex) },
        key,
        hexToBuffer(ciphertextHex)
    );
    return new TextDecoder().decode(plaintext);
}

function validateSecret(secret?: string): boolean {
    const encryptionSecret = secret || process.env.ENCRYPTION_SECRET;
    if (!encryptionSecret) {
        console.error("❌ ENCRYPTION_SECRET is not set");
        return false;
    }
    if (encryptionSecret.length !== 64) {
        console.error(`❌ ENCRYPTION_SECRET must be 64 characters (got ${encryptionSecret.length})`);
        return false;
    }
    if (!/^[0-9a-fA-F]{64}$/.test(encryptionSecret)) {
        console.error("❌ ENCRYPTION_SECRET must contain only hexadecimal characters (0-9, a-f)");
        return false;
    }
    console.log("✅ ENCRYPTION_SECRET is valid");
    return true;
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    try {
        switch (command) {
            case "generate-secret": {
                const secret = await generateSecret();
                console.log("\n🔑 Generated Encryption Secret:");
                console.log(secret);
                console.log("\n📝 Add this to your .env.local file:");
                console.log(`ENCRYPTION_SECRET=${secret}`);
                console.log("\n⚠️  Keep this secret safe! Anyone with this key can decrypt your API keys.");
                break;
            }

            case "encrypt": {
                const plaintext = args[1];
                if (!plaintext) {
                    console.error("❌ Please provide a value to encrypt");
                    console.log("Usage: pnpm tsx scripts/manage-encryption.ts encrypt <api-key>");
                    process.exit(1);
                }
                const encrypted = await encrypt(plaintext);
                console.log("\n🔒 Encrypted value:");
                console.log(encrypted);
                console.log("\n📊 Breakdown:");
                const [iv, ciphertext] = encrypted.split(":");
                console.log(`  IV (${iv.length / 2} bytes): ${iv}`);
                console.log(`  Ciphertext (${ciphertext.length / 2} bytes): ${ciphertext}`);
                break;
            }

            case "decrypt": {
                const encrypted = args[1];
                if (!encrypted) {
                    console.error("❌ Please provide an encrypted value to decrypt");
                    console.log("Usage: pnpm tsx scripts/manage-encryption.ts decrypt <encrypted-value>");
                    process.exit(1);
                }
                const decrypted = await decrypt(encrypted);
                console.log("\n🔓 Decrypted value:");
                console.log(decrypted);
                break;
            }

            case "validate-secret": {
                validateSecret();
                break;
            }

            case "test": {
                console.log("\n🧪 Running encryption test...\n");

                // Generate test secret
                const testSecret = await generateSecret();
                console.log("1️⃣  Generated test secret");

                // Test data
                const testApiKey = "gsk_test_1234567890abcdefghijklmnopqrstuvwxyz";
                console.log(`2️⃣  Test API Key: ${testApiKey}`);

                // Encrypt
                const encrypted = await encrypt(testApiKey, testSecret);
                console.log(`3️⃣  Encrypted: ${encrypted}`);

                // Decrypt
                const decrypted = await decrypt(encrypted, testSecret);
                console.log(`4️⃣  Decrypted: ${decrypted}`);

                // Verify
                if (decrypted === testApiKey) {
                    console.log("\n✅ Test passed! Encryption/decryption working correctly");
                } else {
                    console.log("\n❌ Test failed! Decrypted value doesn't match original");
                    process.exit(1);
                }
                break;
            }

            case "help":
            default: {
                console.log(`
🔐 API Key Encryption Management Script

ALGORITHM DETAILS:
  • Algorithm: AES-256-GCM (Galois/Counter Mode)
  • Key Size: 256 bits (32 bytes / 64 hex characters)
  • IV Size: 96 bits (12 bytes / 24 hex characters)
  • Format: {ivHex}:{ciphertextHex}
  • Authentication: Built-in with GCM mode

COMMANDS:
  generate-secret     Generate a new 256-bit encryption secret
  encrypt <key>       Encrypt an API key using ENCRYPTION_SECRET
  decrypt <value>     Decrypt an encrypted value using ENCRYPTION_SECRET
  validate-secret     Validate the ENCRYPTION_SECRET format
  test                Run encryption/decryption test
  help                Show this help message

EXAMPLES:
  # Generate a new secret (do this once, add to .env.local)
  pnpm tsx scripts/manage-encryption.ts generate-secret

  # Validate your current secret
  pnpm tsx scripts/manage-encryption.ts validate-secret

  # Encrypt an API key
  pnpm tsx scripts/manage-encryption.ts encrypt "gsk_your_api_key_here"

  # Decrypt a value
  pnpm tsx scripts/manage-encryption.ts decrypt "abc123...def:456789...xyz"

  # Run test
  pnpm tsx scripts/manage-encryption.ts test

ENVIRONMENT:
  ENCRYPTION_SECRET   64-character hex string (required for encrypt/decrypt)
        `);
                break;
            }
        }
    } catch (error) {
        console.error("\n❌ Error:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

// Export for use in other scripts
export { encrypt, decrypt, generateSecret, validateSecret };
